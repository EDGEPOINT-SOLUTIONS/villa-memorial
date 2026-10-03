import { describe, expect, it } from "vitest";
import {
  amortizationSchedule,
  engagementTotals,
  installmentAmounts,
  nextReference,
  parsePesoAmount,
  readEngagementIntake,
  readNoticeTemplateIntake,
  readPaymentIntake,
  renderNoticeMessage,
  scheduledNotices,
  shiftDate,
  type Engagement,
  type NoticeSend,
  type NoticeTemplate,
  type Payment,
} from "@/lib/lifecycle";

/**
 * The lifecycle model — the one reading the four registers, the amortization and
 * the modular notices share. `now` is always passed in, so these are deterministic.
 */

const NOW = new Date("2026-10-03T00:00:00Z");

function engagement(over: Partial<Engagement> = {}): Engagement {
  return {
    id: "eng-1",
    reference: "VMP-2026-0001",
    kind: "plan",
    client: { name: "Rosa Lim", phone: "", email: "" },
    prospect_id: null,
    agent: null,
    item: { sku: "", name: "Silver 2", detail: "", price_basis: "" },
    amount_cents: 1_200_000,
    mode: "monthly",
    installments: 12,
    first_due_on: "2026-07-04",
    schedule: null,
    lot: null,
    recorded_at: "2026-07-01T00:00:00Z",
    recorded_by: null,
    ...over,
  };
}

function payment(amount_cents: number, paid_on: string): Payment {
  return {
    id: `pay-${paid_on}`,
    engagement_id: "eng-1",
    amount_cents,
    paid_on,
    note: "",
    recorded_by: null,
    recorded_at: `${paid_on}T00:00:00Z`,
  };
}

const TEMPLATES: NoticeTemplate[] = [
  { id: "two-days", label: "Two days before", days_before: 2, message: "Hello {member}, {amount} is due on {date}.", active: true, created_at: "2026-09-01T00:00:00Z" },
  { id: "one-day", label: "A day before", days_before: 1, message: "{amount} due tomorrow.", active: true, created_at: "2026-09-01T00:00:00Z" },
  { id: "due-day", label: "On the due day", days_before: 0, message: "{amount} due today.", active: true, created_at: "2026-09-01T00:00:00Z" },
  { id: "paused", label: "Paused rule", days_before: 5, message: "nope", active: false, created_at: "2026-09-01T00:00:00Z" },
];

describe("installmentAmounts", () => {
  it("splits a whole amount and gives the last installment the remainder", () => {
    expect(installmentAmounts(1000, 3)).toEqual([333, 333, 334]);
    expect(installmentAmounts(1_200_000, 12)).toEqual(Array(12).fill(100_000));
    expect(installmentAmounts(500, 1)).toEqual([500]);
  });
});

describe("amortizationSchedule", () => {
  it("derives due dates from the mode and allocates payments oldest first", () => {
    const rows = amortizationSchedule(
      engagement(),
      [payment(100_000, "2026-07-04"), payment(100_000, "2026-08-04"), payment(100_000, "2026-09-04")],
      NOW,
    );
    expect(rows).toHaveLength(12);
    expect(rows[0]).toMatchObject({ seq: 1, due_on: "2026-07-04", paid_cents: 100_000, due_cents: 0, state: "paid" });
    expect(rows[3]).toMatchObject({ seq: 4, due_on: "2026-10-04", due_cents: 100_000, state: "due_soon" });
    expect(rows[4]).toMatchObject({ seq: 5, due_on: "2026-11-04", state: "upcoming" });
    // Remaining is the balance after each installment — it falls as the tail shrinks.
    expect(rows[3].remaining_cents).toBe(900_000);
    expect(rows[11].remaining_cents).toBe(100_000);
  });

  it("marks a past-due installment overdue and keeps a one-time record on its date", () => {
    const overdue = amortizationSchedule(engagement({ first_due_on: "2026-06-04" }), [], NOW);
    expect(overdue[3].state).toBe("overdue");
    const once = amortizationSchedule(
      engagement({ mode: "one_time", installments: 1, first_due_on: "2026-10-01" }),
      [],
      NOW,
    );
    expect(once).toEqual([
      expect.objectContaining({ seq: 1, due_on: "2026-10-01", state: "overdue", remaining_cents: 1_200_000 }),
    ]);
  });
});

describe("engagementTotals", () => {
  it("computes paid, outstanding, overdue and the next open installment", () => {
    const totals = engagementTotals(
      engagement({ first_due_on: "2026-06-04" }),
      [payment(100_000, "2026-06-04"), payment(100_000, "2026-07-04")],
      NOW,
    );
    expect(totals.paid_cents).toBe(200_000);
    expect(totals.outstanding_cents).toBe(1_000_000);
    expect(totals.settled).toBe(false);
    // seq 3 (Aug) and seq 4 (Sep) are past due.
    expect(totals.overdue_cents).toBe(200_000);
    expect(totals.next_due?.seq).toBe(3);
  });

  it("never models a negative outstanding on an overpayment", () => {
    const totals = engagementTotals(engagement(), [payment(1_500_000, "2026-07-04")], NOW);
    expect(totals.outstanding_cents).toBe(0);
    expect(totals.settled).toBe(true);
  });
});

describe("scheduledNotices", () => {
  it("fires per open installment per active template, at due date minus the offset", () => {
    const notices = scheduledNotices(engagement(), [], TEMPLATES, [], NOW);
    const seq4 = notices.filter((notice) => notice.seq === 4);
    // The paused template is not scheduled; the rest sort by fire date.
    expect(seq4.map((notice) => notice.template_id)).toEqual(["two-days", "one-day", "due-day"]);
    expect(seq4.find((notice) => notice.template_id === "two-days")).toMatchObject({
      fire_on: "2026-10-02",
      due_on: "2026-10-04",
      state: "due",
    });
    expect(seq4.find((notice) => notice.template_id === "due-day")?.state).toBe("scheduled");
    // A settled installment never reminds.
    expect(notices.some((notice) => notice.seq < 1)).toBe(false);
  });

  it("reads a recorded hand-off as sent and an unsent past window as missed", () => {
    const sends: NoticeSend[] = [
      { id: "s1", engagement_id: "eng-1", template_id: "two-days", seq: 4, sent_at: "2026-10-02T01:00:00Z", sent_by: "Sam Staff" },
    ];
    const notices = scheduledNotices(engagement({ first_due_on: "2026-08-04" }), [], TEMPLATES, sends, NOW);
    expect(notices.find((n) => n.template_id === "two-days" && n.seq === 4)?.state).toBe("sent");
    // seq 2 (2026-09-04) has long passed without a hand-off.
    expect(notices.find((n) => n.template_id === "two-days" && n.seq === 2)?.state).toBe("missed");
  });

  it("fills the {amount} / {date} / {member} tokens", () => {
    const body = renderNoticeMessage({ message: "Hello {member}, {amount} on {date}." }, { due_cents: 100_000, due_on: "2026-10-04" }, "Rosa Lim");
    expect(body).toContain("Rosa Lim");
    expect(body).toContain("₱1,000");
    expect(body).toContain("2026");
  });
});

describe("shiftDate", () => {
  it("steps whole days across a month boundary", () => {
    expect(shiftDate("2026-10-04", -2)).toBe("2026-10-02");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("the form intakes", () => {
  it("reads a valid plan, a service's calendar slot and a lot's coordinates", () => {
    const plan = readEngagementIntake(
      { kind: "plan", name: "Rosa Lim", item_name: "Silver 2", amount: "13440", mode: "monthly", installments: "12", first_due_on: "2026-06-27" },
      { today: "2026-10-03" },
    );
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.value).toMatchObject({ amount_cents: 1_344_000, installments: 12 });

    const service = readEngagementIntake(
      { kind: "service", name: "Nena", item_name: "Interment", amount: "5000", schedule: { on: "2026-10-05", resource_name: "Common chapel", time: "09:00" } },
      { today: "2026-10-03" },
    );
    expect(service.ok).toBe(true);
    if (service.ok) expect(service.value.schedule).toMatchObject({ on: "2026-10-05", resource_name: "Common chapel" });

    const lot = readEngagementIntake(
      { kind: "lot", name: "Ramon", item_name: "Condo-type", amount: "75000", mode: "monthly", installments: "60", first_due_on: "2026-01-05", lot: { lot_number: "7", section: "C" } },
      { today: "2026-10-03" },
    );
    expect(lot.ok).toBe(true);
    if (lot.ok) expect(lot.value.lot).toEqual({ lot_id: null, lot_number: "7", section: "C" });
  });

  it("refuses a nameless, amountless or slotless record with the field named", () => {
    const noName = readEngagementIntake({ kind: "plan", item_name: "Silver 2", amount: "1000" }, { today: "2026-10-03" });
    expect(noName.ok).toBe(false);
    if (!noName.ok) expect(noName.errors.name).toBeTruthy();

    const noAmount = readEngagementIntake({ kind: "plan", name: "Rosa", item_name: "Silver 2", amount: "abc" }, { today: "2026-10-03" });
    expect(noAmount.ok).toBe(false);
    if (!noAmount.ok) expect(noAmount.errors.amount).toBeTruthy();

    const noSlot = readEngagementIntake({ kind: "service", name: "Nena", item_name: "Interment", amount: "5000" }, { today: "2026-10-03" });
    expect(noSlot.ok).toBe(false);
    if (!noSlot.ok) expect(noSlot.errors.schedule_on).toBeTruthy();

    const productTerm = readEngagementIntake({ kind: "product", name: "Felipe", item_name: "Noble Half", amount: "800", mode: "monthly" }, { today: "2026-10-03" });
    expect(productTerm.ok).toBe(false);
    if (!productTerm.ok) expect(productTerm.errors.mode).toBeTruthy();
  });

  it("reads a payment and refuses a zero or malformed amount", () => {
    const ok = readPaymentIntake({ engagement_id: "eng-1", amount: "1120", paid_on: "2026-10-03" }, { today: "2026-10-03" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toMatchObject({ amount_cents: 112_000, paid_on: "2026-10-03" });
    expect(readPaymentIntake({ engagement_id: "eng-1", amount: "0" }, { today: "2026-10-03" }).ok).toBe(false);
    expect(readPaymentIntake({ engagement_id: "eng-1", amount: "-5" }, { today: "2026-10-03" }).ok).toBe(false);
  });

  it("reads a modular notice and bounds the offset", () => {
    const ok = readNoticeTemplateIntake({ label: "Two days before", days_before: "2", message: "Hello {member}" });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value.days_before).toBe(2);
    expect(readNoticeTemplateIntake({ label: "", days_before: 2, message: "x" }).ok).toBe(false);
    expect(readNoticeTemplateIntake({ label: "x", days_before: 500, message: "x" }).ok).toBe(false);
  });
});

describe("parsePesoAmount and nextReference", () => {
  it("parses whole/centavo pesos and rejects anything else", () => {
    expect(parsePesoAmount("1,344")).toBe(134_400);
    expect(parsePesoAmount("12.50")).toBe(1250);
    expect(parsePesoAmount(12)).toBe(1200);
    expect(parsePesoAmount("abc")).toBeNull();
    expect(parsePesoAmount("-1")).toBeNull();
  });

  it("allocates the next office reference per kind", () => {
    expect(nextReference("plan", 0, 2026)).toBe("VMP-2026-0001");
    expect(nextReference("service", 4, 2026)).toBe("SVC-2026-0005");
    expect(nextReference("lot", 2, 2026)).toBe("LOT-2026-0003");
  });
});

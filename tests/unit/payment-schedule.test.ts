import { describe, expect, it } from "vitest";
import {
  daysUntilDue,
  installmentDueDate,
  installmentOutstandingCents,
  monthsPerTerm,
  nextPaymentDue,
  parsePaymentSchedule,
  paymentDueNoticeBody,
  paymentDueNotices,
  paymentDueState,
  unpaidPaymentDues,
  type PaymentSchedule,
} from "@/lib/payment-schedule";

/**
 * The payment-due rules behind the client's minute of 2026-09-21, item 1.
 *
 * Pure and clock-explicit: every case passes its own `now`, and the relative dates below
 * are built FROM the run so the two-days-before boundary can never rot into a fixed
 * calendar accident.
 */

/** A yyyy-mm-dd calendar date `offset` days from today (UTC), relative to the run. */
function isoOffset(offset: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset);
  return new Date(base).toISOString().slice(0, 10);
}

function schedule(over: Partial<PaymentSchedule> = {}): PaymentSchedule {
  return {
    reference: "VM-PLAN-2026-0188",
    term: "monthly",
    first_due_on: "2026-01-31",
    installments: [
      { seq: 1, amount_cents: 1000000, paid_cents: 0 },
      { seq: 2, amount_cents: 1000000, paid_cents: 0 },
    ],
    ...over,
  };
}

describe("deriving a due date from the payment mode", () => {
  it("spaces the four modes by their own interval", () => {
    expect(monthsPerTerm("monthly")).toBe(1);
    expect(monthsPerTerm("quarterly")).toBe(3);
    expect(monthsPerTerm("semi")).toBe(6);
    expect(monthsPerTerm("annual")).toBe(12);

    // monthly, 31 January → February clamps to its last day, then March recovers the 31st
    expect(installmentDueDate("2026-01-31", "monthly", 1)).toBe("2026-01-31");
    expect(installmentDueDate("2026-01-31", "monthly", 2)).toBe("2026-02-28");
    expect(installmentDueDate("2026-01-31", "monthly", 3)).toBe("2026-03-31");
    expect(installmentDueDate("2026-01-31", "monthly", 4)).toBe("2026-04-30");

    expect(installmentDueDate("2026-01-15", "quarterly", 3)).toBe("2026-07-15");
    expect(installmentDueDate("2026-01-15", "semi", 2)).toBe("2026-07-15");
    expect(installmentDueDate("2026-01-15", "annual", 3)).toBe("2028-01-15");
  });
});

describe("the two-days-before boundary", () => {
  it("counts whole UTC days to the calendar due date", () => {
    const now = new Date("2026-09-25T23:30:00Z");
    expect(daysUntilDue("2026-09-27", now)).toBe(2);
    expect(daysUntilDue("2026-09-25", now)).toBe(0);
    expect(daysUntilDue("2026-09-24", now)).toBe(-1);
  });

  it("calls today through +2 days due soon, and a settled instalment paid", () => {
    expect(paymentDueState(1000, 2)).toBe("due_soon");
    expect(paymentDueState(1000, 1)).toBe("due_soon");
    expect(paymentDueState(1000, 0)).toBe("due_soon");
    expect(paymentDueState(1000, 3)).toBe("upcoming");
    expect(paymentDueState(1000, -1)).toBe("overdue");
    expect(paymentDueState(0, -5)).toBe("paid");
  });

  it("never owes a negative amount", () => {
    expect(installmentOutstandingCents({ seq: 1, amount_cents: 1000, paid_cents: 400 })).toBe(600);
    expect(installmentOutstandingCents({ seq: 1, amount_cents: 1000, paid_cents: 1000 })).toBe(0);
    expect(installmentOutstandingCents({ seq: 1, amount_cents: 1000, paid_cents: 1200 })).toBe(0);
  });
});

describe("the notification selection", () => {
  it("fires two days before a due date — and not a day later", () => {
    const dueSoon = schedule({ first_due_on: isoOffset(2), installments: [{ seq: 1, amount_cents: 1200000, paid_cents: 0 }] });
    const tooEarly = schedule({ first_due_on: isoOffset(3), installments: [{ seq: 1, amount_cents: 1200000, paid_cents: 0 }] });
    const now = new Date();

    const notices = paymentDueNotices(dueSoon, { client: "Cory Customer", now });
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      kind: "due_soon",
      client: "Cory Customer",
      reference: "VM-PLAN-2026-0188",
      seq: 1,
      amount_cents: 1200000,
      days_until_due: 2,
    });
    expect(paymentDueNotices(tooEarly, { client: "Cory Customer", now })).toHaveLength(0);
  });

  it("fires for an overdue instalment and says how late it is", () => {
    const overdue = schedule({ first_due_on: isoOffset(-5), installments: [{ seq: 1, amount_cents: 500000, paid_cents: 0 }] });
    const notices = paymentDueNotices(overdue, { client: "Cory Customer", now: new Date() });
    expect(notices).toHaveLength(1);
    expect(notices[0].kind).toBe("overdue");
    expect(notices[0].days_until_due).toBe(-5);
    expect(paymentDueNoticeBody(notices[0])).toMatch(/was due on/);
  });

  it("never reminds about a settled instalment or one further out", () => {
    const settled = schedule({
      first_due_on: isoOffset(-5),
      installments: [{ seq: 1, amount_cents: 500000, paid_cents: 500000 }],
    });
    expect(paymentDueNotices(settled, { client: "Cory Customer", now: new Date() })).toHaveLength(0);
  });

  it("orders the most overdue first", () => {
    const now = new Date();
    const overdue = schedule({
      first_due_on: isoOffset(-40),
      installments: [
        { seq: 1, amount_cents: 500000, paid_cents: 0 },
        { seq: 2, amount_cents: 500000, paid_cents: 0 },
      ],
    });
    const notices = paymentDueNotices(overdue, { client: "Cory Customer", now });
    expect(notices.map((notice) => notice.seq)).toEqual([1, 2]);
    expect(notices[0].days_until_due).toBeLessThan(notices[1].days_until_due);
  });
});

describe("the next open payment", () => {
  it("is the earliest instalment still carrying a balance, skipping the paid ones", () => {
    const plan = schedule({
      installments: [
        { seq: 1, amount_cents: 1000000, paid_cents: 1000000 },
        { seq: 2, amount_cents: 1000000, paid_cents: 0 },
        { seq: 3, amount_cents: 500000, paid_cents: 0 },
      ],
    });
    const due = nextPaymentDue(plan);
    expect(due?.seq).toBe(2);
    expect(due?.amount_cents).toBe(1000000);
  });

  it("is null when the whole plan is paid", () => {
    const plan = schedule({
      installments: [{ seq: 1, amount_cents: 1000000, paid_cents: 1000000 }],
    });
    expect(nextPaymentDue(plan)).toBeNull();
    expect(unpaidPaymentDues(plan, new Date())).toHaveLength(0);
  });
});

describe("the tolerant reader", () => {
  it("accepts a recorded plan and ignores extra fields", () => {
    const parsed = parsePaymentSchedule({
      reference: "VM-PLAN-2026-0188",
      term: "quarterly",
      first_due_on: "2026-07-27",
      extra: "ignored",
      installments: [{ seq: 1, amount_cents: 1000000, paid_cents: 200000, note: "x" }],
    });
    expect(parsed).toEqual({
      reference: "VM-PLAN-2026-0188",
      term: "quarterly",
      first_due_on: "2026-07-27",
      installments: [{ seq: 1, amount_cents: 1000000, paid_cents: 200000 }],
    });
  });

  it("returns null rather than a plausible half-schedule", () => {
    const base = {
      reference: "VM-PLAN-2026-0188",
      term: "monthly",
      first_due_on: "2026-07-27",
      installments: [{ seq: 1, amount_cents: 1000000, paid_cents: 0 }],
    };
    expect(parsePaymentSchedule(null)).toBeNull();
    expect(parsePaymentSchedule({ ...base, reference: "" })).toBeNull();
    expect(parsePaymentSchedule({ ...base, term: "weekly" })).toBeNull();
    expect(parsePaymentSchedule({ ...base, first_due_on: "27/07/2026" })).toBeNull();
    expect(parsePaymentSchedule({ ...base, installments: [] })).toBeNull();
    expect(
      parsePaymentSchedule({ ...base, installments: [{ seq: 1, amount_cents: 1000, paid_cents: 2000 }] }),
    ).toBeNull();
    // seq must be a contiguous 1..n window
    expect(
      parsePaymentSchedule({
        ...base,
        installments: [
          { seq: 1, amount_cents: 1000, paid_cents: 0 },
          { seq: 3, amount_cents: 1000, paid_cents: 0 },
        ],
      }),
    ).toBeNull();
    expect(
      parsePaymentSchedule({
        ...base,
        installments: [
          { seq: 1, amount_cents: 1000, paid_cents: 0 },
          { seq: 1, amount_cents: 1000, paid_cents: 0 },
        ],
      }),
    ).toBeNull();
  });
});

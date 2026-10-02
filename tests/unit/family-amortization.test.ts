import { describe, expect, it } from "vitest";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import {
  lotAmortization,
  planAmortization,
} from "@/lib/family/family-amortization";
import { parsePaymentSchedule } from "@/lib/payment-schedule";
import { LOT_PRICE_CATEGORIES } from "@/lib/villa-pricing";
import { LOT_TERM_LABEL } from "@/lib/monthly-pricing";

/**
 * The family amortization view (captain, 2026-10-02): the plan's recorded
 * schedule and the held lot's recorded six-year figures, derived in ONE place.
 *
 * These cases pin the arithmetic the brief asks for — the periodic amount, what
 * is paid, the remaining balance and periods, the next due date, and
 * `remaining = total − paid` — against the recorded fixture, and pin the honest
 * null when a record carries no schedule or the sheet does not price a section.
 */
const loved = (id: string) =>
  (snapshot as unknown as { loved_ones: Array<Record<string, unknown>> }).loved_ones.find(
    (one) => one.id === id,
  )!;

const NOW = new Date("2026-09-01T00:00:00Z");

describe("a plan's recorded amortization", () => {
  const schedule = parsePaymentSchedule(loved("ernesto-dela-cruz").payment_schedule)!;
  const plan = planAmortization(
    schedule,
    loved("ernesto-dela-cruz").plan_summary as never,
    NOW,
  )!;

  it("reads the recorded mode and term", () => {
    expect(plan.modeLabel).toBe("Monthly");
    expect(plan.termLabel).toBe("5 years");
    expect(plan.reference).toBe("VM-PLAN-2026-0188");
  });

  it("keeps remaining = total − paid, summed from the recorded periods", () => {
    const total = schedule.installments.reduce((sum, i) => sum + i.amount_cents, 0);
    const paid = schedule.installments.reduce((sum, i) => sum + i.paid_cents, 0);
    const remaining = schedule.installments.reduce(
      (sum, i) => sum + Math.max(0, i.amount_cents - i.paid_cents),
      0,
    );
    expect(total).toBe(4200000);
    expect(paid).toBe(2000000);
    expect(remaining).toBe(2200000);
    expect(plan.totalLabel).toBe("₱42,000");
    expect(plan.paidLabel).toBe("₱20,000");
    expect(plan.remainingLabel).toBe("₱22,000");
  });

  it("counts the paid and remaining periods and finds the next due date", () => {
    expect(plan.periodsTotal).toBe(4);
    expect(plan.periodsPaid).toBe(2);
    expect(plan.periodsRemaining).toBe(2);
    // 27 July + two months — derived, never stored a second time.
    expect(plan.nextDueLabel).toBe("27 September 2026");
  });

  it("carries one row per period with its amount, status and remaining", () => {
    expect(plan.rows).toHaveLength(4);
    expect(plan.rows.map((row) => row.periodLabel)).toEqual([
      "Period 1 of 4",
      "Period 2 of 4",
      "Period 3 of 4",
      "Period 4 of 4",
    ]);
    expect(plan.rows[0]).toMatchObject({
      dueLabel: "27 July 2026",
      amount: "₱10,000",
      status: "Paid",
      remaining: "₱0",
      paid: true,
    });
    // The third recorded period is ₱12,000 and still open.
    expect(plan.rows[2]).toMatchObject({
      dueLabel: "27 September 2026",
      amount: "₱12,000",
      status: "Upcoming",
      remaining: "₱12,000",
      paid: false,
    });
    for (const row of plan.rows) {
      expect(row.paid).toBe(row.remaining === "₱0");
    }
  });

  it("labels a non-uniform amount as the next payment, not every payment", () => {
    expect(plan.amountLabel).toBe("Next payment");
    expect(plan.amount).toBe("₱12,000");
  });

  it("shows a uniform schedule as period amount × periods = total", () => {
    const aurora = parsePaymentSchedule(loved("aurora-dela-cruz").payment_schedule)!;
    const p = planAmortization(
      aurora,
      loved("aurora-dela-cruz").plan_summary as never,
      NOW,
    )!;
    expect(p.amountLabel).toBe("Each payment");
    expect(p.amount).toBe("₱8,505");
    // ₱8,505 × 4 periods = ₱34,020 total, exactly as recorded.
    expect(p.periodsTotal).toBe(4);
    expect(p.totalLabel).toBe("₱34,020");
    expect(p.remainingLabel).toBe("₱17,010");
    expect(p.periodsPaid).toBe(2);
    expect(p.periodsRemaining).toBe(2);
  });

  it("returns null when the record carries no readable schedule", () => {
    expect(
      planAmortization(undefined, loved("ernesto-dela-cruz").plan_summary as never, NOW),
    ).toBeNull();
  });
});

describe("a held lot's recorded six-year amortization", () => {
  it("resolves the lot's section to the sheet's family and both printed columns", () => {
    const a = lotAmortization({ section: "A" }, LOT_PRICE_CATEGORIES)!;
    expect(a.family).toBe("Prime Lots");
    expect(a.termLabel).toBe(LOT_TERM_LABEL);
    expect(a.termMonths).toBe(72);
    expect(a.regularMonthly).toBe("₱1,920");
    expect(a.seniorMonthly).toBe("₱1,688");
    expect(a.totalLabel).toBe("₱128,000");

    const b = lotAmortization({ section: "B" }, LOT_PRICE_CATEGORIES)!;
    expect(b.family).toBe("Premium Lots");
    expect(b.regularMonthly).toBe("₱1,710");
    expect(b.seniorMonthly).toBe("₱1,498");
  });

  it("stays honest for a section the sheet does not price", () => {
    expect(lotAmortization({ section: "Z" }, LOT_PRICE_CATEGORIES)).toBeNull();
    expect(lotAmortization({ section: "" }, LOT_PRICE_CATEGORIES)).toBeNull();
    expect(lotAmortization({ section: "A" }, [])).toBeNull();
  });
});

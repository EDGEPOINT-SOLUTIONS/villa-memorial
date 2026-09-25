import { describe, expect, it } from "vitest";
import {
  alertDueDate,
  buildPaymentAlerts,
  paymentAlertWindowDays,
  type PaymentAlertSource,
} from "@/lib/payment-alerts";
import { PAYMENT_DUE_SOON_DAYS } from "@/lib/payment-schedule";

/**
 * The staff dashboard's alert selection. The rule itself belongs to
 * `lib/payment-schedule.ts` (the family-notification lane); this pins that the
 * dashboard COMPOSES it rather than forking it — the boundary is exercised with
 * dates built relative to the run, so the calendar cannot rot.
 */

function isoOffset(offset: number, now = new Date()): string {
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset);
  return new Date(base).toISOString().slice(0, 10);
}

function source(
  partial: Partial<PaymentAlertSource> & { days: number },
): PaymentAlertSource {
  const { days, ...rest } = partial;
  return {
    id: rest.id ?? `inv-${days}`,
    reference: rest.reference ?? `INV-${days}`,
    client: rest.client ?? "Test Client",
    amount_cents: rest.amount_cents ?? 100_000,
    due_at: rest.due_at ?? `${isoOffset(days)}T08:00:00Z`,
  };
}

describe("the due-soon boundary is the shared two-day rule", () => {
  it("flags today, tomorrow and +2 days as due soon", () => {
    const summary = buildPaymentAlerts(
      [source({ days: 0 }), source({ days: 1 }), source({ days: 2 })],
      new Date(),
    );
    expect(PAYMENT_DUE_SOON_DAYS).toBe(2);
    expect(summary.due_soon_count).toBe(3);
    expect(summary.due_soon.map((a) => a.days_until_due)).toEqual([0, 1, 2]);
    expect(summary.due_soon.every((a) => a.state === "due_soon")).toBe(true);
    expect(summary.due_soon.every((a) => a.state_label === "Due soon")).toBe(true);
  });

  it("excludes the day after the window", () => {
    const summary = buildPaymentAlerts([source({ days: PAYMENT_DUE_SOON_DAYS + 1 })], new Date());
    expect(summary.total).toBe(0);
    expect(summary.due_soon_count).toBe(0);
  });

  it("classifies a past due date as overdue with how late it is", () => {
    const summary = buildPaymentAlerts([source({ days: -5 })], new Date());
    expect(summary.overdue_count).toBe(1);
    expect(summary.overdue[0].state).toBe("overdue");
    expect(summary.overdue[0].state_label).toBe("Overdue");
    expect(summary.overdue[0].countdown).toBe("overdue by 5 days");
  });

  it("names the same window the headline prints", () => {
    expect(paymentAlertWindowDays()).toBe(PAYMENT_DUE_SOON_DAYS);
  });
});

describe("what never alerts", () => {
  it("drops a settled payment even when its date has passed", () => {
    const summary = buildPaymentAlerts([source({ days: -10, amount_cents: 0 })], new Date());
    expect(summary.total).toBe(0);
  });

  it("drops a record with no trustworthy due date", () => {
    const summary = buildPaymentAlerts(
      [source({ days: 1, due_at: "not-a-date" }), source({ days: 1, due_at: "" })],
      new Date(),
    );
    expect(summary.total).toBe(0);
  });
});

describe("the split, counts and money", () => {
  it("separates overdue from due soon and totals each", () => {
    const summary = buildPaymentAlerts(
      [
        source({ id: "a", days: -2, amount_cents: 200_000 }),
        source({ id: "b", days: -1, amount_cents: 50_000 }),
        source({ id: "c", days: 2, amount_cents: 120_000 }),
        source({ id: "d", days: 3, amount_cents: 999_999 }),
      ],
      new Date(),
    );

    expect(summary.total).toBe(3);
    expect(summary.overdue_count).toBe(2);
    expect(summary.due_soon_count).toBe(1);
    expect(summary.overdue_cents).toBe(250_000);
    expect(summary.due_soon_cents).toBe(120_000);
    expect(summary.due_soon[0].amount_label).toBe("₱1,200");
  });

  it("orders overdue most-late first and due-soon nearest first", () => {
    const summary = buildPaymentAlerts(
      [source({ id: "late", days: -9 }), source({ id: "later", days: -2 })],
      new Date(),
    );
    expect(summary.overdue.map((a) => a.id)).toEqual(["late", "later"]);

    const due = buildPaymentAlerts(
      [source({ id: "far", days: 2 }), source({ id: "near", days: 1 })],
      new Date(),
    );
    expect(due.due_soon.map((a) => a.id)).toEqual(["near", "far"]);
  });
});

describe("the due date is the record's own UTC calendar day", () => {
  it("reads an instant's UTC day", () => {
    expect(alertDueDate("2026-09-27T23:30:00Z")).toBe("2026-09-27");
  });

  it("returns an empty string for an unreadable instant", () => {
    expect(alertDueDate("nope")).toBe("");
  });
});

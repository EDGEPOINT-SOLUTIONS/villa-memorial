import { describe, expect, it } from "vitest";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import { familyLiveModeEnabled } from "@/lib/api-client/family";
import {
  installmentOutstandingCents,
  nextPaymentDue,
  nextPaymentDueLabel,
  parsePaymentSchedule,
} from "@/lib/payment-schedule";

/**
 * Family snapshot is PROVISIONAL (no frozen family API contract yet — dev-authored).
 * This test pins its shape so a future contract freeze starts from a known record,
 * and reminds readers that live mode must stay off until then.
 */
describe("family snapshot fixture", () => {
  it("is fixture-only until the family API contract freezes", () => {
    expect(familyLiveModeEnabled()).toBe(false);
  });

  it("carries the display-level fields the portal renders", () => {
    const s = snapshot as {
      family: { display_name: string; email: string };
      loved_one: { name: string; life_dates: string };
      plan_summary: { plan_name: string; status: string };
      balance: { total: string; paid: string; remaining: string };
      recent_documents: Array<{ title: string; status: string }>;
    };
    expect(s.family.display_name).toBeTruthy();
    expect(s.family.email).toBe("customer@vm.demo");
    expect(s.loved_one.name).toBeTruthy();
    expect(s.plan_summary.plan_name).toBeTruthy();
    expect(s.balance.total).toMatch(/^₱/);
    expect(Array.isArray(s.recent_documents)).toBe(true);
  });

  it("carries integer minor units that agree with the display strings", () => {
    // Views never parse a display price (repo money rule), so the fixture carries
    // both forms; this test is the one place allowed to parse, purely to pin them
    // together. If they ever drift, one of the two is wrong.
    const s = snapshot as unknown as {
      balance: { total: string; paid: string; remaining: string };
      balance_cents: { total: number; paid: number; remaining: number };
    };
    const toCents = (display: string): number =>
      Math.round(Number(display.replace(/[^0-9]/g, "")) * 100);
    expect(s.balance_cents.total).toBe(toCents(s.balance.total));
    expect(s.balance_cents.paid).toBe(toCents(s.balance.paid));
    expect(s.balance_cents.remaining).toBe(toCents(s.balance.remaining));
    expect(s.balance_cents.remaining).toBe(s.balance_cents.total - s.balance_cents.paid);
    for (const value of Object.values(s.balance_cents)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("records its own provisional provenance in the file", () => {
    const s = snapshot as unknown as { _provenance?: { status?: string; note?: string } };
    expect(s._provenance?.status ?? "").toMatch(/PROVISIONAL/);
    expect(s._provenance?.note ?? "").toMatch(/balance_cents/);
    expect(s._provenance?.note ?? "").toMatch(/payment_schedule/);
  });

  it("carries a payment schedule whose open instalments equal the recorded balance", () => {
    // The schedule and the balance are two readings of one debt; if they ever drift,
    // the family sees two different truths. The fixture is the one place allowed to
    // add them up (views never parse or re-derive a display amount).
    const s = snapshot as unknown as {
      payment_schedule: unknown;
      balance_cents: { total: number; paid: number; remaining: number };
    };
    const schedule = parsePaymentSchedule(s.payment_schedule);
    expect(schedule).not.toBeNull();
    if (!schedule) return;
    const total = schedule.installments.reduce((sum, i) => sum + i.amount_cents, 0);
    const paid = schedule.installments.reduce((sum, i) => sum + i.paid_cents, 0);
    const remaining = schedule.installments.reduce(
      (sum, i) => sum + installmentOutstandingCents(i),
      0,
    );
    expect(total).toBe(s.balance_cents.total);
    expect(paid).toBe(s.balance_cents.paid);
    expect(remaining).toBe(s.balance_cents.remaining);
  });

  it("keeps the plan's next-due line equal to the schedule's earliest open instalment", () => {
    // plan_summary.next_due is display copy, but it must not describe a different
    // instalment from the one the schedule derives — the family would read two dates.
    const s = snapshot as unknown as {
      payment_schedule: unknown;
      plan_summary: { next_due: string };
    };
    const schedule = parsePaymentSchedule(s.payment_schedule);
    expect(schedule).not.toBeNull();
    if (!schedule) return;
    const next = nextPaymentDue(schedule);
    expect(next).not.toBeNull();
    if (!next) return;
    expect(s.plan_summary.next_due).toBe(nextPaymentDueLabel(next));
  });

  it("classifies the family-owned papers so the portal never asks for a copy of them", async () => {
    // The contract and every official receipt are the family's own (kind); anything the
    // app cannot classify stays requestable (family.test in unit/family-documents pins
    // the projection that reads this).
    const { toFamilyDocument } = await import("@/lib/api-client/family");
    const s = snapshot as unknown as { recent_documents: unknown[] };
    const documents = s.recent_documents.map(toFamilyDocument);
    expect(documents.map((doc) => doc?.kind)).toEqual(["service_contract", "official_receipt"]);
    for (const doc of documents) {
      expect(doc).not.toBeNull();
    }
  });
});

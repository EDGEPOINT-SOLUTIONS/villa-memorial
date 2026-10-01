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
 * It is a HOUSEHOLD (captain, 2026-09-30): one account, many loved ones. This test pins
 * its shape so a future contract freeze starts from a known record, and reminds readers
 * that live mode must stay off until then.
 */
type LovedOne = {
  id: string;
  name: string;
  life_dates: string;
  plan_summary: { plan_name: string; status: string; term: string; next_due: string };
  balance: { total: string; paid: string; remaining: string };
  balance_cents?: { total: number; paid: number; remaining: number };
  payment_schedule?: unknown;
  recent_documents: Array<{ title: string; status: string; kind?: string }>;
};

const s = snapshot as unknown as {
  _provenance?: { status?: string; note?: string };
  family: { display_name: string; email: string; primary_contact: string };
  loved_ones: LovedOne[];
};

describe("family snapshot fixture", () => {
  it("is fixture-only until the family API contract freezes", () => {
    expect(familyLiveModeEnabled()).toBe(false);
  });

  it("is a household: one account, several loved ones, each with its own id", () => {
    expect(s.family.display_name).toBeTruthy();
    expect(s.family.email).toBe("customer@vm.demo");
    // The feature must be visible end to end: at least two loved ones.
    expect(s.loved_ones.length).toBeGreaterThanOrEqual(2);
    const ids = s.loved_ones.map((one) => one.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const one of s.loved_ones) {
      expect(one.id).toMatch(/^[a-z0-9-]+$/);
      expect(one.name).toBeTruthy();
      expect(one.life_dates).toMatch(/\d{4}/);
      expect(one.plan_summary.plan_name).toBeTruthy();
      expect(one.balance.total).toMatch(/^₱/);
      expect(Array.isArray(one.recent_documents)).toBe(true);
    }
  });

  it("carries integer minor units that agree with each loved one's display strings", () => {
    // Views never parse a display price (repo money rule), so the fixture carries
    // both forms; this test is the one place allowed to parse, purely to pin them
    // together. If they ever drift, one of the two is wrong.
    const toCents = (display: string): number =>
      Math.round(Number(display.replace(/[^0-9]/g, "")) * 100);
    for (const one of s.loved_ones) {
      const cents = one.balance_cents;
      expect(cents, `${one.id} has no balance_cents`).toBeTruthy();
      if (!cents) continue;
      expect(cents.total).toBe(toCents(one.balance.total));
      expect(cents.paid).toBe(toCents(one.balance.paid));
      expect(cents.remaining).toBe(toCents(one.balance.remaining));
      expect(cents.remaining).toBe(cents.total - cents.paid);
      for (const value of Object.values(cents)) {
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  it("gives each loved one a payment schedule whose open instalments equal their balance", () => {
    // The schedule and the balance are two readings of one debt; if they ever drift,
    // the family sees two different truths. The fixture is the one place allowed to
    // add them up (views never parse or re-derive a display amount).
    for (const one of s.loved_ones) {
      const cents = one.balance_cents;
      const schedule = parsePaymentSchedule(one.payment_schedule);
      expect(schedule, `${one.id} has no valid schedule`).not.toBeNull();
      if (!schedule || !cents) continue;
      const total = schedule.installments.reduce((sum, i) => sum + i.amount_cents, 0);
      const paid = schedule.installments.reduce((sum, i) => sum + i.paid_cents, 0);
      const remaining = schedule.installments.reduce(
        (sum, i) => sum + installmentOutstandingCents(i),
        0,
      );
      expect(total).toBe(cents.total);
      expect(paid).toBe(cents.paid);
      expect(remaining).toBe(cents.remaining);
    }
  });

  it("keeps each plan's next-due line equal to the schedule's earliest open instalment", () => {
    // plan_summary.next_due is display copy, but it must not describe a different
    // instalment from the one the schedule derives — the family would read two dates.
    for (const one of s.loved_ones) {
      const schedule = parsePaymentSchedule(one.payment_schedule);
      expect(schedule).not.toBeNull();
      if (!schedule) continue;
      const next = nextPaymentDue(schedule);
      expect(next).not.toBeNull();
      if (!next) continue;
      expect(one.plan_summary.next_due).toBe(nextPaymentDueLabel(next));
    }
  });

  it("records its own provisional provenance in the file, household shape included", () => {
    const provenance = s._provenance;
    expect(provenance?.status ?? "").toMatch(/PROVISIONAL/);
    expect(provenance?.note ?? "").toMatch(/balance_cents/);
    expect(provenance?.note ?? "").toMatch(/payment_schedule/);
    expect(provenance?.note ?? "").toMatch(/loved_ones/);
  });

  it("classifies each loved one's family-owned papers so the portal never asks for a copy", async () => {
    // The contract and every official receipt are the family's own (kind); anything the
    // app cannot classify stays requestable (unit/family-documents pins the projection
    // that reads this).
    const { toFamilyDocument } = await import("@/lib/api-client/family");
    for (const one of s.loved_ones) {
      const documents = one.recent_documents.map(toFamilyDocument);
      expect(documents.every((doc) => doc !== null)).toBe(true);
      const kinds = documents.map((doc) => doc?.kind);
      expect(kinds).toContain("service_contract");
      expect(kinds).toContain("official_receipt");
      for (const kind of kinds) {
        expect(["service_contract", "official_receipt", "other"]).toContain(kind);
      }
      // Every recorded official receipt carries a number, a date and an amount, so
      // the family can open a real copy (the payments/AR projection's shape).
      for (const doc of documents) {
        if (doc?.kind !== "official_receipt") continue;
        expect(doc.reference, `${one.id} receipt number`).toBeTruthy();
        expect(doc.issued_on, `${one.id} receipt date`).toBeTruthy();
        expect(doc.amount, `${one.id} receipt amount`).toBeTruthy();
      }
    }
  });
});

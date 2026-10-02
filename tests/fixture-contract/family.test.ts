import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import { familyLiveModeEnabled, getFamilyHousehold, toFamilyDocument } from "@/lib/api-client/family";
import { addLovedOne } from "@/lib/api-client/family-household-store";

/**
 * The family snapshot is PROVISIONAL (no frozen family API contract yet). It starts
 * CLEAN (captain, 2026-10-02): the demo household and its loved ones are removed, so
 * the recorded snapshot carries NO loved ones and the family adds its own through the
 * household store. This test pins the clean state, the honest shape an added person
 * is served with, and that live mode stays off until the contract freezes.
 */
const s = snapshot as unknown as {
  _provenance?: { status?: string; note?: string };
  family: { display_name: string; email: string; primary_contact: string };
  loved_ones: unknown[];
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-family-contract-"));
  process.env.FAMILY_HOUSEHOLD_STORE_PATH = path.join(dir, "family-household.json");
});

afterEach(async () => {
  delete process.env.FAMILY_HOUSEHOLD_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("family snapshot fixture", () => {
  it("is fixture-only until the family API contract freezes", () => {
    expect(familyLiveModeEnabled()).toBe(false);
  });

  it("keeps the account identity and starts with no loved ones", () => {
    expect(s.family.display_name).toBeTruthy();
    expect(s.family.email).toBe("customer@vm.demo");
    expect(s.loved_ones).toEqual([]);
  });

  it("records its own provisional provenance, clean start included", () => {
    const provenance = s._provenance;
    expect(provenance?.status ?? "").toMatch(/PROVISIONAL/);
    expect(provenance?.note ?? "").toMatch(/CLEAN START/);
    expect(provenance?.note ?? "").toMatch(/loved_ones/);
  });

  it("serves an added loved one with only what the family typed, and zero money", async () => {
    await addLovedOne({ name: "Nena Bautista", life_dates: "1948 – 2026" });
    const household = await getFamilyHousehold();
    expect(household.people).toHaveLength(1);
    const person = household.people[0];
    expect(person.name).toBe("Nena Bautista");
    expect(person.life_dates).toBe("1948 – 2026");
    // No office record is invented: an empty plan, zero balance, no papers.
    expect(person.plan_summary.plan_name).toBe("");
    expect(person.balance_cents).toEqual({ total: 0, paid: 0, remaining: 0 });
    expect(person.recent_documents).toEqual([]);
    expect(person.lot).toBeNull();
    expect(person.requests).toEqual([]);
    expect(person.appointments).toEqual([]);
    expect(person.familyCase).toBeNull();
    expect(person.payment_schedule).toBeUndefined();
  });

  it("classifies any paper through the family-safe projection", () => {
    // The projection is the only reader of a document record; an unknown kind stays
    // requestable and a family-owned paper keeps its kind.
    expect(toFamilyDocument({ title: "Service contract", status: "Generated", kind: "service_contract" })?.kind).toBe(
      "service_contract",
    );
    expect(toFamilyDocument({ title: "Official receipt", status: "Sent", kind: "official_receipt" })?.kind).toBe(
      "official_receipt",
    );
    expect(toFamilyDocument({ title: "Death certificate", status: "pending", kind: "unknown" })?.kind).toBe("other");
    expect(toFamilyDocument({ title: "" })).toBeNull();
  });
});

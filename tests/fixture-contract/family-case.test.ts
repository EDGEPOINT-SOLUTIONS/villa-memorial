import { describe, expect, it } from "vitest";
import caseFixture from "@/lib/fixtures/family/case.json";

/**
 * The family case fixture is PROVISIONAL (no frozen family API contract yet).
 * It starts CLEAN (captain, 2026-10-02): the demo household's recorded
 * arrangements are removed, so `loved_ones` is empty and every loved one begins
 * in the honest “kept by our office” state. This test pins the clean state and
 * that the reader answers null rather than inventing a schedule.
 */
type CaseFile = {
  _provenance?: { status?: string; note?: string[] | string };
  tenant_id: string;
  loved_ones: unknown[];
};

const file = caseFixture as unknown as CaseFile;

describe("the family case fixture", () => {
  it("is fixture-only until the family API contract freezes, and says so", async () => {
    const { familyLiveModeEnabled } = await import("@/lib/api-client/family");
    expect(familyLiveModeEnabled()).toBe(false);
    const provenance = JSON.stringify(file._provenance ?? "");
    expect(provenance).toMatch(/PROVISIONAL/);
    expect(provenance).toMatch(/CLEAN START/);
  });

  it("starts with no recorded arrangements", () => {
    expect(file.loved_ones).toEqual([]);
  });

  it("carries no amount, no case number and no coordinator", () => {
    const body = JSON.stringify({ ...file, _provenance: undefined });
    expect(body).not.toMatch(/₱|PHP|cent|peso/i);
    expect(body).not.toMatch(/CASE-|case_number|coordinator/i);
    expect(body).not.toMatch(/ticket|TKT|#\d{3,}/i);
  });

  it("answers null for a loved one the record does not carry, never a guessed case", async () => {
    const { getFamilyCase } = await import("@/lib/api-client/family");
    expect(await getFamilyCase("ernesto-dela-cruz")).toBeNull();
    expect(await getFamilyCase()).toBeNull();
  });
});

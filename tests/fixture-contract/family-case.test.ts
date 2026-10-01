import { describe, expect, it } from "vitest";
import caseFixture from "@/lib/fixtures/family/case.json";
import workspace from "@/lib/fixtures/family/workspace.json";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import {
  familyCaseInstantLabel,
  FAMILY_CASE_STEPS,
  familyCaseRows,
} from "@/lib/family/family-case";

/**
 * The family case fixture is PROVISIONAL (no frozen family API contract yet —
 * dev-authored, exactly like `lib/fixtures/family/snapshot.json`). This test pins
 * the promises the arrangement panel rests on:
 *
 *   1. the five moments exist, in order, each with a recorded state;
 *   2. every fact cross-references a real recorded source (the office visit, the
 *      loved one, the lot/park) — nothing is invented;
 *   3. it carries no amount, no family-facing case number and no coordinator;
 *   4. its recorded instants render back to the design's own recorded labels.
 */
type CaseFile = {
  _provenance?: { status?: string; note?: string[] | string };
  tenant_id: string;
  case: {
    loved_one: string;
    steps: Array<{
      key: string;
      starts_at?: string;
      ends_at?: string;
      on?: string;
      place?: string;
      person?: string;
      note?: string;
      status: string;
    }>;
  };
};

const file = caseFixture as unknown as CaseFile;
const ws = workspace as unknown as {
  tenant_id: string;
  appointments: Array<{ id: string; starts_at: string; where: string }>;
};
const snap = snapshot as unknown as { tenant_id: string; loved_one: { name: string } };

describe("the family case fixture", () => {
  it("is fixture-only until the family API contract freezes, and says so", async () => {
    const { familyLiveModeEnabled } = await import("@/lib/api-client/family");
    expect(familyLiveModeEnabled()).toBe(false);
    const provenance = JSON.stringify(file._provenance ?? "");
    expect(provenance).toMatch(/PROVISIONAL/);
    expect(provenance).toMatch(/family API contract/);
  });

  it("records the five moments once each, in the chain's own order", () => {
    expect(file.case.steps.map((step) => step.key)).toEqual([
      "arrangement",
      "viewing",
      "funeral",
      "burial",
      "papers",
    ]);
    expect(FAMILY_CASE_STEPS.map((step) => step.key)).toEqual(file.case.steps.map((s) => s.key));
    for (const step of file.case.steps) {
      expect(step.status, `${step.key} status`).toMatch(/^(done|now|next|not_recorded)$/);
    }
  });

  it("names the same loved one and tenant as the family snapshot", () => {
    expect(file.tenant_id).toBe(snap.tenant_id);
    expect(file.tenant_id).toBe(ws.tenant_id);
    expect(file.case.loved_one).toBe(snap.loved_one.name);
  });

  it("anchors the arrangement to the office's own recorded visit", () => {
    const arrangement = file.case.steps.find((step) => step.key === "arrangement")!;
    const officeVisit = ws.appointments.find((appointment) => appointment.id === "appt-sat")!;
    expect(arrangement.starts_at).toBe(officeVisit.starts_at);
    expect(arrangement.place).toBe(officeVisit.where);
  });

  it("puts the burial at the lot and park the family's plan records", () => {
    const burial = file.case.steps.find((step) => step.key === "burial")!;
    expect(burial.place).toContain("Lawn A-01");
    const funeral = file.case.steps.find((step) => step.key === "funeral")!;
    expect(funeral.place).toContain("Sanctuario de Mercedes y Gloria");
  });

  it("carries no amount, no case number and no coordinator", () => {
    const body = JSON.stringify({ ...file, _provenance: undefined });
    expect(body).not.toMatch(/₱|PHP|cent|peso/i);
    expect(body).not.toMatch(/CASE-|case_number|coordinator/i);
    expect(body).not.toMatch(/ticket|TKT|#\d{3,}/i);
  });

  it("reproduces the design's own recorded labels from the instants", () => {
    // The one way a family screen prints an instant (Asia/Manila) must reproduce
    // the approved design sample's own words for the demo family.
    const viewing = file.case.steps.find((step) => step.key === "viewing")!;
    const funeral = file.case.steps.find((step) => step.key === "funeral")!;
    const burial = file.case.steps.find((step) => step.key === "burial")!;
    expect(familyCaseInstantLabel(funeral.starts_at!)).toBe(
      "Saturday 19 September · 10:00 AM",
    );
    expect(familyCaseInstantLabel(burial.starts_at!)).toBe(
      "Saturday 19 September · 11:30 AM",
    );
    expect(familyCaseInstantLabel(viewing.starts_at!)).toBe(
      "Wednesday 16 September · 9:00 AM",
    );
  });

  it("renders every step, with the papers step a calendar day and no time", async () => {
    const { getFamilyCase } = await import("@/lib/api-client/family");
    const familyCase = await getFamilyCase();
    expect(familyCase).not.toBeNull();
    if (!familyCase) return;
    const rows = familyCaseRows(familyCase);
    expect(rows).toHaveLength(5);
    const papers = rows.find((row) => row.key === "papers")!;
    expect(papers.when).toBe("19 September");
    expect(papers.stateLabel).toBe("Done");
    for (const row of rows) {
      expect(row.when.length, `${row.label} has a recorded time`).toBeGreaterThan(0);
    }
    // The four physical moments have a place; the papers step carries a note
    // instead, which is the honest shape of that record.
    for (const row of rows.filter((r) => r.key !== "papers")) {
      expect(row.place, `${row.label} has a place`).toBeTruthy();
    }
    expect(papers.note, "the papers step carries a note").toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import workspace from "@/lib/fixtures/family/workspace.json";

/**
 * The family workspace fixture is PROVISIONAL (no frozen family API contract yet).
 * It starts CLEAN (captain, 2026-10-02): the demo household's lots, requests and
 * appointments are removed, so `loved_ones` is empty and the `ask_for` taxonomy —
 * the office's vocabulary, not a record — is the fixture's only content. A
 * family-facing service records the per-person rows later; this test pins the
 * clean state and the vocabulary the composer still renders.
 */
type Workspace = {
  _provenance?: { status?: string; note?: string[] | string };
  ask_for: Array<{ key: string; label: string; detail: string }>;
  loved_ones: unknown[];
};

const ws = workspace as unknown as Workspace;

describe("the family workspace fixture", () => {
  it("is fixture-only until the family API contract freezes, and says so", async () => {
    const { familyLiveModeEnabled } = await import("@/lib/api-client/family");
    expect(familyLiveModeEnabled()).toBe(false);
    const provenance = JSON.stringify(ws._provenance ?? "");
    expect(provenance).toMatch(/PROVISIONAL/);
    expect(provenance).toMatch(/CLEAN START/);
  });

  it("starts with no recorded loved-one rows", () => {
    expect(ws.loved_ones).toEqual([]);
  });

  it("records no amount and no ticket number anywhere", () => {
    // Money lives in the family snapshot and lib/villa-pricing.ts; the request log is
    // the office's own, and the app issues no ticket number.
    const body = JSON.stringify({ ...ws, _provenance: undefined });
    expect(body).not.toMatch(/₱|PHP|cent|peso/i);
    expect(body).not.toMatch(/ticket|TKT|#\d{3,}/i);
  });

  it("covers the PRD's universal request taxonomy in the family's words", () => {
    // crm-cases.md:44 — lot concern · payment · maintenance · document request ·
    // transfer · interment · memorial update · chapel/funeral inquiry · other.
    expect(ws.ask_for.map((item) => item.key)).toEqual([
      "lot",
      "papers",
      "payment",
      "transfer",
      "interment",
      "memorial",
      "services",
      "other",
    ]);
    for (const item of ws.ask_for) {
      expect(item.label.length).toBeGreaterThan(3);
      expect(item.detail.length).toBeGreaterThan(10);
    }
  });
});

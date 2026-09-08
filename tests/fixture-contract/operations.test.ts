import { describe, expect, it } from "vitest";
import { getCase, listCases } from "@/lib/api-client/operations";
import casesFile from "@/lib/fixtures/operations/cases.json";

/**
 * Module H fixture-contract tests. NO frozen API exists yet (funeral-cases is
 * unbuilt), so these pin the UI demo data to the documented domain shapes
 * (docs/04-modules/crm-cases.md blueprint §11) so screens can't drift silently
 * from the spec vocabulary.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("operations fixtures follow the documented domain shapes", () => {
  it("cases carry stage + coordinator + task fields", async () => {
    const cases = await listCases();
    expect(cases.length).toBeGreaterThan(0);
    for (const c of cases) {
      expect(c.id).toMatch(UUID_RE);
      expect(c.case_number).toMatch(/^CASE-\d{4}-\d{4}$/);
      expect(c.deceased_name.length).toBeGreaterThan(0);
      expect([
        "inquiry",
        "retrieval",
        "preparation",
        "viewing",
        "ceremony",
        "interment",
        "completed",
      ]).toContain(c.stage);
      expect(c.assigned_coordinator.length).toBeGreaterThan(0);
      expect(Array.isArray(c.services)).toBe(true);
      expect(() => new Date(c.created_at).toISOString()).not.toThrow();
      expect(() => new Date(c.updated_at).toISOString()).not.toThrow();
      expect(Array.isArray(c.tasks)).toBe(true);
      for (const t of c.tasks) {
        expect(t.title.length).toBeGreaterThan(0);
        expect(["pending", "in_progress", "done"]).toContain(t.status);
      }
    }
    expect(casesFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("case by id returns a single record with tasks", async () => {
    const c = await getCase("00000000-0000-4000-8000-000000000C01");
    expect(c.case_number).toBe("CASE-2026-0001");
    expect(c.tasks.length).toBeGreaterThan(0);
  });

  it("unknown case id → not_found error", async () => {
    await expect(getCase("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("completed cases have all tasks done", async () => {
    const cases = await listCases();
    const completed = cases.filter((c) => c.stage === "completed");
    expect(completed.length).toBeGreaterThan(0);
    for (const c of completed) {
      for (const t of c.tasks) {
        expect(t.status).toBe("done");
      }
    }
  });
});

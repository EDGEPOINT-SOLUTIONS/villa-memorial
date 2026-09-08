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

  it("an uncaptured intake answers null, never an empty object", async () => {
    const cases = await listCases();
    const untouched = cases.find((c) => c.case_number === "CASE-2026-0002");
    expect(untouched).toBeDefined();
    expect(untouched!.intake).toBeNull();
  });

  it("seeded cases carry a full Service Contract header incl. the client-channel fields", async () => {
    const cases = await listCases();
    for (const caseNumber of ["CASE-2026-0001", "CASE-2026-0007"]) {
      const kase = cases.find((c) => c.case_number === caseNumber);
      expect(kase).toBeDefined();
      const intake = kase!.intake;
      expect(intake).not.toBeNull();
      expect(intake!.completed_at).not.toBeNull();
      expect(intake!.deceased_gender).toBeTruthy();
      expect(intake!.deceased_civil_status).toBeTruthy();
      expect(intake!.client_name).toBeTruthy();
      expect(intake!.client_gender).toBeTruthy();
      expect(intake!.client_civil_status).toBeTruthy();
      expect(intake!.client_address).toBeTruthy();
      expect(intake!.client_contact).toBeTruthy();
      // Facebook may legitimately be blank (a family with none); the field still exists.
      expect("client_facebook" in intake!).toBe(true);
      expect("client_email" in intake!).toBe(true);
      expect(intake!.client_relationship).toBeTruthy();
      expect(intake!.client_id_presented).toBeTruthy();
      expect(intake!.client_id_number).toBeTruthy();
    }
  });

  it("reads a no-order case (intake precedes checkout) with intake but no price lines", async () => {
    const kase = await getCase("00000000-0000-4000-8000-000000000C07");
    expect(kase.linked_order_number).toBeNull();
    expect(kase.services).toEqual([]);
    expect(kase.intake?.contract_date).toBe("2026-08-28");
  });
});

import { describe, expect, it } from "vitest";
import { getCase, listCases } from "@/lib/api-client/operations";
import casesFile from "@/lib/fixtures/operations/cases.json";

/**
 * Module H fixture-contract tests. NO frozen API exists yet (funeral-cases is
 * unbuilt). The fixture starts CLEAN (captain, 2026-10-02): the recorded demo
 * cases are removed, so the board, the case list and the case detail pages begin
 * empty and a case is created by the office — including "Send to case" on an
 * enquiry (POST /api/inquiries/:id/to-case). These assertions pin that clean
 * state and the shape the screen still requires of any case it reads.
 *
 * The recorded demo cases are kept for test-only page coverage in
 * tests/fixtures/operations-cases-demo.json.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("operations fixture starts clean", () => {
  it("carries no recorded cases", async () => {
    const cases = await listCases();
    expect(cases).toEqual([]);
    expect(casesFile.tenant_id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("the tenant id and shape vocabulary are unchanged", () => {
    expect(UUID_RE.test(casesFile.tenant_id)).toBe(true);
    expect(Array.isArray(casesFile.cases)).toBe(true);
  });

  it("unknown case id → not_found error", async () => {
    await expect(getCase("00000000-0000-4000-8000-00000000dead")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });
});

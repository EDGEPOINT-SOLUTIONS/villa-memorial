import { describe, expect, it } from "vitest";
import snapshot from "@/lib/fixtures/family/snapshot.json";
import { familyLiveModeEnabled } from "@/lib/api-client/family";

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
});

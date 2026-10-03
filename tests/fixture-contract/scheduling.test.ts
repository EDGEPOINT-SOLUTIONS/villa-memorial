import { describe, expect, it } from "vitest";
import bookingsFile from "@/lib/fixtures/scheduling/bookings.json";
import resourcesFile from "@/lib/fixtures/scheduling/resources.json";

/**
 * Fixture↔contract tests: recorded fixtures must keep matching the REAL
 * scheduling-resources response shapes (`as_contract_json`, booking-events-v1
 * KEB-D3-03). If the upstream shape changes, these fail and the fixture must be
 * updated in the same PR chain.
 */

describe("scheduling fixtures mirror the live contract", () => {
  it("resources carry id, name, resource_type and capacity", () => {
    const resources = (resourcesFile as { resources: Array<Record<string, unknown>> }).resources;
    expect(resources.length).toBeGreaterThan(0);
    for (const r of resources) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.name).toBe("string");
      expect(typeof r.resource_type).toBe("string");
      expect(typeof r.capacity).toBe("number");
    }
    // Seeds ship at least one chapel (auto-booking rule needs one).
    expect(resources.some((r) => r.resource_type === "chapel")).toBe(true);
  });

  it("bookings start clean (captain, 2026-10-02)", () => {
    const bookings = (bookingsFile as { bookings: unknown[] }).bookings;
    expect(bookings).toEqual([]);
  });

  it("fixture resource ids referenced by bookings exist in the resources fixture", () => {
    const resources = (resourcesFile as { resources: Array<{ id: string }> }).resources;
    const ids = new Set(resources.map((r) => r.id));
    const bookings = (bookingsFile as { bookings: Array<{ resource_id: string }> }).bookings;
    for (const b of bookings) {
      expect(ids.has(b.resource_id)).toBe(true);
    }
  });
});

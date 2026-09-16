import { describe, expect, it } from "vitest";
import chapelAdminFile from "@/lib/fixtures/scheduling/chapel-admin.json";
import resourcesFile from "@/lib/fixtures/scheduling/resources.json";
import { CHAPEL_CLASS_RULES } from "@/lib/chapel-booking";
import { toChapelRecord } from "@/lib/api-client/chapel-store";

/**
 * Fixture↔fixture test for the APP-AUTHORED chapel administration seed
 * (lib/fixtures/scheduling/chapel-admin.json): the staff screen's editable chapel
 * list must keep pointing at real scheduling resources, and its PLACEHOLDER
 * classes must stay the same mapping lib/chapel-booking.ts carries as the
 * fallback — otherwise the storefront and the staff screen would classify the
 * same resource differently. No upstream contract exists for these records yet
 * (booking-events-v1 defers resource maintenance windows and has no resource
 * write endpoint), so this pins the two local sources together.
 */
describe("the chapel administration seed matches the scheduling fixtures", () => {
  const resources = (resourcesFile as { resources: Array<Record<string, unknown>> }).resources;
  const chapels = (chapelAdminFile as { chapels: unknown[] }).chapels.map(toChapelRecord);

  it("every seeded chapel is a seeded chapel resource", () => {
    for (const chapel of chapels) {
      const resource = resources.find((r) => r.id === chapel.id);
      expect(resource, `no scheduling resource ${chapel.id}`).toBeTruthy();
      expect(resource!.resource_type).toBe("chapel");
    }
  });

  it("classifies each seeded chapel the same way the fallback rules do", () => {
    for (const chapel of chapels) {
      const rule = CHAPEL_CLASS_RULES.find(
        (entry) => entry.match === chapel.id || entry.match === chapel.name,
      );
      expect(rule, `no CHAPEL_CLASS_RULES entry for ${chapel.name}`).toBeTruthy();
      expect(rule!.chapelClass).toBe(chapel.chapel_class);
    }
  });

  it("ships a valid record shape and leaves closures/booking states to the store", () => {
    const raw = chapelAdminFile as unknown as {
      blocks: unknown[];
      booking_states: unknown[];
    };
    expect(chapels.length).toBeGreaterThan(0);
    for (const chapel of chapels) {
      expect(["common", "private"]).toContain(chapel.chapel_class);
      expect(typeof chapel.active).toBe("boolean");
      expect(Number.isInteger(chapel.capacity)).toBe(true);
      expect(typeof chapel.name).toBe("string");
    }
    // The seed is the read-only starting point; closures and confirmations are
    // journal events (lib/api-client/chapel-store.ts), never hand-edited here.
    expect(raw.blocks).toEqual([]);
    expect(raw.booking_states).toEqual([]);
  });
});

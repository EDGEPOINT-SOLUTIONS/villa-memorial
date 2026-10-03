/* --- test-only demo fixtures (clean start, captain 2026-10-02/03) --- */
vi.mock("@/lib/fixtures/lifecycle/engagements.json", async () => ({
  default: (await import("../fixtures/lifecycle-engagements-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { composeCalendar } from "@/lib/calendar-day";
import { loadStaffCalendar } from "@/lib/api-client/staff-calendar";
import { getEngagement } from "@/lib/api-client/lifecycle-store";

/**
 * The service ↔ calendar sync (captain, 2026-10-03).
 *
 * A service's recorded slot is the SAME record the office calendar renders: the
 * day item names the client and the service, and its href opens the client's
 * service record. This is the link the register and the calendar share, so the
 * two can never tell different stories about the same booking.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-lifecycle-calendar-"));
  process.env.LIFECYCLE_STORE_PATH = path.join(dir, "commerce-lifecycle.json");
});

afterEach(async () => {
  delete process.env.LIFECYCLE_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

describe("composeCalendar with lifecycle services", () => {
  it("places the booked service on its day and links to the client's record", () => {
    const items = composeCalendar({
      services: [
        {
          id: "eng-service-0001",
          reference: "SVC-2026-0001",
          client: { name: "Nena Bautista" },
          item: { name: "Interment" },
          schedule: { on: "2026-10-05", time: "09:00", resource_name: "Common chapel", case_number: "C-2026-0042" },
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "service-eng-service-0001",
      date: "2026-10-05",
      time: "09:00",
      kind: "service",
      title: "Nena Bautista",
      href: "/staff/lifecycle/eng-service-0001",
    });
    expect(items[0].detail).toContain("Interment");
    expect(items[0].detail).toContain("Common chapel");
  });

  it("names the service kind in the shared label map", () => {
    const items = composeCalendar({
      services: [
        {
          id: "x",
          reference: "SVC",
          client: { name: "A" },
          item: { name: "B" },
          schedule: { on: "2026-10-05", time: "", resource_name: "R", case_number: null },
        },
      ],
    });
    expect(items[0].kind).toBe("service");
  });
});

describe("the office calendar reads the seeded services", () => {
  it("includes the three booked services and links each to its record", async () => {
    const { items, unreadable } = await loadStaffCalendar([
      "scheduling:read",
      "property:read",
      "billing:read",
    ]);
    const services = items.filter((item) => item.kind === "service");
    expect(services).toHaveLength(3);
    expect(unreadable).not.toContain("services");
    for (const item of services) {
      expect(item.href).toMatch(/^\/staff\/lifecycle\/eng-service-\d+$/);
    }
    // The link resolves to a real record.
    const first = services[0];
    const id = first.href?.split("/").pop() as string;
    expect(await getEngagement(id)).not.toBeNull();
  });
});

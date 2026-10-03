import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ApiError } from "@/lib/api-client/api-error";
import { createOrder } from "@/lib/api-client/commerce";
import { getChapelSchedule, reserveChapelStay } from "@/lib/api-client/chapel-reservations";
import {
  addChapelBlock,
  cancelChapelBooking,
  claimChapelBooking,
  confirmChapelBooking,
  getChapelAdminView,
  removeChapelBlock,
  saveChapel,
} from "@/lib/api-client/chapel-admin";
import { listResources } from "@/lib/api-client/scheduling";
import { chapelMonthView } from "@/lib/chapel-admin";
/* --- test-only demo fixtures (clean start, captain 2026-10-02) --- */
vi.mock("@/lib/fixtures/scheduling/bookings.json", async () => ({
  default: (await import("../fixtures/scheduling-bookings-demo.json")).default,
}));
vi.mock("@/lib/fixtures/commerce/orders.json", async () => ({
  default: (await import("../fixtures/orders-demo.json")).default,
}));
/* --- end test-only demo fixtures --- */


/**
 * Staff chapel administration (Schedule → chapels / availability / bookings):
 * the durable-store behaviour that makes the screen real, exercised through the
 * same server orchestration the BFF routes call.
 *
 * The headline promises the task ships:
 *  · a closure entered here removes the dates from the CUSTOMER booking step;
 *  · cancelling a booking frees the dates again and records the operator's reason;
 *  · confirming turns a storefront cart hold into a confirmed stay;
 *  · a placed order can claim its hold only when it actually carries the stay.
 *
 * Every test points CHAPEL_STORE_PATH (and ORDERS_STORE_PATH for the checkout
 * claim) at its own throwaway file, so nothing touches the repo's .data store.
 */

const CHAPEL_A = "10000000-0000-4000-8000-0000000000c1"; // common
const CHAPEL_B = "10000000-0000-4000-8000-0000000000c2"; // private

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-chapel-admin-"));
  process.env.CHAPEL_STORE_PATH = path.join(dir, "chapels.json");
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
  // The fixture booking store is a module-global; empty it in place so a
  // booking a previous test created cannot leak into the next one.
  const mutated = (globalThis as { __imFixtureBookings?: unknown[] }).__imFixtureBookings;
  if (Array.isArray(mutated)) mutated.length = 0;
});

afterEach(async () => {
  delete process.env.CHAPEL_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

/** Await a promise that must refuse, and hand back the ApiError it raised. */
async function refusalOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw err;
  }
  throw new Error("expected the call to be refused");
}

describe("the chapel seed the staff screen starts from", () => {
  it("reads the park's two placeholder chapels with their sheet classes", async () => {
    const view = await getChapelAdminView();
    expect(view.chapels.map((c) => [c.name, c.chapel_class, c.active])).toEqual([
      ["Chapel A", "common", true],
      ["Chapel B", "private", true],
    ]);
    expect(view.blocks).toEqual([]);
  });

  it("blocks and unblocks a range for the customer step (the same store)", async () => {
    const before = await getChapelSchedule();
    expect(before.blockedDates).toEqual([]);

    const block = await addChapelBlock(
      { resource_id: CHAPEL_A, from: "2026-09-20", to: "2026-09-22", reason: "Repainting" },
      "Sam Staff",
    );

    // The storefront read sees every date of the closed range…
    const blocked = await getChapelSchedule();
    expect(
      blocked.blockedDates
        .filter((entry) => entry.resource_id === CHAPEL_A)
        .map((entry) => entry.date),
    ).toEqual(["2026-09-20", "2026-09-21", "2026-09-22"]);

    // …and a customer can no longer reserve a stay that touches them.
    const refused = await refusalOf(
      reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-09-21", days: 3 }),
    );
    expect(refused.status).toBe(409);
    expect(refused.message).toContain("blocked (maintenance)");

    // A range clear of the closure is still bookable.
    const held = await reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-09-25", days: 3 });
    expect(held.title).toContain("Chapel A");

    // Re-opening the range gives the dates straight back.
    await removeChapelBlock(block.id);
    expect((await getChapelSchedule()).blockedDates).toEqual([]);
    const rebooked = await reserveChapelStay({
      resourceId: CHAPEL_A,
      startDate: "2026-09-20",
      days: 3,
    });
    expect(rebooked.resource_id).toBe(CHAPEL_A);
  });

  it("refuses a closure that overlaps one already on the books", async () => {
    await addChapelBlock(
      { resource_id: CHAPEL_A, from: "2026-10-01", to: "2026-10-05", reason: "Private use" },
      "Sam Staff",
    );
    const clash = await refusalOf(
      addChapelBlock(
        { resource_id: CHAPEL_A, from: "2026-10-05", to: "2026-10-07", reason: "Repainting" },
        "Sam Staff",
      ),
    );
    expect(clash.status).toBe(422);
    expect(clash.message).toContain("Private use");
    // A different chapel is untouched by the first closure.
    await expect(
      addChapelBlock(
        { resource_id: CHAPEL_B, from: "2026-10-05", to: "2026-10-07", reason: "Repainting" },
        "Sam Staff",
      ),
    ).resolves.toMatchObject({ resource_id: CHAPEL_B });
  });

  it("refuses a closure for a chapel that is not on the books", async () => {
    const unknown = await refusalOf(
      addChapelBlock(
        { resource_id: "not-a-chapel", from: "2026-10-01", to: "2026-10-02", reason: "x" },
        "Sam Staff",
      ),
    );
    expect(unknown.status).toBe(404);
  });
});

describe("the chapel list is editable, not hard-coded", () => {
  it("adds a chapel the customer step can immediately book", async () => {
    const record = await saveChapel({
      name: "Chapel C",
      chapel_class: "private",
      capacity: 40,
      active: true,
      notes: "New annex",
    });
    expect(record.id).toMatch(/^app-chapel-/);

    const resources = await listResources();
    expect(resources.some((r) => r.id === record.id && r.name === "Chapel C")).toBe(true);

    const schedule = await getChapelSchedule();
    expect(schedule.chapels.filter((c) => c.chapel_class === "private").map((c) => c.name)).toEqual([
      "Chapel B",
      "Chapel C",
    ]);

    const held = await reserveChapelStay({
      resourceId: record.id,
      startDate: "2026-11-02",
      days: 4,
    });
    expect(held.resource_name).toBe("Chapel C");
  });

  it("keeps a rename, reclass and deactivation in the schedule it serves", async () => {
    const [chapelA] = (await getChapelAdminView()).chapels;
    await saveChapel({
      id: chapelA.id,
      name: "Chapel of the Resurrection",
      chapel_class: "private",
      capacity: 200,
      active: false,
      notes: "Renamed for the demo",
    });

    const schedule = await getChapelSchedule();
    const renamed = schedule.chapels.find((c) => c.id === CHAPEL_A);
    // Off the storefront: an inactive chapel leaves the customer schedule entirely.
    expect(renamed).toBeUndefined();
    expect(schedule.chapels.some((c) => c.chapel_class === "common")).toBe(false);

    // It stays on the park's books for the staff view, with its new facts.
    const view = await getChapelAdminView();
    const record = view.chapels.find((c) => c.id === CHAPEL_A)!;
    expect(record).toMatchObject({
      name: "Chapel of the Resurrection",
      chapel_class: "private",
      capacity: 200,
      active: false,
    });

    const refused = await refusalOf(
      reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-11-02", days: 3 }),
    );
    expect(refused.status).toBe(422);
    expect(refused.message).toContain("not in the park's schedule");
  });

  it("refuses a second chapel with the same name", async () => {
    const clash = await refusalOf(
      saveChapel({ name: "chapel a", chapel_class: "common", capacity: 1, active: true, notes: "" }),
    );
    expect(clash.status).toBe(422);
    expect(clash.message).toContain("Chapel A");
  });
});

describe("the operator's booking lifecycle", () => {
  it("shows a storefront stay as a cart hold until the office confirms it", async () => {
    const held = await reserveChapelStay({ resourceId: CHAPEL_B, startDate: "2026-11-10", days: 4 });

    const before = (await getChapelAdminView()).bookings.find((b) => b.id === held.id)!;
    expect(before.status).toBe("hold");
    expect(before.dates).toEqual(["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]);
    expect(before.by).toBeNull();

    const { state } = await confirmChapelBooking(held.id, "Sam Staff");
    expect(state.status).toBe("confirmed");
    expect(state.by).toBe("Sam Staff");

    const after = (await getChapelAdminView()).bookings.find((b) => b.id === held.id)!;
    expect(after.status).toBe("confirmed");
    // The dates stay taken for the customer either way.
    expect(
      (await refusalOf(reserveChapelStay({ resourceId: CHAPEL_B, startDate: "2026-11-10", days: 4 }))).status,
    ).toBe(409);
  });

  it("frees the dates on cancellation and records the reason", async () => {
    const held = await reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-11-20", days: 3 });

    const missingReason = await refusalOf(cancelChapelBooking(held.id, "   ", "Sam Staff"));
    expect(missingReason.status).toBe(422);
    expect(missingReason.message).toContain("why");

    const { booking, state } = await cancelChapelBooking(
      held.id,
      "Family moved the wake to another week",
      "Sam Staff",
    );
    expect(booking.status).toBe("cancelled");
    expect(state.reason).toBe("Family moved the wake to another week");

    const view = await getChapelAdminView();
    const row = view.bookings.find((b) => b.id === held.id)!;
    expect(row.status).toBe("cancelled");
    expect(row.reason).toBe("Family moved the wake to another week");
    expect(row.by).toBe("Sam Staff");
    // Cancelled stays leave the availability windows the grid reads.
    expect(view.availability.some((w) => w.id === held.id)).toBe(false);

    // The dates are bookable again — the customer step proves it.
    const rebooked = await reserveChapelStay({
      resourceId: CHAPEL_A,
      startDate: "2026-11-20",
      days: 3,
    });
    expect(rebooked.id).not.toBe(held.id);
  });

  it("refuses to cancel twice and to confirm a cancelled stay", async () => {
    const held = await reserveChapelStay({ resourceId: CHAPEL_A, startDate: "2026-12-01", days: 3 });
    await cancelChapelBooking(held.id, "Double booked", "Sam Staff");
    expect((await refusalOf(cancelChapelBooking(held.id, "again", "Sam Staff"))).status).toBe(422);
    expect((await refusalOf(confirmChapelBooking(held.id, "Sam Staff"))).status).toBe(422);
  });
});

describe("checkout claims the hold it paid for", () => {
  it("links the order to the stay and shows the customer to the office", async () => {
    const held = await reserveChapelStay({ resourceId: CHAPEL_B, startDate: "2026-12-10", days: 5 });
    const order = await createOrder({
      customer: { name: "Marites Santos", email: "marites@example.test", phone: "+63 900 000 0000" },
      items: [{ sku: "CHP-PRIVATE-DAY", quantity: 5 }],
    });

    const state = await claimChapelBooking({ bookingId: held.id, orderNumber: order.number });
    expect(state.order_number).toBe(order.number);

    const row = (await getChapelAdminView()).bookings.find((b) => b.id === held.id)!;
    expect(row.status).toBe("confirmed");
    expect(row.order).toEqual({ number: order.number, customer_name: "Marites Santos" });
    // Claiming twice with the same order is idempotent.
    await expect(
      claimChapelBooking({ bookingId: held.id, orderNumber: order.number }),
    ).resolves.toMatchObject({ order_number: order.number });
  });

  it("refuses a claim the order does not back", async () => {
    const held = await reserveChapelStay({ resourceId: CHAPEL_B, startDate: "2026-12-20", days: 4 });
    const order = await createOrder({
      customer: { name: "Test Buyer", email: "buyer@example.test", phone: "+63 900 000 0000" },
      items: [{ sku: "CHP-PRIVATE-DAY", quantity: 3 }],
    });

    const mismatched = await refusalOf(
      claimChapelBooking({ bookingId: held.id, orderNumber: order.number }),
    );
    expect(mismatched.status).toBe(422);
    expect(mismatched.message).toContain("does not match");

    const unknown = await refusalOf(
      claimChapelBooking({ bookingId: held.id, orderNumber: "ORD-2026-99999" }),
    );
    expect(unknown.status).toBe(404);
  });

  it("refuses to link an office-made booking to an order", async () => {
    // A staff booking (no online marker) is never claimable by the storefront.
    const office = await fetchWithoutServer();
    const state = await refusalOf(
      claimChapelBooking({ bookingId: office.id, orderNumber: "ORD-2026-00001" }),
    );
    expect(state.status).toBe(403);
  });
});

/**
 * A booking the office made by hand: created through the scheduling client the
 * staff New-booking form uses, with no online marker in its title.
 */
async function fetchWithoutServer(): Promise<{ id: string }> {
  const { createBooking } = await import("@/lib/api-client/scheduling");
  return createBooking({
    title: "Wake — Day 1",
    resource_id: CHAPEL_A,
    starts_at: "2027-01-05T09:00:00.000Z",
    ends_at: "2027-01-05T17:00:00.000Z",
    case_number: "CASE-2027-0001",
  });
}

describe("the availability month grid", () => {
  it("draws free, held, booked and closed days in whole Monday-first weeks", () => {
    const view = chapelMonthView({
      month: "2026-09",
      chapelName: "Chapel A",
      bookings: [
        {
          resource_id: CHAPEL_A,
          starts_at: "2026-09-10T00:00:00.000Z",
          ends_at: "2026-09-12T00:00:00.000Z",
          admin_status: "hold",
        },
        {
          resource_id: CHAPEL_A,
          starts_at: "2026-09-20T00:00:00.000Z",
          ends_at: "2026-09-21T00:00:00.000Z",
          admin_status: "confirmed",
        },
      ],
      blocks: [{ resource_id: CHAPEL_A, date: "2026-09-20" }],
    });

    const cells = view.weeks.flat();
    // September 2026 starts on a Tuesday, so the grid opens with Monday Aug 31.
    expect(cells[0].date).toBe("2026-08-31");
    expect(cells[0].inMonth).toBe(false);
    expect(view.weeks.every((week) => week.length === 7)).toBe(true);

    const byDate = new Map(cells.map((cell) => [cell.date, cell]));
    expect(byDate.get("2026-09-10")!.status).toBe("held");
    expect(byDate.get("2026-09-11")!.status).toBe("held");
    expect(byDate.get("2026-09-12")!.status).toBe("free");
    expect(byDate.get("2026-09-20")!.status).toBe("booked");
    // A closure and a booking on the same day: booked wins, the clash flag shows.
    expect(byDate.get("2026-09-20")).toMatchObject({ blocked: true, clash: true });
    expect(byDate.get("2026-09-25")!.label).toBe("Chapel A · free");
  });
});

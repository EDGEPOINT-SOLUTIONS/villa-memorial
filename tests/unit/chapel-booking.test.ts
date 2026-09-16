import { describe, expect, it } from "vitest";
import bookingsFile from "@/lib/fixtures/scheduling/bookings.json";
import resourcesFile from "@/lib/fixtures/scheduling/resources.json";
import type { Booking, Resource } from "@/lib/api-client/scheduling";
import { CHAPEL_RATES } from "@/lib/villa-pricing";
import {
  CHAPEL_CLASS_RULES,
  MIN_CHAPEL_DAYS,
  addDays,
  bookingToChapelLine,
  chapelBookingLineSummary,
  chapelBookingTitle,
  chapelClassOf,
  chapelDayStatus,
  chapelRefusalMessage,
  chapelRefusalStatus,
  chapelRequestPrice,
  chapelStayPrices,
  chapelsOf,
  checkChapelAvailability,
  eachDate,
  formatCalendarDate,
  formatChapelStayRange,
  isChapelDayCount,
  isOnlineChapelBooking,
  toChapelBookingLine,
} from "@/lib/chapel-booking";
import { releaseChapelCartLine } from "@/lib/chapel-booking-api";

/**
 * The chapel booking step's rule set — the tests the captain's brief asks for:
 * 3–9 day bounds, overlap refusal (bookings + blocked dates + no chapel free),
 * the price for an exact range (straight from the 2026 sheet), the cart line's
 * contents, and release on removal.
 *
 * The availability cases deliberately use the RECORDED scheduling fixture, so
 * the rules are exercised against the real seeded bookings: Chapel A carries a
 * confirmed 2026-09-10 09:00–17:00 booking ("Wake — Day 1").
 */
const RESOURCES = (resourcesFile as { resources: Resource[] }).resources;
const BOOKINGS = (bookingsFile as { bookings: Booking[] }).bookings;
const CHAPEL_A = RESOURCES.find((r) => r.name === "Chapel A")!;
const CHAPEL_B = RESOURCES.find((r) => r.name === "Chapel B")!;

describe("chapel classification config (PLACEHOLDER until the client confirms)", () => {
  it("points every configured rule at a seeded chapel and covers both sheet classes", () => {
    for (const rule of CHAPEL_CLASS_RULES) {
      const match = RESOURCES.find((r) => r.id === rule.match || r.name === rule.match);
      expect(match, `rule "${rule.match}"`).toBeDefined();
      expect(match!.resource_type).toBe("chapel");
    }
    expect(chapelClassOf(CHAPEL_A)).toBe("common");
    expect(chapelClassOf(CHAPEL_B)).toBe("private");
    expect(chapelClassOf(RESOURCES.find((r) => r.resource_type === "preparation_room")!)).toBeNull();
    expect(chapelsOf(RESOURCES, "common")).toHaveLength(1);
    expect(chapelsOf(RESOURCES, "private")).toHaveLength(1);
  });
});

describe("the 3–9 day stay bound", () => {
  it("accepts exactly 3–9 whole days and refuses everything else", () => {
    expect(isChapelDayCount(2)).toBe(false);
    expect(isChapelDayCount(10)).toBe(false);
    expect(isChapelDayCount(3.5)).toBe(false);
    expect(isChapelDayCount(MIN_CHAPEL_DAYS)).toBe(true);
    expect(isChapelDayCount(6)).toBe(true);
    expect(isChapelDayCount(9)).toBe(true);
  });

  it("refuses an out-of-range stay inside the full availability check", () => {
    for (const days of [2, 10]) {
      const result = checkChapelAvailability({
        resources: RESOURCES,
        bookings: BOOKINGS,
        chapelClass: "common",
        startDate: "2026-09-11",
        days,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.refusal.code).toBe("days_out_of_range");
        expect(chapelRefusalStatus(result.refusal)).toBe(422);
      }
    }
  });
});

describe("the price for an exact range is the client's sheet", () => {
  it("reads every class × day count straight from CHAPEL_RATES", () => {
    for (const row of CHAPEL_RATES) {
      expect(chapelStayPrices("common", row.days)).toEqual({
        perDay: row.common.ratePerDay,
        regular: row.common.regular,
        senior: row.common.senior,
      });
      expect(chapelStayPrices("private", row.days)).toEqual({
        perDay: row.private.ratePerDay,
        regular: row.private.regular,
        senior: row.private.senior,
      });
    }
    // The brief's own figures: common ₱1,500/day, private ₱3,500/day.
    expect(chapelStayPrices("common", 3)).toEqual({ perDay: 1500, regular: 4500, senior: 4320 });
    expect(chapelStayPrices("private", 9)).toEqual({
      perDay: 3500,
      regular: 31500,
      senior: 30240,
    });
  });

  it("prints the 3–9 day range in the request price facts", () => {
    const price = chapelRequestPrice("private", 5);
    expect(price).toContain("₱17,500 regular");
    expect(price).toContain("₱16,800 senior");
    expect(price).toContain("₱3,500 / day");
  });

  it("carries the sheet price into a successful check", () => {
    const result = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-11",
      days: 3,
      resourceId: CHAPEL_A.id,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prices.regular).toBe(4500);
      expect(result.startsAt).toBe("2026-09-11T00:00:00.000Z");
      expect(result.endsAt).toBe("2026-09-14T00:00:00.000Z");
      expect(result.endDate).toBe("2026-09-14");
      expect(result.resource.name).toBe("Chapel A");
    }
  });
});

describe("calendar-date arithmetic", () => {
  it("keeps days UTC-midnight based and end dates exclusive", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(eachDate("2026-09-20", 3)).toEqual(["2026-09-20", "2026-09-21", "2026-09-22"]);
  });

  it("never throws on a half-typed date input (the dialog clears its field)", () => {
    expect(addDays("", 1)).toBe("");
    expect(addDays("2026-09", 2)).toBe("");
    expect(eachDate("", 3)).toEqual([]);
    expect(eachDate("2026-09-20", 0)).toEqual([]);
    const result = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "",
      days: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal.code).toBe("invalid_start_date");
  });

  it("formats a stay as one readable range", () => {
    expect(formatChapelStayRange("2026-09-20", "2026-09-23")).toBe("Sep 20 – 22, 2026");
    expect(formatChapelStayRange("2026-09-30", "2026-10-03")).toBe(
      "Sep 30, 2026 → Oct 2, 2026",
    );
  });
});

describe("availability refuses an overlapping range with the reason", () => {
  it("accepts a range that clears the seeded booking, including the touch boundary", () => {
    // The seeded booking is 2026-09-10 09:00–17:00. A stay ending the morning
    // of the 10th does not touch it; one starting on the 11th clearly does not.
    const boundary = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-07",
      days: 3,
    });
    expect(boundary.ok).toBe(true);
    const after = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-11",
      days: 3,
    });
    expect(after.ok).toBe(true);
  });

  it("refuses a range that overlaps a confirmed booking and names the day", () => {
    const clash = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-10",
      days: 3,
      resourceId: CHAPEL_A.id,
    });
    expect(clash.ok).toBe(false);
    if (!clash.ok) {
      expect(clash.refusal.code).toBe("occupied");
      expect(chapelRefusalStatus(clash.refusal)).toBe(409);
      if (clash.refusal.code === "occupied") {
        expect(clash.refusal.dates).toEqual(["2026-09-10"]);
        expect(clash.refusal.alternatives).toEqual([]);
        expect(chapelRefusalMessage(clash.refusal)).toContain("already booked");
        expect(chapelRefusalMessage(clash.refusal)).toContain(
          formatCalendarDate("2026-09-10"),
        );
      }
    }
  });

  it("lists every conflicting day readably when a booking spans several", () => {
    const span: Booking = {
      ...BOOKINGS[0],
      id: "spanning-hold",
      starts_at: "2026-09-10T00:00:00.000Z",
      ends_at: "2026-09-12T00:00:00.000Z",
      status: "confirmed",
    };
    const result = checkChapelAvailability({
      resources: RESOURCES,
      bookings: [span],
      chapelClass: "common",
      startDate: "2026-09-09",
      days: 3,
      resourceId: CHAPEL_A.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.refusal.code === "occupied") {
      expect(result.refusal.dates).toEqual(["2026-09-10", "2026-09-11"]);
      expect(chapelRefusalMessage(result.refusal)).toContain(
        `${formatCalendarDate("2026-09-10")} and ${formatCalendarDate("2026-09-11")}`,
      );
    }
  });

  it("points at a free chapel of the same class when one exists", () => {
    // Two common chapels: the chosen one is busy, the other is not. The
    // config classifies by seeded name/id, so the second resource reuses the
    // configured name with its own id (the placeholder config's extension path
    // once the client confirms a real second chapel).
    const second: Resource = { ...CHAPEL_A, id: "second-common" };
    const result = checkChapelAvailability({
      resources: [...RESOURCES, second],
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-10",
      days: 3,
      resourceId: CHAPEL_A.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.refusal.code === "occupied") {
      expect(result.refusal.alternatives).toEqual([second.name]);
      expect(chapelRefusalMessage(result.refusal)).toContain("is free for this range");
    }
  });

  it("refuses a blocked date through the documented maintenance hook shape", () => {
    const result = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      blockedDates: [{ resource_id: CHAPEL_A.id, date: "2026-09-12" }],
      chapelClass: "common",
      startDate: "2026-09-11",
      days: 3,
      resourceId: CHAPEL_A.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.code).toBe("blocked");
      if (result.refusal.code === "blocked") {
        expect(result.refusal.dates).toEqual(["2026-09-12"]);
      }
      expect(chapelRefusalMessage(result.refusal)).toContain("maintenance");
    }
  });

  it("refuses when every chapel of the class is taken", () => {
    const result = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-09",
      days: 3,
      // No resourceId → the rule must find a free chapel and, finding none, say so.
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.refusal.code).toBe("no_chapel_free");
      expect(chapelRefusalStatus(result.refusal)).toBe(409);
      expect(chapelRefusalMessage(result.refusal)).toContain("Every common chapel");
    }
  });

  it("tells the panel when a chapel is not in the schedule (or none is configured)", () => {
    const unknown = checkChapelAvailability({
      resources: RESOURCES,
      bookings: BOOKINGS,
      chapelClass: "common",
      startDate: "2026-09-11",
      days: 3,
      resourceId: "not-a-chapel",
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.refusal.code).toBe("unknown_chapel");

    const none = checkChapelAvailability({
      resources: RESOURCES.filter((r) => r.id !== CHAPEL_B.id),
      bookings: BOOKINGS,
      chapelClass: "private",
      startDate: "2026-09-11",
      days: 3,
    });
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.refusal.code).toBe("no_chapel_configured");
  });

  it("ignores cancelled bookings when deciding availability", () => {
    const cancelled: Booking = {
      ...BOOKINGS[0],
      id: "cancelled-hold",
      resource_id: CHAPEL_A.id,
      starts_at: "2026-09-11T00:00:00.000Z",
      ends_at: "2026-09-14T00:00:00.000Z",
      status: "cancelled",
    };
    expect(chapelDayStatus(CHAPEL_A.id, "2026-09-12", [cancelled])).toBe("free");
    const result = checkChapelAvailability({
      resources: RESOURCES,
      bookings: [cancelled],
      chapelClass: "common",
      startDate: "2026-09-11",
      days: 3,
      resourceId: CHAPEL_A.id,
    });
    expect(result.ok).toBe(true);
  });
});

describe("the booking metadata a cart line carries", () => {
  const reservation = {
    id: "booking-42",
    resource_id: CHAPEL_A.id,
    resource_name: CHAPEL_A.name,
    starts_at: "2026-09-20T00:00:00.000Z",
    ends_at: "2026-09-23T00:00:00.000Z",
  };

  it("derives chapel, range and day count from the confirmed reservation", () => {
    const line = bookingToChapelLine(reservation, "common");
    expect(line).toEqual({
      bookingId: "booking-42",
      resourceId: CHAPEL_A.id,
      resourceName: "Chapel A",
      chapelClass: "common",
      startDate: "2026-09-20",
      endDate: "2026-09-23",
      days: 3,
    });
    expect(chapelBookingLineSummary(line)).toBe("Sep 20 – 22, 2026 · 3 days");
  });

  it("reads persisted metadata tolerantly and rejects malformed shapes", () => {
    const persisted = bookingToChapelLine(reservation, "common");
    expect(toChapelBookingLine(JSON.parse(JSON.stringify(persisted)))).toEqual(persisted);
    expect(toChapelBookingLine(null)).toBeNull();
    expect(toChapelBookingLine({ bookingId: "x" })).toBeNull();
    expect(
      toChapelBookingLine({ ...persisted, chapelClass: "royal" }),
    ).toBeNull();
    expect(toChapelBookingLine({ ...persisted, days: 2 })).toBeNull();
    expect(toChapelBookingLine({ ...persisted, startDate: "yesterday" })).toBeNull();
  });

  it("marks online holds so staff and the release guard can tell them apart", () => {
    const title = chapelBookingTitle("Chapel A", 3);
    expect(title).toBe("Online chapel booking — Chapel A, 3 days");
    expect(isOnlineChapelBooking(title)).toBe(true);
    expect(isOnlineChapelBooking("Wake — Day 1")).toBe(false);
  });
});

describe("removing a chapel cart line releases the dates", () => {
  const line = {
    booking: bookingToChapelLine(
      {
        id: "booking-9",
        resource_id: CHAPEL_A.id,
        resource_name: CHAPEL_A.name,
        starts_at: "2026-09-20T00:00:00.000Z",
        ends_at: "2026-09-23T00:00:00.000Z",
      },
      "common",
    ),
  };

  it("cancels the reservation before dropping the line", async () => {
    const released: string[] = [];
    const removed: string[] = [];
    const result = await releaseChapelCartLine(line, "chapel:booking-9", (k) => removed.push(k), async (id) => {
      released.push(id);
    });
    expect(released).toEqual(["booking-9"]);
    expect(removed).toEqual(["chapel:booking-9"]);
    expect(result).toEqual({ released: true, error: null });
  });

  it("still removes the line when the release call fails, and reports it", async () => {
    const removed: string[] = [];
    const result = await releaseChapelCartLine(line, "chapel:booking-9", (k) => removed.push(k), async () => {
      throw new Error("Could not reach the park schedule.");
    });
    expect(removed).toEqual(["chapel:booking-9"]);
    expect(result.released).toBe(false);
    expect(result.error).toBe("Could not reach the park schedule.");
  });

  it("does not call the schedule for an ordinary line", async () => {
    let called = false;
    const removed: string[] = [];
    const result = await releaseChapelCartLine({}, "PKG-BASIC", (k) => removed.push(k), async () => {
      called = true;
    });
    expect(called).toBe(false);
    expect(removed).toEqual(["PKG-BASIC"]);
    expect(result).toEqual({ released: false, error: null });
  });
});

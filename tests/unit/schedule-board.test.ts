import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/api-client/scheduling";
import {
  bookingDates,
  bookingStartDate,
  bookingTimeLabel,
  bookingWindowLabel,
  bookingsOnDay,
  conflictingBookings,
  nearestBookingDays,
  parkToday,
  scheduleDayLabel,
  timeRangeLabel,
} from "@/lib/schedule-board";

/**
 * The day board's pure rules (lib/schedule-board.ts). These pin the two
 * decisions the staff screen must never drift on:
 *  · a day is a UTC calendar date (booking windows are UTC instants; a chapel
 *    stay is a UTC-midnight window), and a multi-day booking appears on every
 *    day it covers, never only its first;
 *  · `conflicting` is the SERVICE's flag (booking-events-v1, flagged not
 *    blocked) — the board shows it for confirmed bookings and never recomputes
 *    an overlap of its own.
 * Instants print in the park's time (Asia/Manila), calendar dates in UTC.
 */

function booking(partial: Partial<Booking> = {}): Booking {
  return {
    id: "b-1",
    resource_id: "res-1",
    resource_name: "Chapel A",
    case_number: null,
    title: "Service",
    starts_at: "2026-09-10T09:00:00Z",
    ends_at: "2026-09-10T17:00:00Z",
    status: "confirmed",
    conflicting: false,
    ...partial,
  };
}

describe("the park's day and the calendar labels", () => {
  it("reads today in the park's time zone, not the server's", () => {
    expect(parkToday(new Date("2026-09-18T15:59:00Z"))).toBe("2026-09-18");
    expect(parkToday(new Date("2026-09-18T16:00:00Z"))).toBe("2026-09-19");
  });

  it("prints a day deterministically in UTC", () => {
    expect(scheduleDayLabel("2026-09-10")).toBe("Thursday, 10 September 2026");
    expect(scheduleDayLabel("not-a-date")).toBe("not-a-date");
  });

  it("prints a window in the park's own time", () => {
    expect(timeRangeLabel("2026-09-10T09:00:00Z", "2026-09-10T17:00:00Z")).toBe(
      "5:00 PM – 1:00 AM",
    );
    expect(timeRangeLabel("nope", "2026-09-10T17:00:00Z")).toBeNull();
  });
});

describe("a booking's days", () => {
  it("covers its UTC window with the end date exclusive", () => {
    const stay = booking({
      starts_at: "2026-09-20T00:00:00Z",
      ends_at: "2026-09-23T00:00:00Z",
    });
    expect(bookingDates(stay)).toEqual(["2026-09-20", "2026-09-21", "2026-09-22"]);
    expect(bookingStartDate(stay)).toBe("2026-09-20");
  });

  it("puts a multi-day booking on every day it covers, earliest first", () => {
    const stay = booking({
      id: "stay",
      starts_at: "2026-09-20T00:00:00Z",
      ends_at: "2026-09-23T00:00:00Z",
    });
    const later = booking({
      id: "later",
      starts_at: "2026-09-21T01:00:00Z",
      ends_at: "2026-09-21T03:00:00Z",
    });
    expect(bookingsOnDay([stay, later], "2026-09-21").map((b) => b.id)).toEqual([
      "stay",
      "later",
    ]);
    expect(bookingsOnDay([stay], "2026-09-23")).toEqual([]);
    expect(bookingsOnDay([stay], "2026-09-19")).toEqual([]);
  });

  it("names the stay day instead of printing midnight-to-midnight hours", () => {
    const stay = booking({
      starts_at: "2026-09-20T00:00:00Z",
      ends_at: "2026-09-23T00:00:00Z",
    });
    expect(bookingTimeLabel(stay, "2026-09-20")).toBe("Day 1 of 3");
    expect(bookingTimeLabel(stay, "2026-09-22")).toBe("Day 3 of 3");
    expect(bookingTimeLabel(booking(), "2026-09-10")).toBe("5:00 PM – 1:00 AM");
  });
});

describe("the service's overlap flag", () => {
  it("keeps only confirmed flagged bookings, earliest first", () => {
    const first = booking({ id: "a", conflicting: true });
    const cancelled = booking({
      id: "b",
      status: "cancelled",
      conflicting: true,
      starts_at: "2026-09-10T07:00:00Z",
    });
    const clean = booking({ id: "c", starts_at: "2026-09-10T06:00:00Z" });
    expect(conflictingBookings([first, cancelled, clean]).map((b) => b.id)).toEqual(["a"]);
  });

  it("reads a window as one line for the strip", () => {
    expect(bookingWindowLabel(booking())).toBe("Sep 10, 2026 · 5:00 PM – 1:00 AM");
    expect(
      bookingWindowLabel(
        booking({ starts_at: "2026-09-20T00:00:00Z", ends_at: "2026-09-23T00:00:00Z" }),
      ),
    ).toBe("Sep 20, 2026 → Sep 22, 2026");
  });
});

describe("nearest booked days", () => {
  const bookings = [
    booking({ id: "sep-10", starts_at: "2026-09-10T09:00:00Z", ends_at: "2026-09-10T17:00:00Z" }),
    booking({ id: "sep-20", starts_at: "2026-09-20T00:00:00Z", ends_at: "2026-09-23T00:00:00Z" }),
  ];

  it("finds the closest day on either side of an empty day", () => {
    expect(nearestBookingDays(bookings, "2026-09-15")).toEqual({
      previous: { date: "2026-09-10", count: 1 },
      next: { date: "2026-09-20", count: 1 },
    });
  });

  it("omits the side that has nothing, and never returns the selected day itself", () => {
    expect(nearestBookingDays(bookings, "2026-09-10")).toEqual({
      previous: null,
      next: { date: "2026-09-20", count: 1 },
    });
    expect(nearestBookingDays(bookings, "2026-09-25")).toEqual({
      previous: { date: "2026-09-22", count: 1 },
      next: null,
    });
    expect(nearestBookingDays([], "2026-09-15")).toEqual({ previous: null, next: null });
  });
});

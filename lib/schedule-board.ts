/**
 * Pure day-board logic for the staff Schedule screen (`/staff/schedule`).
 *
 * The board answers one question at a glance: what runs on this day, on which
 * resource, for which case — and which bookings the service has flagged as
 * overlapping. Everything here is deterministic and storage-free so the page,
 * the week matrix and the tests agree on what "on this day" means.
 *
 * Calendar dates are UTC days: booking windows are UTC instants (the frozen
 * booking-events-v1 contract), chapel stays are UTC-midnight windows, and the
 * chapel availability view already reads them through the same
 * `bookingCalendarDates` walk. Instants are PRINTED in the park's own time
 * (Asia/Manila), the same convention the family portal uses.
 *
 * The `conflicting` flag is the service's own: it marks a booking that overlaps
 * another CONFIRMED booking on the same resource (booking-events-v1, cut line
 * #3 — flagged, never blocked). The board displays the flag; it never recomputes
 * the service's rule.
 */
import { calendarDateOf, formatCalendarDate, isCalendarDate } from "@/lib/chapel-booking";
import { bookingCalendarDates } from "@/lib/chapel-admin";
import type { Booking } from "@/lib/api-client/scheduling";

/** The park's own time zone — a day and an instant are printed in it. */
export const SCHEDULE_TIME_ZONE = "Asia/Manila";

const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: SCHEDULE_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Today at the park, yyyy-mm-dd — SSR and the browser always agree on the day. */
export function parkToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SCHEDULE_TIME_ZONE }).format(now);
}

/** "Thursday, 10 September 2026" — a calendar date, printed in UTC so the
 *  reader's timezone can never shift a recorded day. */
export function scheduleDayLabel(date: string): string {
  if (!isCalendarDate(date)) return date;
  return DAY_FORMAT.format(new Date(`${date}T00:00:00Z`));
}

/** Every calendar date a booking covers (UTC walk; the end date is exclusive). */
export function bookingDates(booking: Booking): string[] {
  return bookingCalendarDates(booking.starts_at, booking.ends_at);
}

/** The booking's first calendar date. */
export function bookingStartDate(booking: Booking): string {
  const dates = bookingDates(booking);
  return dates[0] ?? calendarDateOf(booking.starts_at);
}

/** Bookings that touch `date`, earliest first. Cancelled bookings stay visible —
 *  their state is part of the day. */
export function bookingsOnDay(bookings: readonly Booking[], date: string): Booking[] {
  return bookings
    .filter((booking) => bookingDates(booking).includes(date))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/**
 * The service's overlap flag, read as staff needs it: a booking that overlaps
 * another CONFIRMED booking on the same resource. A cancelled booking's flag is
 * stale and never shown as a live warning.
 */
export function conflictingBookings(bookings: readonly Booking[]): Booking[] {
  return bookings
    .filter((booking) => booking.status === "confirmed" && booking.conflicting)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export type ScheduleDayRef = { date: string; count: number };

/** The nearest day with bookings on either side of `date` — the pointer an empty
 *  day renders so the screen never reads as "no bookings at all". */
export function nearestBookingDays(
  bookings: readonly Booking[],
  date: string,
): { previous: ScheduleDayRef | null; next: ScheduleDayRef | null } {
  const counts = new Map<string, number>();
  for (const booking of bookings) {
    for (const day of bookingDates(booking)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  let previous: ScheduleDayRef | null = null;
  let next: ScheduleDayRef | null = null;
  for (const [day, count] of counts) {
    if (day === date) continue;
    if (day < date) {
      if (!previous || day > previous.date) previous = { date: day, count };
    } else if (!next || day < next.date) {
      next = { date: day, count };
    }
  }
  return { previous, next };
}

/** "9:00 AM – 5:00 PM" in the park's time. Unusable instants yield null. */
export function timeRangeLabel(startsAt: string, endsAt: string): string | null {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return `${TIME_FORMAT.format(start)} – ${TIME_FORMAT.format(end)}`;
}

/**
 * The Time cell of one day's row. A same-day window prints its hours; a booking
 * that covers several days (a chapel stay) prints which day of the stay this is,
 * because "12:00 AM – 12:00 AM" is not what a stay means.
 */
export function bookingTimeLabel(booking: Booking, date: string): string {
  const dates = bookingDates(booking);
  if (dates.length > 1) {
    const index = dates.indexOf(date);
    if (index >= 0) return `Day ${index + 1} of ${dates.length}`;
  }
  return timeRangeLabel(booking.starts_at, booking.ends_at) ?? "—";
}

/** How a booking's whole window reads on the overlap strip: "10 September · 5:00 PM – 1:00 AM". */
export function bookingWindowLabel(booking: Booking): string {
  const dates = bookingDates(booking);
  const day = dates[0] ? formatCalendarDate(dates[0]) : "";
  if (dates.length > 1) {
    const last = dates[dates.length - 1];
    return day === last ? day : `${day} → ${formatCalendarDate(last)}`;
  }
  const time = timeRangeLabel(booking.starts_at, booking.ends_at);
  return time ? `${day} · ${time}` : day;
}

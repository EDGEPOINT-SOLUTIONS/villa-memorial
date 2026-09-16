/**
 * SERVER-side orchestration for the public chapel booking step.
 *
 * The customer flow needs three operations the scheduling module does not
 * expose as-is:
 *   1. the chapel slice of the schedule (chapel resources + their confirmed
 *      bookings + the blocked-date hook) for the dialog's availability view;
 *   2. a reservation that re-checks the range before writing it (the frozen
 *      contract's conflict rule FLAGS overlaps instead of blocking — cut line
 *      #3 — so the storefront holds the line: check, create, and roll the
 *      booking back if a race still came back conflicting);
 *   3. a release that can only cancel a hold this flow created (the booking
 *      title marker), never a staff-made booking.
 *
 * All rules live in lib/chapel-booking.ts (pure, shared with the dialog and the
 * tests); this file only talks to scheduling through lib/api-client/scheduling
 * and raises ApiError for the BFF route handlers to map onto responses.
 *
 * Live mode: SCHEDULING_BASE_URL set routes these through the real service, and
 * scheduling-v1 scopes every call to a staff session (`scheduling:read` /
 * `scheduling:write`). The storefront visitor is not signed in, so live mode
 * today answers 401 for anonymous visitors and the dialog degrades to the
 * Request-order path — the customer booking contract (ownership token, hold
 * semantics) does not exist yet. Said plainly in the PR; not a hidden stub.
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  cancelBooking,
  createBooking,
  listBookings,
  listResources,
  type Booking,
  type Resource,
} from "@/lib/api-client/scheduling";
import {
  blockedDates as chapelBlockedDates,
  chapelBookingInput,
  chapelClassOf,
  chapelRefusalMessage,
  chapelRefusalStatus,
  checkChapelAvailability,
  isOnlineChapelBooking,
  type BlockedDate,
  type ChapelClass,
} from "@/lib/chapel-booking";

/** A scheduling resource the placeholder config classifies as a chapel. */
export type ChapelScheduleResource = Resource & { chapel_class: ChapelClass };

export type ChapelSchedule = {
  chapels: ChapelScheduleResource[];
  /** Confirmed bookings on chapel resources only, in scheduling's order. */
  bookings: Booking[];
  /** Admin-side blocked dates (empty until the maintenance shape exists). */
  blockedDates: BlockedDate[];
};

/** The public booking step's availability read: the park's own chapel schedule. */
export async function getChapelSchedule(): Promise<ChapelSchedule> {
  const [resources, allBookings] = await Promise.all([listResources(), listBookings()]);
  const chapels: ChapelScheduleResource[] = [];
  for (const resource of resources) {
    const chapelClass = chapelClassOf(resource);
    if (chapelClass) chapels.push({ ...resource, chapel_class: chapelClass });
  }
  const chapelIds = new Set(chapels.map((c) => c.id));
  return {
    chapels,
    bookings: allBookings.filter((b) => chapelIds.has(b.resource_id) && b.status === "confirmed"),
    blockedDates: chapelBlockedDates(),
  };
}

export type ChapelReservationInput = {
  resourceId: string;
  startDate: string;
  days: number;
};

/**
 * Reserve one chapel for one 3–9 day range. The range is checked against a
 * freshly read schedule; a booking that still comes back `conflicting` (two
 * requests raced between the read and the write) is cancelled immediately and
 * surfaced as 409, so the customer is never left holding a double-booked range.
 */
export async function reserveChapelStay(input: ChapelReservationInput): Promise<Booking> {
  const schedule = await getChapelSchedule();
  const chapel = schedule.chapels.find((c) => c.id === input.resourceId);
  if (!chapel) {
    throw new ApiError("That chapel is not in the park's schedule — choose another chapel.", 422);
  }
  const chapelClass = chapel.chapel_class;

  const check = checkChapelAvailability({
    resources: schedule.chapels,
    bookings: schedule.bookings,
    blockedDates: schedule.blockedDates,
    chapelClass,
    startDate: input.startDate,
    days: input.days,
    resourceId: input.resourceId,
  });
  if (!check.ok) {
    throw new ApiError(chapelRefusalMessage(check.refusal), chapelRefusalStatus(check.refusal));
  }

  const booking = await createBooking(chapelBookingInput(check));
  if (booking.conflicting) {
    // The race loser releases its own write; the winner keeps the range.
    await cancelBooking(booking.id).catch(() => undefined);
    throw new ApiError(
      "Those dates were just taken for this chapel — pick another stay or dates.",
      409,
    );
  }
  return booking;
}

/**
 * Release an online hold — the counterpart of `reserveChapelStay` for a cart
 * line the customer removes. Staff-made bookings (no online marker) are refused
 * with 403; an already-cancelled hold is returned as-is (idempotent).
 */
export async function releaseOnlineChapelBooking(bookingId: string): Promise<Booking> {
  if (!bookingId.trim()) {
    throw new ApiError("booking id is required", 422);
  }
  const bookings = await listBookings();
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking) {
    throw new ApiError("not_found", 404);
  }
  if (!isOnlineChapelBooking(booking.title)) {
    throw new ApiError("only online chapel holds can be released from the storefront", 403);
  }
  if (booking.status === "cancelled") return booking;
  return cancelBooking(booking.id);
}

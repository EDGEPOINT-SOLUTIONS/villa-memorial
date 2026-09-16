/**
 * SERVER-side orchestration for the staff chapel screens (Schedule → chapels,
 * availability and bookings). The rules live in lib/chapel-admin.ts (pure) and in
 * the durable store lib/api-client/chapel-store.ts; this file is the only place
 * that combines them with the scheduling service, so the BFF route handlers stay
 * parse-and-map (web/AGENTS.md rule 1).
 *
 * Everything here writes through the store the CUSTOMER flow reads
 * (`getChapelSchedule` in lib/api-client/chapel-reservations.ts), which is why
 * an operator's edits land in the storefront immediately: same chapel records,
 * same closed dates, same scheduling bookings.
 *
 * LIVE MODE. booking-events-v1 (KEB-D3-03) exposes reads and booking create/
 * cancel only — no resource write endpoint and no maintenance-window shape — so
 * the chapel settings/closures/confirmation records have no upstream home. Live
 * mode therefore REFUSES those writes with 503 (`CHAPEL_ADMIN_NOT_WIRED`) rather
 * than pretending a contract exists; the reads (the chapel slice of the schedule)
 * still work, and the storefront's own reserve/release path is unchanged.
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  cancelBooking,
  listBookings,
  listResources,
  schedulingLiveModeEnabled,
  type Booking,
  type BookingStatus,
} from "@/lib/api-client/scheduling";
import {
  addChapelBlockRecord,
  listChapelRecords,
  loadChapelAdminState,
  removeChapelBlockRecord,
  saveChapelRecord,
  setChapelBookingStateRecord,
} from "@/lib/api-client/chapel-store";
import { CHAPEL_SKUS } from "@/lib/catalogue-skus";
import { listOrders } from "@/lib/api-client/commerce";
import {
  blockOverlapMessage,
  blocksOverlap,
  bookingCalendarDates,
  chapelBookingStatus,
  chapelClassOfResource,
  type ChapelBlock,
  type ChapelBlockDraft,
  type ChapelBookingState,
  type ChapelBookingStatus,
  type ChapelDraft,
  type ChapelRecord,
} from "@/lib/chapel-admin";
import { isOnlineChapelBooking } from "@/lib/chapel-booking";

export const CHAPEL_ADMIN_NOT_WIRED =
  "chapel setup is fixture-mode only: no upstream contract names resource settings, " +
  "maintenance closures or a booking confirmation record yet.";

/** Live mode has no chapel-admin write contract; refuse instead of inventing one. */
function refuseWhenLive(): void {
  if (schedulingLiveModeEnabled()) {
    throw new ApiError(CHAPEL_ADMIN_NOT_WIRED, 503);
  }
}

/* ------------------------------- the view -------------------------------- */

export type ChapelAdminOrderLink = { number: string; customer_name: string };

export type ChapelAdminBooking = {
  id: string;
  resource_id: string;
  resource_name: string;
  title: string;
  starts_at: string;
  ends_at: string;
  /** The frozen booking-events-v1 status — never rewritten app-side. */
  scheduling_status: BookingStatus;
  /** The operator's view: still in a cart, confirmed, or cancelled. */
  status: ChapelBookingStatus;
  case_number: string | null;
  conflicting: boolean;
  /** Why the dates were given back (cancellations only). */
  reason: string | null;
  /** Who confirmed/cancelled it, and when. */
  by: string | null;
  at: string | null;
  /** The placed order that claimed this hold, when checkout linked one. */
  order: ChapelAdminOrderLink | null;
  /** Every calendar date the booking covers (the availability view's input). */
  dates: string[];
};

export type ChapelAdminView = {
  /** Every chapel on the books, active or not (in fixture order). */
  chapels: ChapelRecord[];
  /** The closed ranges currently on the books, earliest first. */
  blocks: ChapelBlock[];
  /** Every booking against a chapel resource, earliest first, cancelled included. */
  bookings: ChapelAdminBooking[];
  /** The open (hold + confirmed) windows the month grid reads. */
  availability: Array<{
    id: string;
    resource_id: string;
    starts_at: string;
    ends_at: string;
    admin_status: ChapelBookingStatus;
  }>;
};

/** Order links, keyed by order number (absent in live mode — no admin order contract). */
async function orderLinks(): Promise<Map<string, ChapelAdminOrderLink>> {
  try {
    const orders = await listOrders();
    return new Map(
      orders.map((record) => [
        record.order.number,
        { number: record.order.number, customer_name: record.customer.name },
      ]),
    );
  } catch {
    return new Map();
  }
}

function toAdminBooking(
  booking: Booking,
  state: ChapelBookingState | undefined,
  links: Map<string, ChapelAdminOrderLink>,
): ChapelAdminBooking {
  return {
    id: booking.id,
    resource_id: booking.resource_id,
    resource_name: booking.resource_name,
    title: booking.title,
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    scheduling_status: booking.status,
    status: chapelBookingStatus(booking, state),
    case_number: booking.case_number,
    conflicting: booking.conflicting,
    reason: state?.reason ?? null,
    by: state?.by ?? null,
    at: state?.at ?? null,
    order: (state?.order_number && links.get(state.order_number)) || null,
    dates: bookingCalendarDates(booking.starts_at, booking.ends_at),
  };
}

/**
 * The whole staff view: chapels, closures and every chapel booking with its
 * operator status. Reads only — safe in live mode (the records just stay seed).
 */
export async function getChapelAdminView(): Promise<ChapelAdminView> {
  const [{ chapels, blocks, bookingStates }, resources, bookings, links] = await Promise.all([
    loadChapelAdminState(),
    listResources(),
    listBookings(),
    orderLinks(),
  ]);

  const chapelIds = new Set(chapels.map((chapel) => chapel.id));
  const isChapelBooking = (booking: Booking) =>
    chapelIds.has(booking.resource_id) ||
    resources.some(
      (resource) =>
        resource.id === booking.resource_id && chapelClassOfResource(resource, chapels) !== null,
    );

  const adminBookings = bookings
    .filter(isChapelBooking)
    .map((booking) => toAdminBooking(booking, bookingStates.get(booking.id), links))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return {
    chapels,
    blocks: [...blocks].sort((a, b) => a.from.localeCompare(b.from)),
    bookings: adminBookings,
    availability: adminBookings
      .filter((booking) => booking.status !== "cancelled")
      .map((booking) => ({
        id: booking.id,
        resource_id: booking.resource_id,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        admin_status: booking.status,
      })),
  };
}

/* ---------------------------- chapel settings ---------------------------- */

function chapelIdForNewRecord(name: string): string {
  // Fixture-mode resource id for a chapel the park adds. The service's ids are
  // uuids; ours is deliberately NOT one, so an app-created resource is obvious in
  // the fixture store and can never be mistaken for a service row (the tolerant
  // reader keeps `id` an opaque string).
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return `app-chapel-${slug || "chapel"}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Create or update one chapel. The name must be unique (the class mapping and
 * the storefront both match resources by name), and an update may not rename
 * itself onto another chapel.
 */
export async function saveChapel(draft: ChapelDraft): Promise<ChapelRecord> {
  refuseWhenLive();
  const { chapels } = await loadChapelAdminState();
  const existing = draft.id ? (chapels.find((c) => c.id === draft.id) ?? null) : null;
  if (draft.id && !existing) {
    throw new ApiError("not_found", 404);
  }
  const clash = chapels.find(
    (c) => c.name.toLowerCase() === draft.name.toLowerCase() && c.id !== existing?.id,
  );
  if (clash) {
    throw new ApiError(`Another chapel is already called "${clash.name}" — pick another name.`, 422);
  }
  const record: ChapelRecord = {
    id: existing?.id ?? chapelIdForNewRecord(draft.name),
    name: draft.name,
    chapel_class: draft.chapel_class,
    capacity: draft.capacity,
    active: draft.active,
    notes: draft.notes,
  };
  await saveChapelRecord(record);
  return record;
}

/* ------------------------------- closures -------------------------------- */

/** Close a date range for one chapel; overlapping closures are refused, not merged. */
export async function addChapelBlock(draft: ChapelBlockDraft, actor: string): Promise<ChapelBlock> {
  refuseWhenLive();
  const { chapels, blocks } = await loadChapelAdminState();
  if (!chapels.some((chapel) => chapel.id === draft.resource_id)) {
    throw new ApiError("That chapel is not on the park's books — refresh the schedule.", 404);
  }
  const overlap = blocks.find(
    (block) => block.resource_id === draft.resource_id && blocksOverlap(block, draft),
  );
  if (overlap) {
    throw new ApiError(blockOverlapMessage(draft, overlap.reason), 422);
  }
  const block: ChapelBlock = {
    id: `block-${crypto.randomUUID()}`,
    resource_id: draft.resource_id,
    from: draft.from,
    to: draft.to,
    reason: draft.reason,
    created_by: actor.trim() || "Staff",
    created_at: new Date().toISOString(),
  };
  return addChapelBlockRecord(block);
}

/** Re-open a closed range. Unknown ids answer 404 (the UI refreshes instead of lying). */
export async function removeChapelBlock(id: string): Promise<void> {
  refuseWhenLive();
  await removeChapelBlockRecord(id);
}

/* --------------------------- booking lifecycle ---------------------------- */

async function chapelBookingById(id: string): Promise<Booking> {
  const bookings = await listBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) throw new ApiError("not_found", 404);
  return booking;
}

/** The sheet class of the chapel a booking sits on (null when it is not a chapel). */
async function chapelClassForBooking(booking: Booking): Promise<"common" | "private" | null> {
  const [resources, records] = await Promise.all([listResources(), listChapelRecords()]);
  const resource = resources.find((r) => r.id === booking.resource_id);
  return resource
    ? chapelClassOfResource(resource, records)
    : (records.find((r) => r.id === booking.resource_id)?.chapel_class ?? null);
}

/**
 * The sheet class of the chapel a booking sits on, or null when the booking is
 * not against a chapel. The generic schedule mutations use this to decide which
 * rule set applies (a chapel cancellation needs a reason; a vehicle does not).
 */
export async function chapelClassOfBooking(bookingId: string): Promise<"common" | "private" | null> {
  return chapelClassForBooking(await chapelBookingById(bookingId));
}

/**
 * Confirm a booking, i.e. the office accepts a date range. This is what turns a
 * storefront cart hold into a confirmed stay in the admin view; a staff-made
 * booking is already confirmed and answering 200 keeps the action idempotent.
 */
export async function confirmChapelBooking(
  bookingId: string,
  actor: string,
): Promise<{ booking: Booking; state: ChapelBookingState }> {
  refuseWhenLive();
  const booking = await chapelBookingById(bookingId);
  if (booking.status === "cancelled") {
    throw new ApiError("That booking is cancelled — it cannot be confirmed.", 422);
  }
  if ((await chapelClassForBooking(booking)) === null) {
    throw new ApiError("That booking is not against a chapel.", 422);
  }
  const state = await setChapelBookingStateRecord({
    booking_id: booking.id,
    status: "confirmed",
    by: actor.trim() || "Staff",
    at: new Date().toISOString(),
  });
  return { booking, state };
}

/**
 * Cancel a booking: the frozen scheduling status flips first (that is what frees
 * the dates everywhere), then the operator's reason is recorded app-side — the
 * contract has no field for it (`POST /bookings/:id/cancel` carries no body).
 */
export async function cancelChapelBooking(
  bookingId: string,
  reason: string,
  actor: string,
): Promise<{ booking: Booking; state: ChapelBookingState }> {
  refuseWhenLive();
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new ApiError("Say why the booking is being cancelled.", 422);
  }
  const booking = await chapelBookingById(bookingId);
  if (booking.status === "cancelled") {
    throw new ApiError("That booking is already cancelled.", 422);
  }
  if ((await chapelClassForBooking(booking)) === null) {
    throw new ApiError("That booking is not against a chapel.", 422);
  }
  const cancelled = await cancelBooking(booking.id);
  const state = await setChapelBookingStateRecord({
    booking_id: booking.id,
    status: "cancelled",
    by: actor.trim() || "Staff",
    at: new Date().toISOString(),
    reason: trimmed,
  });
  return { booking: cancelled, state };
}

/**
 * The storefront's checkout claim: the customer placed the order, so the cart
 * hold becomes a confirmed booking carrying its order number (and, through the
 * order record, the customer). Called best-effort by the checkout page — a
 * failed claim leaves a normal hold for the office to confirm by hand.
 *
 * Guards: the booking must be an online storefront hold, the order must exist,
 * and the order must actually carry this chapel class's per-day line for exactly
 * this many days — a browser cannot link an unrelated order to a booking. (A
 * checkout that merged two same-class holds into one line therefore cannot claim
 * them automatically; they stay ordinary holds for the office, which is the safe
 * direction.)
 */
export async function claimChapelBooking(input: {
  bookingId: string;
  orderNumber: string;
}): Promise<ChapelBookingState> {
  refuseWhenLive();
  const orderNumber = input.orderNumber.trim();
  if (!orderNumber) throw new ApiError("order_number is required", 422);

  const [booking, orders] = await Promise.all([
    chapelBookingById(input.bookingId),
    listOrders().catch(() => [] as Awaited<ReturnType<typeof listOrders>>),
  ]);
  const order = orders.find((record) => record.order.number === orderNumber);
  if (!order) throw new ApiError("not_found", 404);
  if (order.lifecycle_status === "cancelled") {
    throw new ApiError("That order is cancelled.", 422);
  }
  if (booking.status === "cancelled") {
    throw new ApiError("That chapel stay is no longer held.", 422);
  }
  if (!isOnlineChapelBooking(booking.title)) {
    throw new ApiError("Only a storefront chapel hold can be linked to an order.", 403);
  }

  const chapelClass = await chapelClassForBooking(booking);
  if (chapelClass === null) {
    throw new ApiError("That booking is not against a chapel.", 422);
  }
  const line = order.order.items.find((item) => item.sku === CHAPEL_SKUS[chapelClass]);
  if (!line) {
    throw new ApiError("That order does not carry a chapel stay.", 422);
  }
  const days = bookingCalendarDates(booking.starts_at, booking.ends_at).length;
  if (line.quantity !== days) {
    throw new ApiError(
      `That order's chapel line does not match this stay (${line.quantity} vs ${days} days).`,
      422,
    );
  }

  const current = (await loadChapelAdminState()).bookingStates.get(booking.id);
  if (current?.order_number && current.order_number !== orderNumber) {
    throw new ApiError("That chapel stay is already linked to another order.", 409);
  }
  return setChapelBookingStateRecord({
    booking_id: booking.id,
    status: "confirmed",
    by: "Online checkout",
    at: new Date().toISOString(),
    order_number: orderNumber,
  });
}

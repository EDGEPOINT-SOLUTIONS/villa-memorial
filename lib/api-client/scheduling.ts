/**
 * Typed data access for the Schedule surface (Module H) — resources and bookings.
 *
 * Shapes mirror scheduling-resources' `as_contract_json` / the frozen
 * booking-events-v1 contract (KEB-D3-03): a booking is a reservation of a resource
 * for a window; `conflicting` flags overlap with another CONFIRMED booking on the
 * same resource (auto-blocking is a documented cut line — the calendar shows the
 * warning, staff decide).
 *
 * Live mode: SCHEDULING_BASE_URL set → requests hit `${SCHEDULING_BASE_URL}/scheduling/api/v1/...`
 * through the edge gateway with the staff session cookie. Unset → recorded fixtures,
 * with mutations (create/cancel) kept in a process-global store so the BFF route and
 * the re-rendered screen agree (same pattern as property's fixture lots).
 *
 * Create/cancel go through BFF route handlers (app/api/schedule/*) that check the
 * session + scope server-side before calling the functions below.
 */
import bookingsFile from "@/lib/fixtures/scheduling/bookings.json";
import resourcesFile from "@/lib/fixtures/scheduling/resources.json";
import { ApiError } from "@/lib/api-client/api-error";
import { listChapelRecords } from "@/lib/api-client/chapel-store";
import { mergeChapelResources } from "@/lib/chapel-admin";
import { getAuthedJson, itemsOf, postAuthedJson } from "@/lib/api-client/staff-fetch";

const BASE_URL = process.env.SCHEDULING_BASE_URL ?? "";

export function schedulingLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

export type Resource = {
  id: string;
  name: string;
  resource_type: string;
  capacity: number;
};

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  id: string;
  resource_id: string;
  resource_name: string;
  case_number: string | null;
  title: string;
  starts_at: string; // ISO8601 UTC
  ends_at: string; // ISO8601 UTC
  status: BookingStatus;
  conflicting: boolean;
};

/** Tolerant readers: extra upstream fields ignored, missing critical ones → 502. */
function toResource(raw: unknown): Resource {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed resource", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") {
    throw new ApiError("malformed resource", 502);
  }
  return {
    id: r.id,
    name: r.name,
    resource_type: String(r.resource_type ?? ""),
    capacity: Number(r.capacity ?? 0),
  };
}

function toBooking(raw: unknown): Booking {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed booking", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.resource_id !== "string" || typeof r.title !== "string") {
    throw new ApiError("malformed booking", 502);
  }
  return {
    id: r.id,
    resource_id: r.resource_id,
    resource_name: String(r.resource_name ?? ""),
    case_number: typeof r.case_number === "string" ? r.case_number : null,
    title: r.title,
    starts_at: String(r.starts_at ?? ""),
    ends_at: String(r.ends_at ?? ""),
    status: (r.status as BookingStatus) ?? "confirmed",
    conflicting: Boolean(r.conflicting),
  };
}

export async function listResources(): Promise<Resource[]> {
  if (schedulingLiveModeEnabled()) {
    const payload = await getAuthedJson(BASE_URL, "/scheduling/api/v1/resources");
    return itemsOf(payload).map(toResource);
  }
  const seed = (resourcesFile as { resources: unknown[] }).resources.map(toResource);
  // The park's own chapel records (staff-editable, durable store) overlay the
  // recorded resources: a renamed/re-capacitied chapel keeps the service id, and
  // a chapel added on /staff/schedule becomes a resource the storefront can book.
  return mergeChapelResources(seed, await listChapelRecords());
}

export async function listBookings(): Promise<Booking[]> {
  if (schedulingLiveModeEnabled()) {
    const payload = await getAuthedJson(BASE_URL, "/scheduling/api/v1/bookings");
    return itemsOf(payload).map(toBooking);
  }
  return fixtureBookings();
}

export type BookingInput = {
  title: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  case_number?: string;
};

/** Create a booking (fixture mode mirrors the server's conflict rule). */
export async function createBooking(input: BookingInput): Promise<Booking> {
  if (schedulingLiveModeEnabled()) {
    return toBooking(
      await postAuthedJson(BASE_URL, "/scheduling/api/v1/bookings", input),
    );
  }
  return fixtureCreateBooking(input);
}

export async function cancelBooking(id: string): Promise<Booking> {
  if (schedulingLiveModeEnabled()) {
    return toBooking(
      await postAuthedJson(
        BASE_URL,
        `/scheduling/api/v1/bookings/${encodeURIComponent(id)}/cancel`,
        {},
      ),
    );
  }
  return fixtureCancelBooking(id);
}

/* ----------------------------- fixture mode ----------------------------- */

// Next.js compiles route handlers into separate bundles, so demo mutations live on
// globalThis to stay visible from the BFF route AND the screen that re-renders after
// it (same reasoning as commerce's fixture order store / property's fixture lots).
type FixtureGlobal = typeof globalThis & { __imFixtureBookings?: Booking[] };
const fixtureGlobal = globalThis as FixtureGlobal;
const mutatedBookings = (fixtureGlobal.__imFixtureBookings ??= []);

function fixtureBookings(): Booking[] {
  const base = (bookingsFile as { bookings: Booking[] }).bookings;
  const byId = new Map<string, Booking>();
  for (const b of [...base, ...mutatedBookings]) byId.set(b.id, b);
  return [...byId.values()].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}

async function fixtureCreateBooking(input: BookingInput): Promise<Booking> {
  // Same resource list the screens read: seeds PLUS the chapels the park added on
  // /staff/schedule, so a chapel that was created in the app is bookable at once.
  const resources = await listResources();
  const resource = resources.find((r) => r.id === input.resource_id);
  if (!resource) {
    throw new ApiError("unknown resource", 422);
  }
  const start = new Date(input.starts_at);
  const end = new Date(input.ends_at);
  if (!(end > start)) {
    throw new ApiError("ends_at must be after starts_at", 422);
  }
  const booking: Booking = {
    id: `fixture-${crypto.randomUUID()}`,
    resource_id: resource.id,
    resource_name: resource.name,
    case_number: input.case_number?.trim() || null,
    title: input.title.trim(),
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: "confirmed",
    conflicting: fixtureBookings().some(
      (b) =>
        b.resource_id === resource.id &&
        b.status === "confirmed" &&
        start < new Date(b.ends_at) &&
        end > new Date(b.starts_at),
    ),
  };
  mutatedBookings.unshift(booking);
  return { ...booking };
}

function fixtureCancelBooking(id: string): Booking {
  const existing = fixtureBookings().find((b) => b.id === id);
  if (!existing) {
    throw new ApiError("not_found", 404);
  }
  if (existing.status !== "confirmed") {
    throw new ApiError(`booking is ${existing.status}, only confirmed bookings can be cancelled`, 422);
  }
  const updated: Booking = { ...existing, status: "cancelled" };
  const idx = mutatedBookings.findIndex((b) => b.id === id);
  if (idx >= 0) mutatedBookings[idx] = updated;
  else mutatedBookings.unshift(updated);
  return { ...updated };
}

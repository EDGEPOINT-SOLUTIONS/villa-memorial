/**
 * Browser side of the public chapel booking step: the dialog's three calls to
 * the BFF routes under `/api/chapel/*`. Reads the responses defensively (the
 * route payloads are reshaped upstream data, never trusted blindly) and throws
 * the shared ApiError with the BFF's own message so the dialog can show the
 * service's reason verbatim.
 *
 * Client-safe by construction: no service URLs, no tokens — the BFF owns both.
 */
import { ApiError } from "@/lib/api-client/api-error";
import type { BookingStatus } from "@/lib/api-client/scheduling";
import type { BlockedDate, ChapelBookingLine, ChapelClass } from "@/lib/chapel-booking";

export type ChapelScheduleChapel = {
  id: string;
  name: string;
  resource_type: string;
  capacity: number;
  chapel_class: ChapelClass;
};

export type ChapelScheduleBooking = {
  id: string;
  resource_id: string;
  resource_name: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  conflicting: boolean;
};

export type ChapelScheduleData = {
  chapels: ChapelScheduleChapel[];
  bookings: ChapelScheduleBooking[];
  blocked_dates: BlockedDate[];
};

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const message = (payload as { error: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

async function readJson(res: Response, fallback: string): Promise<unknown> {
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(errorMessage(payload, fallback), res.status);
  }
  return payload;
}

function toScheduleChapel(raw: unknown): ChapelScheduleChapel | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  const chapelClass = r.chapel_class;
  if (chapelClass !== "common" && chapelClass !== "private") return null;
  return {
    id: r.id,
    name: r.name,
    resource_type: String(r.resource_type ?? "chapel"),
    capacity: Number(r.capacity ?? 0),
    chapel_class: chapelClass,
  };
}

function toScheduleBooking(raw: unknown): ChapelScheduleBooking | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.resource_id !== "string") return null;
  if (typeof r.starts_at !== "string" || typeof r.ends_at !== "string") return null;
  return {
    id: r.id,
    resource_id: r.resource_id,
    resource_name: String(r.resource_name ?? ""),
    title: String(r.title ?? ""),
    starts_at: r.starts_at,
    ends_at: r.ends_at,
    status: r.status === "cancelled" ? "cancelled" : "confirmed",
    conflicting: Boolean(r.conflicting),
  };
}

/** The park's chapel schedule for the dialog (chapels, holds, blocked dates). */
export async function fetchChapelSchedule(): Promise<ChapelScheduleData> {
  let res: Response;
  try {
    res = await fetch("/api/chapel/schedule", { cache: "no-store" });
  } catch {
    throw new ApiError("Could not reach the park schedule.", 502);
  }
  const payload = await readJson(res, "The park schedule is unavailable right now.");
  const data = payload as { chapels?: unknown; bookings?: unknown; blocked_dates?: unknown };
  const chapels = (Array.isArray(data.chapels) ? data.chapels : [])
    .map(toScheduleChapel)
    .filter((c): c is ChapelScheduleChapel => c !== null);
  const bookings = (Array.isArray(data.bookings) ? data.bookings : [])
    .map(toScheduleBooking)
    .filter((b): b is ChapelScheduleBooking => b !== null);
  const blocked = Array.isArray(data.blocked_dates)
    ? data.blocked_dates.flatMap((raw): BlockedDate[] => {
        if (typeof raw !== "object" || raw === null) return [];
        const r = raw as Record<string, unknown>;
        if (typeof r.resource_id !== "string" || typeof r.date !== "string") return [];
        return [{ resource_id: r.resource_id, date: r.date }];
      })
    : [];
  return { chapels, bookings, blocked_dates: blocked };
}

/** Hold a chapel for a 3–9 day range; returns the confirmed reservation. */
export async function reserveChapelStay(input: {
  resourceId: string;
  startDate: string;
  days: number;
}): Promise<ChapelScheduleBooking> {
  let res: Response;
  try {
    res = await fetch("/api/chapel/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        resource_id: input.resourceId,
        start_date: input.startDate,
        days: input.days,
      }),
    });
  } catch {
    throw new ApiError("Could not reach the park schedule.", 502);
  }
  const payload = await readJson(res, "The dates could not be held.");
  const booking = toScheduleBooking(
    (payload as { booking?: unknown }).booking ?? payload,
  );
  if (!booking) {
    throw new ApiError("The park schedule answered with an unexpected booking shape.", 502);
  }
  return booking;
}

/** Give an online hold back to the schedule (the customer removed the line). */
export async function releaseChapelBooking(bookingId: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`/api/chapel/bookings/${encodeURIComponent(bookingId)}/release`, {
      method: "POST",
    });
  } catch {
    throw new ApiError("Could not reach the park schedule.", 502);
  }
  await readJson(res, "The chapel hold could not be released.");
}

/**
 * The cart's remove contract for a chapel line: release the hold, then drop the
 * line. If the release call fails the line still leaves the cart (nobody is
 * trapped with an unremovable line) and the error is returned so the cart page
 * can say plainly that the office must confirm the release. The `release`
 * parameter is injectable for unit tests.
 */
export async function releaseChapelCartLine(
  line: { booking?: ChapelBookingLine },
  key: string,
  remove: (key: string) => void,
  release: (bookingId: string) => Promise<unknown> = releaseChapelBooking,
): Promise<{ released: boolean; error: string | null }> {
  if (!line.booking) {
    remove(key);
    return { released: false, error: null };
  }
  try {
    await release(line.booking.bookingId);
    remove(key);
    return { released: true, error: null };
  } catch (err) {
    remove(key);
    return {
      released: false,
      error:
        err instanceof Error && err.message
          ? err.message
          : "The dates could not be released automatically — the office will confirm.",
    };
  }
}

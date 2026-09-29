/**
 * Chapel administration — the park's own side of chapel booking (staff Schedule).
 *
 * The customer flow (merged PR #26) reads ONE chapel schedule; this module owns
 * the rules the staff side of that same schedule obeys, so the screen, the BFF
 * routes, the durable store and the tests share them:
 *
 *  · which scheduling resource is a chapel, what class it sells as, whether it
 *    is active and what the park calls it (`ChapelRecord` — the editable
 *    PLACEHOLDER the client has not confirmed yet),
 *  · closed date ranges (`ChapelBlock` — maintenance / private use) and how they
 *    expand into the per-date blocks the availability rule reads,
 *  · the operator's booking lifecycle (`hold` → `confirmed`, `→ cancelled` with a
 *    reason) layered on top of the FROZEN scheduling record — booking-events-v1
 *    only knows confirmed|cancelled and the contract never names a hold,
 *  · the month grid (free / held / booked / blocked) the availability view renders.
 *
 * Pure by construction (no storage, no React): lib/api-client/chapel-store.ts
 * persists these records, lib/api-client/chapel-admin.ts orchestrates them, and
 * the customer dialog reads the same blocked dates through /api/chapel/schedule.
 */
import type { Resource } from "@/lib/api-client/scheduling";
import {
  CHAPEL_CLASS_LABEL,
  addDays,
  calendarDateOf,
  chapelClassOf,
  formatCalendarDate,
  isCalendarDate,
  isOnlineChapelBooking,
  type BlockedDate,
  type ChapelClass,
  type ChapelConfigLike,
} from "@/lib/chapel-booking";

/* ============================== chapel records ============================= */

/**
 * The park's own facts about one chapel. Keyed to a scheduling resource id where
 * one exists (a chapel added here is a fixture-mode resource too — see
 * lib/api-client/chapel-store.ts).
 */
export type ChapelRecord = {
  id: string;
  name: string;
  chapel_class: ChapelClass;
  capacity: number;
  /** Inactive chapels stay on the books (and on the calendar) but leave the storefront. */
  active: boolean;
  notes: string;
};

/**
 * The chapel record a scheduling resource belongs to: id first, then exact name
 * (the frozen fixture seeds "Chapel A"/"Chapel B", so a live service id the app
 * has not seen is still recognized by name).
 */
export function chapelRecordOf(
  resource: Pick<Resource, "id" | "name">,
  records: readonly ChapelRecord[],
): ChapelRecord | null {
  return (
    records.find((r) => r.id === resource.id) ??
    records.find((r) => r.name === resource.name) ??
    null
  );
}

/** Is this resource usable from the storefront? Unlisted resources stay active. */
export function chapelIsActive(
  resource: Pick<Resource, "id" | "name">,
  records: readonly ChapelRecord[],
): boolean {
  return chapelRecordOf(resource, records)?.active ?? true;
}

/** The class a resource sells as, read from the park's own records first. */
export function chapelClassOfResource(
  resource: Pick<Resource, "id" | "name">,
  records: readonly ChapelRecord[],
): ChapelClass | null {
  return (
    chapelRecordOf(resource, records)?.chapel_class ??
    chapelClassOf(resource, records as readonly ChapelConfigLike[])
  );
}

/** The scheduling-resource row a park-added chapel contributes (fixture mode). */
export function chapelResourceRow(record: ChapelRecord): Resource {
  return {
    id: record.id,
    name: record.name,
    resource_type: "chapel",
    capacity: record.capacity,
  };
}

/**
 * Merge the park's chapel records into the resources a service returned: a known
 * resource takes the park's name/capacity (staff edits land in the storefront);
 * a record the service does not list becomes a chapel resource of its own.
 */
export function mergeChapelResources(
  resources: Resource[],
  records: readonly ChapelRecord[],
): Resource[] {
  const seen = new Set<string>();
  const merged = resources.map((resource) => {
    const record = chapelRecordOf(resource, records);
    if (!record) return resource;
    seen.add(record.id);
    return { ...resource, name: record.name, capacity: record.capacity, resource_type: "chapel" };
  });
  const known = new Set(resources.map((r) => r.id));
  for (const record of records) {
    if (seen.has(record.id) || known.has(record.id)) continue;
    merged.push(chapelResourceRow(record));
  }
  return merged;
}

/* ------------------------------ validation -------------------------------- */

export const MAX_CHAPEL_NAME_LENGTH = 60;
export const MAX_CHAPEL_NOTES_LENGTH = 280;
export const MAX_CHAPEL_CAPACITY = 10_000;

export type ChapelDraft = {
  /** Absent → create; present → update that record (id is never editable). */
  id?: string;
  name: string;
  chapel_class: ChapelClass;
  capacity: number;
  active: boolean;
  notes: string;
};

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * Untrusted input → a chapel draft. The BFF route calls this before anything
 * touches the store; every message is written for the operator.
 */
export function parseChapelDraft(raw: unknown): Parsed<ChapelDraft> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid request" };
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) return { ok: false, error: "Give the chapel a name (at least 2 characters)." };
  if (name.length > MAX_CHAPEL_NAME_LENGTH) {
    return { ok: false, error: `Chapel names are at most ${MAX_CHAPEL_NAME_LENGTH} characters.` };
  }
  if (r.chapel_class !== "common" && r.chapel_class !== "private") {
    return { ok: false, error: "Choose the class this chapel sells as (common or private)." };
  }
  const capacity = Number(r.capacity ?? 0);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > MAX_CHAPEL_CAPACITY) {
    return { ok: false, error: "Capacity must be a whole number between 0 and 10,000." };
  }
  const notes = typeof r.notes === "string" ? r.notes.trim() : "";
  if (notes.length > MAX_CHAPEL_NOTES_LENGTH) {
    return { ok: false, error: `Notes are at most ${MAX_CHAPEL_NOTES_LENGTH} characters.` };
  }
  const id = typeof r.id === "string" ? r.id.trim() : "";
  if (id && !ID_RE.test(id)) return { ok: false, error: "invalid chapel id" };
  return {
    ok: true,
    value: {
      ...(id ? { id } : {}),
      name,
      chapel_class: r.chapel_class,
      capacity,
      active: r.active !== false,
      notes,
    },
  };
}

/** The 2026 sheets only price two classes, so the class is a closed set. */
export function chapelClassLabel(chapelClass: ChapelClass): string {
  return CHAPEL_CLASS_LABEL[chapelClass];
}

/* ============================== blocked ranges ============================= */

/**
 * An operator-entered closed range for one chapel (`from` and `to` inclusive —
 * the dates the customer must not be able to pick). No upstream shape exists
 * (booking-events-v1 defers resource maintenance windows), so this is the
 * app-authored record the durable store keeps.
 */
export type ChapelBlock = {
  id: string;
  resource_id: string;
  from: string;
  to: string;
  reason: string;
  created_by: string;
  created_at: string;
};

export type ChapelBlockDraft = {
  resource_id: string;
  from: string;
  to: string;
  reason: string;
};

/** A quarter — long enough for maintenance closures, short enough to spot a typo. */
export const MAX_CHAPEL_BLOCK_DAYS = 92;

export function parseChapelBlockDraft(raw: unknown): Parsed<ChapelBlockDraft> {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "invalid request" };
  const r = raw as Record<string, unknown>;
  const resourceId = typeof r.resource_id === "string" ? r.resource_id.trim() : "";
  if (!resourceId) return { ok: false, error: "Choose the chapel to block." };
  const from = typeof r.from === "string" ? r.from.trim() : "";
  const to = typeof r.to === "string" ? r.to.trim() : "";
  if (!isCalendarDate(from) || !isCalendarDate(to)) {
    return { ok: false, error: "Give the first and last day of the closure as calendar dates." };
  }
  if (to < from) return { ok: false, error: "The last day of the closure cannot be before the first." };
  const days = blockDates(from, to).length;
  if (days === 0) return { ok: false, error: "That closure is not a valid date range." };
  if (days > MAX_CHAPEL_BLOCK_DAYS) {
    return { ok: false, error: `A closure can run at most ${MAX_CHAPEL_BLOCK_DAYS} days.` };
  }
  const reason = typeof r.reason === "string" ? r.reason.trim() : "";
  if (!reason) {
    return { ok: false, error: "Say why the chapel is closed (maintenance, private use, …)." };
  }
  if (reason.length > 200) return { ok: false, error: "Keep the closure reason under 200 characters." };
  return { ok: true, value: { resource_id: resourceId, from, to, reason } };
}

/** Every calendar date of a closed range, inclusive (`[]` when it is not a valid range). */
export function blockDates(from: string, to: string): string[] {
  if (!isCalendarDate(from) || !isCalendarDate(to) || to < from) return [];
  const dates: string[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    dates.push(date);
    if (dates.length > 400) break; // guard: a mistyped year cannot spin here
  }
  return dates;
}

/** Do two closed ranges touch (share at least one day)? */
export function blocksOverlap(
  a: Pick<ChapelBlock, "from" | "to">,
  b: Pick<ChapelBlock, "from" | "to">,
): boolean {
  return a.from <= b.to && b.from <= a.to;
}

/** The per-date list the availability rule (`chapelDayStatus`) reads. */
export function blockedDateEntries(blocks: readonly ChapelBlock[]): BlockedDate[] {
  return blocks.flatMap((block) =>
    blockDates(block.from, block.to).map((date) => ({ resource_id: block.resource_id, date })),
  );
}

/** "Sep 12 → Sep 14, 2026" for a closed range (both ends inclusive). */
export function formatBlockRange(block: Pick<ChapelBlock, "from" | "to">): string {
  if (block.from === block.to) return formatCalendarDate(block.from);
  return `${formatCalendarDate(block.from)} → ${formatCalendarDate(block.to)}`;
}

/* ========================== operator booking state ========================= */

/**
 * The operator's view of a booking. `hold` is the storefront's quote reservation
 * (booking-events-v1 has no such status — the online title marker plus the
 * absence of a staff confirmation is what identifies it); `confirmed` is a
 * staff-confirmed booking or one a placed order claimed; `cancelled` is the
 * frozen scheduling status, with the operator's reason kept app-side.
 */
export type ChapelBookingStatus = "hold" | "confirmed" | "cancelled";

export const CHAPEL_BOOKING_STATUS_LABEL: Record<ChapelBookingStatus, string> = {
  hold: "In a quote",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

export type ChapelBookingState = {
  booking_id: string;
  status: "confirmed" | "cancelled";
  by: string;
  at: string;
  /** Required on cancellation (why the dates were given back). */
  reason?: string;
  /** Set when a placed order claimed the hold (storefront checkout). */
  order_number?: string;
};

/** The scheduling fields the admin status reads (a full `Booking` satisfies this). */
export type ChapelBookingLike = {
  id: string;
  title: string;
  status: string;
};

export function chapelBookingStatus(
  booking: ChapelBookingLike,
  state: ChapelBookingState | undefined,
): ChapelBookingStatus {
  if (booking.status === "cancelled") return "cancelled";
  if (state?.status === "confirmed") return "confirmed";
  if (isOnlineChapelBooking(booking.title)) return "hold";
  return "confirmed";
}

/**
 * The calendar dates a booking covers: from its start date up to — and
 * including — the day before its exclusive end (a same-day window covers one
 * day). Capped so a mistyped upstream window cannot explode the calendar.
 */
export function bookingCalendarDates(startsAt: string, endsAt: string): string[] {
  const start = calendarDateOf(startsAt);
  const endExclusive = calendarDateOf(endsAt);
  if (!isCalendarDate(start)) return [];
  if (!isCalendarDate(endExclusive) || endExclusive <= start) return [start];
  const dates: string[] = [];
  for (let date = start; date < endExclusive; date = addDays(date, 1)) {
    dates.push(date);
    if (dates.length >= 366) break;
  }
  return dates;
}

/* ============================= the month grid ============================== */

export type ChapelDayStatus = "free" | "held" | "booked" | "blocked";

export type ChapelDayCell = {
  date: string;
  /** False for the leading/trailing days that pad the month into whole weeks. */
  inMonth: boolean;
  status: ChapelDayStatus;
  /** Day belongs to a confirmed booking (staff-confirmed or claimed by an order). */
  booked: boolean;
  /** Day is held by a booking that is still only in a customer's quote. */
  held: boolean;
  /** Day sits inside an operator-entered closure. */
  blocked: boolean;
  /** A closure and a booking cover the same day — worth the operator's eye. */
  clash: boolean;
  /** "Chapel A · booked" — the cell's accessible label. */
  label: string;
};

export type ChapelMonth = {
  /** "2026-09" */
  month: string;
  /** "September 2026" */
  label: string;
  /** Whole weeks (Monday first). */
  weeks: ChapelDayCell[][];
};

export const CHAPEL_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** "2026-09-12" → "2026-09". */
export function monthOf(date: string): string {
  return isCalendarDate(date) ? date.slice(0, 7) : "";
}

/** Shift a "YYYY-MM" month by whole months. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return month;
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  const monthIndex = total - year * 12;
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** "September 2026" for the month picker's heading. */
export function formatMonthLabel(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) return month;
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export type ChapelMonthInput = {
  month: string;
  chapelName: string;
  /** The open windows covering the chapel; only their dates and operator status matter. */
  bookings: ReadonlyArray<{
    resource_id: string;
    starts_at: string;
    ends_at: string;
    admin_status: ChapelBookingStatus;
  }>;
  blocks: readonly BlockedDate[];
};

/**
 * One chapel's month: every day of the month (padded to whole Monday-first
 * weeks) carrying free/held/booked/blocked. Booked/held win over blocked for the
 * primary status, and `clash` flags the day so an operator sees a closure and a
 * booking on the same date.
 */
export function chapelMonthView(input: ChapelMonthInput): ChapelMonth {
  const { month, chapelName } = input;
  const [y, m] = month.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return { month, label: month, weeks: [] };
  }
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const padBefore = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells: ChapelDayCell[] = [];

  const total = Math.ceil((padBefore + daysInMonth) / 7) * 7;
  for (let index = 0; index < total; index++) {
    const date = addDays(first, index - padBefore);
    const dayStart = Date.parse(`${date}T00:00:00.000Z`);
    const dayEnd = Date.parse(`${addDays(date, 1)}T00:00:00.000Z`);
    const covering = input.bookings.filter(
      (b) => Date.parse(b.starts_at) < dayEnd && Date.parse(b.ends_at) > dayStart,
    );
    const booked = covering.some((b) => b.admin_status === "confirmed");
    const held = covering.some((b) => b.admin_status === "hold");
    const blocked = input.blocks.some((bl) => bl.date === date);
    const status: ChapelDayStatus = booked ? "booked" : held ? "held" : blocked ? "blocked" : "free";
    const label =
      status === "free"
        ? `${chapelName} · free`
        : status === "blocked"
          ? `${chapelName} · closed`
          : `${chapelName} · ${status}`;
    cells.push({
      date,
      inMonth: date.slice(0, 7) === month,
      status,
      booked,
      held,
      blocked,
      clash: blocked && (booked || held),
      label,
    });
  }

  const weeks: ChapelDayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { month, label: formatMonthLabel(month), weeks };
}

/* ============================== operator copy ============================== */

/**
 * The PLACEHOLDER notice the chapel settings screen shows. The client has not
 * confirmed the park's real chapel list, so the notice travels with the screen
 * (and the PR) rather than being restated in a dozen places.
 */
export const CHAPEL_PLACEHOLDER_NOTICE =
  "PLACEHOLDER DATA — the park has not confirmed how many chapels exist, their names, or " +
  "which class each sells as. Chapel A and Chapel B come from the scheduling seed; add, " +
  "rename, reclass, deactivate or close them here and the customer booking step follows " +
  "immediately (same store).";

/** The refusal when a new closure overlaps one already on the books. */
export function blockOverlapMessage(range: { from: string; to: string }, reason: string): string {
  return `That range overlaps a closure already on the books (${reason}). Unblock it first, or pick other dates.`;
}

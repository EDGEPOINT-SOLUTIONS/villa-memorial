/**
 * Chapel stays — the public storefront's booking rules (client + server safe).
 *
 * Why this module exists: a chapel is not a one-click product. The customer must
 * choose a chapel, a start date and a 3–9 day stay, see that EVERY day in the
 * range is free, see what that exact range costs, and only then put it in the
 * quote. All of those decisions are pure functions here so the dialog, the BFF
 * route and the tests share ONE rule set — the route handler stays a thin
 * fetch/check/proxy with no rules of its own. This module is the single source
 * of truth for
 *  · which scheduling resources are chapels and which sheet class they sell as
 *    (PLACEHOLDER — see CHAPEL_CLASS_RULES below),
 *  · the 3–9 day bound and the calendar-date arithmetic (UTC-midnight windows),
 *  · availability (a range is bookable only when no confirmed booking and no
 *    blocked date touches any of its days; the service's own conflict rule
 *    *flags*, it does not block — KEB-D3-03 cut line #3),
 *  · the client's 2026 chapel prices (read from lib/villa-pricing.ts, never
 *    restated here),
 *  · and the booking metadata a quote line carries.
 *
 * Availability source: `resources` (one resource per chapel) + `bookings` from
 * the scheduling module (lib/api-client/scheduling.ts), read through the server
 * orchestration in lib/api-client/chapel-reservations.ts. Which resources are
 * chapels, their sheet class, whether they are active and which dates the park
 * has closed come from the park's own records (lib/chapel-admin.ts + the durable
 * store in lib/api-client/chapel-store.ts) — resource maintenance windows are a
 * deferred item of the frozen booking-events-v1 contract, so the staff Schedule
 * screen owns them app-side and this rules module only consumes the result.
 */
import type { Resource } from "@/lib/api-client/scheduling";
import { CHAPEL_RATES, php } from "@/lib/villa-pricing";

export type ChapelClass = "common" | "private";

export const CHAPEL_CLASS_ORDER: ReadonlyArray<ChapelClass> = ["common", "private"];

export const CHAPEL_CLASS_LABEL: Record<ChapelClass, string> = {
  common: "Common chapel",
  private: "Private chapel",
};

/** The client's sheets price chapel use in 3–9 day stays only. */
export const MIN_CHAPEL_DAYS = 3;
export const MAX_CHAPEL_DAYS = 9;

/* ===========================================================================
 * FALLBACK configuration — the PLACEHOLDER seed, not the operating switch.
 *
 * The client has NOT confirmed how many chapels the park has, their names, or
 * which seeded scheduling resource is the common vs the private chapel. The
 * 2026 sheet only prices two classes. The staff Schedule screen owns those
 * facts now (lib/chapel-admin.ts + the durable store): an operator adds, renames,
 * reclassifies, deactivates and closes chapels there, and that is what the
 * storefront reads.
 *
 * This list is the SEED/FALLBACK for a resource the park's own records do not
 * list (it matches the recorded fixture
 * lib/fixtures/scheduling/chapel-admin.json — pinned by
 * tests/fixture-contract/chapel-admin.test.ts). Keep the two in step; change the
 * mapping per-resource on /staff/schedule rather than here.
 * ========================================================================= */

export type ChapelClassRule = { match: string; chapelClass: ChapelClass };

export const CHAPEL_CLASS_RULES: ReadonlyArray<ChapelClassRule> = [
  { match: "Chapel A", chapelClass: "common" },
  { match: "Chapel B", chapelClass: "private" },
];

/** The sheet class a scheduling resource sells as, or null when it is not a chapel. */
/** The structural shape an explicit chapel config carries (see ChapelRecord). */
export type ChapelConfigLike = {
  id: string;
  name: string;
  chapel_class: ChapelClass;
  active?: boolean;
};

/**
 * The sheet class a scheduling resource sells as, or null when it is not a
 * chapel. The park's own records (staff-editable, lib/chapel-admin.ts) win; the
 * placeholder rules above are the fallback for resources they do not list.
 */
export function chapelClassOf(
  resource: Pick<Resource, "id" | "name">,
  configs: readonly ChapelConfigLike[] = [],
): ChapelClass | null {
  const config =
    configs.find((c) => c.id === resource.id) ?? configs.find((c) => c.name === resource.name);
  if (config) return config.chapel_class;
  const rule = CHAPEL_CLASS_RULES.find(
    (r) => r.match === resource.id || r.match === resource.name,
  );
  return rule?.chapelClass ?? null;
}

/** Every chapel of a class (empty when no resource sells as that class). */
export function chapelsOf(
  resources: Resource[],
  chapelClass: ChapelClass,
  configs: readonly ChapelConfigLike[] = [],
): Resource[] {
  return resources.filter((r) => chapelClassOf(r, configs) === chapelClass);
}

/* ----------------------------- calendar dates ----------------------------- */

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A whole 3–9 day stay. */
export function isChapelDayCount(days: number): boolean {
  return Number.isInteger(days) && days >= MIN_CHAPEL_DAYS && days <= MAX_CHAPEL_DAYS;
}

/** A real `YYYY-MM-DD` calendar date (the panel's date input value). */
export function isCalendarDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  return new Date(t).toISOString().slice(0, 10) === value;
}

/** The calendar date `n` days after a calendar date (UTC arithmetic). An
 *  invalid date yields "" so a half-typed panel input can never throw. */
export function addDays(date: string, n: number): string {
  if (!isCalendarDate(date)) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Every calendar date of a stay, starting at `start` ([] when the range is not a
 *  valid 3–9 day stay yet). */
export function eachDate(start: string, days: number): string[] {
  if (!isCalendarDate(start) || !Number.isInteger(days) || days <= 0) return [];
  const dates: string[] = [];
  for (let i = 0; i < days; i++) dates.push(addDays(start, i));
  return dates;
}

/** A stay's booking window: UTC midnight of the start date to UTC midnight after the last day. */
export function chapelRange(startDate: string, days: number): { startsAt: string; endsAt: string } {
  return {
    startsAt: `${startDate}T00:00:00.000Z`,
    endsAt: `${addDays(startDate, days)}T00:00:00.000Z`,
  };
}

// NOTE: addDays/eachDate guard against an empty or half-typed date input — the
// booking dialog clears its date field between edits, and an unguarded
// Date.UTC(NaN) would throw inside render.

/** The calendar date of an ISO timestamp (UTC — every stay window is UTC midnight based). */
export function calendarDateOf(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toISOString().slice(0, 10);
}

/** "Sep 20, 2026" — the dialog and quote labels (deterministic locale). */
export function formatCalendarDate(date: string): string {
  if (!isCalendarDate(date)) return date;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Sun, Sep 20" — one day of the range list. */
export function formatCalendarDay(date: string): string {
  if (!isCalendarDate(date)) return date;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * "Sep 20 – 22, 2026" for a stay (the end date is exclusive, so the printed
 * last day is endDate − 1). Falls back to a full both-years form when the stay
 * crosses a month or a year, so the range is never ambiguous.
 */
export function formatChapelStayRange(startDate: string, endDateExclusive: string): string {
  if (!isCalendarDate(startDate) || !isCalendarDate(endDateExclusive)) {
    return `${startDate} → ${endDateExclusive}`;
  }
  const last = addDays(endDateExclusive, -1);
  if (last === startDate) return formatCalendarDate(startDate);
  if (startDate.slice(0, 4) === last.slice(0, 4) && startDate.slice(5, 7) === last.slice(5, 7)) {
    const day = Number(last.slice(8, 10));
    const startDay = Number(startDate.slice(8, 10));
    const [y, m] = startDate.split("-").map(Number);
    const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-PH", {
      timeZone: "UTC",
      month: "short",
    });
    return `${month} ${startDay} – ${day}, ${y}`;
  }
  return `${formatCalendarDate(startDate)} → ${formatCalendarDate(last)}`;
}

/* ------------------------------- pricing ---------------------------------- */

export type ChapelStayPrices = {
  /** The sheet's per-day rate for this class (the quote line's unit price). */
  perDay: number;
  /** The sheet's 3–9 day regular total for this stay (what the quote charges). */
  regular: number;
  /** The sheet's senior-citizen column total for this stay (office-applied). */
  senior: number;
};

/**
 * The client's 2026 figures for one class × day count. Throws outside 3–9 days:
 * the sheet only prices those stays, and callers validate with
 * `isChapelDayCount` first.
 */
export function chapelStayPrices(chapelClass: ChapelClass, days: number): ChapelStayPrices {
  const row = CHAPEL_RATES.find((r) => r.days === days);
  if (!row) {
    throw new Error(`No 2026 chapel rate for ${days} days — the sheet prices 3–9 day stays.`);
  }
  const rate = row[chapelClass];
  return { perDay: rate.ratePerDay, regular: rate.regular, senior: rate.senior };
}

/* ----------------------------- availability ------------------------------- */

/**
 * A date the park has closed for a chapel (maintenance/private use). No shape
 * exists upstream (booking-events-v1 defers resource maintenance windows), so
 * the staff Schedule screen stores closed RANGES app-side
 * (lib/api-client/chapel-store.ts) and expands them to these per-date entries
 * (lib/chapel-admin.ts `blockedDateEntries`) before either the dialog or the
 * reserve check reads them.
 */
export type BlockedDate = { resource_id: string; date: string };

/** The booking fields the availability rules actually read (a full `Booking`
 *  satisfies this, and so does the BFF's reshaped payload). */
export type BookingWindow = {
  resource_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

export type ChapelDayStatus = "free" | "booked" | "blocked";

/** Is one calendar day free for one chapel? The dialog's day chips and the range
 *  check share this exact rule. */
export function chapelDayStatus(
  resourceId: string,
  date: string,
  bookings: BookingWindow[],
  blocks: BlockedDate[] = [],
): ChapelDayStatus {
  const dayStart = Date.parse(`${date}T00:00:00.000Z`);
  const dayEnd = Date.parse(`${addDays(date, 1)}T00:00:00.000Z`);
  const booked = bookings.some(
    (b) =>
      b.resource_id === resourceId &&
      b.status === "confirmed" &&
      Date.parse(b.starts_at) < dayEnd &&
      Date.parse(b.ends_at) > dayStart,
  );
  if (booked) return "booked";
  if (blocks.some((bl) => bl.resource_id === resourceId && bl.date === date)) return "blocked";
  return "free";
}

/** The days of the requested range that hit a confirmed booking (booking) or a block. */
function clashDates(
  resourceId: string,
  startDate: string,
  days: number,
  bookings: BookingWindow[],
  blocks: BlockedDate[],
): { bookingDates: string[]; blockedDates: string[] } {
  const bookingDates: string[] = [];
  const blocked: string[] = [];
  for (const date of eachDate(startDate, days)) {
    const status = chapelDayStatus(resourceId, date, bookings, blocks);
    if (status === "booked") bookingDates.push(date);
    if (status === "blocked") blocked.push(date);
  }
  return { bookingDates, blockedDates: blocked };
}

export type ChapelAvailabilityRefusal =
  | { code: "days_out_of_range"; days: number }
  | { code: "invalid_start_date"; startDate: string }
  | { code: "no_chapel_configured"; chapelClass: ChapelClass }
  | { code: "unknown_chapel"; resourceId: string }
  | {
      code: "occupied";
      chapelClass: ChapelClass;
      resourceName: string;
      dates: string[];
      /** Chapel names of the same class that ARE free for this range. */
      alternatives: string[];
    }
  | {
      code: "blocked";
      chapelClass: ChapelClass;
      resourceName: string;
      dates: string[];
      alternatives: string[];
    }
  | { code: "no_chapel_free"; chapelClass: ChapelClass; dates: string[] };

export type ChapelAvailabilityOk = {
  ok: true;
  resource: Resource;
  chapelClass: ChapelClass;
  startDate: string;
  /** Exclusive end date (the morning after the last day). */
  endDate: string;
  startsAt: string;
  endsAt: string;
  days: number;
  prices: ChapelStayPrices;
};

export type ChapelAvailabilityResult = ChapelAvailabilityOk | { ok: false; refusal: ChapelAvailabilityRefusal };

/**
 * The booking rule, in one place. `resourceId` picks a specific chapel; omit it
 * to take the first chapel of the class that is free for the whole range.
 * `chapelConfigs` carries the park's own chapel records when the caller has them
 * (the dialog reads them from /api/chapel/schedule), so a renamed or
 * reclassified chapel is still matched without restating the class mapping here.
 */
export function checkChapelAvailability(input: {
  resources: Resource[];
  bookings: BookingWindow[];
  blockedDates?: BlockedDate[];
  chapelConfigs?: readonly ChapelConfigLike[];
  chapelClass: ChapelClass;
  startDate: string;
  days: number;
  resourceId?: string;
}): ChapelAvailabilityResult {
  const { chapelClass, startDate, days } = input;
  const blocks = input.blockedDates ?? [];
  const configs = input.chapelConfigs ?? [];

  if (!isChapelDayCount(days)) {
    return { ok: false, refusal: { code: "days_out_of_range", days } };
  }
  if (!isCalendarDate(startDate)) {
    return { ok: false, refusal: { code: "invalid_start_date", startDate } };
  }

  const chapels = chapelsOf(input.resources, chapelClass, configs);
  if (chapels.length === 0) {
    return { ok: false, refusal: { code: "no_chapel_configured", chapelClass } };
  }

  const target = input.resourceId
    ? chapels.find((c) => c.id === input.resourceId)
    : undefined;
  if (input.resourceId && !target) {
    return { ok: false, refusal: { code: "unknown_chapel", resourceId: input.resourceId } };
  }

  const clashes = (resource: Resource) =>
    clashDates(resource.id, startDate, days, input.bookings, blocks);
  const isFree = (resource: Resource) => {
    const c = clashes(resource);
    return c.bookingDates.length === 0 && c.blockedDates.length === 0;
  };

  const free = chapels.filter(isFree);
  const chosen = target ?? free[0];

  // No chapel named and none of the class is free for the whole range.
  if (!chosen) {
    const allDates = [
      ...new Set(
        chapels.flatMap((c) => {
          const h = clashes(c);
          return [...h.bookingDates, ...h.blockedDates];
        }),
      ),
    ].sort();
    return {
      ok: false,
      refusal: { code: "no_chapel_free", chapelClass, dates: allDates },
    };
  }

  if (isFree(chosen)) {
    const { startsAt, endsAt } = chapelRange(startDate, days);
    return {
      ok: true,
      resource: chosen,
      chapelClass,
      startDate,
      endDate: addDays(startDate, days),
      startsAt,
      endsAt,
      days,
      prices: chapelStayPrices(chapelClass, days),
    };
  }

  const pick = chosen;
  const hit = clashes(pick);
  const alternatives = free.filter((c) => c.id !== pick.id).map((c) => c.name);
  if (hit.blockedDates.length > 0) {
    return {
      ok: false,
      refusal: {
        code: "blocked",
        chapelClass,
        resourceName: pick.name,
        dates: hit.blockedDates,
        alternatives,
      },
    };
  }
  return {
    ok: false,
    refusal: {
      code: "occupied",
      chapelClass,
      resourceName: pick.name,
      dates: hit.bookingDates,
      alternatives,
    },
  };
}

/** "Sep 20, 2026 and Sep 21, 2026" — a readable list for the refusal copy. */
function joinDates(dates: string[]): string {
  const labels = dates.map(formatCalendarDate);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function chapelRefusalMessage(refusal: ChapelAvailabilityRefusal): string {
  switch (refusal.code) {
    case "days_out_of_range":
      return `Chapel stays run ${MIN_CHAPEL_DAYS}–${MAX_CHAPEL_DAYS} days — choose a stay in that range.`;
    case "invalid_start_date":
      return "Choose a valid start date for the stay.";
    case "no_chapel_configured": {
      const label = CHAPEL_CLASS_LABEL[refusal.chapelClass].toLowerCase();
      return `No ${label} is configured in the park's schedule yet, so these dates cannot be checked online. Please call the office.`;
    }
    case "unknown_chapel":
      return "That chapel is no longer in the park's schedule — choose another chapel.";
    case "occupied":
    case "blocked": {
      const dates = joinDates(refusal.dates);
      const label = CHAPEL_CLASS_LABEL[refusal.chapelClass].toLowerCase();
      const why = refusal.code === "occupied" ? "already booked" : "blocked (maintenance)";
      return refusal.alternatives.length > 0
        ? `${refusal.resourceName} is ${why} on ${dates}. ${refusal.alternatives.join(" and ")} ${
            refusal.alternatives.length === 1 ? "is" : "are"
          } free for this range.`
        : `${refusal.resourceName} is ${why} on ${dates}, and no other ${label} is free for this range.`;
    }
    case "no_chapel_free": {
      const dates = joinDates(refusal.dates);
      const label = CHAPEL_CLASS_LABEL[refusal.chapelClass].toLowerCase();
      return `Every ${label} is taken on ${dates}. Try other dates or send the office a request.`;
    }
  }
}

/** HTTP status for a refusal (the BFF route maps it straight onto the response). */
export function chapelRefusalStatus(refusal: ChapelAvailabilityRefusal): number {
  switch (refusal.code) {
    case "occupied":
    case "blocked":
    case "no_chapel_free":
      return 409;
    default:
      return 422;
  }
}

/* --------------------------- the quote line model -------------------------- */

/**
 * What a chapel quote line carries: the reservation the quote holds, its chapel,
 * its range and its day count. The line's unit price stays the catalogue's
 * per-day SKU price (the quote/checkout contract re-prices SKU × quantity), and
 * `days` is the quantity, so the placed order totals the whole stay.
 */
export type ChapelBookingLine = {
  bookingId: string;
  resourceId: string;
  resourceName: string;
  chapelClass: ChapelClass;
  /** First day of the stay (YYYY-MM-DD). */
  startDate: string;
  /** Exclusive end date (the morning after the last day, YYYY-MM-DD). */
  endDate: string;
  days: number;
};

/** Tolerant reader for the booking metadata persisted with a quote line. */
export function toChapelBookingLine(raw: unknown): ChapelBookingLine | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const bookingId = typeof r.bookingId === "string" ? r.bookingId : "";
  const resourceId = typeof r.resourceId === "string" ? r.resourceId : "";
  const resourceName = typeof r.resourceName === "string" ? r.resourceName : "";
  const chapelClass = r.chapelClass;
  const startDate = typeof r.startDate === "string" ? r.startDate : "";
  const endDate = typeof r.endDate === "string" ? r.endDate : "";
  const days = Number(r.days);
  if (!bookingId || !resourceId || !resourceName) return null;
  if (chapelClass !== "common" && chapelClass !== "private") return null;
  if (!isCalendarDate(startDate) || !isChapelDayCount(days)) return null;
  return {
    bookingId,
    resourceId,
    resourceName,
    chapelClass,
    startDate,
    endDate: isCalendarDate(endDate) ? endDate : addDays(startDate, days),
    days,
  };
}

/** The reservation fields the quote metadata needs (a full `Booking` satisfies it). */
export type ReservationLike = {
  id: string;
  resource_id: string;
  resource_name: string;
  starts_at: string;
  ends_at: string;
};

/** The quote metadata for a reservation the scheduling module confirmed. */
export function bookingToChapelLine(booking: ReservationLike, chapelClass: ChapelClass): ChapelBookingLine {
  const startDate = calendarDateOf(booking.starts_at);
  const endDate = calendarDateOf(booking.ends_at);
  const days = Math.max(
    MIN_CHAPEL_DAYS,
    Math.round((Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / DAY_MS),
  );
  return {
    bookingId: booking.id,
    resourceId: booking.resource_id,
    resourceName: booking.resource_name,
    chapelClass,
    startDate,
    endDate,
    days,
  };
}

/** "Sep 20 – 22, 2026 · 3 days" — the quote line's booking summary. */
export function chapelBookingLineSummary(line: ChapelBookingLine): string {
  return `${formatChapelStayRange(line.startDate, line.endDate)} · ${line.days} ${
    line.days === 1 ? "day" : "days"
  }`;
}

/* --------------------------- booking writes ------------------------------- */

/**
 * The title marker every online storefront reservation carries. Staff see it on
 * the schedule, and `releaseOnlineChapelBooking` only releases bookings with it
 * (a storefront visitor may drop the hold their quote created — never a
 * staff-made booking). A customer booking contract with ownership tokens is the
 * open contract question.
 */
export const ONLINE_CHAPEL_BOOKING_MARKER = "Online chapel booking";

export function chapelBookingTitle(resourceName: string, days: number): string {
  return `${ONLINE_CHAPEL_BOOKING_MARKER} — ${resourceName}, ${days} ${
    days === 1 ? "day" : "days"
  }`;
}

export function isOnlineChapelBooking(title: string): boolean {
  return title.startsWith(ONLINE_CHAPEL_BOOKING_MARKER);
}

/** The scheduling `POST /bookings` body for a confirmed-available range. */
export function chapelBookingInput(range: ChapelAvailabilityOk): {
  title: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
} {
  return {
    title: chapelBookingTitle(range.resource.name, range.days),
    resource_id: range.resource.id,
    starts_at: range.startsAt,
    ends_at: range.endsAt,
  };
}

/* ------------------------------ quote helpers ------------------------------ */

/**
 * The parenthesised price facts for the request path: the sheet's regular and
 * senior totals for THIS range (never an invented amount).
 */
export function chapelRequestPrice(chapelClass: ChapelClass, days: number): string {
  const prices = chapelStayPrices(chapelClass, days);
  return `${php(prices.regular)} regular / ${php(prices.senior)} senior for ${days} ${
    days === 1 ? "day" : "days"
  } (${php(prices.perDay)} / day)`;
}

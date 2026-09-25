/**
 * Burial calendar — burial schedules and their light pickups (PURE).
 *
 * Client minutes of meeting (Villa Memorial, 2026-09-21), item 2 — "Integrate a
 * calendar into the system to record and manage burial schedules. The calendar
 * shall include the pickup schedule of lights, corresponding to the date of
 * burial." `/staff/schedule` renders the office's recorded sheet through this
 * module, so the page, the calendar grid and the tests cannot disagree about
 * what a day holds:
 *
 *  · One burial entry per service, keyed to the case the office recorded. Its
 *    light pickup lives ON the burial (a single field), never as a second
 *    calendar event — the minutes ask for the pickup "corresponding to the date
 *    of burial", so the product models one record with two times, not two events.
 *  · A day is a calendar date (yyyy-mm-dd) and a time is a "HH:MM" park-time
 *    clock reading written by the office. Nothing here reads a wall clock, so
 *    SSR and the browser always agree on the grid.
 *  · Conflicts are DERIVED from the recorded times (a shared burial slot, a crew
 *    double-booked for pickups, a pickup set before its own burial) — the calendar
 *    flags what the office recorded; it never invents an event or edits one.
 *
 * The shape is app-authored (lib/fixtures/scheduling/burials.json) because no
 * contract names a burial-schedule or light-pickup record; live mode refuses it
 * with 503 (lib/api-client/burial-schedule.ts). Pure by construction: no storage,
 * no React.
 */
import {
  addDays,
  formatCalendarDate,
  isCalendarDate,
} from "@/lib/chapel-booking";
import { addMonths, formatMonthLabel, monthOf } from "@/lib/chapel-admin";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const LIGHT_PICKUP_STATES = ["scheduled", "in_progress", "done"] as const;
export type LightPickupState = (typeof LIGHT_PICKUP_STATES)[number];

export const LIGHT_PICKUP_STATE_LABEL: Record<LightPickupState, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Collected",
};

export const LIGHT_PICKUP_STATE_TONE: Record<
  LightPickupState,
  "info" | "warning" | "success"
> = {
  scheduled: "info",
  in_progress: "warning",
  done: "success",
};

export function isLightPickupState(value: unknown): value is LightPickupState {
  return typeof value === "string" && (LIGHT_PICKUP_STATES as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Records the calendar reads                                          */
/* ------------------------------------------------------------------ */

/** The office's light-pickup schedule for one burial. */
export type LightPickup = {
  /** Park-time "HH:MM" the crew is set to collect the lights. */
  time: string;
  state: LightPickupState;
  /** The office role that collects them — a crew label, never a named person. */
  crew: string;
  note: string | null;
};

/** One recorded burial — the case it belongs to and its light pickup, if set. */
export type BurialEntry = {
  id: string;
  /** Burial day, yyyy-mm-dd. */
  date: string;
  /** Park-time "HH:MM" the burial service starts. */
  time: string;
  case_number: string;
  deceased_name: string;
  lot_number: string;
  section: string;
  coordinator: string;
  light_pickup: LightPickup | null;
  note: string | null;
};

export type BurialSchedule = {
  /** The recorded day the calendar opens on (yyyy-mm-dd, park time). */
  as_of: string;
  burials: BurialEntry[];
};

/* ------------------------------------------------------------------ */
/* Park-time clock                                                     */
/* ------------------------------------------------------------------ */

const TIME_OF_DAY_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const PARK_TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** A real park-time "HH:MM" clock reading (the office writes these by hand). */
export function isTimeOfDay(value: string): boolean {
  return TIME_OF_DAY_RE.test(value);
}

/**
 * "HH:MM" → "9:00 AM". Asia/Manila is a fixed UTC+8 offset (no DST), so the
 * reading is anchored to a fixed date and can never drift with the machine.
 */
export function formatParkTime(time: string): string {
  if (!isTimeOfDay(time)) return time;
  return PARK_TIME_FORMAT.format(new Date(`2026-01-01T${time}:00+08:00`));
}

/* ------------------------------------------------------------------ */
/* Day lookups                                                         */
/* ------------------------------------------------------------------ */

/** Burials recorded on `date`, earliest service first, name as the tie-break. */
export function burialsOnDay(burials: readonly BurialEntry[], date: string): BurialEntry[] {
  return burials
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.time.localeCompare(b.time) || a.deceased_name.localeCompare(b.deceased_name));
}

export function burialHasPickup(entry: BurialEntry): boolean {
  return entry.light_pickup !== null;
}

/** The Monday that opens the week containing `date` (Monday-first, repo convention). */
export function weekStart(date: string): string {
  if (!isCalendarDate(date)) return "";
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/* ------------------------------------------------------------------ */
/* Month view                                                          */
/* ------------------------------------------------------------------ */

export const BURIAL_WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type BurialMonthCell = {
  date: string;
  /** False for the leading/trailing days that pad the month into whole weeks. */
  inMonth: boolean;
  burials: BurialEntry[];
};

export type BurialMonthView = {
  /** "2026-09" */
  month: string;
  /** "September 2026" */
  label: string;
  /** Whole weeks, Monday first. */
  weeks: BurialMonthCell[][];
};

/** Every day of `month` (yyyy-mm), padded to whole Monday-first weeks. */
export function burialMonthView(
  month: string,
  burials: readonly BurialEntry[],
): BurialMonthView {
  const [y, m] = month.split("-").map(Number);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return { month, label: month, weeks: [] };
  }
  const first = `${month}-01`;
  const padBefore = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const total = Math.ceil((padBefore + daysInMonth) / 7) * 7;

  const cells: BurialMonthCell[] = [];
  for (let index = 0; index < total; index++) {
    const date = addDays(first, index - padBefore);
    cells.push({
      date,
      inMonth: date.slice(0, 7) === month,
      burials: burialsOnDay(burials, date),
    });
  }

  const weeks: BurialMonthCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return { month, label: formatMonthLabel(month), weeks };
}

/* ------------------------------------------------------------------ */
/* Week view                                                           */
/* ------------------------------------------------------------------ */

export type BurialWeekDay = {
  date: string;
  /** "Mon, Sep 28" */
  label: string;
  burials: BurialEntry[];
};

export type BurialWeekView = {
  /** Monday. */
  start: string;
  /** Sunday. */
  end: string;
  /** "Sep 28 – Oct 4, 2026" */
  label: string;
  days: BurialWeekDay[];
};

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** The seven days (Monday–Sunday) around `anchor`. */
export function burialWeekView(
  anchor: string,
  burials: readonly BurialEntry[],
): BurialWeekView {
  const start = weekStart(anchor);
  if (!start) return { start: "", end: "", label: anchor, days: [] };
  const days: BurialWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    days.push({
      date,
      label: WEEKDAY_FORMAT.format(new Date(`${date}T00:00:00Z`)),
      burials: burialsOnDay(burials, date),
    });
  }
  const end = days[6].date;
  const label =
    monthOf(start) === monthOf(end)
      ? `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`
      : `${formatCalendarDate(start)} → ${formatCalendarDate(end)}`;
  return { start, end, label, days };
}

/* ------------------------------------------------------------------ */
/* The preparation list                                                */
/* ------------------------------------------------------------------ */

/** Burials on or after `from`, nearest first — what preparation reads next. */
export function upcomingBurials(
  burials: readonly BurialEntry[],
  from: string,
  limit = 6,
): BurialEntry[] {
  return burials
    .filter((entry) => entry.date >= from)
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    )
    .slice(0, Math.max(0, limit));
}

/** The nearest recorded burial days on either side of `date` — the pointer an
 *  empty month/week shows instead of reading as "nothing booked at all". */
export function nearestBurialDays(
  burials: readonly BurialEntry[],
  date: string,
): { previous: string | null; next: string | null } {
  let previous: string | null = null;
  let next: string | null = null;
  for (const entry of burials) {
    if (entry.date < date) {
      if (!previous || entry.date > previous) previous = entry.date;
    } else if (entry.date > date) {
      if (!next || entry.date < next) next = entry.date;
    }
  }
  return { previous, next };
}

/* ------------------------------------------------------------------ */
/* Conflicts                                                           */
/* ------------------------------------------------------------------ */

export const BURIAL_CONFLICT_KINDS = ["burial_slot", "pickup_crew", "pickup_order"] as const;
export type BurialConflictKind = (typeof BURIAL_CONFLICT_KINDS)[number];

export type BurialConflict = {
  kind: BurialConflictKind;
  date: string;
  /** The burials the flag is about, in recorded order. */
  burial_ids: string[];
  /** One short sentence a coordinator can act on. */
  message: string;
};

function crewKey(crew: string): string {
  return crew.trim().toLowerCase();
}

/**
 * Every recorded scheduling conflict, earliest day first. Three rules, all read
 * straight from the sheet: two burials share one time; one crew is set for two
 * light pickups at the same time; a light pickup is set before its own burial.
 * Nothing is recomputed against a service and no conflict is invented.
 */
export function burialConflicts(burials: readonly BurialEntry[]): BurialConflict[] {
  const conflicts: BurialConflict[] = [];

  // 1 · Two burials share a date and a start time.
  const slots = new Map<string, BurialEntry[]>();
  for (const entry of burials) {
    const key = `${entry.date} ${entry.time}`;
    slots.set(key, [...(slots.get(key) ?? []), entry]);
  }
  for (const [, entries] of slots) {
    if (entries.length < 2) continue;
    const [first] = entries;
    const names = entries.map((entry) => entry.deceased_name).join(", ");
    conflicts.push({
      kind: "burial_slot",
      date: first.date,
      burial_ids: entries.map((entry) => entry.id),
      message: `${formatCalendarDate(first.date)} · ${formatParkTime(first.time)}: ${names} share one burial time.`,
    });
  }

  // 2 · One crew is set for two pickups at the same date and time.
  const pickups = new Map<string, BurialEntry[]>();
  for (const entry of burials) {
    if (!entry.light_pickup) continue;
    const key = `${entry.date} ${entry.light_pickup.time} ${crewKey(entry.light_pickup.crew)}`;
    pickups.set(key, [...(pickups.get(key) ?? []), entry]);
  }
  for (const [, entries] of pickups) {
    if (entries.length < 2) continue;
    const [first] = entries;
    const pickup = first.light_pickup as LightPickup;
    conflicts.push({
      kind: "pickup_crew",
      date: first.date,
      burial_ids: entries.map((entry) => entry.id),
      message: `${formatCalendarDate(first.date)} · ${formatParkTime(pickup.time)}: ${pickup.crew} is set for ${entries.length} light pickups at once.`,
    });
  }

  // 3 · A pickup set before its own burial (the lights cannot leave first).
  for (const entry of burials) {
    if (!entry.light_pickup) continue;
    if (entry.light_pickup.time < entry.time) {
      conflicts.push({
        kind: "pickup_order",
        date: entry.date,
        burial_ids: [entry.id],
        message: `${formatCalendarDate(entry.date)}: the light pickup for ${entry.deceased_name} is set before the burial.`,
      });
    }
  }

  return conflicts.sort(
    (a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind),
  );
}

/** The set of burial ids that appear in any conflict — the cells that get flagged. */
export function conflictedBurialIds(conflicts: readonly BurialConflict[]): Set<string> {
  const ids = new Set<string>();
  for (const conflict of conflicts) for (const id of conflict.burial_ids) ids.add(id);
  return ids;
}

/* ------------------------------------------------------------------ */
/* Month navigation                                                    */
/* ------------------------------------------------------------------ */

/** The month a month-view arrow moves to, and the anchor date it lands on. */
export function shiftMonthAnchor(anchor: string, delta: number): string {
  const month = monthOf(anchor);
  if (!month) return anchor;
  const shifted = addMonths(month, delta);
  return `${shifted}-01`;
}

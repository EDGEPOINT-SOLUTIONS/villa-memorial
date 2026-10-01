/**
 * The family visit calendar's PURE logic — the month grid, the day an instant
 * belongs to, the events grouped by day, the state→tone colour role and the
 * visit kinds a family can ask the office for.
 *
 * Not a service and not a data layer: every value here is derived from records
 * the pages already read (`lib/fixtures/family/workspace.json` through
 * `lib/api-client/family.ts`). The ONE way the portal prints a day stays
 * `lib/family/family-view.ts`; this module only decides which calendar cell a
 * recorded instant belongs to and how the month is laid out.
 *
 * Week starts on MONDAY: the park is in the Philippines, where the week reads
 * Monday→Sunday (the same rule `styles/…` and the office's own calendars use).
 * Dates are computed in UTC so a reader's timezone can never move a cell; the
 * day key an instant maps to is the Asia/Manila day (`familyInstantDay`).
 *
 * NOTHING IS INVENTED: a day with no recorded appointment is a plain day. There
 * is no availability, no free slot and no running office-hours calendar here —
 * the scheduling service does not exist, and the pages say so on the day.
 */
import type { FamilyAppointment } from "@/lib/api-client/family";
import {
  familyAppointmentState,
  familyInstantDateLabel,
  familyInstantDay,
  familyInstantTimeLabel,
  familyInstantWeekday,
} from "@/lib/family/family-view";

/** One recorded appointment together with the loved one it belongs to. */
export type CalendarAppointment = FamilyAppointment & {
  person_id: string;
  person_name: string;
};

/** One cell of the month grid. `inMonth` is false for a neighbouring month's spill. */
export type CalendarDay = {
  /** `yyyy-mm-dd`. */
  key: string;
  day: number;
  inMonth: boolean;
};

export type CalendarWeek = {
  /** The first day of the week, used as a stable React key. */
  key: string;
  days: CalendarDay[];
};

/** A month key: `yyyy-mm`. */
export type CalendarMonthKey = string;

/** The state of a recorded visit → the colour role it carries (never colour alone). */
export type VisitTone = "ok" | "wait" | "neutral";

const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** `2026-09` from a year and a 1-based month. */
export function monthKeyOf(year: number, month: number): CalendarMonthKey {
  return `${year}-${pad2(month)}`;
}

/** The month a `yyyy-mm-dd` day belongs to. */
export function monthKeyFromDay(key: string): CalendarMonthKey {
  return key.slice(0, 7);
}

/** A month key back to its year and 1-based month, defensively. */
export function parseMonthKey(key: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return { year: 1970, month: 1 };
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(month) || month < 1 || month > 12) return { year, month: 1 };
  return { year, month };
}

/** The month `delta` months away from `key` (delta may be negative). */
export function addMonths(key: string, delta: number): CalendarMonthKey {
  const { year, month } = parseMonthKey(key);
  const zero = year * 12 + (month - 1) + delta;
  return monthKeyOf(Math.floor(zero / 12), (zero % 12) + 1);
}

/** The month's written name — “September 2026”. */
export function monthLabel(key: string): string {
  const { year, month } = parseMonthKey(key);
  return MONTH_FORMAT.format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * The month laid out as weeks, Monday first. Every week has exactly seven days;
 * the leading and trailing days belong to the neighbouring month (`inMonth`
 * false) so the grid never leaves a hole.
 */
export function buildMonthGrid(key: string): CalendarWeek[] {
  const { year, month } = parseMonthKey(key);
  const first = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay: 0 = Sunday … 6 = Saturday. Shift so Monday is 0.
  const offset = (first.getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const weeks = Math.ceil((offset + lastDay) / 7);
  const grid: CalendarWeek[] = [];
  for (let week = 0; week < weeks; week += 1) {
    const days: CalendarDay[] = [];
    for (let slot = 0; slot < 7; slot += 1) {
      const cursor = new Date(Date.UTC(year, month - 1, 1 - offset + week * 7 + slot));
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth() + 1;
      const d = cursor.getUTCDate();
      days.push({
        key: dayKey(y, m, d),
        day: d,
        inMonth: m === month && y === year,
      });
    }
    grid.push({ key: days[0].key, days });
  }
  return grid;
}

/** The recorded visits grouped by the Manila day they fall on. */
export function groupByDay(
  appointments: readonly CalendarAppointment[],
): Map<string, CalendarAppointment[]> {
  const byDay = new Map<string, CalendarAppointment[]>();
  for (const appointment of appointments) {
    const key = familyInstantDay(appointment.starts_at);
    if (!key) continue;
    const list = byDay.get(key);
    if (list) list.push(appointment);
    else byDay.set(key, [appointment]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  return byDay;
}

/** The day keys that carry at least one visit, in order. */
export function eventDayKeys(byDay: Map<string, CalendarAppointment[]>): string[] {
  return [...byDay.keys()].sort();
}

/**
 * The first day in a month that carries a visit, or null. Used to open the
 * calendar on something real rather than always on the 1st.
 */
export function firstEventDay(
  byDay: Map<string, CalendarAppointment[]>,
  month: CalendarMonthKey,
): string | null {
  return eventDayKeys(byDay).find((key) => monthKeyFromDay(key) === month) ?? null;
}

/**
 * The month the calendar should open on: the month of the nearest visit that is
 * not behind the reader, else the month of the most recent one, else this month.
 * A page with no recorded visit opens on today's month, which is honest — the
 * calendar simply has nothing marked on it.
 */
export function defaultMonthKey(
  appointments: readonly Pick<FamilyAppointment, "starts_at">[],
  todayKey: string,
): CalendarMonthKey {
  const days = appointments
    .map((appointment) => familyInstantDay(appointment.starts_at))
    .filter(Boolean)
    .sort();
  if (days.length === 0) return monthKeyFromDay(todayKey);
  const upcoming = days.find((key) => key >= todayKey);
  return monthKeyFromDay(upcoming ?? days[days.length - 1]);
}

/** The colour role a state carries. The meaning is always also a word. */
export function visitTone(state: FamilyAppointment["state"]): VisitTone {
  if (state === "confirmed") return "ok";
  if (state === "waiting") return "wait";
  return "neutral";
}

/**
 * The one line a day cell announces to a screen reader: the day, then each
 * recorded visit with who it is for, what it is, the time and its state. The
 * calendar grid is a table of marks; this is the text behind a mark.
 */
export function dayAriaSummary(
  dayKey: string,
  events: readonly CalendarAppointment[],
): string {
  if (events.length === 0) return `${familyInstantWeekday(`${dayKey}T00:00:00+08:00`)} ${familyInstantDateLabel(`${dayKey}T00:00:00+08:00`)}, no visits`;
  const parts = events.map(
    (event) =>
      `${event.person_name}, ${event.title}, ${familyInstantTimeLabel(event.starts_at)}, ${familyAppointmentState(event.state)}`,
  );
  return `${familyInstantWeekday(`${dayKey}T00:00:00+08:00`)} ${familyInstantDateLabel(`${dayKey}T00:00:00+08:00`)}: ${parts.join("; ")}`;
}

/** One kind of visit a family can ask the office for. */
export type FamilyVisitKind = {
  key: "home_visit" | "park_visit" | "office_visit";
  /** The family's words for the visit. */
  label: string;
  /** One short line of what it is. */
  detail: string;
};

/**
 * The visit kinds the office can be asked for — the same three the recorded
 * appointments use (`home_visit` · `park_visit` · `office_visit`). This is not a
 * new taxonomy: it is the family's plain words for the kinds already in the
 * record, and every one of them still ends in a call, never a booked slot.
 */
export const FAMILY_VISIT_KINDS: readonly FamilyVisitKind[] = [
  {
    key: "home_visit",
    label: "A visit to your home",
    detail: "The office comes to you — we call before we set off.",
  },
  {
    key: "park_visit",
    label: "A walk to the lot with us",
    detail: "We meet you at the park and walk to your loved one's lot.",
  },
  {
    key: "office_visit",
    label: "A meeting at the office",
    detail: "Sit down with the office in Sunrise, Isabela City.",
  },
] as const;

/** One visit kind by its key, or undefined for anything else. */
export function familyVisitKind(key: string | undefined): FamilyVisitKind | undefined {
  return FAMILY_VISIT_KINDS.find((kind) => kind.key === key);
}

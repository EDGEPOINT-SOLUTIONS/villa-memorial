/**
 * The month grid — PURE, portal-neutral.
 *
 * Both the family visit calendar and the agent appointments calendar read the
 * same month layout: weeks start on MONDAY (the park is in the Philippines,
 * where the week reads Monday→Sunday), every week has exactly seven cells, and
 * the leading and trailing days belong to the neighbouring month so the grid
 * never leaves a hole. Dates are computed in UTC so a reader's timezone can
 * never move a cell; the day an instant belongs to is decided by the caller
 * (each portal keys instants to its own Asia/Manila day).
 *
 * This module holds no records and no state — only the arithmetic a month view
 * needs. The family-specific calendar logic stays in
 * `lib/family/family-calendar.ts`, which re-exports these helpers; the agent's
 * stays in `lib/agent/agent-calendar.ts`.
 */

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

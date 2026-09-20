/**
 * The office's date windows — PURE, client + server.
 *
 * Why it exists: the Accounting screen and the Reports screen both filter a period
 * of recorded data, and "which days does 1–31 August mean" must have one answer.
 * The vocabulary is deliberately tiny: an inclusive calendar-date window where an
 * empty end means "everything recorded", validated from untrusted query params,
 * and the date arithmetic the reports need (month bounds, each day, a percentage
 * over a whole).
 *
 * All dates are calendar dates (yyyy-mm-dd) compared as strings — the same
 * vocabulary the fixtures record — never a locale-formatted date or a local-time
 * instant, so server and browser agree.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Inclusive calendar-date window; an open end means "everything recorded". */
export type DatePeriod = {
  from: string | null;
  to: string | null;
};

/** A valid yyyy-mm-dd from an untrusted query param, or null. */
export function parsePeriodDate(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!DATE_RE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

/** The period a page reads: validated, and swapped when the ends are reversed. */
export function datePeriod(
  fromRaw: string | null | undefined,
  toRaw: string | null | undefined,
): DatePeriod {
  let from = parsePeriodDate(fromRaw);
  let to = parsePeriodDate(toRaw);
  if (from && to && from > to) [from, to] = [to, from];
  return { from, to };
}

export function periodIsAll(period: DatePeriod): boolean {
  return period.from === null && period.to === null;
}

/** The date half of an ISO instant or a calendar date. */
export function dateOnly(value: string): string {
  return value.slice(0, 10);
}

/** Is a date (or instant) inside the window, inclusive? */
export function inPeriod(value: string, period: DatePeriod): boolean {
  const date = dateOnly(value);
  if (!date) return false;
  if (period.from && date < period.from) return false;
  if (period.to && date > period.to) return false;
  return true;
}

function formatPeriodDate(date: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function periodLabel(period: DatePeriod): string {
  if (!period.from && !period.to) return "All recorded dates";
  if (period.from && period.to) {
    return period.from === period.to
      ? formatPeriodDate(period.from)
      : `${formatPeriodDate(period.from)} – ${formatPeriodDate(period.to)}`;
  }
  if (period.from) return `From ${formatPeriodDate(period.from)}`;
  return `Up to ${formatPeriodDate(period.to as string)}`;
}

/** First and last day of the month that contains `date` (a business "today"). */
export function monthBoundsOf(date: string): DatePeriod {
  const month = dateOnly(date).slice(0, 7);
  if (!DATE_RE.test(`${month}-01`)) return { from: null, to: null };
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, "0")}` };
}

/** Every calendar date in the window, inclusive; [] when invalid or reversed. */
export function eachDate(from: string, to: string): string[] {
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || to < from) return [];
  const dates: string[] = [];
  for (let date = from; date <= to; date = addOneDay(date)) {
    dates.push(date);
    if (dates.length > 400) break; // a mistyped year cannot spin a server render
  }
  return dates;
}

export function addOneDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Part of a whole as a whole-number percentage; null when the whole is zero. */
export function percentOf(part: number, whole: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

/**
 * Admin analytics — the figures behind `/staff/analytics`, PURE (client + server).
 *
 * WHY IT EXISTS. The plan (§9.1) fixes one chart grammar and one source per metric, and
 * this module owns the numbers so the screen can stay a drawing shell. There is no
 * reporting-analytics service yet, so every figure is DERIVED from the same recorded
 * stores the screens already read — the durable order store, the counter's payment
 * journal, the recorded invoices, the CRM inquiries and the property lots. A metric with
 * no source is named as such on the screen; this module never invents a point.
 *
 * THE SERIES RULE. `salesSeries` / `collectionsSeries` plot only months that carry a
 * recorded value — a month with no sale is not a fabricated zero on the line, and a
 * window with no data at all is the caller's named empty state (`LineChart` renders it
 * once the series is shorter than a line). Labels are short month names, values are
 * integer centavos, and the months are sorted oldest first so the line reads left→right.
 */
import { dateOnly, inPeriod, percentOf, type DatePeriod } from "@/lib/period";
import type { Lot } from "@/lib/api-client/property";
import type { Inquiry } from "@/lib/api-client/crm";

/* -------------------------------- the range ------------------------------ */

export const ANALYTICS_RANGES = ["month", "quarter", "year"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_RANGE_LABEL: Record<AnalyticsRange, string> = {
  month: "This month",
  quarter: "This quarter",
  year: "This year",
};

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return typeof value === "string" && (ANALYTICS_RANGES as readonly string[]).includes(value);
}

/**
 * The window a range covers, as inclusive calendar dates: the current month, quarter or
 * year up to the business day. "Up to" and not "the whole period" because the office
 * reads figures to date — a month with two days in it is two days of records.
 */
export function analyticsWindow(range: AnalyticsRange, now: Date): DatePeriod {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const pad = (value: number) => String(value).padStart(2, "0");
  const today = `${year}-${pad(month + 1)}-${pad(now.getUTCDate())}`;
  if (range === "month") return { from: `${year}-${pad(month + 1)}-01`, to: today };
  if (range === "quarter") {
    const firstMonth = Math.floor(month / 3) * 3;
    return { from: `${year}-${pad(firstMonth + 1)}-01`, to: today };
  }
  return { from: `${year}-01-01`, to: today };
}

/** The trailing months a trend line reads, ending with the current month. */
export function trailingMonthWindow(now: Date, months = 6): DatePeriod {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month - (months - 1), 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

/* -------------------------------- the series ----------------------------- */

/** One plotted month: the key is yyyy-mm, the label is what the axis prints. */
export type MonthlyPoint = { month: string; label: string; value: number };

/** The yyyy-mm a dated record belongs to. */
export function monthKeyOf(value: string): string {
  return dateOnly(value).slice(0, 7);
}

/** A short month name (`Jul`) — the axis has no room for a year. */
export function shortMonthLabel(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return month;
  return new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "short" }).format(parsed);
}

/**
 * Group dated records into months inside the window, keeping only months with a value.
 * A month with no record is not a plotted zero — the line draws the months that exist.
 */
export function monthlySeries<T>(
  records: readonly T[],
  period: DatePeriod,
  at: (record: T) => string,
  value: (record: T) => number,
): MonthlyPoint[] {
  const byMonth = new Map<string, number>();
  for (const record of records) {
    if (!inPeriod(at(record), period)) continue;
    const month = monthKeyOf(at(record));
    byMonth.set(month, (byMonth.get(month) ?? 0) + value(record));
  }
  return [...byMonth.entries()]
    .filter(([, total]) => total > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, label: shortMonthLabel(month), value: total }));
}

/** Sales by month — the durable order store's real `placed_at` and total. */
export function salesSeries(
  orders: ReadonlyArray<{ placed_at: string; total_cents: number }>,
  period: DatePeriod,
): MonthlyPoint[] {
  return monthlySeries(orders, period, (order) => order.placed_at, (order) => order.total_cents);
}

/** Collections by month — the counter's payment journal, keyed by the day received. */
export function collectionsSeries(
  payments: ReadonlyArray<{ received_on: string; amount_cents: number }>,
  period: DatePeriod,
): MonthlyPoint[] {
  return monthlySeries(
    payments,
    period,
    (payment) => payment.received_on,
    (payment) => payment.amount_cents,
  );
}

/* ------------------------------ the conversion --------------------------- */

export type Conversion = {
  /** Inquiries received inside the window. */
  total: number;
  /** Of those, the ones whose recorded status is `converted`. */
  converted: number;
  /** Whole percent, or null when the window holds no inquiry (never 0%). */
  pct: number | null;
};

/** Inquiries received in the window, and how many converted — no guessed denominator. */
export function inquiryConversion(
  inquiries: readonly Inquiry[],
  period: DatePeriod,
): Conversion {
  const inWindow = inquiries.filter((inquiry) => inPeriod(inquiry.received_at, period));
  const converted = inWindow.filter((inquiry) => inquiry.status === "converted").length;
  return { total: inWindow.length, converted, pct: percentOf(converted, inWindow.length) };
}

/* ------------------------------ lot availability ------------------------- */

export type LotAvailability = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  occupied: number;
  /** Every other recorded status (holds, transfer) — named, never folded into one bucket. */
  other: number;
};

/** The recorded lots by status; the four the office watches plus an honest "other". */
export function lotAvailability(lots: readonly Lot[]): LotAvailability {
  const count = (status: string) => lots.filter((lot) => lot.status === status).length;
  const available = count("available");
  const reserved = count("reserved");
  const sold = count("sold");
  const occupied = count("occupied");
  return {
    total: lots.length,
    available,
    reserved,
    sold,
    occupied,
    other: lots.length - available - reserved - sold - occupied,
  };
}

/* ------------------------------ the source map --------------------------- */

/**
 * Where today's number comes from and which service produces it live — the one table
 * the screen prints under its figures. It is data, not prose, so a later contract can be
 * diffed against it; the live column names the service, never a promise the app keeps.
 */
export const ANALYTICS_SOURCES: ReadonlyArray<{
  metric: string;
  source: string;
  live: string;
}> = [
  {
    metric: "Collections",
    source: "The counter's payment journal — a recorded payment and the receipt it issued.",
    live: "D8 finance-billing · billing-list-api-v1",
  },
  {
    metric: "Dues & aging",
    source: "Each invoice's due date and outstanding balance; the two-day rule in payment-alerts.",
    live: "D8 finance-billing",
  },
  {
    metric: "Sales",
    source: "The durable order store — the orders the office actually placed.",
    live: "order-events-v1",
  },
  {
    metric: "Inquiry → order conversion",
    source: "Recorded inquiries (new → contacted → converted), counted against orders placed.",
    live: "D3 crm-families",
  },
  {
    metric: "Lot availability",
    source: "The property lots' recorded status.",
    live: "property-gis",
  },
  {
    metric: "Cases by stage · chapel occupancy",
    source: "Operations cases and the scheduling chapel calendar.",
    live: "funeral-cases · D5 scheduling-resources",
  },
];

/* --------------------------- the honest blank line ----------------------- */

/** The dashboard's own named reason, kept as one constant so the screens cannot drift. */
export const COLLECTIONS_BLANK_REASON =
  "No payment recorded yet — collections appear once a payment is posted at the counter.";

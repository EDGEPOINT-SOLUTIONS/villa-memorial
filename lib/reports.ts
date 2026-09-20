/**
 * The Reports screen's rules — PURE, client + server.
 *
 * Why it exists: `/staff/reports` renders four of the reports the office actually
 * asks for over recorded data (there is no reporting-analytics service yet). The
 * one thing a report must never do is invent a figure, so every count, bucket and
 * percentage is derived here from rows the caller fetched, and a period the caller
 * cannot fill simply yields zero rows — which the page renders as an honest empty
 * state, never a fabricated chart.
 *
 * The vocabulary is deliberately small and shared: the four report keys the tab
 * row walks, the period window (inclusive calendar dates), and four rollups —
 * collections by month, cases by stage over the same `CASE_STAGES` the ops board
 * uses, lot counts by the property service's status members, and chapel occupancy
 * over the scheduling bookings the park already records.
 */

import { CASE_STAGES, stageLabel, type CaseStage } from "@/lib/operations/case-board";
import {
  dateOnly,
  eachDate,
  inPeriod,
  percentOf,
  type DatePeriod,
} from "@/lib/period";

/* --------------------------------- tabs ---------------------------------- */

export const REPORT_KEYS = ["collections", "sales", "occupancy", "cases"] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export const REPORT_LABEL: Record<ReportKey, string> = {
  collections: "Collections",
  sales: "Sales by agent",
  occupancy: "Lot & chapel occupancy",
  cases: "Cases by stage",
};

export function isReportKey(value: unknown): value is ReportKey {
  return typeof value === "string" && (REPORT_KEYS as readonly string[]).includes(value);
}

/* -------------------------------- periods -------------------------------- */

/** The office's inclusive calendar-date window — the shared `lib/period.ts` shape. */
export type ReportPeriod = DatePeriod;

/* ------------------------------ collections ------------------------------ */

export type CollectionPaymentLike = {
  received_on: string;
  amount_cents: number;
};

export type CollectionsMonthRow = {
  /** yyyy-mm */
  month: string;
  count: number;
  total_cents: number;
};

/** The payments inside the window, grouped by the month they were received. */
export function collectionsByMonth(
  payments: readonly CollectionPaymentLike[],
  period: ReportPeriod,
): CollectionsMonthRow[] {
  const months = new Map<string, CollectionsMonthRow>();
  for (const payment of payments) {
    if (!inPeriod(payment.received_on, period)) continue;
    const month = dateOnly(payment.received_on).slice(0, 7);
    const row = months.get(month) ?? { month, count: 0, total_cents: 0 };
    row.count += 1;
    row.total_cents += payment.amount_cents;
    months.set(month, row);
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

function monthNameOf(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return month;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(parsed);
}

export function monthLabel(month: string): string {
  return monthNameOf(month);
}

/* --------------------------- lots & chapels ------------------------------ */

export const LOT_STATUS_LABEL: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
  occupied: "Occupied",
  for_transfer: "For transfer",
  on_hold: "On hold",
  maintenance_hold: "Maintenance hold",
};

/** The order a lot report reads: the sellable states first, the holds last. */
const LOT_STATUS_ORDER = [
  "available",
  "reserved",
  "sold",
  "occupied",
  "for_transfer",
  "on_hold",
  "maintenance_hold",
];

export function lotStatusLabel(status: string): string {
  return LOT_STATUS_LABEL[status] ?? status;
}

export type ReportLot = {
  status: string;
  reserved_at?: string | null;
  sold_at?: string | null;
};

export type LotRollupRow = {
  status: string;
  label: string;
  /** Lots on the books now, in this state. */
  count: number;
  /** Lots that entered the state inside the window (from the recorded date). */
  moved_in_period: number;
};

/**
 * Lot occupancy: a snapshot count per status, plus how many entered that state
 * inside the window. "Entered" only exists where the lot records the date —
 * reserved_at for a reservation, sold_at for a sale/occupation — so nothing is
 * guessed for the statuses the property service tracks without a date.
 */
export function lotRollup(
  lots: readonly ReportLot[],
  period: ReportPeriod,
): LotRollupRow[] {
  const statuses = LOT_STATUS_ORDER.filter((status) =>
    lots.some((lot) => lot.status === status),
  );
  for (const lot of lots) {
    if (!statuses.includes(lot.status)) statuses.push(lot.status);
  }
  return statuses.map((status) => {
    const rows = lots.filter((lot) => lot.status === status);
    const movedIn = rows.filter((lot) => {
      const date =
        status === "reserved" ? lot.reserved_at : status === "sold" || status === "occupied" ? lot.sold_at : null;
      return date ? inPeriod(date, period) : false;
    }).length;
    return { status, label: lotStatusLabel(status), count: rows.length, moved_in_period: movedIn };
  });
}

export const CHAPEL_CLASS_TEXT: Record<string, string> = {
  common: "Common",
  private: "Private",
};

export type ReportChapel = {
  id: string;
  name: string;
  chapel_class: string;
  active: boolean;
};

export type ReportChapelBooking = {
  resource_id: string;
  status: string;
  dates: string[];
};

export type ReportChapelBlock = {
  resource_id: string;
  from: string;
  to: string;
};

export type ChapelRollupRow = {
  id: string;
  name: string;
  chapel_class: string;
  active: boolean;
  booked_days: number;
  closed_days: number;
  open_days: number;
  /** Booked open days ÷ open days, whole percent; null when the chapel has no open day. */
  occupancy_pct: number | null;
};

/**
 * Chapel occupancy for the window: for each chapel on the books, how many of its
 * own days a non-cancelled booking holds, how many days a recorded closure takes
 * out of service, and the occupancy over what is left. A hold counts exactly as
 * the scheduling record does (a customer's cart is a booking until staff cancel
 * it — the board says the same thing).
 */
export function chapelRollup(
  chapels: readonly ReportChapel[],
  bookings: readonly ReportChapelBooking[],
  blocks: readonly ReportChapelBlock[],
  period: ReportPeriod,
): ChapelRollupRow[] {
  if (!period.from || !period.to) return [];
  const window = eachDate(period.from, period.to);
  return chapels.map((chapel) => {
    const booked = new Set(
      bookings
        .filter(
          (booking) => booking.resource_id === chapel.id && booking.status !== "cancelled",
        )
        .flatMap((booking) => booking.dates)
        .filter((date) => inPeriod(date, period)),
    );
    const closed = new Set(
      blocks
        .filter((block) => block.resource_id === chapel.id)
        .flatMap((block) => eachDate(block.from, block.to))
        .filter((date) => inPeriod(date, period)),
    );
    const open = window.filter((date) => !closed.has(date));
    const bookedOpen = [...booked].filter((date) => !closed.has(date)).length;
    return {
      id: chapel.id,
      name: chapel.name,
      chapel_class: chapel.chapel_class,
      active: chapel.active,
      booked_days: bookedOpen,
      closed_days: closed.size,
      open_days: open.length,
      occupancy_pct: percentOf(bookedOpen, open.length),
    };
  });
}

/* ------------------------------ cases by stage --------------------------- */

export type ReportCase = {
  stage: string;
  created_at: string;
};

export type CaseStageRow = {
  stage: CaseStage;
  label: string;
  count: number;
  share_pct: number | null;
};

/**
 * Cases opened in the window, by the stage they are on today — the ops board's
 * own stage words and order, so the two screens can never describe the pipeline
 * differently.
 */
export function caseRollup(
  cases: readonly ReportCase[],
  period: ReportPeriod,
): CaseStageRow[] {
  const opened = cases.filter((entry) => inPeriod(entry.created_at, period));
  return CASE_STAGES.map((stage) => {
    const count = opened.filter((entry) => entry.stage === stage).length;
    return {
      stage,
      label: stageLabel(stage),
      count,
      share_pct: percentOf(count, opened.length),
    };
  });
}

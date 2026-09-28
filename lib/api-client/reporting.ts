/**
 * Typed data access for Module I dashboard + reporting screens.
 *
 * The reporting-analytics service is unbuilt, so there is nothing to query for a
 * pre-aggregated summary. Rather than serve a SEPARATE fixture — which is how the
 * dashboard came to claim 6 cases while the live cases board showed 4 — this module
 * AGGREGATES THE SAME CLIENTS THE SCREENS USE, in every mode.
 *
 * That makes divergence structurally impossible: fixture mode aggregates fixtures, live
 * mode aggregates live services, and the dashboard cannot contradict a screen in either.
 * When reporting-analytics ships, this becomes a single query behind the same signature.
 *
 * Two figures are NOT derivable from those clients and are therefore `null` rather than
 * invented — the screen renders them as "—":
 *   · collections_this_month_cents — needs payment dates; the invoice list has no history
 *   · activity — no inquiries or orders list endpoint exists
 *
 * `/staff/reports` reads four of the office's own reports through this module too. Each
 * one derives from a REAL recorded source and says what reporting-analytics will supply
 * when live — no report invents a figure:
 *   · collections — the durable billing store's recorded payments (fixture mode only:
 *     the frozen billing list contract names no payments list, so live mode reports the
 *     report unavailable rather than an empty cash box);
 *   · sales by agent — the durable order store. Orders record no agent attribution yet
 *     (`lib/commission.ts` says the same), so every row is "Not recorded" and the screen
 *     names crm-families as the missing input; a live order admin does not exist either,
 *     so the 503 is caught and reported as unavailable;
 *   · lot & chapel occupancy — the property lots and the scheduling chapel bookings the
 *     staff Schedule already reads;
 *   · cases by stage — the operations case store, using the ops board's own stage words.
 *
 * A source that cannot be read leaves its report `null` (the occupancy report carries one
 * flag per half) and the page renders an honest unavailable state — never an empty chart.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { liveModeEnabled } from "@/lib/live-mode";
import {
  buildPaymentAlerts,
  type PaymentAlertSource,
  type PaymentAlertSummary,
} from "@/lib/payment-alerts";
import { listCases } from "@/lib/api-client/operations";
import { listLots } from "@/lib/api-client/property";
import { billingLiveModeEnabled, listInvoices } from "@/lib/api-client/finance";
import { listFixturePayments } from "@/lib/api-client/billing-store";
import { getChapelAdminView } from "@/lib/api-client/chapel-admin";
import { listOrders, type OrderLifecycleStatus } from "@/lib/api-client/commerce";
import { INSTRUMENT_LABEL } from "@/lib/contracts/payment-capture";
import { inPeriod } from "@/lib/period";
import {
  caseRollup,
  chapelRollup,
  collectionsByMonth,
  lotRollup,
  type CaseStageRow,
  type ChapelRollupRow,
  type CollectionsMonthRow,
  type LotRollupRow,
  type ReportPeriod,
} from "@/lib/reports";

/**
 * reporting-analytics is unbuilt, so the switch is declared but cannot be entered
 * (lib/live-mode.ts, state "none"): this module aggregates the same clients the
 * screens use in every mode and has no live branch to select.
 */
export function reportingLiveModeEnabled(): boolean {
  return liveModeEnabled("reporting");
}

export type CaseSummary = {
  total: number;
  active: number;
  completed: number;
  new_today: number;
};

export type LotSummary = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  occupied: number;
};

export type FinanceSummary = {
  total_invoices: number;
  overdue_count: number;
  total_outstanding_cents: number;
  /** null — needs payment dates the invoice list does not carry. */
  collections_this_month_cents: number | null;
  currency: string;
};

/** null throughout — no inquiries or orders list endpoint exists to count. */
export type ActivitySummary = {
  new_inquiries_this_month: number | null;
  orders_this_month: number | null;
};

export type DashboardSummary = {
  /** null when the section's source could not be read (no scope, upstream down). */
  cases: CaseSummary | null;
  lots: LotSummary | null;
  finance: FinanceSummary | null;
  /**
   * The dashboard's due-soon / overdue payments, derived through the shared two-day
   * rule (`lib/payment-alerts.ts`). null when the billing source could not be read.
   */
  payment_alerts: PaymentAlertSummary | null;
  activity: ActivitySummary;
};

function sameUtcDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

/**
 * Aggregates the module clients. One failing source nulls its own section rather than
 * taking the whole dashboard down — a staff member without `billing:read` still gets the
 * operations and property tables.
 */
export async function getDashboardSummary(now: Date = new Date()): Promise<DashboardSummary> {
  const [casesResult, lotsResult, invoicesResult] = await Promise.allSettled([
    listCases(),
    listLots(),
    listInvoices(now),
  ]);

  let cases: CaseSummary | null = null;
  if (casesResult.status === "fulfilled") {
    const all = casesResult.value;
    const completed = all.filter((c) => c.stage === "completed").length;
    cases = {
      total: all.length,
      active: all.length - completed,
      completed,
      new_today: all.filter((c) => sameUtcDay(c.created_at, now)).length,
    };
  }

  let lots: LotSummary | null = null;
  if (lotsResult.status === "fulfilled") {
    const all = lotsResult.value;
    const count = (s: string) => all.filter((l) => l.status === s).length;
    lots = {
      total: all.length,
      available: count("available"),
      reserved: count("reserved"),
      sold: count("sold"),
      occupied: count("occupied"),
    };
  }

  let finance: FinanceSummary | null = null;
  let paymentAlerts: PaymentAlertSummary | null = null;
  if (invoicesResult.status === "fulfilled") {
    const all = invoicesResult.value;
    // The dashboard alert surface: the same invoices, classified by the shared
    // two-day rule the family reminder runs on — never a second due-soon threshold.
    const sources: PaymentAlertSource[] = all.map((invoice) => ({
      id: invoice.id,
      reference: invoice.invoice_number,
      client: invoice.customer_name,
      amount_cents: Math.max(0, invoice.total_cents - invoice.paid_cents),
      due_at: invoice.due_at,
    }));
    paymentAlerts = buildPaymentAlerts(sources, now);
    finance = {
      total_invoices: all.length,
      // ONE meaning of "overdue": the date rule above, not the stored status (which keeps a
      // part-paid invoice `partial` however late it is). The billing screen reads the same
      // rule, so the dashboard can no longer read 2 here and 6 in the band.
      overdue_count: paymentAlerts.overdue_count,
      total_outstanding_cents: all.reduce(
        (sum, i) => sum + Math.max(0, i.total_cents - i.paid_cents),
        0,
      ),
      collections_this_month_cents: null,
      currency: all[0]?.currency ?? "PHP",
    };
  }

  return {
    cases,
    lots,
    finance,
    payment_alerts: paymentAlerts,
    activity: { new_inquiries_this_month: null, orders_this_month: null },
  };
}

/* ============================================================================
 * /staff/reports — the four office reports
 * ========================================================================= */

/* ------------------------------ collections ------------------------------ */

type RawRecordedPayment = Awaited<ReturnType<typeof listFixturePayments>>[number];

/** One recorded payment, joined to the invoice it settles for the payer's name. */
export type RecordedCollectionPayment = {
  id: string;
  received_on: string;
  invoice_number: string;
  customer_name: string;
  method_label: string;
  amount_cents: number;
};

export type CollectionsReport = {
  /** false when this mode cannot list payments at all (live: no payments-list endpoint). */
  available: boolean;
  months: CollectionsMonthRow[];
  payments: RecordedCollectionPayment[];
  total_cents: number;
  count: number;
};

/**
 * Collections over a period: the payments the counter recorded, newest first, grouped
 * by the month they were received. The durable billing store is the source; a period
 * with no payment is an empty result, which the page renders as the honest empty state.
 */
export async function loadCollectionsReport(period: ReportPeriod): Promise<CollectionsReport> {
  if (billingLiveModeEnabled()) {
    return { available: false, months: [], payments: [], total_cents: 0, count: 0 };
  }
  const [payments, invoices] = await Promise.all([listFixturePayments(), listInvoices()]);
  const byNumber = new Map(invoices.map((invoice) => [invoice.invoice_number, invoice]));
  const inWindow = payments.filter((payment: RawRecordedPayment) =>
    inPeriod(payment.received_on, period),
  );
  return {
    available: true,
    months: collectionsByMonth(payments, period),
    payments: [...inWindow]
      .sort((a, b) => {
        if (a.received_on !== b.received_on) return b.received_on.localeCompare(a.received_on);
        return b.recorded_at.localeCompare(a.recorded_at);
      })
      .map((payment) => ({
        id: payment.id,
        received_on: payment.received_on,
        invoice_number: payment.invoice_number,
        customer_name: byNumber.get(payment.invoice_number)?.customer_name ?? "",
        method_label: INSTRUMENT_LABEL[payment.method] ?? payment.method,
        amount_cents: payment.amount_cents,
      })),
    total_cents: inWindow.reduce((sum, payment) => sum + payment.amount_cents, 0),
    count: inWindow.length,
  };
}

/* ----------------------------- sales by agent ---------------------------- */

/** One sale's recorded facts. The agent is deliberately absent — nothing records one. */
export type SalesOrderRow = {
  number: string;
  placed_at: string;
  customer_name: string;
  total_cents: number;
  currency: string;
  lifecycle_status: OrderLifecycleStatus;
};

export type SalesByAgentReport = {
  available: boolean;
  orders: SalesOrderRow[];
  total_cents: number;
  currency: string;
  /** How many of the orders in the window were cancelled (shown, never hidden). */
  cancelled: number;
};

/**
 * Sales in a period, with no agent column filled: orders do not record attribution
 * (`lib/commission.ts` carries the same limitation). A live order-admin read does not
 * exist, so its 503 becomes `available: false` — the page names the missing input
 * instead of erroring.
 */
export async function loadSalesByAgentReport(period: ReportPeriod): Promise<SalesByAgentReport> {
  try {
    const orders = await listOrders();
    const placed = orders.filter(
      (record) => record.order.placed_at && inPeriod(record.order.placed_at, period),
    );
    return {
      available: true,
      orders: [...placed]
        .sort((a, b) => (b.order.placed_at ?? "").localeCompare(a.order.placed_at ?? ""))
        .map((record) => ({
          number: record.order.number,
          placed_at: record.order.placed_at ?? "",
          customer_name: record.customer.name,
          total_cents: record.order.total_cents,
          currency: record.order.currency,
          lifecycle_status: record.lifecycle_status,
        })),
      total_cents: placed.reduce((sum, record) => sum + record.order.total_cents, 0),
      currency: placed[0]?.order.currency ?? "PHP",
      cancelled: placed.filter((record) => record.lifecycle_status === "cancelled").length,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      return { available: false, orders: [], total_cents: 0, currency: "PHP", cancelled: 0 };
    }
    throw err;
  }
}

/* ------------------------- lot & chapel occupancy ------------------------ */

export type OccupancyReport = {
  /** null when the lot source could not be read — the page names it plainly. */
  lots: LotRollupRow[] | null;
  /** null when the chapel source could not be read. */
  chapels: ChapelRollupRow[] | null;
  period: ReportPeriod;
};

/**
 * Lot occupancy (snapshot + arrivals inside the window) and chapel occupancy (booked
 * days over open days, closures excluded). One failing source nulls its own half —
 * the other still renders.
 */
export async function loadOccupancyReport(period: ReportPeriod): Promise<OccupancyReport> {
  const [lotsResult, chapelsResult] = await Promise.allSettled([
    listLots(),
    getChapelAdminView(),
  ]);
  const lots = lotsResult.status === "fulfilled" ? lotRollup(lotsResult.value, period) : null;
  const chapels =
    chapelsResult.status === "fulfilled"
      ? chapelRollup(
          chapelsResult.value.chapels,
          chapelsResult.value.bookings,
          chapelsResult.value.blocks,
          period,
        )
      : null;
  return { lots, chapels, period };
}

/* ------------------------------ cases by stage --------------------------- */

export type CasesByStageReport = {
  rows: CaseStageRow[];
  total: number;
};

/** Cases opened in the window, grouped by the stage they are on today. */
export async function loadCasesByStageReport(period: ReportPeriod): Promise<CasesByStageReport> {
  const cases = await listCases();
  const rows = caseRollup(cases, period);
  return { rows, total: rows.reduce((sum, row) => sum + row.count, 0) };
}

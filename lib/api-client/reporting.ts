/**
 * Typed data access for Module I dashboard screens (summary stats).
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
 */
import { listCases } from "@/lib/api-client/operations";
import { listLots } from "@/lib/api-client/property";
import { listInvoices } from "@/lib/api-client/finance";

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
  if (invoicesResult.status === "fulfilled") {
    const all = invoicesResult.value;
    finance = {
      total_invoices: all.length,
      overdue_count: all.filter((i) => i.status === "overdue").length,
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
    activity: { new_inquiries_this_month: null, orders_this_month: null },
  };
}

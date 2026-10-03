import Link from "next/link";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { LineChart, StatCard } from "@/components/kit";
import { PageHeader } from "@/components/ui/page";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { formatMinorUnits } from "@/lib/money";
import { inPeriod } from "@/lib/period";
import { listInvoices, type Invoice } from "@/lib/api-client/finance";
import { listOrders } from "@/lib/api-client/commerce";
import { listFixturePayments } from "@/lib/api-client/billing-store";
import { outstandingTotal, overdueTotal, receivedInPeriod } from "@/lib/receivables";
import {
  ANALYTICS_RANGES,
  ANALYTICS_RANGE_LABEL,
  COLLECTIONS_BLANK_REASON,
  analyticsWindow,
  collectionsSeries,
  isAnalyticsRange,
  salesSeries,
  trailingMonthWindow,
} from "@/lib/analytics";

export const metadata = { title: "Analytics — Admin Portal" };

/**
 * Analytics — how the business is doing, at a glance.
 *
 * FOUR FIGURES and TWO CHARTS, nothing else: what came in (collections), what was
 * sold (sales), what is still owed (outstanding) and what is late (overdue). Every
 * figure is derived from the same recorded store its own screen reads — the counter
 * payment journal, the durable order store and the recorded invoices — so no number
 * is restated. There is no source table, no rules note and no intro: the chart and
 * the tile already say what they are.
 *
 * The chart grammar is the kit's one device (`components/kit/line-chart.tsx`):
 * mandatory zero baseline, ≤4 gridlines, ≤6 x labels, tabular figures, a named empty
 * state, and a draw-on-view stroke that `prefers-reduced-motion` removes. A series
 * with no record is named, never drawn as a zero line.
 *
 * READ-ONLY: this screen renders recorded numbers and links to the screens that own
 * the records. It posts, sends and schedules nothing. The gate is the finance read
 * the figures aggregate (`accounting:read` / `billing:read`), the same any-of gate
 * `/staff/reports` carries.
 */

type AnalyticsSearch = { range?: string };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["accounting:read", "billing:read"])) {
    return (
      <>
        <PageHeader title="Analytics" />
        <ForbiddenState requiredScopes={["accounting:read", "billing:read"]} />
      </>
    );
  }

  const params = await searchParams;
  const range = isAnalyticsRange(params.range) ? params.range : "month";
  const now = new Date();
  const window = analyticsWindow(range, now);
  const chartWindow = trailingMonthWindow(now, 6);

  const [invoicesResult, ordersResult, paymentsResult] = await Promise.allSettled([
    listInvoices(now),
    listOrders(),
    listFixturePayments(),
  ]);

  const invoices: Invoice[] | null =
    invoicesResult.status === "fulfilled" ? invoicesResult.value : null;
  const orders =
    ordersResult.status === "fulfilled"
      ? ordersResult.value.map((record) => ({
          placed_at: record.order.placed_at ?? "",
          total_cents: record.order.total_cents,
        }))
      : null;
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : null;

  const received = payments ? receivedInPeriod(payments, window) : null;
  const outstanding = invoices ? outstandingTotal(invoices) : null;
  const hasOpenInvoices = invoices !== null && invoices.some((invoice) => invoice.total_cents - invoice.paid_cents > 0);
  const overdue = invoices ? overdueTotal(invoices, now) : null;
  const salesInWindow = orders
    ? orders.filter((order) => inPeriod(order.placed_at, window))
    : null;
  const salesTotal = salesInWindow
    ? salesInWindow.reduce((sum, order) => sum + order.total_cents, 0)
    : null;

  const salesPoints = orders ? salesSeries(orders, chartWindow) : [];
  const collectionPoints = payments ? collectionsSeries(payments, chartWindow) : [];
  const hasAnyPayment = payments !== null && payments.length > 0;

  return (
    <div className="stack-4">
      <PageHeader
        title="Analytics"
        lead="How the business is doing."
        actions={
          <nav className="lot-rec-tabs" aria-label="Period">
            <ul>
              {ANALYTICS_RANGES.map((key) => (
                <li key={key}>
                  <Link
                    href={`/staff/analytics?range=${key}`}
                    aria-current={key === range ? "page" : undefined}
                  >
                    {ANALYTICS_RANGE_LABEL[key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        }
      />

      <div className="kpi-grid">
        <StatCard
          label="Collections"
          value={received === null || received.count === 0 ? "—" : formatMinorUnits(received.total_cents)}
          sub={
            received === null
              ? "the payment journal could not be read"
              : received.count === 0
                ? "no payment in the period"
                : `${received.count} payment${received.count === 1 ? "" : "s"} in the period`
          }
        />
        <StatCard
          label="Sales"
          value={salesTotal === null || salesTotal === 0 ? "—" : formatMinorUnits(salesTotal)}
          sub={
            salesTotal === null
              ? "the order store could not be read"
              : salesInWindow && salesInWindow.length > 0
                ? `${salesInWindow.length} order${salesInWindow.length === 1 ? "" : "s"} in the period`
                : "no order in the period"
          }
        />
        <StatCard
          label="Outstanding"
          value={outstanding === null || !hasOpenInvoices ? "—" : formatMinorUnits(outstanding)}
          sub={
            outstanding === null
              ? "the invoices could not be read"
              : hasOpenInvoices
                ? "still owed"
                : "nothing owed"
          }
        />
        <StatCard
          label="Overdue"
          value={overdue === null || overdue.count === 0 ? "—" : formatMinorUnits(overdue.amount_cents)}
          sub={
            overdue === null
              ? "the invoices could not be read"
              : overdue.count > 0
                ? `${overdue.count} account${overdue.count === 1 ? "" : "s"} past due`
                : "nothing past due"
          }
        />
      </div>

      <div className="analytics-charts">
        <div className="card">
          <div className="card__body">
            {payments === null ? (
              <ErrorState message="The payment journal could not be read, so collections has no series." />
            ) : (
              <LineChart
                title="Collections · last 6 months"
                points={collectionPoints}
                kind="peso_cents"
                tone="gold"
                unitLabel="₱ · counter payments"
                needLabel="a second month of payments"
                emptyNote={hasAnyPayment ? undefined : COLLECTIONS_BLANK_REASON}
                footnote="The counter payment journal."
                dataTestId="analytics-collections-chart"
              />
            )}
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            {orders === null ? (
              <ErrorState message="The order store could not be read, so sales has no series." />
            ) : (
              <LineChart
                title="Sales · last 6 months"
                points={salesPoints}
                kind="peso_cents"
                tone="gold"
                unitLabel="₱ · recorded orders"
                needLabel="a second month of orders"
                footnote="The durable order store."
                dataTestId="analytics-sales-chart"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { EmptyState, LineChart, StatCard, StatusChip } from "@/components/kit";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { formatMinorUnits } from "@/lib/money";
import { inPeriod, periodLabel } from "@/lib/period";
import { listInvoices, type Invoice } from "@/lib/api-client/finance";
import { listLots, type Lot } from "@/lib/api-client/property";
import { listOrders } from "@/lib/api-client/commerce";
import { listInquiries, type Inquiry } from "@/lib/api-client/crm";
import { listFixturePayments } from "@/lib/api-client/billing-store";
import { outstandingTotal, overdueTotal, duesAging, receivedInPeriod } from "@/lib/receivables";
import {
  ANALYTICS_RANGES,
  ANALYTICS_RANGE_LABEL,
  ANALYTICS_SOURCES,
  COLLECTIONS_BLANK_REASON,
  analyticsWindow,
  collectionsSeries,
  inquiryConversion,
  isAnalyticsRange,
  lotAvailability,
  salesSeries,
  trailingMonthWindow,
} from "@/lib/analytics";

export const metadata = { title: "Analytics — Admin Portal" };

/**
 * Staff Analytics — the money and the pipeline, at a glance.
 *
 * The plan (§9.1) has no reporting-analytics service to query, so every figure is derived
 * from the same recorded stores the screens already read: the counter's payment journal
 * (collections), the durable order store (sales), the recorded invoices (dues + aging), the
 * CRM inquiries (conversion) and the property lots (availability). A source that cannot be
 * read names itself; a metric with no recorded series shows a named blank, never a zero line.
 *
 * THE CHART. The lead line is the one data-ink device the product has (`components/kit`
 * `LineChart`): a mandatory zero baseline, at most four gridlines and six x labels, a single
 * draw-on-view stroke that `prefers-reduced-motion` removes, and a named empty state. Sales
 * is the real recorded series (the order store's own months); collections plots the counter's
 * journal and shows the journal's honest empty state when no payment has been recorded.
 *
 * READ-ONLY: this screen renders recorded numbers and links to the screens that own the
 * records. It posts, sends and schedules nothing.
 */

type AnalyticsSearch = { range?: string };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearch>;
}) {
  const session = await requireSessionOrRedirect();
  // Provisional finance scope: the frozen vocabulary has no analytics scope, and every
  // figure here is a statement about billing/accounting records — the same any-of gate
  // `/staff/reports` uses. The page says which source it could not read.
  if (!hasAnyScope(session.scopes, ["accounting:read", "billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Analytics" />
        <PageSection>
          <ForbiddenState requiredScopes={["accounting:read", "billing:read"]} />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const range = isAnalyticsRange(params.range) ? params.range : "month";
  const now = new Date();
  const window = analyticsWindow(range, now);
  const chartWindow = trailingMonthWindow(now, 6);

  const [invoicesResult, lotsResult, ordersResult, inquiriesResult, paymentsResult] =
    await Promise.allSettled([
      listInvoices(now),
      listLots(),
      listOrders(),
      listInquiries(),
      listFixturePayments(),
    ]);

  const invoices: Invoice[] | null =
    invoicesResult.status === "fulfilled" ? invoicesResult.value : null;
  const lots: Lot[] | null = lotsResult.status === "fulfilled" ? lotsResult.value : null;
  const orders =
    ordersResult.status === "fulfilled"
      ? ordersResult.value.map((record) => ({
          placed_at: record.order.placed_at ?? "",
          total_cents: record.order.total_cents,
        }))
      : null;
  const inquiries: Inquiry[] | null =
    inquiriesResult.status === "fulfilled" ? inquiriesResult.value : null;
  const payments = paymentsResult.status === "fulfilled" ? paymentsResult.value : null;

  const outstanding = invoices ? outstandingTotal(invoices) : null;
  const overdue = invoices ? overdueTotal(invoices, now) : null;
  const aging = invoices ? duesAging(invoices, now) : null;
  const received = payments ? receivedInPeriod(payments, window) : null;
  const salesInWindow = orders
    ? orders.filter((order) => inPeriod(order.placed_at, window))
    : null;
  const salesTotal = salesInWindow
    ? salesInWindow.reduce((sum, order) => sum + order.total_cents, 0)
    : null;
  const salesCount = salesInWindow?.length ?? null;
  const conversion = inquiries ? inquiryConversion(inquiries, window) : null;
  const availability = lots ? lotAvailability(lots) : null;

  const salesPoints = orders ? salesSeries(orders, chartWindow) : [];
  const collectionPoints = payments ? collectionsSeries(payments, chartWindow) : [];

  const hasRecordedPayments = payments !== null && payments.length > 0;

  const rangeHref = (next: string) => `/staff/analytics?range=${next}`;

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="The money and the pipeline"
        lead="Collections, dues, sales and the pipeline over the recorded stores."
        actions={<StatusChip tone="neutral">Read-only</StatusChip>}
      />

      <PageSection>
        <nav className="lot-rec-tabs" aria-label="Analytics period">
          <ul>
            {ANALYTICS_RANGES.map((key) => (
              <li key={key}>
                <Link href={rangeHref(key)} aria-current={key === range ? "page" : undefined}>
                  {ANALYTICS_RANGE_LABEL[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-muted">Showing {periodLabel(window)}.</p>

        <div className="kpi-grid">
          <StatCard
            label="Collections"
            value={
              received === null
                ? "—"
                : hasRecordedPayments
                  ? formatMinorUnits(received.total_cents)
                  : "—"
            }
            sub={
              received === null
                ? "the payment journal could not be read"
                : hasRecordedPayments
                  ? `${received.count} payments received in this period`
                  : "no payment recorded yet"
            }
          />
          <StatCard
            label="Outstanding"
            value={outstanding === null ? "—" : formatMinorUnits(outstanding)}
            sub={invoices ? `${invoices.length} recorded invoices` : "invoices could not be read"}
          />
          <StatCard
            label="Overdue"
            value={overdue === null ? "—" : formatMinorUnits(overdue.amount_cents)}
            sub={overdue ? `${overdue.count} accounts past due` : "invoices could not be read"}
          />
          <StatCard
            label="Sales"
            value={salesTotal === null ? "—" : formatMinorUnits(salesTotal)}
            sub={salesCount === null ? "orders could not be read" : `${salesCount} orders placed`}
          />
          <StatCard
            label="Inquiry → order"
            value={conversion === null || conversion.pct === null ? "—" : `${conversion.pct}%`}
            sub={
              conversion === null
                ? "inquiries could not be read"
                : conversion.total === 0
                  ? "no inquiry received in this period"
                  : `${conversion.converted} of ${conversion.total} converted`
            }
          />
          <StatCard
            label="Lots available"
            value={availability === null ? "—" : availability.available}
            sub={
              availability
                ? `of ${availability.total} · ${availability.reserved} reserved`
                : "lots could not be read"
            }
          />
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Trends</h2>
        <div className="analytics-charts">
          <div className="card">
            <div className="card__body">
              {orders === null ? (
                <ErrorState message="The order store could not be read, so sales has no series." />
              ) : (
                <LineChart
                  title="Sales by month"
                  points={salesPoints}
                  kind="peso_cents"
                  tone="gold"
                  unitLabel="₱ · recorded orders"
                  needLabel="a recorded order with a date"
                  footnote="From the durable order store — the orders the office actually placed."
                  dataTestId="analytics-sales-chart"
                />
              )}
            </div>
          </div>
          <div className="card">
            <div className="card__body">
              {payments === null ? (
                <ErrorState message="The payment journal could not be read, so collections has no series." />
              ) : (
                <LineChart
                  title="Collections by month"
                  points={collectionPoints}
                  kind="peso_cents"
                  tone="gold"
                  unitLabel="₱ · counter payments"
                  needLabel="a payment recorded at the counter"
                  emptyNote={COLLECTIONS_BLANK_REASON}
                  footnote="From the counter's payment journal — a payment and its receipt are one event."
                  dataTestId="analytics-collections-chart"
                />
              )}
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <div className="analytics-panels">
          <div className="card">
            <div className="card__body">
              <h2 className="page-section-title">Dues aging</h2>
              <p className="text-sm text-muted">
                Derived from each invoice&rsquo;s due date and balance — never a stored bucket.
              </p>
              {aging === null ? (
                <ErrorState message="The invoices could not be read, so aging is unavailable." />
              ) : (
                <ul className="aging" data-testid="analytics-aging">
                  {aging.map((row) => (
                    <li key={row.bucket} className="aging__row">
                      <span className="aging__label">{row.label}</span>
                      <strong className="aging__amount">{formatMinorUnits(row.amount_cents)}</strong>
                      <span className="aging__count">
                        {row.count} {row.count === 1 ? "account" : "accounts"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__body">
              <h2 className="page-section-title">Lots</h2>
              {availability === null ? (
                <ErrorState message="The property lots could not be read, so availability is unavailable." />
              ) : availability.total === 0 ? (
                <EmptyState
                  title="No lots recorded"
                  hint="A lot added on the Property map appears here with its recorded status."
                />
              ) : (
                <>
                  <div className="stackbar" aria-hidden="true">
                    {availability.available > 0 ? (
                      <i
                        className="stackbar__seg seg--success"
                        style={{ width: `${(availability.available / availability.total) * 100}%` }}
                      />
                    ) : null}
                    {availability.reserved > 0 ? (
                      <i
                        className="stackbar__seg seg--warning"
                        style={{ width: `${(availability.reserved / availability.total) * 100}%` }}
                      />
                    ) : null}
                    {availability.sold > 0 ? (
                      <i
                        className="stackbar__seg seg--info"
                        style={{ width: `${(availability.sold / availability.total) * 100}%` }}
                      />
                    ) : null}
                    {availability.occupied > 0 ? (
                      <i
                        className="stackbar__seg seg--neutral"
                        style={{ width: `${(availability.occupied / availability.total) * 100}%` }}
                      />
                    ) : null}
                  </div>
                  <div className="legend">
                    <span className="legend__item">
                      <i className="dot dot--success" /> Available · {availability.available}
                    </span>
                    <span className="legend__item">
                      <i className="dot dot--warning" /> Reserved · {availability.reserved}
                    </span>
                    <span className="legend__item">
                      <i className="dot dot--info" /> Sold · {availability.sold}
                    </span>
                    <span className="legend__item">
                      <i className="dot dot--neutral" /> Occupied · {availability.occupied}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">Where every number comes from</h2>
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>
              The source each figure reads today, and the service that will produce it live.
            </caption>
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Source today</th>
                <th scope="col">Live service</th>
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_SOURCES.map((row) => (
                <tr key={row.metric}>
                  <th scope="row">{row.metric}</th>
                  <td>{row.source}</td>
                  <td className="text-muted">{row.live}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="analytics-notes">
          <Alert tone="info" title="The chart rules">
            Zero baseline · at most four gridlines · at most six x labels · tabular figures ·
            one value label, not one per point · the draw-on-view line is removed entirely under
            prefers-reduced-motion.
          </Alert>
          <Alert tone="info" title="A figure with no source is named">
            {COLLECTIONS_BLANK_REASON} A period with no data is named, never drawn as a zero line.
          </Alert>
        </div>
      </PageSection>
    </>
  );
}

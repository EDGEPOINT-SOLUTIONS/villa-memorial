import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
import { ApiError } from "@/lib/api-client/api-error";
import {
  loadCasesByStageReport,
  loadCollectionsReport,
  loadOccupancyReport,
  loadSalesByAgentReport,
  type CasesByStageReport,
  type CollectionsReport,
  type OccupancyReport,
  type SalesByAgentReport,
} from "@/lib/api-client/reporting";
import { ORDER_LIFECYCLE_LABEL } from "@/lib/api-client/commerce";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { businessToday } from "@/lib/contracts/payment-capture";
import { formatMinorUnits } from "@/lib/money";
import { datePeriod, monthBoundsOf, periodIsAll, periodLabel, type DatePeriod } from "@/lib/period";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  CHAPEL_CLASS_TEXT,
  REPORT_KEYS,
  REPORT_LABEL,
  isReportKey,
  monthLabel,
  type ReportKey,
} from "@/lib/reports";

export const metadata = { title: "Reports — Admin Portal" };

/**
 * Staff Reports — a small set of the reports the office actually asks for, over
 * recorded data.
 *
 * WHY THERE IS NO CHART SERVICE BEHIND THIS: reporting-analytics is unbuilt, so
 * each tab derives its rows from a source the product already reads
 * (`lib/api-client/reporting.ts`) and says in one line which service produces it
 * live. Nothing is invented: orders record no agent, so "Sales by agent" shows the
 * real sales with "Not recorded" in the agent column and names the missing input;
 * a period with no payment, order or case renders its honest empty state; a source
 * that cannot be read says so rather than showing an empty chart.
 *
 * The reports are tabs (server-rendered links, `aria-current`) so the screen opens
 * on the answer rather than a wall of prose. Each tab carries its own period form
 * above its table; the period is inclusive calendar dates.
 */

type ReportsSearch = {
  report?: string;
  from?: string;
  to?: string;
};

/** The one-line note under each report's heading: who produces it when live. */
const LIVE_SOURCE: Record<ReportKey, string> = {
  collections:
    "Live: reporting-analytics produces this from the billing service's recorded payments.",
  sales:
    "Live: reporting-analytics produces this from crm-families agent attribution — orders record none yet.",
  occupancy:
    "Live: reporting-analytics produces this from property-gis lots and the scheduling chapel calendar.",
  cases: "Live: reporting-analytics produces this from funeral-cases.",
};

function formatterCurrency(cents: number, currency = "PHP"): string {
  return formatMinorUnits(cents, currency);
}

function PeriodForm({
  report,
  period,
  label,
}: {
  report: ReportKey;
  period: DatePeriod;
  label: string;
}) {
  return (
    <form className="filter-bar" role="search">
      <input type="hidden" name="report" value={report} />
      <input
        className="input"
        type="date"
        name="from"
        defaultValue={period.from ?? ""}
        aria-label="From date"
      />
      <input
        className="input"
        type="date"
        name="to"
        defaultValue={period.to ?? ""}
        aria-label="To date"
      />
      <button className="btn btn--primary btn--sm" type="submit">
        {label}
      </button>
      {!periodIsAll(period) ? (
        <Link className="btn btn--ghost btn--sm" href={`/staff/reports?report=${report}`}>
          Clear
        </Link>
      ) : null}
    </form>
  );
}

function CollectionsPanel({
  report,
  period,
}: {
  report: CollectionsReport;
  period: DatePeriod;
}) {
  if (!report.available) {
    return (
      <Alert tone="info">
        <p className="mb-0">
          Live mode cannot list payments: the frozen billing list contract names no payments
          endpoint, so this report stays empty until reporting-analytics supplies one.
        </p>
      </Alert>
    );
  }
  if (report.count === 0) {
    return (
      <EmptyState
        title="No payments recorded in this period"
        hint={`Nothing was collected between ${periodLabel(period).toLowerCase()}. Record a payment at the counter and it appears here.`}
      />
    );
  }
  return (
    <>
      <div className="kpi-grid">
        <StatCard
          label="Collected"
          value={formatterCurrency(report.total_cents)}
          sub={periodLabel(period)}
        />
        <StatCard label="Payments" value={report.count} sub="recorded at the counter" />
        <StatCard
          label="Months"
          value={report.months.length}
          sub="with a collection"
        />
      </div>
      <div className="table-wrapper mt-4" tabIndex={0}>
        <table className="table">
          <caption>Collections by month, newest first.</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col" className="table__numeric">
                Payments
              </th>
              <th scope="col" className="table__numeric">
                Collected
              </th>
            </tr>
          </thead>
          <tbody>
            {report.months.map((month) => (
              <tr key={month.month}>
                <th scope="row">{monthLabel(month.month)}</th>
                <td className="table__numeric">{month.count}</td>
                <td className="table__numeric">{formatterCurrency(month.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-wrapper mt-4" tabIndex={0}>
        <table className="table">
          <caption>Each recorded payment, newest first.</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Invoice</th>
              <th scope="col">Customer</th>
              <th scope="col">Instrument</th>
              <th scope="col" className="table__numeric">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {report.payments.map((payment) => (
              <tr key={payment.id}>
                <td className="nowrap">{payment.received_on}</td>
                <td>
                  <code>{payment.invoice_number}</code>
                </td>
                <td>{payment.customer_name || <span className="text-muted">—</span>}</td>
                <td>{payment.method_label}</td>
                <td className="table__numeric">{formatterCurrency(payment.amount_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SalesPanel({ report, period }: { report: SalesByAgentReport; period: DatePeriod }) {
  if (!report.available) {
    return (
      <Alert tone="info">
        <p className="mb-0">
          The order admin is not wired in live mode (no order-admin contract), so this report
          stays empty until reporting-analytics supplies it.
        </p>
      </Alert>
    );
  }
  if (report.orders.length === 0) {
    return (
      <EmptyState
        title="No orders in this period"
        hint={`No sale was placed between ${periodLabel(period).toLowerCase()}.`}
      />
    );
  }
  return (
    <>
      <div className="kpi-grid">
        <StatCard
          label="Sales value"
          value={formatterCurrency(report.total_cents, report.currency)}
          sub="every order in the period, cancellations included"
        />
        <StatCard
          label="Orders"
          value={report.orders.length}
          sub={`${report.cancelled} cancelled, kept visible`}
        />
        <StatCard
          label="Attributed sales"
          value="0"
          sub="no agent is recorded on an order"
        />
      </div>
      <p className="text-sm text-muted mt-4">
        Orders do not record which agent sold them. Attribution is the missing input, supplied
        by crm-families — this table never guesses one.
      </p>
      <div className="table-wrapper" tabIndex={0}>
        <table className="table">
          <caption>Real orders in the period, with the agent column honestly empty.</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Placed</th>
              <th scope="col">Customer</th>
              <th scope="col" className="table__numeric">
                Value
              </th>
              <th scope="col">Fulfilment</th>
              <th scope="col">Agent</th>
            </tr>
          </thead>
          <tbody>
            {report.orders.map((order) => (
              <tr key={order.number}>
                <td>
                  <code>{order.number}</code>
                </td>
                <td className="nowrap">{order.placed_at.slice(0, 10)}</td>
                <td>{order.customer_name}</td>
                <td className="table__numeric">
                  {formatterCurrency(order.total_cents, order.currency)}
                </td>
                <td>{ORDER_LIFECYCLE_LABEL[order.lifecycle_status]}</td>
                <td>
                  <span className="text-muted">Not recorded</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OccupancyPanel({
  report,
  period,
}: {
  report: OccupancyReport;
  period: DatePeriod;
}) {
  return (
    <>
      <div className="kpi-grid">
        <StatCard
          label="Period"
          value={periodLabel(period)}
          sub="inclusive calendar days"
        />
        <StatCard
          label="Lots on the books"
          value={report.lots ? report.lots.reduce((sum, row) => sum + row.count, 0) : "—"}
          sub={report.lots ? "all recorded statuses" : "property lots could not be read"}
        />
        <StatCard
          label="Chapels"
          value={report.chapels ? report.chapels.length : "—"}
          sub={
            report.chapels
              ? "on the scheduling books"
              : "the chapel calendar could not be read"
          }
        />
      </div>

      <h3 className="page-section-title mt-4">Lots</h3>
      {report.lots === null ? (
        <ErrorState message="The property lots could not be read just now." />
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>
              A snapshot of every recorded lot, plus the lots that entered the state inside
              the period where the lot records the date.
            </caption>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col" className="table__numeric">
                  On the books now
                </th>
                <th scope="col" className="table__numeric">
                  Entered in period
                </th>
              </tr>
            </thead>
            <tbody>
              {report.lots.map((row) => (
                <tr key={row.status}>
                  <th scope="row">
                    <Link href={`/staff/property?status=${encodeURIComponent(row.status)}`}>
                      {row.label}
                    </Link>
                  </th>
                  <td className="table__numeric">{row.count}</td>
                  <td className="table__numeric">{row.moved_in_period}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="page-section-title mt-4">Chapels</h3>
      {report.chapels === null ? (
        <ErrorState message="The chapel calendar could not be read just now." />
      ) : report.chapels.length === 0 ? (
        <EmptyState
          title="No chapels on the books"
          hint="A chapel added on the Schedule screen appears here with its occupancy."
        />
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <caption>
              Booked days over open days for {periodLabel(period).toLowerCase()}; recorded
              closures are excluded from both sides of the ratio.
            </caption>
            <thead>
              <tr>
                <th scope="col">Chapel</th>
                <th scope="col">Class</th>
                <th scope="col" className="table__numeric">
                  Booked days
                </th>
                <th scope="col" className="table__numeric">
                  Closed days
                </th>
                <th scope="col" className="table__numeric">
                  Open days
                </th>
                <th scope="col" className="table__numeric">
                  Occupancy
                </th>
              </tr>
            </thead>
            <tbody>
              {report.chapels.map((chapel) => (
                <tr key={chapel.id}>
                  <th scope="row">
                    <span className="table__name">{chapel.name}</span>
                    {chapel.active ? null : (
                      <span className="table__sub">
                        <Badge tone="neutral">Inactive</Badge>
                      </span>
                    )}
                  </th>
                  <td>{CHAPEL_CLASS_TEXT[chapel.chapel_class] ?? chapel.chapel_class}</td>
                  <td className="table__numeric">{chapel.booked_days}</td>
                  <td className="table__numeric">{chapel.closed_days}</td>
                  <td className="table__numeric">{chapel.open_days}</td>
                  <td className="table__numeric">
                    {chapel.occupancy_pct === null ? "—" : `${chapel.occupancy_pct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CasesPanel({ report, period }: { report: CasesByStageReport; period: DatePeriod }) {
  if (report.total === 0) {
    return (
      <EmptyState
        title="No cases opened in this period"
        hint={`No case was opened between ${periodLabel(period).toLowerCase()}.`}
      />
    );
  }
  return (
    <>
      <div className="kpi-grid">
        <StatCard label="Cases opened" value={report.total} sub={periodLabel(period)} />
        <StatCard
          label="Completed"
          value={report.rows.find((row) => row.stage === "completed")?.count ?? 0}
          sub="of the cases opened in the period"
        />
        <StatCard
          label="On the board"
          value={
            report.total -
            (report.rows.find((row) => row.stage === "completed")?.count ?? 0)
          }
          sub="still in progress"
        />
      </div>
      <div className="table-wrapper mt-4" tabIndex={0}>
        <table className="table">
          <caption>
            Cases opened in the period, by the stage they are on today — the ops board&rsquo;s own
            stage order.
          </caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col" className="table__numeric">
                Cases
              </th>
              <th scope="col" className="table__numeric">
                Share
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.stage}>
                <th scope="row">
                  <Link href={`/staff/ops#stage-${row.stage}`}>{row.label}</Link>
                </th>
                <td className="table__numeric">{row.count}</td>
                <td className="table__numeric">
                  {row.share_pct === null ? "—" : `${row.share_pct}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportsSearch>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["accounting:read", "billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Reports" />
        <PageSection>
          <ForbiddenState requiredScopes={["accounting:read", "billing:read"]} />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const report: ReportKey = isReportKey(params.report) ? params.report : "collections";
  const requested = datePeriod(params.from, params.to);
  // An unbounded occupancy window is not a report; that tab opens on the current month.
  const period =
    report === "occupancy" && periodIsAll(requested)
      ? monthBoundsOf(businessToday())
      : requested;

  let collections: CollectionsReport | null = null;
  let sales: SalesByAgentReport | null = null;
  let occupancy: OccupancyReport | null = null;
  let cases: CasesByStageReport | null = null;
  try {
    if (report === "collections") collections = await loadCollectionsReport(period);
    else if (report === "sales") sales = await loadSalesByAgentReport(period);
    else if (report === "occupancy") occupancy = await loadOccupancyReport(period);
    else cases = await loadCasesByStageReport(period);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Reports" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "Unable to load this report."}
          />
        </PageSection>
      </>
    );
  }

  const query = new URLSearchParams();
  if (requested.from) query.set("from", requested.from);
  if (requested.to) query.set("to", requested.to);
  const tabHref = (key: ReportKey) => {
    const next = new URLSearchParams(query);
    next.set("report", key);
    return `/staff/reports?${next.toString()}`;
  };

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Reports"
        actions={<Badge tone="neutral">Read-only</Badge>}
      />

      <PageSection>
        <nav className="lot-rec-tabs" aria-label="Reports">
          <ul>
            {REPORT_KEYS.map((key) => (
              <li key={key}>
                <Link
                  href={tabHref(key)}
                  aria-current={key === report ? "page" : undefined}
                >
                  {REPORT_LABEL[key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="lot-rec-gap">{LIVE_SOURCE[report]}</p>

        <h2 className="page-section-title">{REPORT_LABEL[report]}</h2>
        <PeriodForm
          report={report}
          period={period}
          label={report === "occupancy" ? "Apply month" : "Apply period"}
        />

        {report === "collections" && collections ? (
          <CollectionsPanel report={collections} period={period} />
        ) : null}
        {report === "sales" && sales ? <SalesPanel report={sales} period={period} /> : null}
        {report === "occupancy" && occupancy ? (
          <OccupancyPanel report={occupancy} period={period} />
        ) : null}
        {report === "cases" && cases ? <CasesPanel report={cases} period={period} /> : null}
      </PageSection>
    </>
  );
}

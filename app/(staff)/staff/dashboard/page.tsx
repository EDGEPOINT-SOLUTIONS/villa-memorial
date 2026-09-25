import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState } from "@/components/ui/states";
import { PaymentAlertBand } from "./payment-alert-band";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api-client/reporting";
import { listBookings } from "@/lib/api-client/scheduling";
import { formatMinorUnits } from "@/lib/money";

export const metadata = { title: "Dashboard — Admin Portal" };

/**
 * Staff dashboard — villa-memorial design grammar: clickable KPI tiles, a
 * "business at a glance" visual strip (status breakdown bars + finance), then
 * glance tables (upcoming services / active cases). Everything is aggregated
 * from the SAME clients the screens use, so the dashboard can never contradict
 * a screen. Permission-gated: each figure only renders for a session that could
 * open its source screen.
 */

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

function Segment({ value, tone }: { value: number; tone: string }) {
  if (value <= 0) return null;
  return <span className={`stackbar__seg seg--${tone}`} style={{ width: `${value}%` }} />;
}

export default async function StaffDashboardPage() {
  const session = await requireSessionOrRedirect();
  const firstName = session.displayName.split(" ")[0];

  const canSeeCases = hasAnyScope(session.scopes, ["cases:read"]);
  const canSeeLots = hasAnyScope(session.scopes, ["property:read"]);
  const canSeeFinance = hasAnyScope(session.scopes, ["billing:read", "accounting:read"]);
  const canSeeSchedule = hasAnyScope(session.scopes, ["scheduling:read"]);

  let summary: DashboardSummary | null = null;
  let summaryFailed = false;
  if (canSeeCases || canSeeLots || canSeeFinance) {
    try {
      summary = await getDashboardSummary();
    } catch {
      summaryFailed = true;
    }
  }

  let upcoming: Awaited<ReturnType<typeof listBookings>> | null = null;
  if (canSeeSchedule) {
    try {
      const all = await listBookings();
      upcoming = all
        .filter((b) => b.status === "confirmed" && new Date(b.ends_at) >= new Date())
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .slice(0, 5);
    } catch {
      upcoming = null;
    }
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lots = summary?.lots;
  const cases = summary?.cases;
  const finance = summary?.finance;
  const paymentAlerts = summary?.payment_alerts ?? null;
  const casesOther = cases ? cases.total - cases.active - cases.completed : 0;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Good day, ${firstName}`}
        actions={
          <span className="text-sm text-muted">
            {today} ·{" "}
            <Badge tone="accent">Admin view</Badge>
          </span>
        }
      />

      {/* Red payment alert — dues two days out and past, from the shared two-day rule */}
      {canSeeFinance && paymentAlerts ? <PaymentAlertBand summary={paymentAlerts} /> : null}

      {/* KPI tiles — at-a-glance numbers */}
      <div className="kpi-grid">
        {canSeeCases && cases ? (
          <Link href="/staff/cases" className="card kpi-card">
            <div className="kpi-card__body">
              <div className="kpi-card__label">Active cases</div>
              <div className="kpi-card__value">{cases.active}</div>
              <div className="kpi-card__sub">
                {cases.completed} completed · {cases.new_today} new today
              </div>
            </div>
            <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
          </Link>
        ) : null}

        {canSeeLots && lots ? (
          <Link href="/staff/property" className="card kpi-card">
            <div className="kpi-card__body">
              <div className="kpi-card__label">Available lots</div>
              <div className="kpi-card__value">{lots.available}</div>
              <div className="kpi-card__sub">
                of {lots.total} lots · {lots.reserved} reserved
              </div>
            </div>
            <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
          </Link>
        ) : null}

        {canSeeFinance && finance ? (
          <Link href="/staff/billing" className="card kpi-card">
            <div className="kpi-card__body">
              <div className="kpi-card__label">Overdue accounts</div>
              <div className="kpi-card__value">{finance.overdue_count}</div>
              <div className="kpi-card__sub">of {finance.total_invoices} invoices</div>
            </div>
            <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
          </Link>
        ) : null}

        {canSeeFinance && finance ? (
          <Link href="/staff/billing" className="card kpi-card">
            <div className="kpi-card__body">
              <div className="kpi-card__label">Receivables</div>
              <div className="kpi-card__value">
                {formatMinorUnits(finance.total_outstanding_cents, finance.currency)}
              </div>
              <div className="kpi-card__sub">total outstanding balance</div>
            </div>
            <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {/* Business at a glance — visual breakdowns */}
      <PageSection>
        <h2 className="page-section-title">Business at a glance</h2>
        <div className="glance-grid">
          {canSeeCases && cases ? (
            <Card header={<h3>Cases</h3>}>
              <div className="stackbar" role="img" aria-label="Case status breakdown">
                <Segment value={pct(cases.active, cases.total)} tone="info" />
                <Segment value={pct(cases.completed, cases.total)} tone="success" />
                <Segment value={pct(casesOther, cases.total)} tone="neutral" />
              </div>
              <div className="legend">
                <span className="legend__item">
                  <i className="dot dot--info" /> Active · {cases.active}
                </span>
                <span className="legend__item">
                  <i className="dot dot--success" /> Completed · {cases.completed}
                </span>
                {casesOther > 0 ? (
                  <span className="legend__item">
                    <i className="dot dot--neutral" /> Other · {casesOther}
                  </span>
                ) : null}
              </div>
            </Card>
          ) : null}

          {canSeeLots && lots ? (
            <Card header={<h3>Memorial lots</h3>}>
              <div className="stackbar" role="img" aria-label="Lot status breakdown">
                <Segment value={pct(lots.available, lots.total)} tone="success" />
                <Segment value={pct(lots.reserved, lots.total)} tone="warning" />
                <Segment value={pct(lots.sold, lots.total)} tone="info" />
                <Segment value={pct(lots.occupied, lots.total)} tone="neutral" />
              </div>
              <div className="legend">
                <span className="legend__item">
                  <i className="dot dot--success" /> Available · {lots.available}
                </span>
                <span className="legend__item">
                  <i className="dot dot--warning" /> Reserved · {lots.reserved}
                </span>
                <span className="legend__item">
                  <i className="dot dot--info" /> Sold · {lots.sold}
                </span>
                <span className="legend__item">
                  <i className="dot dot--neutral" /> Occupied · {lots.occupied}
                </span>
              </div>
            </Card>
          ) : null}

          {canSeeFinance && finance ? (
            <Card header={<h3>Finance</h3>}>
              <div className="finance-glance">
                <div className="finance-glance__main">
                  <span className="finance-glance__label">Outstanding</span>
                  <strong className="finance-glance__amount">
                    {formatMinorUnits(finance.total_outstanding_cents, finance.currency)}
                  </strong>
                </div>
                <div className="finance-glance__row">
                  <span>Invoices</span>
                  <strong>{finance.total_invoices}</strong>
                </div>
                <div className="finance-glance__row">
                  <span>Overdue</span>
                  <strong>{finance.overdue_count}</strong>
                </div>
                <div className="finance-glance__row">
                  <span>Collected this month</span>
                  <strong>
                    {finance.collections_this_month_cents === null ? (
                      <span className="text-muted" title="Needs payment history — the invoice list does not carry it">
                        —
                      </span>
                    ) : (
                      formatMinorUnits(finance.collections_this_month_cents, finance.currency)
                    )}
                  </strong>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </PageSection>

      {/* Glance tables */}
      {canSeeSchedule && upcoming && upcoming.length > 0 ? (
        <PageSection>
          <div className="split-grid">
            <Card
              header={
                <div className="row row--space">
                  <h3>Upcoming services</h3>
                  <Link href="/staff/schedule" className="text-sm link-muted">
                    View schedule
                  </Link>
                </div>
              }
            >
              <div className="table-wrapper" tabIndex={0}>
                <table className="table">
                  <tbody>
                    {upcoming.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <div className="table__name">{b.title}</div>
                          <div className="table__sub">{b.resource_name}</div>
                        </td>
                        <td className="nowrap">
                          {new Date(b.starts_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(b.starts_at).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          {b.conflicting ? <Badge tone="danger">overlap</Badge> : <Badge tone="info">booked</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {canSeeCases && cases ? (
              <Card
                header={
                  <div className="row row--space">
                    <h3>Active cases</h3>
                    <Link href="/staff/cases" className="text-sm link-muted">
                      View cases
                    </Link>
                  </div>
                }
              >
                <div className="finance-glance">
                  <div className="finance-glance__row">
                    <span>Active now</span>
                    <strong>{cases.active}</strong>
                  </div>
                  <div className="finance-glance__row">
                    <span>Completed</span>
                    <strong>{cases.completed}</strong>
                  </div>
                  <div className="finance-glance__row">
                    <span>New today</span>
                    <strong>{cases.new_today}</strong>
                  </div>
                  <div className="finance-glance__row">
                    <span>Total</span>
                    <strong>{cases.total}</strong>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>
        </PageSection>
      ) : null}

      {summaryFailed ? (
        <PageSection>
          <ErrorState message="Summary metrics are unavailable — the reporting service is configured but its client is not wired yet. Unset REPORTING_BASE_URL to show recorded demo figures." />
        </PageSection>
      ) : null}

      {/* Session details — kept compact at the bottom */}
      <PageSection>
        <details className="card details-card">
          <summary className="card__header">
            <h3>Session &amp; permissions</h3>
          </summary>
          <div className="card__body">
            <div className="kv">
              <div>
                <dt>Name</dt>
                <dd>{session.displayName}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{session.email}</dd>
              </div>
              <div>
                <dt>Workspace</dt>
                <dd>
                  <code>{session.tenantId}</code>
                </dd>
              </div>
              <div>
                <dt>Access expires</dt>
                <dd>{new Date(session.expiresAt).toLocaleTimeString()}</dd>
              </div>
            </div>
            <div className="row row--wrap" style={{ marginTop: "var(--space-4)" }}>
              {session.scopes.map((s) => (
                <Badge key={s} tone="neutral">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </details>
      </PageSection>
    </>
  );
}

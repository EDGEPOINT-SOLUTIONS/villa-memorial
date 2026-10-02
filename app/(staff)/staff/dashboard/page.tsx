import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState } from "@/components/ui/states";
import { NeedsYou } from "@/components/staff/needs-you";
import { UnifiedCalendar, type CalendarHrefFor } from "@/components/staff/unified-calendar";
import { PaymentAlertBand } from "./payment-alert-band";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getDashboardSummary, type DashboardSummary } from "@/lib/api-client/reporting";
import { listInquiries, type Inquiry } from "@/lib/api-client/crm";
import { listFixtureAdminOrders, type AdminOrder } from "@/lib/api-client/order-store";
import { loadWorkOrders, type WorkOrderList } from "@/lib/api-client/work-orders";
import { listFamilyRequests, type FamilyRequest } from "@/lib/api-client/family";
import { listDocuments, type Document } from "@/lib/api-client/documents";
import { loadStaffCalendar } from "@/lib/api-client/staff-calendar";
import { buildNeedsYou } from "@/lib/staff-queue";
import { isCalendarDate } from "@/lib/chapel-booking";
import { parkToday } from "@/lib/schedule-board";
import { formatMinorUnits } from "@/lib/money";

export const metadata = { title: "Dashboard — Admin Portal" };

/**
 * Staff dashboard — the admin-plan board's composition (captain, 2026-10-02).
 *
 * One screen answers the office's morning questions in reading order: the
 * greeting and its quick actions, five figures that lead, the cross-record
 * “Needs you today” queue, the payment notification bands, then the labelled
 * calendar whose days open their whole detail. Figures lead and records follow;
 * there is no paragraph wall and no decorative chart.
 *
 * Every figure is a read of the SAME client its own screen uses, so the dashboard
 * can never contradict a screen, and each source is read only for a session that
 * could open it — a store that fails contributes nothing rather than a guess.
 */

function parkDateLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

function parkGreeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** How long a record has waited, from its own recorded instant. */
function ageLabel(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "unknown";
  const hours = Math.max(0, Math.floor((now.getTime() - t) / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function KpiTile({
  href,
  label,
  value,
  sub,
  badge,
  tone,
}: {
  href: string;
  label: string;
  value: string | number;
  sub: string;
  badge?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <Link href={href} className="card kpi-card">
      <div className="kpi-card__body">
        <div className="kpi-card__label">{label}</div>
        <div className="kpi-card__value">{value}</div>
        <div className="kpi-card__sub">{sub}</div>
      </div>
      {badge ? <Badge tone={tone ?? "neutral"}>{badge}</Badge> : null}
    </Link>
  );
}

export default async function StaffDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; calDate?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  const firstName = session.displayName.split(" ")[0];

  const canSeeCases = hasAnyScope(session.scopes, ["cases:read"]);
  const canSeeLots = hasAnyScope(session.scopes, ["property:read"]);
  const canSeeFinance = hasAnyScope(session.scopes, ["billing:read", "accounting:read"]);
  const canSeeSchedule = hasAnyScope(session.scopes, ["scheduling:read"]);
  const canSeeOrders = hasAnyScope(session.scopes, ["orders:read"]);
  const canSeeDocuments = hasAnyScope(session.scopes, ["documents:read"]);

  const params = await searchParams;
  const now = new Date();

  let summary: DashboardSummary | null = null;
  let summaryFailed = false;
  if (canSeeCases || canSeeLots || canSeeFinance) {
    try {
      summary = await getDashboardSummary();
    } catch {
      summaryFailed = true;
    }
  }

  let inquiries: Inquiry[] = [];
  if (canSeeCases) {
    try {
      inquiries = await listInquiries();
    } catch {
      inquiries = [];
    }
  }
  let orders: AdminOrder[] = [];
  if (canSeeOrders) {
    try {
      orders = await listFixtureAdminOrders();
    } catch {
      orders = [];
    }
  }
  let workOrders: WorkOrderList | null = null;
  if (canSeeLots) {
    try {
      workOrders = await loadWorkOrders();
    } catch {
      workOrders = null;
    }
  }
  let familyRequests: FamilyRequest[] = [];
  if (canSeeCases) {
    try {
      familyRequests = await listFamilyRequests();
    } catch {
      familyRequests = [];
    }
  }
  let documents: Document[] = [];
  if (canSeeDocuments) {
    try {
      documents = await listDocuments();
    } catch {
      documents = [];
    }
  }

  const calendar = canSeeSchedule ? await loadStaffCalendar(session.scopes) : null;

  const finance = summary?.finance;
  const paymentAlerts = summary?.payment_alerts ?? null;

  const calendarAnchor = calendar?.anchor || parkToday();
  const selectedDate =
    params.date && isCalendarDate(params.date) ? params.date : calendarAnchor;
  const calendarMonth =
    params.calDate && /^\d{4}-\d{2}$/.test(params.calDate)
      ? params.calDate
      : selectedDate.slice(0, 7);
  const calendarHrefFor: CalendarHrefFor = ({ month: nextMonth, date }) => {
    const query = new URLSearchParams();
    query.set("calDate", nextMonth ?? calendarMonth);
    const day = date ?? selectedDate;
    if (day) query.set("date", day);
    return `/staff/dashboard?${query.toString()}`;
  };

  const servicesToday = (calendar?.items ?? [])
    .filter((item) => item.kind === "burial" && item.date === selectedDate)
    .map((item) => ({ id: item.id, title: item.title, detail: item.detail, href: item.href }));
  const queue = buildNeedsYou({
    alerts: paymentAlerts,
    inquiries,
    orders,
    workOrders,
    familyRequests,
    documents,
    servicesToday,
  });

  // The five figures, derived from the same records the queue reads.
  const openRequests = familyRequests.filter((r) => r.state !== "done");
  const waitingOnYou = openRequests.filter((r) => r.state === "waiting_on_you").length;
  const newInquiries = inquiries.filter((i) => i.status === "new");
  const fulfilOrders = orders.filter(
    (o) => o.lifecycle_status === "new" || o.lifecycle_status === "confirmed",
  );
  const newOrders = orders.filter((o) => o.lifecycle_status === "new").length;
  const confirmedOrders = orders.filter((o) => o.lifecycle_status === "confirmed").length;
  const dueNearest = paymentAlerts?.due_soon.length
    ? Math.min(...paymentAlerts.due_soon.map((a) => a.days_until_due))
    : null;
  const overdueWorst = paymentAlerts?.overdue.length
    ? Math.max(...paymentAlerts.overdue.map((a) => Math.abs(a.days_until_due)))
    : null;

  const dateLabel = parkDateLabel(now);
  const needsCount = queue.length;
  const needsLabel =
    needsCount === 0
      ? "nothing needs you today"
      : needsCount === 1
        ? "1 thing needs you today"
        : `${needsCount} things need you today`;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${parkGreeting(now)}, ${firstName}`}
        lead={`${dateLabel} · ${needsLabel}`}
        actions={
          <div className="row row--wrap">
            <Link href="/staff/cases/new" className="btn btn--primary btn--sm">
              + New case
            </Link>
            <Link href="/staff/billing/record-payment" className="btn btn--secondary btn--sm">
              Record a payment
            </Link>
          </div>
        }
      />

      {/* Five figures lead — each the same read its own screen makes. */}
      <div className="kpi-grid">
        {canSeeCases ? (
          <KpiTile
            href="/staff/customers"
            label="Family requests"
            value={openRequests.length}
            sub={`${waitingOnYou} waiting on the family`}
            badge={openRequests.length > 0 ? "needs you" : undefined}
            tone="warning"
          />
        ) : null}
        {canSeeCases ? (
          <KpiTile
            href="/staff/inquiries"
            label="New inquiries"
            value={newInquiries.length}
            sub={
              newInquiries.length > 0
                ? `oldest ${ageLabel(newInquiries[0].received_at, now)}`
                : "none waiting"
            }
            badge={newInquiries.length > 0 ? "new" : undefined}
            tone="info"
          />
        ) : null}
        {canSeeOrders ? (
          <KpiTile
            href="/staff/orders"
            label="Orders to fulfil"
            value={fulfilOrders.length}
            sub={`${newOrders} new · ${confirmedOrders} confirmed`}
            badge={fulfilOrders.length > 0 ? "queue" : undefined}
            tone="neutral"
          />
        ) : null}
        {canSeeFinance && finance ? (
          <KpiTile
            href="/staff/billing"
            label="Payments due"
            value={
              paymentAlerts ? formatMinorUnits(paymentAlerts.due_soon_cents, finance.currency) : "—"
            }
            sub={
              paymentAlerts && paymentAlerts.due_soon_count > 0
                ? `${paymentAlerts.due_soon_count} account${paymentAlerts.due_soon_count === 1 ? "" : "s"} · nearest ${dueNearest} day${dueNearest === 1 ? "" : "s"}`
                : "nothing in the two-day window"
            }
            badge={paymentAlerts && paymentAlerts.due_soon_count > 0 ? "due soon" : undefined}
            tone="warning"
          />
        ) : null}
        {canSeeFinance && finance ? (
          <KpiTile
            href="/staff/billing"
            label="Overdue"
            value={paymentAlerts ? formatMinorUnits(paymentAlerts.overdue_cents, finance.currency) : "—"}
            sub={
              paymentAlerts && paymentAlerts.overdue_count > 0
                ? `${paymentAlerts.overdue_count} account${paymentAlerts.overdue_count === 1 ? "" : "s"} · worst ${overdueWorst} day${overdueWorst === 1 ? "" : "s"}`
                : "nothing overdue"
            }
            badge={paymentAlerts && paymentAlerts.overdue_count > 0 ? "overdue" : undefined}
            tone="danger"
          />
        ) : null}
      </div>

      {/* Needs you today — the cross-record work queue. */}
      <PageSection>
        <div className="row row--space row--wrap">
          <h2 className="page-section-title">Needs you today</h2>
          <span className="text-sm text-muted">
            {queue.length} item{queue.length === 1 ? "" : "s"} across payments, requests,
            inquiries, orders and documents
          </span>
        </div>
        <NeedsYou rows={queue} limit={8} />
      </PageSection>

      {/* Payment notifications — the two bands the board draws. */}
      {canSeeFinance && paymentAlerts ? <PaymentAlertBand summary={paymentAlerts} /> : null}

      {/* The labelled calendar — every recorded day type, click a day for detail. */}
      {calendar ? (
        <PageSection>
          <UnifiedCalendar
            month={calendarMonth}
            selectedDate={selectedDate}
            items={calendar.items}
            today={parkToday()}
            hrefFor={calendarHrefFor}
            heading="The calendar, with every day type named"
          />
        </PageSection>
      ) : null}

      {summaryFailed ? (
        <PageSection>
          <ErrorState message="Summary metrics are unavailable — the reporting service is configured but its client is not wired yet. Unset REPORTING_BASE_URL to show recorded demo figures." />
        </PageSection>
      ) : null}

      {/* Session details — kept compact at the bottom. */}
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

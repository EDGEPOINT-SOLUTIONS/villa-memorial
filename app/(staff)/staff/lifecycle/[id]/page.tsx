import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
import { StatusChip, type StatusTone } from "@/components/kit/status-chip";
import { PaymentForm } from "@/components/staff/payment-form";
import { NoticeRules } from "@/components/staff/notice-rules";
import { NoticeList } from "@/components/staff/notice-list";
import { getEngagementDetail } from "@/lib/api-client/lifecycle";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  ENGAGEMENT_KIND_HREF,
  ENGAGEMENT_KIND_LABEL,
  ENGAGEMENT_KIND_PLURAL,
  NOTICE_TRANSPORT_NOTE,
  engagementStateLabel,
  engagementTone,
  isTermMode,
  nextDueLine,
  paymentAmountLabel,
  paymentModeLabel,
  shortDueDate,
} from "@/lib/lifecycle";
import { paymentDueStateLabel, type PaymentDueState } from "@/lib/payment-schedule";
import { ApiError } from "@/lib/api-client/api-error";

export const metadata = { title: "Client accounting — Admin Portal" };

const DUE_TONE: Record<PaymentDueState, StatusTone> = {
  paid: "success",
  overdue: "danger",
  due_soon: "warning",
  upcoming: "neutral",
};

/**
 * One client's accounting — the page a member, service, lot or buyer record opens.
 *
 * The money is the one derivation (amount · paid · outstanding), the schedule is
 * the amortization (period · due · amount · state · remaining), and the notices
 * are the modular rules the app scheduled. A service also shows the calendar slot
 * the office calendar renders, with a link to that day; a calendar entry links
 * back here. Nothing is restated from another screen — every figure is read from
 * the one lifecycle store.
 */
export default async function EngagementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  const { id } = await params;

  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Clients & records" title="Client accounting" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let detail: Awaited<ReturnType<typeof getEngagementDetail>>;
  try {
    detail = await getEngagementDetail(id, new Date());
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Clients & records" title="Client accounting" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "This client's record is unavailable right now."}
          />
        </PageSection>
      </>
    );
  }

  if (!detail) {
    return (
      <>
        <PageHeader eyebrow="Clients & records" title="Client accounting" />
        <PageSection>
          <ErrorState message="No record is stored under that reference." />
        </PageSection>
      </>
    );
  }

  const { engagement, totals, payments, schedule, notices, templates } = detail;
  const canWrite = hasAnyScope(session.scopes, ["cases:write"]);
  const kindLabel = ENGAGEMENT_KIND_LABEL[engagement.kind];
  const termPaid = isTermMode(engagement.mode);
  // A long lot carries dozens of open installments; the notice panel shows the next
  // three (the ones the office can act on now) so the page stays at-a-glance.
  const nextOpenSeqs = schedule
    .filter((row) => row.due_cents > 0)
    .slice(0, 3)
    .map((row) => row.seq);
  const visibleNotices = notices.filter((notice) => nextOpenSeqs.includes(notice.seq));

  return (
    <div className="stack-4">
      <div>
        <Link href={ENGAGEMENT_KIND_HREF[engagement.kind]} className="btn btn--ghost btn--sm">
          <ArrowLeft size={15} aria-hidden="true" />
          {ENGAGEMENT_KIND_PLURAL[engagement.kind]}
        </Link>
      </div>

      <PageHeader
        eyebrow={`${kindLabel} · ${engagement.reference}`}
        title={engagement.client.name}
        lead={`${engagement.item.name}${engagement.item.detail ? ` · ${engagement.item.detail}` : ""}`}
        actions={
          <StatusChip tone={engagementTone(totals)}>{engagementStateLabel(totals)}</StatusChip>
        }
      />

      <div className="kpi-grid">
        <StatCard label="Amount" value={paymentAmountLabel(totals.amount_cents)} sub={engagement.item.price_basis || "Recorded amount"} />
        <StatCard label="Paid" value={paymentAmountLabel(totals.paid_cents)} sub={`${payments.length} payment${payments.length === 1 ? "" : "s"} recorded`} />
        <StatCard label="Outstanding" value={paymentAmountLabel(totals.outstanding_cents)} sub={totals.settled ? "Settled" : "Still owed"} />
        <StatCard
          label={termPaid ? "Next due" : "State"}
          value={termPaid ? nextDueLine(totals) : engagementStateLabel(totals)}
          sub={termPaid ? `${totals.installments_paid} of ${totals.installments_total} paid` : paymentModeLabel(engagement.mode)}
        />
      </div>

      {engagement.schedule ? (
        <section className="card" aria-labelledby="service-calendar-title">
          <div className="card__header">
            <h2 id="service-calendar-title">On the calendar</h2>
          </div>
          <div className="card__body stack-2">
            <p style={{ margin: 0 }}>
              <CalendarDays size={15} aria-hidden="true" /> {shortDueDate(engagement.schedule.on)}
              {engagement.schedule.time ? ` · ${engagement.schedule.time}` : ""} ·{" "}
              {engagement.schedule.resource_name}
              {engagement.schedule.case_number ? ` · ${engagement.schedule.case_number}` : ""}
            </p>
            <div className="row">
              <Link
                href={`/staff/calendar?date=${engagement.schedule.on}`}
                className="btn btn--ghost btn--sm"
              >
                Open that day
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card" aria-labelledby="record-title">
        <div className="card__header">
          <h2 id="record-title">The record</h2>
        </div>
        <div className="card__body">
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Service / item</th>
                  <td>{engagement.item.name}</td>
                </tr>
                <tr>
                  <th scope="row">Price basis</th>
                  <td>{engagement.item.price_basis || "Not recorded"}</td>
                </tr>
                <tr>
                  <th scope="row">Payment</th>
                  <td>
                    {engagement.mode === "one_time"
                      ? `One-time · due ${shortDueDate(engagement.first_due_on)}`
                      : `${paymentModeLabel(engagement.mode)} · ${engagement.installments} installments · first due ${shortDueDate(engagement.first_due_on)}`}
                  </td>
                </tr>
                {engagement.lot ? (
                  <tr>
                    <th scope="row">Lot</th>
                    <td>
                      Section {engagement.lot.section} · Lot {engagement.lot.lot_number}
                    </td>
                  </tr>
                ) : null}
                {engagement.prospect_id ? (
                  <tr>
                    <th scope="row">From prospect</th>
                    <td>{engagement.prospect_id}</td>
                  </tr>
                ) : null}
                {engagement.agent ? (
                  <tr>
                    <th scope="row">Agent</th>
                    <td>{engagement.agent}</td>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row">Recorded</th>
                  <td>
                    {shortDueDate(engagement.recorded_at.slice(0, 10))}
                    {engagement.recorded_by ? ` · ${engagement.recorded_by}` : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {termPaid ? (
        <section className="card" aria-labelledby="schedule-title">
          <div className="card__header">
            <h2 id="schedule-title">Amortization schedule</h2>
          </div>
          <div className="card__body">
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <caption className="visually-hidden">Amortization schedule</caption>
                <thead>
                  <tr>
                    <th scope="col">Period</th>
                    <th scope="col">Due</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                    <th scope="col">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.seq}>
                      <th scope="row">{row.period}</th>
                      <td>{shortDueDate(row.due_on)}</td>
                      <td className="table__numeric">{paymentAmountLabel(row.amount_cents)}</td>
                      <td>
                        <StatusChip tone={DUE_TONE[row.state]}>{paymentDueStateLabel(row.state)}</StatusChip>
                      </td>
                      <td className="table__numeric">{paymentAmountLabel(row.remaining_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card" aria-labelledby="payments-title">
        <div className="card__header">
          <h2 id="payments-title">Payments</h2>
        </div>
        <div className="card__body stack-3">
          {payments.length === 0 ? (
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              No payment has been recorded yet.
            </p>
          ) : (
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <caption className="visually-hidden">Recorded payments</caption>
                <thead>
                  <tr>
                    <th scope="col">Received</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Note</th>
                    <th scope="col">Recorded by</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <th scope="row">{shortDueDate(payment.paid_on)}</th>
                      <td className="table__numeric">{paymentAmountLabel(payment.amount_cents)}</td>
                      <td>{payment.note || "—"}</td>
                      <td>{payment.recorded_by ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {canWrite && !totals.settled ? (
            <PaymentForm engagementId={engagement.id} outstandingCents={totals.outstanding_cents} />
          ) : null}
        </div>
      </section>

      <section className="card" aria-labelledby="notices-title">
        <div className="card__header">
          <h2 id="notices-title">Notices</h2>
        </div>
        <div className="card__body stack-3">
          <p className="text-sm text-muted" style={{ margin: 0 }}>
            {NOTICE_TRANSPORT_NOTE}
          </p>
          <NoticeList engagementId={engagement.id} notices={visibleNotices} />
          {notices.length > visibleNotices.length && nextOpenSeqs.length > 0 ? (
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              Showing the notices for the next {nextOpenSeqs.length} open installment
              {nextOpenSeqs.length === 1 ? "" : "s"}; the rest sit in the schedule above.
            </p>
          ) : null}
          {canWrite ? <NoticeRules templates={templates} /> : null}
        </div>
      </section>
    </div>
  );
}

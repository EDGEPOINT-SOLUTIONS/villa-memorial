import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/kit/empty-state";
import { StatusChip } from "@/components/kit/status-chip";
import {
  ENGAGEMENT_KIND_LABEL,
  ENGAGEMENT_KIND_PLURAL,
  engagementStateLabel,
  engagementTone,
  nextDueLine,
  paymentAmountLabel,
  paymentModeLabel,
  shortDueDate,
  type EngagementKind,
  type EngagementView,
} from "@/lib/lifecycle";

/**
 * The one register table for the four lifecycle outcomes.
 *
 * A row leads with the person, then what they took and its figures; a term-paid
 * row (a plan, a lot) also leads with its next due date, because that is the
 * office's next action. Every row opens the same shared accounting page, where
 * the amortization schedule and the scheduled notices live.
 */
export function EngagementRegister({
  kind,
  views,
}: {
  kind: EngagementKind;
  views: EngagementView[];
}) {
  const rows = views.filter((view) => view.engagement.kind === kind);
  if (rows.length === 0) {
    return (
      <EmptyState
        title={`No ${ENGAGEMENT_KIND_PLURAL[kind].toLowerCase()} recorded yet`}
        hint={`Record the first one to start the register.`}
        action={
          <Link href={`/staff/lifecycle/new?kind=${kind}`} className="btn btn--primary btn--sm">
            Record {ENGAGEMENT_KIND_LABEL[kind].toLowerCase()}
          </Link>
        }
      />
    );
  }

  const termPaid = rows.some((row) => row.engagement.mode !== "one_time");

  return (
    <div className="table-wrapper" tabIndex={0}>
      <table className="table">
        <caption className="visually-hidden">{ENGAGEMENT_KIND_PLURAL[kind]} register</caption>
        <thead>
          <tr>
            <th scope="col">{kind === "service" ? "Client" : kind === "plan" ? "Member" : "Buyer"}</th>
            <th scope="col">
              {kind === "plan" ? "Plan" : kind === "service" ? "Service" : kind === "lot" ? "Lot" : "Product"}
            </th>
            <th scope="col">Term</th>
            <th scope="col">Amount</th>
            <th scope="col">Paid</th>
            <th scope="col">Outstanding</th>
            {termPaid ? <th scope="col">Next due</th> : <th scope="col">State</th>}
            <th scope="col">
              <span className="visually-hidden">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ engagement, totals }) => (
            <tr key={engagement.id}>
              <th scope="row">{engagement.client.name}</th>
              <td>
                {engagement.item.name}
                {engagement.lot ? ` · ${engagement.lot.section}-${engagement.lot.lot_number}` : ""}
                {kind === "service" && engagement.schedule ? (
                  <span className="text-sm text-muted">
                    {" "}
                    · {shortDueDate(engagement.schedule.on)}
                    {engagement.schedule.time ? ` ${engagement.schedule.time}` : ""} ·{" "}
                    {engagement.schedule.resource_name}
                  </span>
                ) : null}
              </td>
              <td>{engagement.mode === "one_time" ? "One-time" : paymentModeLabel(engagement.mode)}</td>
              <td className="table__numeric">{paymentAmountLabel(totals.amount_cents)}</td>
              <td className="table__numeric">{paymentAmountLabel(totals.paid_cents)}</td>
              <td className="table__numeric">{paymentAmountLabel(totals.outstanding_cents)}</td>
              {termPaid ? (
                <td>{nextDueLine(totals)}</td>
              ) : (
                <td>
                  <StatusChip tone={engagementTone(totals)}>{engagementStateLabel(totals)}</StatusChip>
                </td>
              )}
              <td className="table__numeric">
                <Link href={`/staff/lifecycle/${engagement.id}`} className="btn btn--ghost btn--sm">
                  Open
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

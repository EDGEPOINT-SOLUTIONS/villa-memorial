/**
 * The family's amortization panels — the one presentation of the recorded plan
 * schedule and the held lot's recorded six-year amortization.
 *
 * Presentation only: the figures arrive already derived and formatted from
 * `lib/family/family-amortization.ts` (which reuses the ONE amortization model),
 * and this file invents nothing. The plan schedule is a compact table — period ·
 * amount · status · remaining — under a labelled facts strip, so a family reads
 * where they stand at a glance; a record that carries no schedule renders the
 * honest “not recorded” state with the office phone, never a plausible one.
 *
 * The classes are the dashboard's own (`dash-panel`, `dash-facts`, `dash-table`),
 * so the schedules inherit the dense scope, the tabular figures and the phone
 * restacking the rest of the portal already uses.
 */
import Link from "next/link";
import { DashFacts, DashPanel } from "@/components/family/dash-ui";
import { StatusChip, type StatusTone } from "@/components/kit/status-chip";
import type { LotAmortization, PlanAmortization } from "@/lib/family/family-amortization";
import { FAMILY_HELP } from "@/lib/family/contact";
import type { PaymentDueState } from "@/lib/payment-schedule";

/** The status-chip tone for a derived instalment state (the dashboard's own map). */
const TONE: Record<PaymentDueState, StatusTone> = {
  paid: "success",
  overdue: "danger",
  due_soon: "warning",
  upcoming: "neutral",
};

function CallLine() {
  return (
    <p className="dash-note">
      Call <a href={FAMILY_HELP.phoneHref}>{FAMILY_HELP.phone}</a> and we’ll read it to you.
    </p>
  );
}

/**
 * The plan's amortization: the recorded mode, term, periodic amount, what is
 * paid, what is left, the remaining periods and the next due date, then the
 * period-by-period schedule. `plan` is null when the record carries no schedule.
 */
export function PlanAmortizationPanel({
  plan,
  id,
  className = "dash-span-12",
}: {
  plan: PlanAmortization | null;
  id?: string;
  className?: string;
}) {
  if (!plan) {
    return (
      <DashPanel
        id={id}
        role="money"
        className={className}
        label="Amortization"
        title="Your schedule"
      >
        <p className="dash-state">Your payment schedule isn’t recorded here yet.</p>
        <CallLine />
      </DashPanel>
    );
  }

  return (
    <DashPanel
      id={id}
      role="money"
      className={className}
      label="Amortization"
      title="Your schedule"
      count={`${plan.periodsPaid} of ${plan.periodsTotal} paid`}
    >
      <DashFacts
        columns={2}
        facts={[
          { label: "Payment mode", value: plan.modeLabel },
          { label: "Term", value: plan.termLabel ?? "Not recorded" },
          { label: plan.amountLabel, value: plan.amount },
          {
            label: "Payments made",
            value: `${plan.paidLabel} · ${plan.periodsPaid} of ${plan.periodsTotal}`,
            tone: "ok",
          },
          { label: "Remaining balance", value: plan.remainingLabel, tone: "due" },
          { label: "Remaining periods", value: String(plan.periodsRemaining) },
          { label: "Next due", value: plan.nextDueLabel ?? "Nothing due" },
          { label: "Reference", value: plan.reference },
        ]}
      />

      <table className="table dash-table">
        <caption className="visually-hidden">Your payment schedule</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col" className="table__numeric">
              Amount
            </th>
            <th scope="col">Status</th>
            <th scope="col" className="table__numeric">
              Remaining
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">
                {row.periodLabel}
                <span className="dash-table__sub">{row.dueLabel}</span>
              </th>
              <td className="table__numeric" data-label="Amount">
                {row.amount}
              </td>
              <td data-label="Status">
                <StatusChip tone={TONE[row.statusKey]}>{row.status}</StatusChip>
              </td>
              <td className="table__numeric" data-label="Remaining">
                {row.remaining}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashPanel>
  );
}

/**
 * The held lot's recorded six-year amortization: the sheet's family for the lot's
 * section, its term, the regular and senior monthly figures and the selling
 * total. `amortization` is null when the sheet does not price the section.
 */
export function LotAmortizationPanel({
  amortization,
  className = "dash-span-5",
}: {
  amortization: LotAmortization | null;
  className?: string;
}) {
  if (!amortization) {
    return (
      <DashPanel
        role="place"
        className={className}
        label="Amortization"
        title="This lot’s schedule"
      >
        <p className="dash-state">The recorded lot amortization isn’t on this page yet.</p>
        <CallLine />
      </DashPanel>
    );
  }

  return (
    <DashPanel
      role="place"
      className={className}
      label="Amortization"
      title="This lot’s recorded schedule"
    >
      <DashFacts
        columns={2}
        facts={[
          { label: "Lot family", value: `${amortization.family} · ${amortization.area} sqm` },
          { label: "Term", value: amortization.termLabel },
          { label: "Regular monthly", value: amortization.regularMonthly },
          { label: "Senior monthly", value: amortization.seniorMonthly },
          { label: "Selling price", value: amortization.totalLabel },
        ]}
      />
      <p className="dash-note">
        From {amortization.sourceLabel}. The office confirms your own schedule.
      </p>
    </DashPanel>
  );
}

/** The one quiet link from a money line to the full schedule. */
export function AmortizationLink({ className }: { className?: string }) {
  return (
    <Link className={className ?? "dash-panel__link"} href="/client/payments#amortization">
      See your full schedule →
    </Link>
  );
}

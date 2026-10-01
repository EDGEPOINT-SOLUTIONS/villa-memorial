import { Banknote, CalendarClock, FileText, MessageCircle, Phone, Store } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { paidPercent, percentWords } from "@/lib/family/family-view";
import {
  longDueDate,
  paymentAmountLabel,
  paymentDueCountdown,
  paymentDueStateLabel,
  unpaidPaymentDues,
} from "@/lib/payment-schedule";
import {
  Answer,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  WhatThisShows,
} from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { PortalChip, PortalProgress } from "@/components/portal/portal-ui";

export const metadata = { title: "Payments — Villa Funeraria" };

/**
 * Payments — the family's “My Payments” screen (PRD screen-inventory), on the
 * dashboard's dense grammar (2026-09-30): the paid share, the open instalments
 * and the three ways to pay, each in its own panel, with the honest gap in the
 * ONE shared disclosure.
 *
 * The client's minute (2026-09-21, item 1) asks for payment-due notification: the
 * plan's own instalments render with the reference, what is still owed and the
 * derived due date. The due-soon / overdue wording comes from
 * `lib/payment-schedule.ts` — computed from the recorded plan against today,
 * never a background timer the demo cannot run.
 */
export default async function ClientPaymentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { balance, balance_cents, plan_summary } = snapshot;

  const now = new Date();
  const schedule = snapshot.payment_schedule;
  const openPayments = schedule ? unpaidPaymentDues(schedule, now) : [];

  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;

  return (
    <div className="dash">
      <Answer
        kicker="Payments"
        headline={
          hasBalance
            ? `${balance.remaining} is still to pay. Here’s how to pay.`
            : "Your plan is fully paid. Nothing is due."
        }
        sub={
          hasBalance
            ? `You have paid ${balance.paid} of ${balance.total}.`
            : `${balance.total} of ${balance.total} · thank you.`
        }
        chips={
          <>
            <PortalChip>{plan_summary.plan_name}</PortalChip>
            {percent !== null ? <PortalChip>{percentWords(percent)} paid</PortalChip> : null}
          </>
        }
        actions={
          <>
            <PrimaryAction href="#ways" label="See how to pay" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Talk to us first"
              icon={<MessageCircle size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <div className="dash-grid">
        <DashPanel
          role="money"
          className="dash-span-12"
          label="Money"
          title="Paid so far"
          count={percent !== null ? `${percentWords(percent)} paid` : undefined}
        >
          {percent !== null ? (
            <PortalProgress
              left={<strong>{balance.paid} paid</strong>}
              right={`${balance.total} in all`}
              percent={percent}
              ariaLabel={`${balance.paid} of ${balance.total} paid — ${percentWords(percent)}`}
            />
          ) : (
            <p className="dash-empty">
              {balance.paid} paid of {balance.total} in all.
            </p>
          )}
        </DashPanel>

        {schedule && openPayments.length > 0 ? (
          <DashPanel
            id="coming"
            role="money"
            className="dash-span-12"
            label="Coming"
            title="What’s coming"
            count={`${openPayments.length} open`}
          >
            <Rows>
              {openPayments.map((due) => (
                <Row
                  key={due.seq}
                  icon={<CalendarClock size={22} aria-hidden="true" />}
                  title={`${paymentAmountLabel(due.due_cents)} ${paymentDueCountdown(due.days_until_due)}`}
                  meta={`${due.reference} · payment ${due.seq} of ${schedule.installments.length} · ${longDueDate(due.due_on)}`}
                  state={paymentDueStateLabel(due.state)}
                  wait
                  action={<QuietAction href={FAMILY_HELP.phoneHref} label="Call about this" />}
                />
              ))}
            </Rows>
          </DashPanel>
        ) : null}

        <DashPanel id="ways" role="place" className="dash-span-12" label="Ways to pay" title="Ways to pay">
          <Rows>
            <Row
              icon={<Phone size={22} aria-hidden="true" />}
              title="GCash or Maya"
              meta="Call us while you send it; we confirm the number and your reference"
              state="Easiest"
              action={<QuietAction href={FAMILY_HELP.phoneHref} label="Call to pay" />}
            />
            <Row
              icon={<Banknote size={22} aria-hidden="true" />}
              title="Bank transfer"
              meta="Ask us for the account, then send a photo of the deposit slip"
              action={
                <QuietAction href={FAMILY_HELP.phoneHref} label="Ask for the details" />
              }
            />
            <Row
              icon={<Store size={22} aria-hidden="true" />}
              title="At the office"
              meta={`${FAMILY_HELP.office} · cash, card or cheque`}
              action={<QuietAction href={FAMILY_HELP.phoneHref} label="Arrange a time" />}
            />
          </Rows>
          <QuietLink
            href="/client/documents"
            label="See your official receipts"
            icon={<FileText size={20} aria-hidden="true" />}
          />
        </DashPanel>

        <DashPanel
          role="neutral"
          className="dash-span-12"
          label="If money is tight"
          title="If money is tight"
        >
          <p className="dash-state">
            Tell us before a date passes and we will agree a new schedule.
          </p>
          <QuietLink
            href={FAMILY_HELP.phoneHref}
            label="Talk to us about a schedule"
            icon={<MessageCircle size={20} aria-hidden="true" />}
          />
        </DashPanel>
      </div>

      <WhatThisShows>
        Your full payment history isn’t connected yet. Call {FAMILY_HELP.phone} and we’ll read your
        statement to you.
      </WhatThisShows>
    </div>
  );
}

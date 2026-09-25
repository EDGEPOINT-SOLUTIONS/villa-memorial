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
  PaidSoFar,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
  WhatThisShows,
} from "@/components/family/family-ui";
import { PortalChip } from "@/components/portal/portal-ui";

export const metadata = { title: "Payments — Villa Memorial" };

/**
 * Payments — the family's “My Payments” screen (PRD screen-inventory).
 *
 * The client's minute (2026-09-21, item 1) asks for payment-due notification: the
 * client should see what is coming, so the plan's own instalments render as rows
 * with the reference, what is still owed and the derived due date. The due-soon /
 * overdue wording comes from `lib/payment-schedule.ts` — computed from the recorded
 * plan against today, never a background timer the demo cannot run. `now` is the
 * server's clock; the demo's own schedule ages with it exactly like the billing
 * seed, and tests pin the two-days-before boundary with explicit clocks.
 *
 * The payment history still isn't wired, and the ONE shared `WhatThisShows`
 * disclosure says so in a line — never an empty table that reads as if the family
 * had never paid.
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
    <>
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

      <PaidSoFar
        paid={balance.paid}
        total={balance.total}
        percent={percent ?? undefined}
        words={percent === null ? "in all" : percentWords(percent)}
      />

      {schedule && openPayments.length > 0 ? (
        <Section
          id="coming"
          title="What’s coming"
          sub="Every date still open on your plan."
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
        </Section>
      ) : null}

      <Section
        id="ways"
        title="Three ways to pay"
        sub="Every payment gets an official receipt."
      >
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
        <p>
          <QuietLink
            href="/client/documents"
            label="See your official receipts"
            icon={<FileText size={20} aria-hidden="true" />}
          />
        </p>
      </Section>

      <Section
        title="If money is tight"
        sub="Tell us before a date passes and we will agree a new schedule."
      >
        <QuietLink
          href={FAMILY_HELP.phoneHref}
          label="Talk to us about a schedule"
          icon={<MessageCircle size={20} aria-hidden="true" />}
        />
      </Section>

      <WhatThisShows>
        Your full payment history isn’t connected yet. Call {FAMILY_HELP.phone} and we’ll read your
        statement to you.
      </WhatThisShows>
    </>
  );
}

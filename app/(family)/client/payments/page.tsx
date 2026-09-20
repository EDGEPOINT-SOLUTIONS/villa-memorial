import { Banknote, FileText, MessageCircle, Phone, Store } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { paidPercent, percentWords } from "@/lib/family/family-view";
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
 * Payments — the family's “My Payments” screen (PRD screen-inventory),
 * compressed to the family reading budget (2026-09-21): the figure leads, the
 * three ways are rows, and the history sits behind the ONE shared
 * `WhatThisShows` disclosure. The duplicate “official receipts” section is gone
 * (receipts live on Papers, linked here).
 *
 * Real today: the balance and the three ways a family can pay. The payment
 * history is not wired, and the disclosure says so in one line — never an empty
 * table that reads as if the family had never paid.
 */
export default async function ClientPaymentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { balance, balance_cents, plan_summary } = snapshot;

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

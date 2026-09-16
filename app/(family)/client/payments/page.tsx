import { Banknote, MessageCircle, Phone, Store } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { paidPercent, percentWords } from "@/lib/family/family-view";
import {
  Answer,
  CallAction,
  Note,
  PaidSoFar,
  PrimaryAction,
  QuietAction,
  QuietLink,
  Row,
  Rows,
  Section,
} from "@/components/family/family-ui";

export const metadata = { title: "Payments — Villa Memorial" };

/**
 * Payments — the approved redesign (docs/08-delivery/family-portal-design,
 * page 04). Real today: the balance and the three ways a family can pay.
 * The payment history is not wired, and says so in one calm note — never an
 * empty table that reads as if the family had never paid.
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
            ? `${balance.remaining} is still to pay on your family’s plan.`
            : "Your plan is fully paid. Nothing is due."
        }
        sub={
          hasBalance
            ? `That is what is left of ${balance.total} — you have already paid ${balance.paid}. The next date in your agreement is ${plan_summary.next_due}.`
            : `${balance.total} of ${balance.total} · thank you. We will tell you if anything changes.`
        }
        actions={
          <>
            <PrimaryAction href="#ways" label="See how to pay" />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Talk to us first — nothing bad happens"
              icon={<MessageCircle size={20} aria-hidden="true" />}
            />
          </>
        }
      />

      <Section title="Paid so far">
        <PaidSoFar
          paid={balance.paid}
          total={balance.total}
          percent={percent ?? undefined}
          words={percent === null ? "in all" : percentWords(percent)}
        />
      </Section>

      <Section
        id="ways"
        title="Three ways to pay"
        sub="Every payment gets an official receipt. Pick whichever is easiest for your family."
      >
        <Rows>
          <Row
            icon={<Phone size={22} aria-hidden="true" />}
            title="GCash or Maya"
            meta="Call us while you send it, and we will confirm the number and your reference"
            state="Easiest"
            action={<CallAction label="Call to pay" />}
          />
          <Row
            icon={<Banknote size={22} aria-hidden="true" />}
            title="Bank transfer"
            meta="Ask us for the account details, then send us a photo of the deposit slip"
            action={
              <QuietAction href={FAMILY_HELP.phoneHref} label="Ask for the details" />
            }
          />
          <Row
            icon={<Store size={22} aria-hidden="true" />}
            title="At the office"
            meta={`${FAMILY_HELP.office} · cash, card or cheque`}
            action={<QuietAction href={FAMILY_HELP.phoneHref} label="Arrange a collection" />}
          />
        </Rows>
      </Section>

      <Section
        title="If money is tight"
        sub="Tell us before a payment is missed and we will agree a new schedule with you, in writing. Nothing is lost just because a date passes."
      >
        <QuietLink
          href={FAMILY_HELP.phoneHref}
          label="Talk to us about a schedule"
          icon={<MessageCircle size={20} aria-hidden="true" />}
        />
      </Section>

      <Note>
        <p>
          <strong>Your payment history is not on this page yet.</strong> Every payment and its
          official receipt will be listed here when the family records service is switched on. Until
          then, ask us for a statement and we will send it to you or read it to you on the phone.
        </p>
      </Note>
    </>
  );
}

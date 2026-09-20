import { Building2, ScrollText, Users } from "lucide-react";
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

export const metadata = { title: "Your plan — Villa Memorial" };

/**
 * Your plan — the family's “My Plans” screen (PRD screen-inventory), compressed
 * to the family reading budget (2026-09-21): one-sentence hero, the paid share,
 * the plan's own rows, and the schedule gap in the ONE shared `WhatThisShows`
 * disclosure.
 *
 * Real today: the plan summary and the balance, straight from the family
 * snapshot. The instalment schedule and the plan certificate are not wired and
 * are named in one line, never faked.
 */
export default async function ClientPlansPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { plan_summary, balance, balance_cents } = snapshot;

  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;

  return (
    <>
      <Answer
        kicker="Your plan"
        headline={
          hasBalance
            ? `${plan_summary.plan_name} is active. ${balance.remaining} is still open.`
            : `${plan_summary.plan_name} is active. It is fully paid.`
        }
        sub={`The next date in your agreement is ${plan_summary.next_due}.`}
        chips={
          <>
            <PortalChip>{plan_summary.status}</PortalChip>
            <PortalChip>Over {plan_summary.term}</PortalChip>
          </>
        }
        actions={
          <>
            <PrimaryAction
              href={hasBalance ? "/client/payments" : "/client/documents"}
              label={hasBalance ? "See how to pay" : "See your papers"}
            />
            <QuietLink
              href={FAMILY_HELP.phoneHref}
              label="Call us about your plan"
              icon={<Building2 size={20} aria-hidden="true" />}
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

      <Section title="What your plan is for" sub="A long-term promise to the people you leave behind.">
        <Rows>
          <Row
            icon={<ScrollText size={22} aria-hidden="true" />}
            title="Your plan certificate"
            meta="A copy will be here when the family records service is on"
          />
          <Row
            icon={<Users size={22} aria-hidden="true" />}
            title="Beneficiaries"
            meta="Who the plan protects, as recorded by Villa Agency"
          />
          <Row
            icon={<Building2 size={22} aria-hidden="true" />}
            title="Account maturity and claims"
            meta="Handled by Villa Agency with Eternal Plans, Inc."
            action={
              <QuietAction href={FAMILY_HELP.agencyPhoneHref} label="Call Villa Agency" />
            }
          />
        </Rows>
      </Section>

      <WhatThisShows>
        The instalment schedule isn’t connected yet. Call {FAMILY_HELP.phone} and we’ll read it to
        you.
      </WhatThisShows>
    </>
  );
}

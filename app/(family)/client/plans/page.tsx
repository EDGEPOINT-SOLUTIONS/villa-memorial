import { Building2, ScrollText, Users } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { paidPercent, percentWords } from "@/lib/family/family-view";
import { personIdFrom } from "@/lib/family/family-household";
import { PersonSwitcherForSnapshot } from "@/components/family/family-person-switcher";
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

export const metadata = { title: "Your plan — Villa Funeraria" };

/**
 * Your plan — the family's “My Plans” screen (PRD screen-inventory), on the
 * dashboard's dense grammar (2026-09-30): the paid share and the plan's own
 * rows in panels, with the certificate/beneficiary gaps in the ONE shared
 * disclosure.
 *
 * Real today: the plan summary and the balance, straight from the family
 * snapshot. The plan certificate is not wired and is named in one line, never
 * faked.
 */
export default async function ClientPlansPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePortalSessionOrRedirect("family");
  const requested = personIdFrom(await searchParams);
  const snapshot = await getFamilySnapshot(requested);
  const { plan_summary, balance, balance_cents } = snapshot;

  const hasBalance = (balance_cents?.remaining ?? 0) > 0;
  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;

  return (
    <div className="dash">
      <PersonSwitcherForSnapshot snapshot={snapshot} basePath="/client/plans" />
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

        <DashPanel
          role="place"
          className="dash-span-12"
          label="Your plan"
          title="What your plan is for"
        >
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
        </DashPanel>
      </div>

      <WhatThisShows>
        The instalment schedule and the plan certificate aren’t connected yet. Call {FAMILY_HELP.phone}{" "}
        and we’ll read it to you.
      </WhatThisShows>
    </div>
  );
}

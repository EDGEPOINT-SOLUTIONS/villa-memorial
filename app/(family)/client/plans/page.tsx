import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { paidPercent } from "@/lib/family/family-view";
import {
  FamilyKv,
  FamilyMoney,
  FamilyProgress,
  FamilySection,
} from "@/components/family/family-ui";

export const metadata = { title: "Memorial plans — Villa Memorial" };

/**
 * My Plans — approved design page 4.
 * Real today: the plan summary and the balance, both from the family snapshot.
 * Not yet real: the instalment schedule, per-payment receipts and plan documents;
 * the page says so where they would go.
 */
export default async function ClientPlansPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { plan_summary, balance, balance_cents } = snapshot;

  const percent =
    balance_cents && balance_cents.total > 0
      ? paidPercent(balance_cents.total, balance_cents.paid)
      : null;

  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Our arrangement</p>
          <h1>Memorial plans</h1>
          <p className="fp-lead">
            The plans your family holds with Villa Memorial, and what is next on each.
          </p>
        </div>
        <div className="page-header__actions">
          <Link className="btn btn--secondary btn--sm" href="/client/support">
            Ask about a plan
          </Link>
        </div>
      </header>

      <FamilySection
        title={plan_summary.plan_name}
        sub="Everything a plan holder asks: how much is left, what it covers, and who to ask."
      >
        <div className="fp-grid-3">
          <FamilyMoney label="Plan status" value={plan_summary.status} note="With Villa Memorial" tone="ok" />
          <FamilyMoney label="Term" value={plan_summary.term} note="Agreed with your family" />
          <FamilyMoney
            label="Still open"
            value={balance.remaining}
            note={`Next due ${plan_summary.next_due}`}
            tone={balance_cents && balance_cents.remaining > 0 ? "due" : undefined}
          />
        </div>

        <Card header={<h3 className="fp-h3">Where the payments are</h3>}>
          {percent !== null ? (
            <FamilyProgress
              percent={percent}
              note={`${balance.paid} of ${balance.total} paid · ${percent}% of the plan`}
            />
          ) : (
            <p className="fp-note">
              {balance.paid} of {balance.total} paid. We will show the full instalment schedule
              here as soon as the family records service is switched on.
            </p>
          )}
          <div className="fp-split mt-4">
            <div>
              <FamilyKv
                rows={[
                  ["Plan", plan_summary.plan_name],
                  ["Status", plan_summary.status],
                  ["Term", plan_summary.term],
                  ["Next due", plan_summary.next_due],
                  ["Total", balance.total],
                  ["Paid so far", balance.paid],
                  ["Still open", balance.remaining],
                ]}
              />
            </div>
            <div>
              <p className="fp-h3">The instalment schedule</p>
              <p className="fp-note">
                Not wired yet: the list of payments (dates, amounts, receipts) arrives with the
                family records service. Until then, ask us and we will read your schedule to you
                — {FAMILY_HELP.phone}, {FAMILY_HELP.hours}.
              </p>
              <div className="row row--wrap mt-4">
                <Link className="btn btn--primary btn--sm" href="/client/payments">
                  How to pay
                </Link>
                <Link className="btn btn--secondary btn--sm" href="/client/documents">
                  Receipts &amp; contracts
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </FamilySection>

      <FamilySection
        title="What your plan is for"
        sub="A plan is a long-term promise to the people you leave behind."
      >
        <Card>
          <div className="fp-split">
            <div>
              <p className="fp-h3">What we hold for your family</p>
              <FamilyKv
                rows={[
                  ["Plan", plan_summary.plan_name],
                  ["Covered by", "Villa Memorial · Funeraria Villa · Villa Agency"],
                  ["Term", plan_summary.term],
                  ["Status", plan_summary.status],
                ]}
              />
            </div>
            <div>
              <p className="fp-h3">What is not shown yet — and why</p>
              <ul className="fp-bullets">
                <li>
                  <strong>Plan terms</strong> (what is covered, transport, transferability) —
                  they are on your plan certificate; the portal copy arrives with the family
                  records service.
                </li>
                <li>
                  <strong>Account maturity and claims</strong> — handled by Villa Agency with
                  Eternal Plans, Inc. We will bring them into this page once the records exist.
                </li>
              </ul>
              <div className="row row--wrap mt-4">
                <Link className="btn btn--secondary btn--sm" href="/plans">
                  See the public plan pages
                </Link>
                <Link className="btn btn--secondary btn--sm" href="/client/support">
                  Ask a question
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </FamilySection>

      <FamilySection title="Things you can ask for">
        <div className="fp-quicks">
          {[
            ["Change a beneficiary", "keep your plan current", "/client/support"],
            ["Transfer the plan", "to another living person", "/client/support"],
            ["Request a certificate", "a copy for your records", "/client/documents"],
            ["Ask about maturity", "when it is fully paid", "/client/support"],
            ["Ask about a claim", "when the time comes", "/client/support"],
            ["Talk to Villa Agency", FAMILY_HELP.agencyPhone, FAMILY_HELP.agencyPhoneHref],
          ].map(([label, note, href]) => (
            <Link className="fp-quick" href={href} key={label}>
              <span>{label}</span>
              <em>{note}</em>
            </Link>
          ))}
        </div>
        <div className="row row--wrap mt-4">
          <Badge tone="info">Nothing here sends anything yet</Badge>
          <p className="fp-note">
            These actions open a page that explains what is planned; until the records service
            exists, a call is the fastest way to change anything.
          </p>
        </div>
      </FamilySection>
    </div>
  );
}

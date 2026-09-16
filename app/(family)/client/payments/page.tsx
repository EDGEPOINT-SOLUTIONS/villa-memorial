import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { buildFamilyNeeds, familyDocumentView } from "@/lib/family/family-view";
import {
  FamilyDocRow,
  FamilyHelpCard,
  FamilyKv,
  FamilyMoney,
  FamilyNeeds,
  FamilySection,
} from "@/components/family/family-ui";

export const metadata = { title: "Payments — Villa Memorial" };

/**
 * My Payments — approved design page 6.
 * Real today: the balance, and the three ways a family can actually pay.
 * Not yet real: payment history, per-payment receipts and online payment — the
 * page says so instead of showing an empty table as if the family had never paid.
 */
export default async function ClientPaymentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { balance, balance_cents, plan_summary, recent_documents } = snapshot;

  const needs = buildFamilyNeeds(snapshot).filter((need) => need.kind === "due");
  const receipts = recent_documents
    .map((doc) => familyDocumentView(doc.title, doc.status))
    .filter((doc) => /receipt/i.test(doc.title));

  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Money &amp; papers</p>
          <h1>Payments</h1>
          <p className="fp-lead">
            What is paid, what is left, and how to pay — without the accounting words.
          </p>
        </div>
        <div className="page-header__actions">
          <Link className="btn btn--secondary btn--sm" href="/client/support">
            Request a statement
          </Link>
        </div>
      </header>

      <FamilySection title="What needs you">
        {needs.length > 0 ? (
          <FamilyNeeds needs={needs} />
        ) : (
          <Card>
            <p className="empty-state__title">You are up to date</p>
            <p className="empty-state__hint">
              {balance.remaining} is settled, or nothing is due right now. Your next date is{" "}
              {plan_summary.next_due}.
            </p>
          </Card>
        )}
        <div className="fp-grid-3 mt-4">
          <FamilyMoney label="Plan total" value={balance.total} note={plan_summary.plan_name} />
          <FamilyMoney label="Paid so far" value={balance.paid} note="Recorded against your family's plan" tone="ok" />
          <FamilyMoney
            label="Still open"
            value={balance.remaining}
            note={`Next due ${plan_summary.next_due}`}
            tone={balance_cents && balance_cents.remaining > 0 ? "due" : undefined}
          />
        </div>
      </FamilySection>

      <FamilySection
        title="How to pay"
        sub="Three ways that work today. Every payment gets an official receipt."
      >
        <div className="fp-grid-3">
          <Card header={<h3 className="fp-h3">GCash or Maya</h3>}>
            <p className="fp-note">
              Send to the number the office gives you, and put your family&rsquo;s plan in the
              note. Call {FAMILY_HELP.phone} and we will confirm the number and the reference while
              you are on the line — a wrong number is the one mistake we do not want.
            </p>
            <a className="btn btn--secondary btn--sm mt-4" href={FAMILY_HELP.phoneHref}>
              Call {FAMILY_HELP.phone}
            </a>
          </Card>
          <Card header={<h3 className="fp-h3">Bank transfer</h3>}>
            <p className="fp-note">
              Ask us for the account details, or send us the deposit slip afterwards and we will
              record the payment the same day.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/support">
              Ask for the account details
            </Link>
          </Card>
          <Card header={<h3 className="fp-h3">At the office</h3>}>
            <p className="fp-note">
              {FAMILY_HELP.office}. Cash, card or cheque — and we can collect at the chapel while
              the wake is on, if that is easier for your family.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/appointments">
              Arrange a collection
            </Link>
          </Card>
        </div>
        <div className="mt-4">
          <Alert tone="info" title="Paying online is not switched on yet">
            Online card payment and a downloadable statement arrive with the family records
            service. Until then these three ways work, and every payment is recorded against your
            family&rsquo;s plan with an official receipt.
          </Alert>
        </div>
      </FamilySection>

      <FamilySection
        title="Payment history"
        sub="When a payment is recorded against your family's plan, it will appear here."
      >
        <Card>
          <p className="empty-state__title">Your history is not shown yet</p>
          <p className="empty-state__hint">
            Not wired yet: the list of payments (date, what for, amount, how, and the receipt) needs
            the family records service. Until then, ask us for a statement and we will send or read
            it to you.
          </p>
          <div className="row row--wrap mt-4">
            <Link className="btn btn--secondary btn--sm" href="/client/support">
              Ask for a statement
            </Link>
            <Link className="btn btn--secondary btn--sm" href="/client/documents">
              Your papers &amp; receipts
            </Link>
          </div>
          {receipts.length > 0 ? (
            <div className="mt-4">
              <p className="fp-h3">Receipts we have issued</p>
              {receipts.map((doc) => (
                <FamilyDocRow
                  key={doc.title}
                  title={doc.title}
                  meta="Issued for your family"
                  status={doc.status}
                  tone={doc.tone}
                  href="/client/documents"
                />
              ))}
            </div>
          ) : null}
        </Card>
      </FamilySection>

      <FamilySection
        title="If money is tight"
        sub="Nothing bad happens the moment a payment is missed."
      >
        <div className="fp-split">
          <Card>
            <p className="fp-note">
              Call us and we will agree a new schedule, in writing. Your agreement&rsquo;s penalty
              only applies if a payment is missed for a long time without any arrangement — and we
              would always rather talk first.
            </p>
            <a className="btn btn--secondary btn--sm mt-4" href={FAMILY_HELP.phoneHref}>
              Talk to us about a schedule
            </a>
          </Card>
          <Card header={<h3 className="fp-h3">Help with the cost</h3>}>
            <p className="fp-note">
              Families often bring these to the contract. If you have any of them, tell us and we
              will apply them for you.
            </p>
            <FamilyKv
              rows={[
                ["LGU burial assistance", "Coffin and embalming days"],
                ["DSWD assistance", "Per the program you qualify for"],
                ["Senior citizen discount", "20% on eligible items"],
                ["SSS / GSIS", "Burial benefit claim"],
              ]}
            />
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/support">
              Tell us what you have
            </Link>
          </Card>
        </div>
      </FamilySection>

      <FamilySection title="While you wait, a person can help">
        <FamilyHelpCard
          phone={FAMILY_HELP.phone}
          phoneHref={FAMILY_HELP.phoneHref}
          hours={FAMILY_HELP.hours}
          office={FAMILY_HELP.office}
        />
      </FamilySection>
    </div>
  );
}

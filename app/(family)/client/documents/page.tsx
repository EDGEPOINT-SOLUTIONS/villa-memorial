import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { familyDocumentView } from "@/lib/family/family-view";
import { FamilyDocRow, FamilyHelpCard, FamilySection } from "@/components/family/family-ui";

export const metadata = { title: "Documents — Villa Memorial" };

/**
 * My Documents — approved design page 7.
 * Real today: the papers the snapshot records for this family, in family words.
 * Not yet real: the full repository (permits, certificates), the "waiting on
 * you" rules, uploads and copy requests.
 */
export default async function ClientDocumentsPage() {
  const session = await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const documents = snapshot.recent_documents.map((doc) =>
    familyDocumentView(doc.title, doc.status),
  );

  return (
    <div className="fp-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Money &amp; papers</p>
          <h1>Documents</h1>
          <p className="fp-lead">
            The papers your family has with us — with who is waiting on whom.
          </p>
        </div>
        <div className="page-header__actions">
          <Link className="btn btn--secondary btn--sm" href="/client/support">
            Ask for a copy
          </Link>
        </div>
      </header>

      <FamilySection
        title="Waiting on you"
        sub="Papers we still need from your family. Nothing is waiting on you right now."
      >
        <Card>
          <p className="empty-state__title">Nothing is waiting on you</p>
          <p className="empty-state__hint">
            When we need a paper from you, it will be named here with the date we need it by and one
            way to send it — a photo on your phone is enough. Permits, certificates and the papers
            you hand us will also be listed on this page once the family records service is on.
          </p>
        </Card>
      </FamilySection>

      <FamilySection
        title="Your family's papers"
        sub="Contracts, receipts and certificates we have issued for your family."
      >
        <Card>
          {documents.length === 0 ? (
            <p className="fp-note">
              No papers have been issued yet. They appear here the moment they are ready.
            </p>
          ) : (
            documents.map((doc) => (
              <FamilyDocRow
                key={doc.title}
                title={doc.title}
                meta={doc.note}
                status={doc.status}
                tone={doc.tone}
                actionLabel="Ask for a copy"
                href="/client/support"
              />
            ))
          )}
          <div className="alert alert--info mt-4" role="status">
            <div>
              <strong>This list is not complete yet.</strong>
              <br />
              The full repository — death certificate, burial permit, lot documents, the plan
              certificate — arrives with the family records service. Until then, call{" "}
              {FAMILY_HELP.phone} and we will find any paper for you.
            </div>
          </div>
        </Card>
      </FamilySection>

      <FamilySection
        title="Who can see these papers"
        sub="Your family's papers are private to your family and to the staff who serve you."
      >
        <div className="fp-split">
          <Card header={<h3 className="fp-h3">On this account</h3>}>
            <FamilyDocRow
              title={snapshot.family.display_name}
              meta={`${session.email ?? snapshot.family.email} · signs in and sees everything`}
              status="Owner"
              tone="success"
            />
            <p className="fp-note mt-4">
              Inviting another family member (with their own role and their own access) is part of
              the approved design and arrives with the family records service — it is planned, not
              switched on.
            </p>
            <Link className="btn btn--secondary btn--sm mt-4" href="/client/family">
              See what is planned for family access
            </Link>
          </Card>
          <Card header={<h3 className="fp-h3">When a paper is wrong</h3>}>
            <p className="fp-note">
              If a name, a date or an amount on a paper does not match your own copy, tell us and we
              will correct the record. Your paper receipt is the one that counts.
            </p>
            <a className="btn btn--secondary btn--sm mt-4" href={FAMILY_HELP.phoneHref}>
              Call {FAMILY_HELP.phone}
            </a>
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

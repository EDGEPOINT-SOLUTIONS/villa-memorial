import { Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilyCase, getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { familyPapers } from "@/lib/family/family-documents";
import { Answer, PrimaryAction, QuietLink, Rows, WhatThisShows } from "@/components/family/family-ui";
import { DashPanel } from "@/components/family/dash-ui";
import { CaseChain, CaseSchedule, caseDoneWords } from "@/components/family/family-case";
import { OwnedPaperRow } from "@/components/family/family-papers";

export const metadata = { title: "The funeral — Villa Funeraria" };

/**
 * The funeral — the office's recorded arrangement, connected (2026-09-30).
 *
 * The dashboard's arrangement panel and this page render the SAME recorded case
 * through the ONE renderer (`components/family/family-case.tsx`): the five
 * moments, each with the time and place the office wrote down and its state. A
 * family whose record carries no case keeps the honest “kept by our office”
 * state — call and we will read it — and a step the record does not carry says
 * “Not recorded yet” rather than a guessed time.
 *
 * The family's own service contract stays in the open on this page (the
 * captain's 2026-09-17 rule); what the record cannot show yet sits in the ONE
 * shared gap disclosure.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot().catch(() => null);
  const familyCase = await getFamilyCase().catch(() => null);
  const firstName = snapshot?.loved_one.name.split(/\s+/)[0] || "Your loved one";
  const contract = familyPapers(snapshot?.recent_documents ?? []).contract;

  return (
    <div className="dash">
      <Answer
        kicker="The funeral"
        headline={
          familyCase
            ? `${firstName}’s funeral, as our office recorded it.`
            : `${firstName}’s funeral plan is kept by our office.`
        }
        sub={
          familyCase
            ? "The five moments, with the times and places we hold."
            : "Call us and we will read you the whole plan."
        }
        actions={
          familyCase ? (
            <>
              <PrimaryAction href="#arrangement" label="See the times and places" />
              <QuietLink
                href={FAMILY_HELP.phoneHref}
                label="Call us about the funeral"
                icon={<Phone size={20} aria-hidden="true" />}
              />
            </>
          ) : (
            <>
              <PrimaryAction href={FAMILY_HELP.phoneHref} label={`Call ${FAMILY_HELP.phone}`} />
              <QuietLink href="/client/documents" label="See your papers" />
            </>
          )
        }
      />

      {familyCase ? (
        <div className="dash-grid">
          <DashPanel
            id="arrangement"
            role="arrangement"
            className="dash-span-12"
            label="The arrangement"
            title="The funeral"
            count={caseDoneWords(familyCase)}
          >
            <CaseChain familyCase={familyCase} />
            <CaseSchedule familyCase={familyCase} />
          </DashPanel>
        </div>
      ) : null}

      <div className="dash-grid">
        <DashPanel
          id="contract"
          role="place"
          className="dash-span-12"
          label="Papers"
          title="Your service contract"
        >
          {contract ? (
            <Rows>
              <OwnedPaperRow paper={contract} />
            </Rows>
          ) : (
            <p className="dash-empty">
              No service contract is recorded here yet. Call us and we will find your copy.
            </p>
          )}
        </DashPanel>
      </div>

      <WhatThisShows>
        Nothing else about the funeral is kept online yet. Call {FAMILY_HELP.phone} for anything at
        all.
      </WhatThisShows>
    </div>
  );
}

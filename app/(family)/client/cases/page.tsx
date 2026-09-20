import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FAMILY_HELP } from "@/lib/family/contact";
import { familyPapers } from "@/lib/family/family-documents";
import { PlannedAnswer, Rows, Section } from "@/components/family/family-ui";
import { OwnedPaperRow } from "@/components/family/family-papers";

export const metadata = { title: "The funeral — Villa Memorial" };

/**
 * The funeral — the approved redesign (docs/08-delivery/family-portal-design,
 * page 03), compressed to the family reading budget (2026-09-21): one-sentence
 * hero, the family's own contract in the open, and the preview of what will
 * live here behind the ONE shared `WhatThisShows` disclosure.
 *
 * The family case service does not exist yet, so this is the honest designed
 * state: call and the office will read the plan. No invented times.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot().catch(() => null);
  const firstName = snapshot?.loved_one.name.split(/\s+/)[0] || "Your loved one";
  const contract = familyPapers(snapshot?.recent_documents ?? []).contract;

  return (
    <PlannedAnswer
      kicker="The funeral"
      headline={`${firstName}’s funeral plan is kept by our office.`}
      sub="Call us and we will read you the whole plan."
      planned={[
        {
          label: "The viewing",
          detail: "Where to go and the hours you can visit",
        },
        {
          label: "The funeral service",
          detail: "The church, the time, and who is leading it",
        },
        {
          label: "The burial",
          detail: "The place, the time, and your family’s lot",
        },
        {
          label: "What we are taking care of",
          detail: "The permit, the cars and the flowers",
        },
      ]}
      note={`The viewing, service and burial times aren’t connected yet. Call ${FAMILY_HELP.phone} and we’ll tell you.`}
    >
      <Section title="Your service contract" sub="Your family’s own copy — always here.">
        {contract ? (
          <Rows>
            <OwnedPaperRow paper={contract} />
          </Rows>
        ) : (
          <p className="ag-sub">
            No service contract is recorded here yet. Call us and we will find your copy.
          </p>
        )}
      </Section>
    </PlannedAnswer>
  );
}

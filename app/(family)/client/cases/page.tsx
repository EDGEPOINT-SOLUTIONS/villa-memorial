import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { familyPapers } from "@/lib/family/family-documents";
import { PlannedAnswer, Rows, Section } from "@/components/family/family-ui";
import { OwnedPaperRow } from "@/components/family/family-papers";

export const metadata = { title: "The funeral — Villa Memorial" };

/**
 * The funeral — the approved redesign (docs/08-delivery/family-portal-design,
 * page 03). The family case service does not exist yet, so this is the honest
 * designed state: one answer (the office holds the plan, call and we will read
 * it), the moments that will live here, and one calm note. No invented times.
 *
 * The funeral is also where the service contract belongs: it is the family's
 * own paper, so it is shown here as theirs — a real copy when the record can
 * produce one, the honest “getting it ready” state otherwise, and never a
 * request.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot().catch(() => null);
  const firstName = snapshot?.loved_one.name.split(/\s+/)[0] || "Your loved one";
  const contract = familyPapers(snapshot?.recent_documents ?? []).contract;

  return (
    <PlannedAnswer
      kicker="The funeral"
      headline={`${firstName}’s funeral plan is kept by our office. Call us and we will read you the whole plan.`}
      sub="The viewing hours, the funeral service and the burial are not shown here yet — the arrangement records are not connected to this page. Until they are, the office will tell you exactly what is arranged."
      plannedTitle="What will be here"
      planned={[
        {
          label: "The viewing",
          detail: "Where to go and the hours you can visit, every day",
        },
        {
          label: "The funeral service",
          detail: "The church, the time, and who is leading the service",
        },
        {
          label: "The burial",
          detail: "The place, the time, and your family’s lot",
        },
        {
          label: "What we are taking care of",
          detail: "The permit, the cars and the flowers — so you do not have to follow any of it up",
        },
        {
          label: "If anything changes",
          detail: "One line at the top of this page, and a call to you",
        },
      ]}
      note="The arrangement records service is not switched on yet. When it is, everything above will keep itself up to date on this page, and you will not have to call to ask what changed."
    >
      <Section
        title="Your service contract"
        sub="The contract for the funeral is your family's own copy — kept here for you, never something you have to request."
      >
        {contract ? (
          <Rows>
            <OwnedPaperRow paper={contract} />
          </Rows>
        ) : (
          <p className="ag-sub">
            No service contract is recorded here yet. When there is one, your copy stays on this
            page and you will never need to ask for it. Call us any time and we will find it for
            you.
          </p>
        )}
      </Section>
    </PlannedAnswer>
  );
}

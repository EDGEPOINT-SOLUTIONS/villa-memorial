import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilyPlannedPage } from "@/components/family/family-ui";

export const metadata = { title: "Requests — Villa Memorial" };

/**
 * Requests — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Getting help"
      title="Requests"
      lead="Ask us for anything — a repair, a paper, a change, a visit — and see who is handling it."
      missing="Request tracking needs the service desk (ticket number, owner, status, history). Until it exists nothing can be stored or answered here, so we will not pretend it can."
      blocks={[
        { heading: "Open requests", detail: "What you asked for, who has it, and whether it is waiting on us or on you" },
        { heading: "What you can ask for", detail: "Maintenance, papers, transfer, interment, the memorial, a visit" },
        { heading: "New request", detail: "Tell us in your own words, with a photo if it helps" },
        { heading: "Closed requests", detail: "Everything already handled, so nothing is asked twice" },
      ]}
      help={
        <FamilyHelpCard
          phone={FAMILY_HELP.phone}
          phoneHref={FAMILY_HELP.phoneHref}
          hours={FAMILY_HELP.hours}
          office={FAMILY_HELP.office}
        />
      }
    />
  );
}

import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import {
  FamilyHelpCard,
  FamilyPlannedPage,
  FamilySection,
  FamilySteps,
} from "@/components/family/family-ui";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Funeral case — Villa Memorial" };

/**
 * Funeral case — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Our arrangement"
      title="Funeral case"
      lead="What is happening, step by step, and what your family arranged — in the words we would use on the phone."
      missing="Cases are staff-scoped today: showing a family their own funeral case needs a family-scoped read of the case and its schedule. Until then, call us and we will tell you exactly where things stand."
      blocks={[
        { heading: "Where they are now", detail: "The seven stages of the arrangement, with the dates" },
        { heading: "The services and the schedule", detail: "Viewing, funeral service and interment — times and places" },
        { heading: "What your family has arranged", detail: "The services chosen, what is included, and what was paid" },
        { heading: "The papers for this case", detail: "Death certificate, burial permit, authorizations, contracts" },
        { heading: "If something changes", detail: "Ask for a change, or tell us something privately" },
      ]}
      help={
        <FamilyHelpCard
          phone={FAMILY_HELP.phone}
          phoneHref={FAMILY_HELP.phoneHref}
          hours={FAMILY_HELP.hours}
          office={FAMILY_HELP.office}
        />
      }
      preview={
        <FamilySection
          title="The steps we will show you"
          sub="Our own case model — inquiry, retrieval, preparation, viewing, ceremony, interment, completed — written in the words we use on the phone. The dates appear here once your family's case is visible to you."
        >
          <Card>
            <FamilySteps
              steps={[
                { state: "todo", label: "We bring your loved one into our care" },
                { state: "todo", label: "The arrangement is agreed with your family" },
                { state: "todo", label: "Preparation and dressing are completed" },
                { state: "todo", label: "The viewing, at the chapel you chose" },
                { state: "todo", label: "The funeral service" },
                { state: "todo", label: "The interment, at your family's lot" },
                { state: "todo", label: "All papers returned to your family" },
              ]}
            />
          </Card>
        </FamilySection>
      }
    />
  );
}

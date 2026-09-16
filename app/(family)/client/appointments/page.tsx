import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilyPlannedPage } from "@/components/family/family-ui";

export const metadata = { title: "Appointments — Villa Memorial" };

/**
 * Appointments — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Getting help"
      title="Appointments"
      lead="Time with our people — at the office, at the park, or on the phone."
      missing="Family-facing appointments need the scheduling service to confirm a real slot. We will not show a booking that a human has not confirmed."
      blocks={[
        { heading: "Upcoming", detail: "What is confirmed, where to go, and how to reschedule" },
        { heading: "Ask for a time", detail: "Who is coming, what you would like to talk about, and anything we should prepare" },
        { heading: "Past appointments", detail: "What was discussed, so you keep the thread" },
        { heading: "Prefer to just call?", detail: "Our office hours and the duty line" },
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

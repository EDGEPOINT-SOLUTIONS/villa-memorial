import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilyPlannedPage } from "@/components/family/family-ui";

export const metadata = { title: "Privacy Center — Villa Memorial" };

/**
 * Privacy Center — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Our family & privacy"
      title="Privacy Center"
      lead="What we hold, who can see it, and what you can change — all in one place."
      missing="Consent controls, an access log of who on our staff looked at your family's records, and data-rights requests all need the consent and audit services. The promises below are what we hold ourselves to; the buttons that change things are not switched on yet."
      blocks={[
        { heading: "Our promise to your family", detail: "What we use your records for, and what we will never do" },
        { heading: "What other people can see", detail: "Per item: family only, link only, public without a name, or staff only" },
        { heading: "Who looked at your records", detail: "Your own log of every staff look-up" },
        { heading: "Your choices", detail: "Remembrance reminders, memorial activity and park news — off unless you turn them on" },
        { heading: "Your rights under the Data Privacy Act", detail: "See and copy, correct, object, close and erase" },
        { heading: "What we keep, and for how long", detail: "With the reason — including what the law does not let us erase" },
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

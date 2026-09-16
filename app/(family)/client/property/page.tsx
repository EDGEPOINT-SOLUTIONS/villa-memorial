import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilyPlannedPage } from "@/components/family/family-ui";

export const metadata = { title: "Memorial property — Villa Memorial" };

/**
 * Memorial property — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Our arrangement"
      title="Memorial property"
      lead="The lots your family owns or is paying for, and what is happening on them."
      missing="Lot records for families — who the lot belongs to, the sale terms, the interments and the maintenance history — are not modelled yet. The park map and the lot inventory exist on our side; the family view arrives with the property records service."
      blocks={[
        { heading: "The place", detail: "Park, section, block and lot, with the lot pinned on the park map" },
        { heading: "Who it belongs to", detail: "Owner and authorized family, and the right of interment" },
        { heading: "Payments for this lot", detail: "Total, paid and balance — with the ways we can arrange it" },
        { heading: "On the lot right now", detail: "Interments, maintenance and the care fund" },
        { heading: "What you can ask for", detail: "Transfer, marker, maintenance, a visit, the lot's QR record" },
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

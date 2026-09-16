import { Phone } from "lucide-react";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { PlannedAnswer, PrimaryAction, QuietLink } from "@/components/family/family-ui";

export const metadata = { title: "Your lot — Villa Memorial" };

/**
 * Your lot — the approved redesign (docs/08-delivery/family-portal-design).
 * Lot records for families do not exist yet, so this is the honest designed
 * state. The park map is real, so it carries the primary action.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <PlannedAnswer
      kicker="Your lot"
      headline="Your lot records are kept by our office. The park map is here, and it is real."
      sub="Who the lot belongs to, the payments for it and what is on it now are held by the property office and are not connected to this page yet. Open the map to find your family’s place."
      plannedTitle="What will be here"
      planned={[
        {
          label: "The place",
          detail: "Park, section, block and lot, pinned on the park map",
        },
        {
          label: "Who it belongs to",
          detail: "Owner, authorized family, and the right of interment",
        },
        {
          label: "Payments for this lot",
          detail: "Total, paid and balance — with the ways we can arrange it",
        },
        {
          label: "On the lot right now",
          detail: "Interments, maintenance and the care fund",
        },
        {
          label: "What you can ask for",
          detail: "Transfer, marker, maintenance, a visit",
        },
      ]}
      note="Lot records for families are not switched on yet. Until they are, call us and we will find anything about your lot."
      action={
        <>
          <PrimaryAction href="/map" label="Open the park map" />
          <QuietLink
            href={FAMILY_HELP.phoneHref}
            label="Call us about your lot"
            icon={<Phone size={20} aria-hidden="true" />}
          />
        </>
      }
    />
  );
}

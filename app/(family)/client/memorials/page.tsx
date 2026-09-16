import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilyPlannedPage } from "@/components/family/family-ui";

export const metadata = { title: "Memorials — Villa Memorial" };

/**
 * Memorials — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Remembering"
      title="Memorials"
      lead="The pages your family keeps for the people you have lost — and who they are shared with."
      missing="There is no memorial service yet: pages, photos, tributes and the moderation your family controls all arrive with the memorial module. Nothing about your family is published anywhere until that exists and you say so."
      blocks={[
        { heading: "Your family's memorial pages", detail: "Their story, photos and songs — private by default" },
        { heading: "Tributes waiting for you", detail: "Messages from family and friends, published only after your approval" },
        { heading: "Who can see it", detail: "Family only, a private link, or public — your choice, per memorial" },
        { heading: "Remembrance dates", detail: "Birthday, anniversary and All Souls' — reminders you can switch off" },
        { heading: "During a wake", detail: "A guestbook, the programme, a private livestream for relatives abroad" },
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

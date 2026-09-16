import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";
import { FamilyHelpCard, FamilyPlannedPage } from "@/components/family/family-ui";

export const metadata = { title: "Family & access — Villa Memorial" };

/**
 * Family & access — approved family-portal design (docs/08-delivery/family-portal-design).
 *
 * The page is designed and the data path does not exist yet, so it states what
 * will be here and how to reach a person today. No invented data is rendered.
 */
export default async function Page() {
  await requirePortalSessionOrRedirect("family");

  return (
    <FamilyPlannedPage
      eyebrow="Our family & privacy"
      title="Family & access"
      lead="Who is in this arrangement with you, what each person can see, and who decides."
      missing="Family membership — roles, invitations and the access list — needs the identity service to carry family members. Today one account signs in; the family circle is designed and not switched on."
      blocks={[
        { heading: "The people on this account", detail: "Each person's role in plain words, and when they last looked" },
        { heading: "What each role can see", detail: "Owner, family member, contributor and guest — across the arrangement, payments and the memorial" },
        { heading: "Family living abroad", detail: "Joining from overseas, local times, the live link, and contributions" },
        { heading: "Decisions and consent", detail: "Changing who decides, and what your family has agreed to share" },
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

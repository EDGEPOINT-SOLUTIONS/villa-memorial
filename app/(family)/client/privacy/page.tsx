import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Privacy Center — Villa Memorial" };

export default async function privacyPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="Privacy Center" />
      <PageSection>
        <FamilyComingSoon area="Privacy Center" whatUnblocks="consent records for the family portal arrive with the family API contract" />
      </PageSection>
    </>
  );
}

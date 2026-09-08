import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My Funeral Cases — In Memoriam" };

export default async function casesPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="My Funeral Cases" />
      <PageSection>
        <FamilyComingSoon area="My Funeral Cases" whatUnblocks="case visibility for families arrives with the family API contract (cases are staff-scoped today)" />
      </PageSection>
    </>
  );
}

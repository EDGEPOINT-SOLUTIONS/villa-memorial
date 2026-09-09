import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My memorial property — Villa Memorial" };

export default async function propertyPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="My memorial property" />
      <PageSection>
        <FamilyComingSoon area="My memorial property" whatUnblocks="lot ownership for the family portal arrives with the dev-authored family API (the lot contract is staff-scoped today)" />
      </PageSection>
    </>
  );
}

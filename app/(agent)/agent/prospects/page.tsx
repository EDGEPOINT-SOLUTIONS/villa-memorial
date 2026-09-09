import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Prospects — Villa Memorial" };

export default async function prospectsPage() {
  await requirePortalSessionOrRedirect("agent");
  return (
    <>
      <PageHeader eyebrow="Agent portal" title="Prospects" />
      <PageSection>
        <FamilyComingSoon area="Prospects" whatUnblocks="lead capture for agents runs on crm-families, which is not built yet" />
      </PageSection>
    </>
  );
}

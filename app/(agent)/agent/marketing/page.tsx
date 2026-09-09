import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Marketing Materials — Villa Memorial" };

export default async function marketingPage() {
  await requirePortalSessionOrRedirect("agent");
  return (
    <>
      <PageHeader eyebrow="Agent portal" title="Marketing Materials" />
      <PageSection>
        <FamilyComingSoon area="Marketing Materials" whatUnblocks="marketing content lives in the CMS, which is not built yet" />
      </PageSection>
    </>
  );
}

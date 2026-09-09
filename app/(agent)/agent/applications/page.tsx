import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Applications — Villa Memorial" };

export default async function applicationsPage() {
  await requirePortalSessionOrRedirect("agent");
  return (
    <>
      <PageHeader eyebrow="Agent portal" title="Applications" />
      <PageSection>
        <FamilyComingSoon area="Applications" whatUnblocks="plan/application tracking for agents arrives with the crm-families and plan contracts" />
      </PageSection>
    </>
  );
}

import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My clients — In Memoriam" };

export default async function clientsPage() {
  await requirePortalSessionOrRedirect("agent");
  return (
    <>
      <PageHeader eyebrow="Agent portal" title="My clients" />
      <PageSection>
        <FamilyComingSoon area="My clients" whatUnblocks="a client list for agents arrives with the crm-families contract (the agent workspace is not built yet)" />
      </PageSection>
    </>
  );
}

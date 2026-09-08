import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My Requests — In Memoriam" };

export default async function requestsPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="My Requests" />
      <PageSection>
        <FamilyComingSoon area="My Requests" whatUnblocks="the requests/inquiry path runs on crm-families, which is not built yet" />
      </PageSection>
    </>
  );
}

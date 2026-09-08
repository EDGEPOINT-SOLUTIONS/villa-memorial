import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Support & Tickets — In Memoriam" };

export default async function supportPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="Support & Tickets" />
      <PageSection>
        <FamilyComingSoon area="Support & Tickets" whatUnblocks="the support-ticketing module is deferred platform scope" />
      </PageSection>
    </>
  );
}

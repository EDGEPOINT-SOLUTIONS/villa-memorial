import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Notifications — In Memoriam" };

export default async function notificationsPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="Notifications" />
      <PageSection>
        <FamilyComingSoon area="Notifications" whatUnblocks="delivery of family notifications awaits the notification rule/event contract freeze" />
      </PageSection>
    </>
  );
}

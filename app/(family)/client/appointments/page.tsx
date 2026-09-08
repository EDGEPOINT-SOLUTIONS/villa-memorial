import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My Appointments — In Memoriam" };

export default async function appointmentsPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="My Appointments" />
      <PageSection>
        <FamilyComingSoon area="My Appointments" whatUnblocks="appointment scheduling for families arrives with the family API contract" />
      </PageSection>
    </>
  );
}

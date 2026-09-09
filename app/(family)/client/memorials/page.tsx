import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My Memorials — Villa Memorial" };

export default async function memorialsPage() {
  await requirePortalSessionOrRedirect("family");
  return (
    <>
      <PageHeader eyebrow="Family portal" title="My Memorials" />
      <PageSection>
        <FamilyComingSoon area="My Memorials" whatUnblocks="digital memorials / QR tributes have no backend service yet — they await the memorial module contract" />
      </PageSection>
    </>
  );
}

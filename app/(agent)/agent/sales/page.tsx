import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "Sales & Commissions — Villa Memorial" };

export default async function salesPage() {
  await requirePortalSessionOrRedirect("agent");
  return (
    <>
      <PageHeader eyebrow="Agent portal" title="Sales & Commissions" />
      <PageSection>
        <FamilyComingSoon area="Sales & Commissions" whatUnblocks="the commission engine is deferred platform scope (finance) — nothing is fake-wired here" />
      </PageSection>
    </>
  );
}

import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My payments — Villa Memorial" };

export default async function ClientPaymentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { balance } = snapshot;

  return (
    <>
      <PageHeader eyebrow="Family portal" title="My payments" />
      <PageSection>
        <Card header={<h3>Account balance</h3>}>
          <div className="stack-3">
            <div className="row row--space">
              <span className="text-sm text-muted">Total</span>
              <span>{balance.total}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Paid</span>
              <span>{balance.paid}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Remaining</span>
              <strong>{balance.remaining}</strong>
            </div>
          </div>
        </Card>
      </PageSection>
      <PageSection>
        <FamilyComingSoon
          area="Payment history &amp; online payment"
          whatUnblocks="per-payment history for families arrives with the family API contract (billing is staff-scoped today)"
        />
      </PageSection>
    </>
  );
}

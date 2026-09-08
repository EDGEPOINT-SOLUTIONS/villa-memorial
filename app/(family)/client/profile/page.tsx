import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";

export const metadata = { title: "My profile — In Memoriam" };

export default async function ClientProfilePage() {
  const session = await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { family } = snapshot;

  return (
    <>
      <PageHeader eyebrow="Family portal" title="My profile" />
      <div className="family-grid">
        <Card header={<h3>Account</h3>}>
          <div className="stack-3">
            <div className="row row--space">
              <span className="text-sm text-muted">Name</span>
              <span>{family.display_name}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Email</span>
              <span>{session.email}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Primary contact</span>
              <span>{family.primary_contact}</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

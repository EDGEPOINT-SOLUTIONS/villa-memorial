import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { FamilyComingSoon } from "@/components/family-coming-soon";

export const metadata = { title: "My documents — Villa Memorial" };

export default async function ClientDocumentsPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { recent_documents } = snapshot;

  return (
    <>
      <PageHeader eyebrow="Family portal" title="My documents" />
      {recent_documents.length > 0 ? (
        <PageSection>
          <Card header={<h3>Recent documents</h3>}>
            <div className="stack-3">
              {recent_documents.map((d) => (
                <div key={d.title} className="row row--space">
                  <span>{d.title}</span>
                  <Badge tone="info">{d.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </PageSection>
      ) : null}
      <PageSection>
        <FamilyComingSoon
          area="Document repository"
          whatUnblocks="a family-scoped document list awaits the family API contract (the repository is staff-scoped today)"
        />
      </PageSection>
    </>
  );
}

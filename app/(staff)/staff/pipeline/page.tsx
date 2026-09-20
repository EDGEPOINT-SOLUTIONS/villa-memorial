import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCrmLeads } from "@/lib/api-client/crm-leads";
import { LeadRecordsPanel } from "@/components/crm/lead-records-panel";

export const metadata = { title: "Sales pipeline — Admin Portal" };

/**
 * Sales pipeline (Relationships) — the CRM area's lead list and the entry point
 * to the staff lead record at /staff/pipeline/[id].
 *
 * The pipeline's own service (crm-families) is unbuilt, so no stage can move
 * from this screen and the office's assignment/sync writes wait on it — the one
 * note above the list says so. What the screen can show honestly today is the
 * recorded lead file, read-only, through lib/api-client/crm-leads.ts. Gating is
 * the CRM area's own (`cases:read`, the same as Customers/Inquiries).
 */
export default async function PipelinePage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Relationships" title="Sales pipeline" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const leads = await listCrmLeads();

  return (
    <>
      <PageHeader eyebrow="Relationships" title="Sales pipeline" />

      <PageSection>
        <Alert tone="info" title="Leads and pipeline run on crm-families, which is unbuilt.">
          Stages cannot move from this screen yet. The records below are the office&apos;s own
          recorded demo file — read-only, and every lead opens its full record.
        </Alert>
      </PageSection>

      <PageSection>
        <Card header={<h2>Recorded lead records</h2>}>
          <LeadRecordsPanel leads={leads} />
        </Card>
      </PageSection>
    </>
  );
}

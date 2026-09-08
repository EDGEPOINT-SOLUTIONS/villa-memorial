import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { getFamilySnapshot } from "@/lib/api-client/family";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My memorial plans — In Memoriam" };

export default async function ClientPlansPage() {
  await requirePortalSessionOrRedirect("family");
  const snapshot = await getFamilySnapshot();
  const { plan_summary } = snapshot;

  return (
    <>
      <PageHeader eyebrow="Family portal" title="My memorial plans" />
      <PageSection>
        <Card header={<h3>Active plan</h3>}>
          <div className="stack-3">
            <div className="row row--space">
              <span className="text-sm text-muted">Plan</span>
              <strong>{plan_summary.plan_name}</strong>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Status</span>
              <Badge tone="success">{plan_summary.status}</Badge>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Term</span>
              <span>{plan_summary.term}</span>
            </div>
            <div className="row row--space">
              <span className="text-sm text-muted">Next due</span>
              <span>{plan_summary.next_due}</span>
            </div>
          </div>
        </Card>
      </PageSection>
      <PageSection>
        <Card header={<h3>Looking for a new plan?</h3>}>
          <p className="text-sm text-muted">
            Browse pre-need plans and services on the public site.
          </p>
          <Link href="/plans" className="btn btn--secondary btn--sm">
            Explore plans
          </Link>
        </Card>
      </PageSection>
    </>
  );
}

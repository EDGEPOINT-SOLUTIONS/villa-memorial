import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, NotWiredState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Workflows — Staff Portal" };

/** Workflow builder (villa /admin/workflows). The config/workflow engine is a
 * deferred platform layer; the + New door exists for route parity. */
export default async function WorkflowsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["tenancy:tenants:manage"])) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Workflows" />
        <PageSection>
          <ForbiddenState requiredScopes={["tenancy:tenants:manage"]} />
        </PageSection>
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Workflows"
        actions={
          <Link href="/staff/workflows/new" className="btn btn--primary btn--sm">
            + New workflow
          </Link>
        }
      />
      <PageSection>
        <NotWiredState
          area="Workflows"
          reason="The workflow/config engine is a deferred platform layer — this admin surface (and its + New door) appears once that engine exists."
        />
      </PageSection>
    </>
  );
}

import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, NotWiredState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Plans — Staff Portal" };

/** Staff-side plan management (villa /plans + /plans/new). The public catalogue
 * (/plans) is live; management awaits the catalog write API. */
export default async function PlansPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Plans" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Plans"
        actions={
          <Link href="/staff/plans/new" className="btn btn--primary btn--sm">
            + New plan
          </Link>
        }
      />
      <PageSection>
        <NotWiredState
          area="Plans"
          reason="The public catalogue is live (browse at /plans). Staff plan management (list, edit, deactivate) needs the dev-authored catalog write API; individual plan detail pages (/staff/plans/:id) will open from this list when it lands."
        />
      </PageSection>
    </>
  );
}

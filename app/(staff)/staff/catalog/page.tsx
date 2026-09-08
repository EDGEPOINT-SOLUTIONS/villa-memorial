import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, NotWiredState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";

export const metadata = { title: "Catalog — Staff Portal" };

/** Catalog management surface (villa /catalog). The read side shows on the public
 * storefront; staff CRUD awaits the catalog write API — the create door exists. */
export default async function CatalogPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:read"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Catalog" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:read"]} />
        </PageSection>
      </>
    );
  }
  const canWrite = hasAnyScope(session.scopes, ["catalog:write"]);
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Catalog"
        actions={
          canWrite ? (
            <Link href="/staff/catalog/new" className="btn btn--primary btn--sm">
              + New catalog item
            </Link>
          ) : null
        }
      />
      <PageSection>
        <NotWiredState
          area="Catalog"
          reason="The public catalogue is live (browse at /plans); staff catalogue management (create/edit/deactivate) needs the dev-authored catalog write API. The + New entry point opens the honest not-wired door until then."
        />
      </PageSection>
    </>
  );
}

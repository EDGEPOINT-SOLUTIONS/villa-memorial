import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { CatalogItemForm } from "../catalog-item-form";

export const metadata = { title: "New catalog item — Staff Portal" };

/**
 * Create one catalogue item (`catalog:write`). The form validates field by field
 * with the same rule the durable store enforces; the item reaches the public
 * catalogs as soon as it is published.
 */
export default async function NewCatalogItemPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title="New catalog item" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Commerce · Catalog"
        title="New catalog item"
        actions={
          <Link href="/staff/catalog" className="btn btn--secondary btn--sm">
            Back to catalog
          </Link>
        }
      />
      <PageSection>
        <CatalogItemForm />
      </PageSection>
    </>
  );
}

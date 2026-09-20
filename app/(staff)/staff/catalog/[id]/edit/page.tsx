import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { ApiError } from "@/lib/api-client/api-error";
import { getAdminCatalogItem, type AdminCatalogItem } from "@/lib/api-client/commerce";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { CatalogItemForm } from "../../catalog-item-form";

export const metadata = { title: "Edit catalog item — Admin Portal" };

/**
 * Edit one catalogue item by its numeric id (`catalog:write`). The id is the
 * stable identity, so a SKU correction does not move the screen; unknown ids and
 * unpublished items are both readable here because this is the ADMIN record.
 */
export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title="Edit catalog item" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let record: AdminCatalogItem | null;
  try {
    record = await getAdminCatalogItem(decodeURIComponent(id));
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title="Edit catalog item" />
        <PageSection>
          <ErrorState
            message={err instanceof ApiError ? err.message : "Unable to load that catalog item."}
          />
        </PageSection>
      </>
    );
  }

  if (!record) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title="Catalog item not found" />
        <PageSection>
          <EmptyState
            title={`No catalog item ${id}`}
            hint="Check the SKU against the catalog list."
          />
          <div className="mt-4">
            <Link href="/staff/catalog" className="btn btn--secondary btn--sm">
              Back to catalog
            </Link>
          </div>
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Commerce · Catalog"
        title={`Edit ${record.item.sku}`}
        actions={
          <Link href="/staff/catalog" className="btn btn--secondary btn--sm">
            Back to catalog
          </Link>
        }
      />
      <PageSection>
        <CatalogItemForm record={record} />
      </PageSection>
    </>
  );
}

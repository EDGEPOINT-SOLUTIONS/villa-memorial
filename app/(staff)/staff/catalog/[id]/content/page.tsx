import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { CatalogueEntryEditor } from "@/components/content/catalogue-entry-editor";
import {
  ProductLineEditor,
  type ProductLineCatalogueRow,
} from "@/components/content/product-line-editor";
import type { SkuOption } from "@/components/content/content-editor-fields";
import { ApiError } from "@/lib/api-client/api-error";
import { getAdminCatalogItem, listCatalogItems } from "@/lib/api-client/commerce";
import { getItemEntry } from "@/lib/api-client/content-entries";
import { getProductLineForSku } from "@/lib/api-client/product-lines";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { itemEntryKind, itemEntryTarget } from "@/lib/catalogue-content";
import { coffinModelForSku } from "@/lib/catalogue-skus";
import type { ProductLine } from "@/lib/content-catalog";

type ContentParams = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Edit item content — Admin Portal" };

/**
 * Item page-content editor (content-catalogue Phase 4) — one casket or package
 * entry per catalogue item.
 *
 * Reached from the catalogue list and the item's edit form ("Page content").
 * The entry adds the ecommerce-style half: a long description, photographs and
 * ordered content blocks (specifications, dimension tables, inclusions, notes),
 * with every price block bound to a live catalogue SKU — never an amount.
 *
 * The catalogue record remains the identity: the screen shows the name, group
 * and SKU read-only and links to the form that edits them, so a content edit can
 * never rename a product or move a price.
 */
export default async function CatalogItemContentPage({ params }: ContentParams) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title="Edit item content" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let record: Awaited<ReturnType<typeof getAdminCatalogItem>>;
  try {
    record = await getAdminCatalogItem(decodeURIComponent(id));
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title="Edit item content" />
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

  if (!itemEntryKind(record.item.sku)) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title={record.item.name} />
        <PageSection>
          <EmptyState
            title="This item has no page-content entry"
            hint="Casket models and packages carry editable page content. Service lines and add-ons are edited on their own screens (Pages & content, or the catalogue form)."
          />
          <div className="mt-4">
            <Link href={`/staff/catalog/${record.item.id}/edit`} className="btn btn--secondary btn--sm">
              Edit the catalogue record
            </Link>
          </div>
        </PageSection>
      </>
    );
  }

  let entry: Awaited<ReturnType<typeof getItemEntry>>;
  let skuOptions: SkuOption[] = [];
  let catalogueRows: ProductLineCatalogueRow[] = [];
  let line: ProductLine | null = null;
  try {
    entry = await getItemEntry(record.item.sku);
    const items = await listCatalogItems();
    skuOptions = items.map((item) => ({
      sku: item.sku,
      name: item.name,
      displayPrice: item.display_price,
    }));
    catalogueRows = items.map((item) => ({ id: item.id, sku: item.sku, name: item.name }));
    // Casket models carry the "choose a model" line; packages do not.
    if (itemEntryKind(record.item.sku) === "casket") {
      line = await getProductLineForSku(record.item.sku);
    }
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title={record.item.name} />
        <PageSection>
          <ErrorState message="The item content is unavailable right now." />
        </PageSection>
      </>
    );
  }

  if (!entry) {
    return (
      <>
        <PageHeader eyebrow="Commerce · Catalog" title={record.item.name} />
        <PageSection>
          <ErrorState message="This item's page content could not be loaded." />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <p className="text-sm" style={{ margin: 0 }}>
        <Link href="/staff/catalog" className="back-link">
          ← Catalog
        </Link>
      </p>
      <PageHeader eyebrow="Commerce · Catalog · Page content" title={record.item.name} />
      <CatalogueEntryEditor
        initial={entry}
        def={itemEntryTarget(record.item)}
        skuOptions={skuOptions}
      />
      {line ? (
        <ProductLineEditor
          initial={line}
          collection={coffinModelForSku(record.item.sku)?.collection ?? line.name}
          catalogue={catalogueRows}
        />
      ) : null}
    </div>
  );
}

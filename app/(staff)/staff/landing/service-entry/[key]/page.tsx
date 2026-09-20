import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { CatalogueEntryEditor } from "@/components/content/catalogue-entry-editor";
import type { SkuOption } from "@/components/content/content-editor-fields";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getServiceEntry } from "@/lib/api-client/content-entries";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { serviceEntryDef } from "@/lib/service-content";

type EntryParams = { params: Promise<{ key: string }> };

export async function generateMetadata({ params }: EntryParams): Promise<Metadata> {
  const { key } = await params;
  const def = serviceEntryDef(key);
  return { title: `${def?.fallbackTitle ?? "Service entry"} — Pages & content — Admin Portal` };
}

/**
 * The service-entry editor route — one guide entry per key
 * (death-at-home · death-at-hospital · transport).
 *
 * Reached from Pages & content → Funeraria Memorial Services (its "Service
 * entries" list). The editor receives the LIVE catalogue lines (price-block
 * references) and the entry itself; the same validator runs client- and
 * server-side.
 */
export default async function ServiceEntryAdminPage({ params }: EntryParams) {
  const { key } = await params;
  const def = serviceEntryDef(key);
  if (!def) notFound();

  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title={def.fallbackTitle} />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let entry;
  let skuOptions: SkuOption[] = [];
  try {
    entry = await getServiceEntry(def.key);
    const items = await listCatalogItems();
    skuOptions = items.map((item) => ({ sku: item.sku, name: item.name, displayPrice: item.display_price }));
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title={def.fallbackTitle} />
        <PageSection>
          <ErrorState message="The service entry is unavailable right now." />
        </PageSection>
      </>
    );
  }
  if (!entry) notFound();

  return (
    <div className="stack-4">
      <p className="text-sm" style={{ margin: 0 }}>
        <Link href="/staff/landing/services" className="back-link">
          ← Funeraria Memorial Services
        </Link>
      </p>
      <PageHeader eyebrow="Commerce · Pages & content" title={def.fallbackTitle} />
      <CatalogueEntryEditor
        initial={entry}
        def={{ ...def, kindLabel: "Service entry" }}
        skuOptions={skuOptions}
      />
    </div>
  );
}

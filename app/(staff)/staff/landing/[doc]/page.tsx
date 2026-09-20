import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { PageDocumentEditor, type SkuOption } from "@/components/content/page-document-editor";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { pageDocumentDef } from "@/lib/content-catalog";

type DocParams = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: DocParams): Promise<Metadata> {
  const { doc } = await params;
  return { title: `${pageDocumentDef(doc)?.label ?? "Page"} — Pages & content — Admin Portal` };
}

/**
 * The page-document editor route — one document per key (park · services ·
 * plans · coffins). Home lives at /staff/landing/home because it keeps the
 * existing full landing/FAQ editor; an old bookmark to /staff/landing/home is
 * already the static route, and this dynamic one redirects if it is ever hit by
 * name.
 *
 * The editor receives the LIVE catalogue lines (price-block references) and the
 * document itself; the same validator runs client- and server-side.
 */
export default async function PageDocumentAdminPage({ params }: DocParams) {
  const { doc } = await params;
  if (doc === "home") redirect("/staff/landing/home");
  const def = pageDocumentDef(doc);
  if (!def || def.editor !== "page") notFound();

  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title={def.label} />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let document;
  let skuOptions: SkuOption[] = [];
  try {
    document = await getPageDocument(def.key);
    const items = await listCatalogItems();
    skuOptions = items.map((item) => ({ sku: item.sku, name: item.name, displayPrice: item.display_price }));
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title={def.label} />
        <PageSection>
          <ErrorState message="The page document is unavailable right now." />
        </PageSection>
      </>
    );
  }
  if (!document) notFound();

  return (
    <div className="stack-4">
      <p className="text-sm" style={{ margin: 0 }}>
        <Link href="/staff/landing" className="back-link">
          ← Pages &amp; content
        </Link>
      </p>
      <PageHeader eyebrow="Commerce · Pages & content" title={def.label} />
      <PageDocumentEditor
        initial={document}
        skuOptions={skuOptions}
        blocksEnabled={def.blocks}
        pageRoute={def.route}
      />
    </div>
  );
}

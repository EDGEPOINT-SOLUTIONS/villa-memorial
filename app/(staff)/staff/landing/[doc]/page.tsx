import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { PageDocumentEditor, type SkuOption } from "@/components/content/page-document-editor";
import { BlogDocumentEditor } from "@/components/content/blog-document-editor";
import { LandingPageEditor } from "@/components/landing/landing-page-editor";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listServiceEntries } from "@/lib/api-client/content-entries";
import { pageDocumentDef, type CatalogueEntry } from "@/lib/content-catalog";
import { SERVICE_ENTRY_DEFS } from "@/lib/service-content";

type DocParams = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: DocParams): Promise<Metadata> {
  const { doc } = await params;
  return { title: `${pageDocumentDef(doc)?.label ?? "Page"} — Pages & content — Admin Portal` };
}

/**
 * The page-document editor route — one document per key (park · services ·
 * plans · coffins · blog). Home lives at /staff/landing/home (its own seven
 * sections) and the FAQ at /staff/landing/faq; an old bookmark to
 * /staff/landing/home is already the static route, and this dynamic one
 * redirects if it is ever hit by name.
 *
 * THE BLOG EDITOR OWNS EVERYTHING /blog RENDERS (office, inbox 048): its own
 * page document (the posts lead) AND the former storefront's landing-document
 * sections, which the restored bands beneath the posts render. So this route
 * renders the blog document editor and, below it, the landing editor in
 * `storefront` mode (Hero · rails · About · plans-and-lots · plan board · park
 * map copy) — the two documents stay independent and each saves through its
 * own seam.
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
  let serviceEntries: CatalogueEntry[] = [];
  // The blog's restored bands render from the LANDING document, so the blog
  // editor loads it too (its own document editor loads separately above).
  let landing: Awaited<ReturnType<typeof listLandingContent>> | null = null;
  let pricing: Awaited<ReturnType<typeof loadPricingDocument>> | null = null;
  try {
    document = await getPageDocument(def.key);
    const items = await listCatalogItems();
    skuOptions = items.map((item) => ({ sku: item.sku, name: item.name, displayPrice: item.display_price }));
    if (def.key === "services") serviceEntries = await listServiceEntries();
    if (def.key === "blog") {
      [landing, pricing] = await Promise.all([listLandingContent(), loadPricingDocument()]);
    }
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
      {def.key === "blog" ? (
        <BlogDocumentEditor
          initial={document}
          sessionName={session.displayName.split(" ")[0] ?? session.displayName}
        />
      ) : (
        <PageDocumentEditor
          initial={document}
          skuOptions={skuOptions}
          blocksEnabled={def.blocks}
          pageRoute={def.route}
        />
      )}

      {/* The blog's restored storefront bands live in the landing document —
          this is their editor (office, inbox 048). */}
      {def.key === "blog" && landing && pricing ? (
        <LandingPageEditor
          mode="storefront"
          initialContent={landing}
          lotCategories={pricing.lotCategories}
          planPricing={pricing.plans}
          sessionName={session.displayName.split(" ")[0] ?? session.displayName}
        />
      ) : null}

      {def.key === "services" ? (
        <PageSection>
          <div className="card">
            <div className="card__body stack-3">
              <div>
                <p className="eyebrow-label" style={{ marginBottom: "var(--space-1)" }}>
                  Services catalogue
                </p>
                <h2 className="text-lg" style={{ margin: 0 }}>
                  Service entries
                </h2>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                  The guide pages are service entries: their title, summary, photograph and content
                  blocks are edited here and print on their own page and on /services.
                </p>
              </div>
              {SERVICE_ENTRY_DEFS.map((entryDef) => {
                const entry = serviceEntries.find((record) => record.key === entryDef.key);
                return (
                  <div
                    key={entryDef.key}
                    className="row row--space row--wrap"
                    style={{ gap: "var(--space-3)", alignItems: "center" }}
                  >
                    <div>
                      <p className="text-md" style={{ margin: 0 }}>
                        <strong>{entry?.title || entryDef.fallbackTitle}</strong>
                      </p>
                      <p className="text-sm text-muted" style={{ margin: 0 }}>
                        {entryDef.route}
                      </p>
                    </div>
                    <Link
                      href={`/staff/landing/service-entry/${entryDef.key}`}
                      className="btn btn--secondary btn--sm"
                    >
                      Edit entry
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </PageSection>
      ) : null}
    </div>
  );
}

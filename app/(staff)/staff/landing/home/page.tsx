import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLandingContent } from "@/lib/api-client/landing";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listResources } from "@/lib/api-client/scheduling";
import { planContentFromDocument } from "@/lib/plan-content";
import { builderCatalog } from "@/lib/service-builder-catalog";
import { LandingPageEditor } from "@/components/landing/landing-page-editor";
import type { HomeEditorCatalog } from "@/components/landing/home-sections-editor";
import { chapelClassOf } from "@/lib/chapel-booking";

export const metadata: Metadata = { title: "Home — Pages & content — Admin Portal" };

/**
 * The Home document — the editor for THE HOME PAGE ONLY (office, inbox 048):
 * the new home's own seven sections plus the shared brand / 24-7 chrome its
 * header, footer and call read. The former storefront's sections (Hero, rails,
 * About, plans-and-lots, the plan board, the park map copy) moved to the blog
 * editor, which owns the page that renders them, and the FAQ moved to
 * /staff/landing/faq, the page it drives.
 *
 * The public home at / AND the FAQ page at /faq render ONLY from the content
 * document this page edits. Saving POSTs the whole document through the BFF
 * route, which validates it and persists it into the same fixture store the
 * public pages read. The section navigator mirrors the public page order: map
 * before newsfeed.
 */
export default async function LandingHomeAdminPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Home" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let content;
  let pricing;
  let catalogItems: Awaited<ReturnType<typeof listCatalogItems>> = [];
  let resources: Awaited<ReturnType<typeof listResources>> = [];
  try {
    [content, pricing] = await Promise.all([listLandingContent(), loadPricingDocument()]);
    // The live-store choices the home editor offers: the catalogue's casket
    // models, the five a-la-carte services, the chapel resources and the lot
    // families. Each is best-effort — an unavailable store degrades to the
    // recorded seed's choices rather than failing the editor.
    [catalogItems, resources] = await Promise.all([
      listCatalogItems().catch(() => []),
      listResources().catch(() => []),
    ]);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Home" />
        <PageSection>
          <ErrorState message="The landing content store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  const plansPage = await getPageDocument("plans").catch(() => null);
  const catalog = builderCatalog(
    pricing,
    planContentFromDocument(plansPage).notes.contestability,
    catalogItems,
  );
  const homeCatalog: HomeEditorCatalog = {
    casketModels: catalog.caskets.map((casket) => ({
      model: casket.model,
      collection: casket.collection,
    })),
    services: catalog.services.map((service) => service.label),
    chapels: resources
      .filter((resource) => resource.resource_type === "chapel")
      .map((resource) => ({
        id: resource.id,
        name: resource.name,
        capacity: resource.capacity,
        kind: chapelClassOf(resource, []),
      })),
    lotFamilies: pricing.lotCategories.map((family) => ({
      title: family.title,
      caption: family.caption,
      products: family.rows.map((row) => row.product),
    })),
  };

  return (
    <div className="stack-4">
      <p className="text-sm" style={{ margin: 0 }}>
        <Link href="/staff/landing" className="back-link">
          ← Pages &amp; content
        </Link>
      </p>
      <PageHeader
        eyebrow="Commerce · Pages & content"
        title="Home"
        actions={
          <Link href="/" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live page
          </Link>
        }
      />
      <LandingPageEditor
        mode="home"
        initialContent={content}
        lotCategories={pricing.lotCategories}
        planPricing={pricing.plans}
        homeCatalog={homeCatalog}
        sessionName={session.displayName.split(" ")[0] ?? session.displayName}
      />
    </div>
  );
}

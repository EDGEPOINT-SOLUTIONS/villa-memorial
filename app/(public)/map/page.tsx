import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { ContentBlocks } from "@/components/content/content-blocks";
import { LocationBlock } from "@/components/public/location-block";
import { listLandingContent } from "@/lib/api-client/landing";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { PublicParkMap } from "@/components/public-park-map";
import { LotListing } from "@/app/(public)/lots/lot-listing";
import { listLots, propertyLiveModeEnabled } from "@/lib/api-client/property";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { buildLotListing } from "@/lib/lot-listing-data";
import { EMPTY_LOT_FILTERS } from "@/lib/lot-listing";
import { heroBackgroundLayer, heroTextColourStyle } from "@/lib/landing/hero-background";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { pageMetadata } from "@/lib/seo";
import type { PageHero, PageTab } from "@/lib/content-catalog";

export const metadata: Metadata = pageMetadata({
  title: "Villa Memorial Park — Villa Memorial",
  description:
    "Walk the Villa Memorial Park map — sections, plots, availability and deep links to any plot, with the interactive 3D view of the grounds.",
  path: "/map",
});

// Fixture mode is static-friendly, but once a live public lots path lands the page must
// re-read per request (env/cookies) — never let it serve stale prerendered HTML.
export const dynamic = "force-dynamic";

/**
 * Public park map (Module D, client-facing surface) — now the captain's
 * "Villa Memorial Park" PAGE (content-catalogue Phase 1, review 2026-09-21):
 *
 *   hero (editable in Pages & content) → Park view / Lots tabs → the page
 *   document's content blocks.
 *
 * The Lots listing is a TAB of this page (the captain's direction); the standalone
 * /lots route and the /lots/[id] and /lots/price-list-2026 routes stay, per the
 * same review. Both surfaces shape their rows through lib/lot-listing-data.ts, so
 * they cannot list different plots.
 *
 * Shares the SAME map component + data as the staff property explorer, so what a
 * client sees and what staff see is the same picture — derived positions, same status
 * palette, same lot records.
 *
 * Data note (honest, not hidden): in fixture mode (no PROPERTY_BASE_URL) lots come
 * from recorded fixtures and this page demos standalone. In LIVE mode the property
 * API is scope-gated behind the edge gateway (property:read), which a signed-out
 * visitor does not hold — a public read path for lots is a dev-authored gateway/
 * contract decision (blocked-on-dev, not invented here). Until then the live page
 * renders a graceful error instead of pretending.
 *
 * Capability note (captain 2026-09-20): this page is VIEW-ONLY FOR EVERYONE,
 * signed in or not. It reads no session and passes no plotting capability —
 * plotting is an administrative act and lives in the admin area
 * (`/staff/property`, gated there on `property:write`). The public map is the
 * viewer: sections, plots, availability, lot details, deep links and the 3D
 * walk-through, with nothing that changes data.
 */

/** Read-failure fallback — the recorded seed's own hero words, never new copy. */
const FALLBACK_HERO: PageHero = {
  eyebrow: "Interactive park map",
  headline: "Villa Memorial Park",
  lead: "Walk the grounds of Villa Memorial Park — zoom, pan and click any plot to see its type, status and asking price where published.",
  image: null,
  background: null,
  backgroundTransparency: 100,
  textColour: null,
};

const FALLBACK_TABS: PageTab[] = [
  { id: "tab-view", label: "Park view", href: "/map", note: null },
  { id: "tab-lots", label: "Lots", href: "/map?tab=lots", note: null },
];

export default async function PublicMapPage({
  searchParams,
}: {
  searchParams: Promise<{ park?: string; plot?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const initialPark = sp.park === "villa" ? "villa" : undefined;
  const initialPlot = sp.plot?.trim() || undefined;
  const activeTab = sp.tab === "lots" ? "lots" : "view";

  let lots;
  try {
    lots = await listLots();
  } catch {
    return (
      <div className="stack-4">
        <div className="page-header">
          <div className="page-header__text">
            <p className="page-header__eyebrow">Sanctuario Memorial Park</p>
            <h1>Villa Memorial Park</h1>
          </div>
        </div>
        <ErrorState
          message={
            propertyLiveModeEnabled()
              ? "The live park map is not available to signed-out visitors yet."
              : "The park map could not be loaded. Please try again shortly."
          }
        />
        {propertyLiveModeEnabled() ? (
          <p className="text-sm text-muted">
            Public lot listings need a public read route at the gateway — a platform
            decision, not something this screen can fix.{" "}
            <Link href="/plans">Browse plans &amp; services</Link> in the meantime.
          </p>
        ) : null}
      </div>
    );
  }

  // Page content (hero, tabs, blocks) + the sellable lines a price block may
  // resolve against. A content read failure falls back to the recorded words;
  // it must never take the map down.
  const [document, catalogItems, pricing, landing] = await Promise.all([
    getPageDocument("park").catch(() => null),
    listCatalogItems().catch(() => []),
    loadPricingDocument().catch(() => null),
    listLandingContent().catch(() => null),
  ]);
  const hero = document?.hero ?? FALLBACK_HERO;
  const tabs = document?.tabs.length ? document.tabs : FALLBACK_TABS;
  const wash = heroBackgroundLayer({ background: hero.background, backgroundTransparency: hero.backgroundTransparency });
  const heroTextStyle = heroTextColourStyle(hero);
  // An image-only hero (a photo and no eyebrow/headline/lead) renders the raw
  // photograph: no wash, no copy, no effect.
  const heroHasCopy = Boolean(hero.eyebrow.trim() || hero.headline.trim() || hero.lead.trim());
  const imageOnly = Boolean(hero.image) && !heroHasCopy;
  const priceBySku = new Map(catalogItems.map((item) => [item.sku, item.display_price]));

  const isLotsTab = (tab: PageTab) => tab.href.includes("tab=lots");
  const lotData = activeTab === "lots" ? buildLotListing(lots, pricing?.lotCategories ?? []) : null;

  return (
    <div className="stack-4">
      <section
        className={`hero-premium park-hero${imageOnly ? " hero-premium--image-only" : ""}`}
        style={heroTextStyle ?? undefined}
      >
        {wash && !imageOnly ? <div className="park-hero__wash" aria-hidden="true" style={{ background: wash.background, opacity: wash.opacity }} /> : null}
        <div className="hero-premium__grid">
          {imageOnly ? (
            // A pure photo hero still names the page for assistive tech.
            <h1 className="visually-hidden">Villa Memorial Park</h1>
          ) : (
            <div>
              {hero.eyebrow.trim() ? <p className="eyebrow-label">{hero.eyebrow}</p> : null}
              <h1 className="hero-premium__title">{hero.headline || "Villa Memorial Park"}</h1>
              {hero.lead.trim() ? <p className="hero-premium__lead">{hero.lead}</p> : null}
              <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
                {lots.length} lots · deep-link any plot, e.g.{" "}
                <Link href="/map?park=villa&plot=A-001">/map?park=villa&amp;plot=A-001</Link>
              </p>
              <nav className="hero-chips" aria-label="Explore the park">
                <Link href="/lots">Browse all plots</Link>
                <Link href="/gallery">Photos of the park</Link>
              </nav>
            </div>
          )}
          {hero.image ? (
            <figure className="hero-premium__media park-hero__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- staff-chosen hero photo */}
              <img src={hero.image} alt="" />
            </figure>
          ) : null}
        </div>
      </section>

      <nav className="seg-filter park-tabs" aria-label="Park page sections">
        {tabs.map((tab) => {
          const active = isLotsTab(tab) === (activeTab === "lots");
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`pill-toggle${active ? " pill-toggle--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "lots" && lotData ? (
        <LotListing
          items={lotData.items}
          parks={lotData.parks}
          statuses={lotData.statuses}
          types={lotData.types}
          sections={lotData.sections}
          initialFilters={{ ...EMPTY_LOT_FILTERS }}
          initialSort=""
          syncUrl={false}
        />
      ) : (
        <div className="map-shell">
          <PublicParkMap lots={lots} initialPark={initialPark} initialPlot={initialPlot} enable3d />
        </div>
      )}

      {/* Where the park is and how to get there (client's minutes 2026-09-21,
          item 6) — the one directions action on the park page, below the plot
          layout and above the page's editable content. */}
      {landing ? (
        <LocationBlock
          contact={landing.contact}
          titleId="park-location-title"
        />
      ) : null}

      {document && document.blocks.length > 0 ? (
        <ContentBlocks
          blocks={document.blocks}
          priceOf={(sku) => priceBySku.get(sku) ?? null}
          mediaBaseUrl={mediaPublicBaseUrl()}
          matrixOf={(ref) => {
            if (!pricing) return null;
            if (ref === "plans.regular") {
              return <PlanPaymentTable rows={pricing.plans.regular} label="Villa Memorial Plan — regular payment schedule" />;
            }
            if (ref === "plans.senior") {
              return <PlanPaymentTable rows={pricing.plans.senior} senior label="Villa Memorial Plan — senior citizen payment schedule" />;
            }
            return null;
          }}
        />
      ) : null}
    </div>
  );
}

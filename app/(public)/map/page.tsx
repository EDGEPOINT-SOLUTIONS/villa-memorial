import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { PublicParkMap } from "@/components/public-park-map";
import { LotListing } from "@/app/(public)/lots/lot-listing";
import { listLots, propertyLiveModeEnabled } from "@/lib/api-client/property";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { buildLotListing, SEED_PARKS } from "@/lib/lot-listing-data";
import { EMPTY_LOT_FILTERS } from "@/lib/lot-listing";
import { parkType } from "@/lib/park-types";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { PublicHero } from "@/components/kit";
import { pageMetadata } from "@/lib/seo";
import type { PageTab } from "@/lib/content-catalog";

export const metadata: Metadata = pageMetadata({
  title: "Villa Memorial Park — Villa Funeraria",
  description:
    "Walk the Villa Memorial Park map — sections, plots, availability and deep links to any plot, with the interactive 3D view of the grounds.",
  path: "/map",
});

// Fixture mode is static-friendly, but once a live public lots path lands the page must
// re-read per request (env/cookies) — never let it serve stale prerendered HTML.
export const dynamic = "force-dynamic";

/**
 * Public park map (Module D, client-facing surface) — the captain's
 * "Villa Memorial Park" PAGE (content-catalogue Phase 1, review 2026-09-21;
 * opening rebuilt to the home's gateway grammar 2026-09-30):
 *
 *   the gateway (Map / Lots actions) → the recorded plots on one plan →
 *   the page document's content blocks.
 *
 * The opening is the home's gateway grammar, the same one /services wears: a
 * centred, plain band with a visible h1 at the page-title step, one ≤12-word
 * lead, and the two view actions as "Map" (the current view) and "Lots". They
 * REPLACE the old standalone pill tabs, so the page has ONE view switch, not
 * two. A three-fact trust row under a hairline gives the family the park at a
 * glance — every fact is a record count, never a claim.
 *
 * The Lots listing is a TAB of this page (the captain's direction); the standalone
 * /lots route and the /lots/[id] and /lots/price-list-2026 routes stay, per the
 * same review. Both surfaces shape their rows through lib/lot-listing-data.ts, so
 * they cannot list different plots.
 *
 * THE DATA IS HONEST (captain, 2026-09-30: "there are many fake datas inside the
 * map please clean this and remain only the real ones those who are in the lot
 * pages only"). The generated placeholder inventory was removed from the one
 * shared store (`lib/park-maps.ts`), so the map, the 3D park, the staff explorer
 * and the agent map draw the SAME 16 recorded plots the lot pages list. The
 * legend and the trust row below are record counts.
 *
 * Shares the SAME map component + data as the staff property explorer, so what a
 * client sees and what staff see is the same picture — derived positions, same status
 * palette, same lot records.
 *
 * Capability note (captain 2026-09-20): this page is VIEW-ONLY FOR EVERYONE,
 * signed in or not. It reads no session and passes no plotting capability —
 * plotting is an administrative act and lives in the admin area
 * (`/staff/property`, gated there on `property:write`). The public map is the
 * viewer: sections, plots, availability, lot details, deep links and the 3D
 * walk-through, with nothing that changes data.
 *
 * Data note (honest, not hidden): in fixture mode lots come from the recorded
 * fixtures. In LIVE mode the property API is scope-gated behind the gateway
 * (`property:read`), which a signed-out visitor does not hold — the page renders
 * the graceful error below rather than pretending. A public read route is a
 * gateway/contract decision, not something this screen invents.
 */

const FALLBACK_TABS: PageTab[] = [
  { id: "tab-view", label: "Map", href: "/map", note: null },
  { id: "tab-lots", label: "Lots", href: "/map?tab=lots", note: null },
];

/** The plot statuses the shared store can draw — mirrors `lib/park-live-lots.ts`. */
const DRAWABLE_PLOT_STATUSES = new Set([
  "available",
  "reserved",
  "sold",
  "occupied",
  "maintenance",
]);

export default async function PublicMapPage({
  searchParams,
}: {
  searchParams: Promise<{ park?: string; plot?: string; tab?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const initialPark = sp.park === "villa" ? "villa" : undefined;
  const initialPlot = sp.plot?.trim() || undefined;
  const activeTab = sp.tab === "lots" ? "lots" : "view";
  // `?view=3d` — the memorial's finder opens the 3D park framed on the plot.
  const initialMode = sp.view === "3d" ? ("3d" as const) : undefined;

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
  const [document, catalogItems, pricing] = await Promise.all([
    getPageDocument("park").catch(() => null),
    listCatalogItems().catch(() => []),
    loadPricingDocument().catch(() => null),
  ]);
  const tabs = document?.tabs.length ? document.tabs : FALLBACK_TABS;
  const priceBySku = new Map(catalogItems.map((item) => [item.sku, item.display_price]));

  const isLotsTab = (tab: PageTab) => tab.href.includes("tab=lots");
  const lotData = activeTab === "lots" ? buildLotListing(lots, pricing?.lotCategories ?? []) : null;

  // ---- the gateway's two view actions (the old standalone tabs become these) --
  const viewTab = tabs.find((tab) => !isLotsTab(tab)) ?? FALLBACK_TABS[0];
  const lotsTab = tabs.find((tab) => isLotsTab(tab)) ?? FALLBACK_TABS[1];
  const onMap = activeTab === "view";
  const primaryAction = onMap
    ? { label: viewTab.label, href: viewTab.href, current: true }
    : { label: lotsTab.label, href: lotsTab.href, current: true };
  const secondaryAction = onMap
    ? { label: lotsTab.label, href: lotsTab.href }
    : { label: viewTab.label, href: viewTab.href };

  // ---- the park at a glance: every figure is a record count -------------------
  // The same live overlay the map and the listing use: a linked plot takes its
  // live lot's status, anything else keeps its recorded status. No count here can
  // disagree with the legend beside the map.
  const recordedPlots = SEED_PARKS.flatMap((park) => park.plots);
  const liveStatusById = new Map(lots.map((lot) => [lot.id, lot.status]));
  const statusOf = (plot: (typeof recordedPlots)[number]) => {
    const live = plot.lot_id ? liveStatusById.get(plot.lot_id) : undefined;
    return live && DRAWABLE_PLOT_STATUSES.has(live) ? live : plot.status;
  };
  const recordedCount = recordedPlots.length;
  const availableCount = recordedPlots.filter((plot) => statusOf(plot) === "available").length;
  const typeNames = [...new Set(recordedPlots.map((plot) => plot.typeId).filter((t): t is string => Boolean(t)))]
    .map((typeId) => parkType(typeId).name)
    .map((name) => name.charAt(0) + name.slice(1).toLowerCase());

  const hero = document?.hero;
  const heroEyebrow = hero?.eyebrow.trim() || undefined;
  const heroHeadline = hero?.headline.trim() || "Villa Memorial Park";
  const heroLead = hero?.lead.trim() || undefined;

  return (
    <div className="stack-4 park-page">
      {/* Band 1 · the opening — the home's gateway grammar (captain 2026-09-30):
          a visible h1 at the page-title step, one short lead, the two view
          actions, and the park's own facts under a hairline. No card, no photo. */}
      <PublicHero
        variant="interior"
        eyebrow={heroEyebrow}
        title={heroHeadline}
        lead={heroLead}
        textColour={hero?.textColour ?? null}
        primary={primaryAction}
        secondary={secondaryAction}
      />

      <ul className="park-facts" aria-label="The park at a glance">
        <li>
          <strong>{recordedCount} recorded plots</strong>
          <span>the same records the lot pages show</span>
        </li>
        <li>
          <strong>{typeNames.length} lot types</strong>
          <span>{typeNames.join(" · ")}</span>
        </li>
        <li>
          <strong>{availableCount} available</strong>
          <span>read from the live lot records</span>
        </li>
      </ul>

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
        <PublicParkMap
          lots={lots}
          initialPark={initialPark}
          initialPlot={initialPlot}
          initialMode={initialMode}
          enable3d
          bandHead={{
            kicker: "The park map",
            title: "Every recorded plot, on one plan",
            lead: "Click a plot for its status, size and price.",
          }}
        />
      )}

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

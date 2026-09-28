import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { PublicHero } from "@/components/kit";
import { listLots, type Lot } from "@/lib/api-client/property";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { buildLotListing } from "@/lib/lot-listing-data";
import { parseLotFilters, parseLotsSort } from "@/lib/lot-listing";
import { pageMetadata } from "@/lib/seo";
import { LotListing } from "./lot-listing";

export const metadata: Metadata = pageMetadata({
  title: "Memorial lots — Villa Funeraria",
  description:
    "Browse the park's plots by park, status and legend type — see availability and the published lot prices, then reserve with the park office.",
  path: "/lots",
});

/**
 * Public lot browse (Module D public face) — a product listing, captain
 * 2026-09-20: "still /lots have lots that doesn't have any images… the filter
 * is in the left side it should be sticky… inspired by amazon product pages,
 * but the theme color is our theme" — plus the two additions that made the
 * filter panel a client-side "Refine lots by" surface.
 *
 * THE SERVER HALF of that split loads and shapes the data once through
 * lib/lot-listing-data.ts (`buildLotListing`) — the SAME shaping the park page's
 * Lots tab uses, so the two surfaces can never list different rows. The
 * filter/sort state is parsed from the query string so the first paint is the
 * filtered view a shareable URL describes.
 *
 * The client half (./lot-listing.tsx) filters, sorts and mirrors the state back
 * into the URL without a navigation. The frozen `Lot` contract carries no image
 * field — the imagery derivation and its open contract ask are documented in
 * lib/lot-imagery.ts.
 */
export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  let lots: Lot[];
  try {
    lots = await listLots();
  } catch {
    return (
      <div className="stack-4">
        <h1>Memorial lots</h1>
        <ErrorState message="The lot listings are unavailable right now. Please try again shortly." />
        <p className="text-sm text-muted">
          <Link href="/map">Try the park map</Link> instead.
        </p>
      </div>
    );
  }

  const { items, parks, statuses, types, sections } = buildLotListing(
    lots,
    (await loadPricingDocument()).lotCategories,
  );

  const initialFilters = parseLotFilters(params, {
    parks: parks.map((park) => park.id),
    statuses: statuses.map((status) => status.id),
    types: types.map((type) => type.id),
    sections,
  });
  const initialSort = parseLotsSort(typeof params.sort === "string" ? params.sort : undefined);

  const availableCount = items.filter((item) => item.status === "available").length;

  return (
    <>
      {/* An interior hero from the shared grammar — one sentence, the real
          count, one commitment (the park map) and one support action. The
          listing's own cards carry every picture, so no photographic band pushes
          the filters and results below the fold ("answer at a glance"). */}
      <PublicHero
        variant="interior"
        eyebrow="Memorial lots"
        title="Find a place of rest"
        lead="Every plot, pictured — with its type, status and price where published."
        primary={{ label: "Walk the park map", href: "/map" }}
        secondary={{ label: "2026 price list", href: "/lots/price-list-2026" }}
      >
        <p className="catalogue-hero__facts">
          {availableCount} available · {items.length} plots
        </p>
      </PublicHero>

      <LotListing
        items={items}
        parks={parks}
        statuses={statuses}
        types={types}
        sections={sections}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />
    </>
  );
}

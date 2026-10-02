import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { SectionHead } from "@/components/kit";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { buildCasketListing, casketFacetIds, parseCasketFilters, parseCasketsSort } from "@/lib/casket-listing";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { pageMetadata } from "@/lib/seo";
import { ProductsListing } from "./products-listing";

export const metadata: Metadata = pageMetadata({
  title: "Coffins & caskets — Villa Funeraria",
  description:
    "The client's full 2026 casket catalogue at published prices — SRP, senior-citizen price and the inclusions per family, with details for every model.",
  path: "/products",
});

// Reads the content document + catalogue per request — a staff edit must be
// what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Coffins & caskets — the client's full 2026 casket catalogue at published
 * prices, sold as a SHOP (catalogue page blueprint, plan §5.3 / lane 2 of the
 * public design plan).
 *
 * THE STRUCTURE (captain 2026-09-25, Amazon-familiar): the shared interior
 * `PublicHero`, then a real product LISTING — a sticky left rail (Collection ·
 * Cover · Price), a results count with a sort control, and an even picture-first
 * grid of `ProductCard`s, the same grammar /lots uses. The first eight matches
 * render; the rest sit in one "Show all N" disclosure (plan §3 R8).
 *
 * The sheet's five-tier reference and the per-family inclusions blocks are
 * retired (captain, 2026-09-30). Every figure, photograph, SKU and detail route
 * is unchanged — the server half shapes the rows (`buildCasketListing`) and the
 * client half (`./products-listing.tsx`) filters and sorts them in place.
 *
 * Provenance for every figure: lib/villa-pricing.ts; for every photograph:
 * lib/client-photos.ts + the 24-row table in lib/media.ts.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  let catalogItems: Awaited<ReturnType<typeof listCatalogItems>>;
  try {
    catalogItems = await listCatalogItems();
  } catch {
    return (
      <div className="stack-4">
        <h1>Coffin options</h1>
        <ErrorState message="The casket catalogue is unavailable right now. Please try again shortly." />
      </div>
    );
  }
  const page = await getPageDocument("coffins").catch(() => null);

  const caskets = buildCasketListing(catalogItems);
  const facetIds = casketFacetIds(caskets);
  const initialFilters = parseCasketFilters(params, facetIds);
  const initialSort = parseCasketsSort(typeof params.sort === "string" ? params.sort : undefined);
  const priceBy = new Map(catalogItems.map((line) => [line.sku, line.display_price]));
  const priceOf = (sku: string) => priceBy.get(sku) ?? null;

  return (
    // The folio envelope the shared `.public-main` already carries — the same
    // width /lots, /gallery and the home use. The page previously pinched itself
    // to `containerClass("catalogue")` (75rem = 960px at the 80% root), which
    // left the results column only 677px wide and made the catalogue render two
    // cards across. The folio width gives the four-column grid room beside the
    // sticky refine rail (captain 2026-09-30: "make it 4 columns").
    <div className="stack-5 catalogue-page">
      {/* The opening band is GONE (captain, 2026-10-02): the catalogue and its own
          section head lead. One hidden h1 keeps the page heading. */}
      <h1 className="visually-hidden">{page?.hero.headline.trim() || "Coffins & caskets"}</h1>

      {page && page.blocks.length > 0 ? (
        <ContentBlocks blocks={page.blocks} priceOf={priceOf} mediaBaseUrl={mediaPublicBaseUrl()} />
      ) : null}

      <section className="catalogue-band" aria-labelledby="catalogue-title">
        <SectionHead
          id="catalogue-title"
          kicker="The 2026 catalogue"
          title="Every model, with its price"
          lead="Illustrative samples; the office confirms the model."
        />
        {caskets.length === 0 ? (
          <EmptyState
            title="The model catalogue is unavailable right now"
            hint="The five tiers are shown below; send a request and the office will confirm the model, its published 2026 price and availability."
          />
        ) : (
          <ProductsListing
            items={caskets}
            initialFilters={initialFilters}
            initialSort={initialSort}
          />
        )}
      </section>

    </div>
  );
}

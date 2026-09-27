import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { PublicDisclosure, PublicHero, SectionHead } from "@/components/kit";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { buildCasketListing, casketFacetIds, parseCasketFilters, parseCasketsSort } from "@/lib/casket-listing";
import { COFFINS, COFFIN_TIER_NOTE, php } from "@/lib/villa-pricing";
import { CasketInclusionTable } from "@/components/villa/casket-catalogue";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { heroTextColourStyle } from "@/lib/landing/hero-background";
import { containerClass } from "@/lib/public-layout";
import { pageMetadata } from "@/lib/seo";
import { ProductsListing } from "./products-listing";

export const metadata: Metadata = pageMetadata({
  title: "Coffins & caskets — Villa Memorial",
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
 * The sheet's five-tier reference and the per-family inclusions each sit behind
 * their own disclosure. Every figure, photograph, SKU and detail route is
 * unchanged — the server half shapes the rows (`buildCasketListing`) and the
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
  const [page, { contact }] = await Promise.all([
    getPageDocument("coffins").catch(() => null),
    listLandingContent(),
  ]);
  const heroTextStyle = page ? heroTextColourStyle(page.hero) : null;

  const caskets = buildCasketListing(catalogItems);
  const facetIds = casketFacetIds(caskets);
  const initialFilters = parseCasketFilters(params, facetIds);
  const initialSort = parseCasketsSort(typeof params.sort === "string" ? params.sort : undefined);
  const [leadTier, ...higherTiers] = COFFINS;
  const priceBy = new Map(catalogItems.map((line) => [line.sku, line.display_price]));
  const priceOf = (sku: string) => priceBy.get(sku) ?? null;
  // The "from" figure is the cheapest casket the LIVE catalogue sells, read off the same
  // listing the cards render. It used to be `Math.min(...CASKET_MODELS.map(m => m.srp))` —
  // the hardcoded sheet list — so a staff price edit moved every card but not this line.
  const fromPrice = caskets.length
    ? php(Math.min(...caskets.map((casket) => casket.priceCents)) / 100)
    : null;

  return (
    <div className={`${containerClass("catalogue")} stack-5 catalogue-page`}>
      <PublicHero
        variant="interior"
        eyebrow={page?.hero.eyebrow.trim() || "Coffins & caskets"}
        title={page?.hero.headline.trim() || "Coffin options"}
        lead={page?.hero.lead.trim() || "Every 2026 coffin, with its published price."}
        textColour={heroTextStyle ? undefined : null}
        primary={{ label: "See the catalogue", href: "#catalogue-title" }}
        secondary={{ label: "Call the office", href: contact.phoneHref }}
      >
        <p className="catalogue-hero__facts">
          {caskets.length} model{caskets.length === 1 ? "" : "s"}
          {fromPrice ? ` · from ${fromPrice}` : ""} · sample photographs labelled
        </p>
      </PublicHero>

      {page && page.blocks.length > 0 ? (
        <ContentBlocks blocks={page.blocks} priceOf={priceOf} mediaBaseUrl={mediaPublicBaseUrl()} />
      ) : null}

      <section className="catalogue-band" aria-labelledby="catalogue-title">
        <SectionHead
          id="catalogue-title"
          kicker="The 2026 catalogue"
          title="Every model, with its price"
          lead="Photographs are illustrative samples; the office confirms the exact model and availability."
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

      <section className="catalogue-band" aria-labelledby="coffin-tiers-title">
        <SectionHead
          id="coffin-tiers-title"
          kicker="Reference"
          title="The five coffin tiers"
        />
        <PublicDisclosure summary="Show the five tiers">
          {/* The entry tier leads at full size, the four steps above it follow as
              hairline rows, each with its photograph, lid line and description. */}
          <div className="ledger">
            <article className="ledger__lead">
              <figure className="ledger__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded casket photo */}
                <img src={leadTier.photo} alt={`${leadTier.tier} casket`} loading="lazy" />
              </figure>
              <div className="ledger__body">
                <p className="ledger__eyebrow">The entry tier</p>
                <h3 className="ledger__title">{leadTier.tier}</h3>
                <p className="ledger__note">{leadTier.description}</p>
                <p className="ledger__note">
                  <strong>Lid:</strong> {leadTier.lid}
                </p>
              </div>
            </article>
            <ul className="ledger__list">
              {higherTiers.map((coffin) => (
                <li className="ledger__entry" key={coffin.tier}>
                  <article className="tier-ledger__row">
                    <figure className="tier-ledger__media">
                      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded casket photo */}
                      <img src={coffin.photo} alt="" loading="lazy" />
                    </figure>
                    <div className="tier-ledger__body">
                      <h3 className="ledger__row-title">{coffin.tier}</h3>
                      <p className="ledger__row-meta">{coffin.description}</p>
                      <p className="ledger__row-meta">
                        <strong>Lid:</strong> {coffin.lid}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted">{COFFIN_TIER_NOTE}</p>
        </PublicDisclosure>
      </section>

      <section className="catalogue-band" aria-labelledby="casket-inclusions-title">
        <SectionHead
          id="casket-inclusions-title"
          kicker="Inclusions"
          title="What is included per family"
        />
        <PublicDisclosure summary="Show the inclusions table">
          <CasketInclusionTable />
        </PublicDisclosure>
      </section>

      <p className="text-sm text-muted">
        Every casket model above is included in the{" "}
        <Link href="/plans">Villa Memorial Plan</Link>; senior citizens enjoy the{" "}
        <Link href="/price-list">senior plan</Link> with free flowers.
      </p>
      <p className="text-sm text-muted">
        See the <Link href="/services">memorial service rates</Link> (embalming, retrieval,
        delivery, viewing and interment) or the{" "}
        <Link href="/lots/price-list-2026">2026 lot price list</Link>.
      </p>
    </div>
  );
}

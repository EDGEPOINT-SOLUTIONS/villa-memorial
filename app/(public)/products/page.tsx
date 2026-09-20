import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { COFFIN_SKUS } from "@/lib/catalogue-skus";
import { CASKET_MODELS, COFFINS, COFFIN_TIER_NOTE } from "@/lib/villa-pricing";
import {
  CasketInclusionTable,
  CasketModelCards,
  type SellableCasket,
} from "@/components/villa/casket-catalogue";
import { ContentBlocks } from "@/components/content/content-blocks";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Coffins & caskets — Villa Memorial",
  description:
    "The client's full 2026 casket catalogue at published prices — SRP, senior-citizen price and the inclusions per family, with details for every model.",
  path: "/products",
});

// Reads the content document + catalogue per request — a staff edit must be
// what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/** Bind each sheet model to its catalogue entry (SKU map: lib/catalogue-skus.ts). */
function bindCaskets(
  items: Awaited<ReturnType<typeof listCatalogItems>>,
): SellableCasket[] {
  const bySku = new Map(items.map((item) => [item.sku, item]));
  return CASKET_MODELS.flatMap((model) => {
    const sku = COFFIN_SKUS.find((entry) => entry.model === model.model)?.sku;
    const item = sku ? bySku.get(sku) : undefined;
    return item ? [{ model, item }] : [];
  });
}

/**
 * Coffins & caskets — the client's full 2026 casket catalogue at published
 * prices, sold as a SHOP: every model is a card in the shared `.shop-grid`
 * (three across at 1440, two on a tablet, one at 390) whose photograph leads at
 * the column's own width — never the 88×66 thumbnails the captain measured on
 * 2026-09-19. Each card carries the family, the model name, the cover its sheet
 * name states, the regular SRP, one compact senior line, a one-line illustration
 * label, and one primary action (Add to cart on the real SKU) with the quieter
 * Request order and View details links beside it. The SKU, the long cover note
 * and the full caption live on /products/[sku], where a family has stopped to
 * read; the 2026-09-21 pass moved them there so a card stays a card.
 *
 * The five tiers on the client's TYPES OF COFFIN sheet follow the shop as a
 * reference band (the sheet's own reading, with its substitution note), and the
 * per-family inclusions from PRICE LIST FOR 2026 III close the page. Provenance
 * for every figure: lib/villa-pricing.ts; for every photograph:
 * lib/client-photos.ts + the 24-row table in lib/media.ts.
 */
export default async function ProductsPage() {
  let items: Awaited<ReturnType<typeof listCatalogItems>>;
  try {
    items = await listCatalogItems();
  } catch {
    return (
      <div className="stack-4">
        <h1>Coffin options</h1>
        <ErrorState message="The casket catalogue is unavailable right now. Please try again shortly." />
      </div>
    );
  }
  const page = await getPageDocument("coffins").catch(() => null);

  const caskets = bindCaskets(items);
  const [leadTier, ...higherTiers] = COFFINS;
  const priceBy = new Map(items.map((line) => [line.sku, line.display_price]));
  const priceOf = (sku: string) => priceBy.get(sku) ?? null;

  return (
    <div className="stack-5">
      <section className="page-hero">
        <p className="eyebrow-label">{page?.hero.eyebrow || "Coffins & caskets"}</p>
        <h1 className="page-hero__title">{page?.hero.headline || "Coffin options"}</h1>
        <p className="page-hero__lead">
          {page?.hero.lead ||
            "Every 2026 coffin, with its published price."}
        </p>
        <div className="page-hero__actions">
          <a className="btn btn--primary" href="#catalogue-title">
            See the catalogue
          </a>
          <a className="btn btn--secondary" href="#coffin-tiers-title">
            Compare the five tiers
          </a>
        </div>
      </section>

      {page && page.blocks.length > 0 ? (
        <ContentBlocks blocks={page.blocks} priceOf={priceOf} />
      ) : null}

      <section className="stack-4" aria-labelledby="catalogue-title">
        <h2 className="section-title" id="catalogue-title">
          The 2026 casket catalogue — every model with its price
        </h2>
        {caskets.length === 0 ? (
          <EmptyState
            title="The model catalogue is unavailable right now"
            hint="The five tiers are shown below; send a request and the office will confirm the model, its published 2026 price and availability."
          />
        ) : (
          <CasketModelCards caskets={caskets} />
        )}
      </section>

      <section className="stack-3" aria-labelledby="coffin-tiers-title">
        <h2 className="section-title" id="coffin-tiers-title">
          The five coffin tiers on the 2026 sheet
        </h2>
        {/* The sheet's own reading of its five sample coffins — the entry tier
            leads at full size, the four steps above it follow as hairline rows,
            each with its photograph, lid line and description. The models above
            are the shop; this band is the sheet's index of what the tiers mean. */}
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
      </section>

      <section className="stack-3" aria-labelledby="casket-inclusions-title">
        <h2 className="section-title" id="casket-inclusions-title">
          What is included per casket family
        </h2>
        <CasketInclusionTable />
      </section>

      <p className="text-sm text-muted">
        Every casket model above is included in the{" "}
        <Link href="/plans">Villa Memorial Plan</Link>; senior citizens enjoy the{" "}
        <Link href="/price-list">senior plan</Link> with free flowers.
      </p>
      <p className="text-sm text-muted">
        See the <Link href="/services">memorial service rates</Link> (embalming,
        retrieval, delivery, viewing and interment) or the{" "}
        <Link href="/lots/price-list-2026">2026 lot price list</Link>.
      </p>
    </div>
  );
}

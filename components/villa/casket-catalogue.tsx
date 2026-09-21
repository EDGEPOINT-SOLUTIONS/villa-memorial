import Link from "next/link";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { ProductCard, ResultsGrid } from "@/components/kit";
import type { CatalogItem } from "@/lib/api-client/commerce";
import { casketDetailHref } from "@/lib/catalogue-skus";
import { casketSamplePhoto } from "@/lib/media";
import {
  CASKET_COLLECTIONS,
  CASKET_INCLUSION_COLUMNS,
  CASKET_INCLUSION_NOTES,
  CASKET_INCLUSIONS,
  COFFIN_SAMPLE_NOTE,
  coffinCover,
  php,
  type CasketModel,
} from "@/lib/villa-pricing";

/**
 * The 2026 casket catalogue — every model with its published figures, grouped by
 * the collection the sheet files it under, with the per-family inclusion
 * reference table below it.
 *
 *  - CasketModelCards: the shop itself. Every model is a card in the narrower
 *    `.casket-grid` (an even 3 across at 1440, 2 on a tablet, 1 at 390), led by
 *    the client's photograph, then the family, the model name, ONE short
 *    supporting line (the cover its own name states), the regular SRP, one
 *    compact senior-citizen line and ONE primary action (Add to cart on the
 *    exact catalogue SKU/price) with the quieter Request order beside it. The
 *    photograph and the title are the detail path; the SKU, the long cover note
 *    and the full substitution sentence live on /products/[sku].
 *    Every published figure stays: SRP, senior SRP, senior discount, discounted
 *    price and the model's own detail route. The 2026-09-21 listing pass moved
 *    the card's two long paragraphs (the per-model cover essay and the full
 *    caption) to the detail view and the page's tier band, cutting the average
 *    card from ~58 to ~33 words without dropping a figure or a label.
 *
 *    On the photographs: the client supplied 14 usable 2026 photographs and none
 *    of them is named after a 2026 sheet model (open client question — see
 *    lib/client-photos.ts). Each model therefore shows the photograph selected
 *    by the explicit 24-row table in lib/media.ts (the cover its own name states
 *    and its collection's price band), and EVERY card carries the sample chip
 *    and the short illustration line (`COFFIN_SAMPLE_NOTE`). The full
 *    substitution sentence (COFFIN_TIER_NOTE) prints once below the tier band
 *    and on the detail view; a family never reads a picture as a promise.
 *
 *    The sheet's own five sample coffins (Bronze 1/2, Silver 1/2, Gold) keep
 *    their strip on the model detail page, where the sheet's lid lines are
 *    published beside them.
 *  - CasketInclusionTable reads "PRICE LIST FOR 2026 III": the per-family row of
 *    flowers / tarp / lapida / family car / 1 doz roses / thank-you card and the
 *    package's common & private chapel day rate, with the sheet's own footnotes.
 *
 * tests/unit/villa-pricing.test.ts pins every figure; tests/unit/
 * price-surfacing.test.tsx pins that each one actually reaches the page.
 */

/** A sheet model bound to its catalogue entry (built by /products from COFFIN_SKUS). */
export type SellableCasket = {
  model: CasketModel;
  item: CatalogItem;
};

/** ₱-prefixed amount for a row. */
function amount(n: number): string {
  return php(n);
}

/** The catalogue shape the shared cart pair takes. */
function cartItemOf(item: CatalogItem) {
  return {
    sku: item.sku,
    name: item.name,
    itemType: item.item_type,
    unitPriceCents: item.unit_price_cents,
    currency: item.currency,
  };
}

/** The prefilled request every casket line carries — the sheet's own two prices. */
function casketRequest(model: CasketModel) {
  return {
    note: `Regular SRP ${amount(model.srp)}; senior-citizen price ${amount(
      model.seniorPrice,
    )} (61–100, no insurance benefit). Casket: ${model.collection}.`,
  };
}

/** The one short supporting line a card prints: the sheet's cover, or the office confirms it. */
function coverLine(model: CasketModel): string {
  return coffinCover(model.model) ?? "Cover confirmed by the office";
}

/**
 * The model grid, with the optional collection index above it. The index is
 * rendered ONCE per page: the first (visible) grid prints it and the
 * "Show all N" disclosure passes `showIndex={false}`, so the count/entry-price
 * legend never repeats inside the disclosure.
 */
export function CasketModelCards({
  caskets,
  showIndex = true,
  indexCaskets = caskets,
}: {
  caskets: SellableCasket[];
  showIndex?: boolean;
  /** The list the collection index summarises — the FULL catalogue when the
   *  grid is a "Show all N" window, so the legend never shrinks to the visible
   *  rows. */
  indexCaskets?: SellableCasket[];
}) {
  const collections = CASKET_COLLECTIONS.map((collection) => ({
    collection,
    models: indexCaskets.filter((c) => c.model.collection === collection),
  })).filter((entry) => entry.models.length > 0);

  return (
    <div className="stack-4">
      {/* The lightweight collection index: the four collections with their model
          count and entry price, so the whole catalogue's shape is read before
          the grid. No filter, no second control — the grid below is one flow. */}
      {showIndex ? (
        <ul className="casket-index" aria-label="Collections in the 2026 catalogue">
          {collections.map(({ collection, models }) => {
            const from = Math.min(...models.map((c) => c.model.srp));
            return (
              <li className="casket-index__item" key={collection}>
                <span className="casket-index__name">{collection}</span>
                <span className="casket-index__meta">
                  {models.length} model{models.length === 1 ? "" : "s"} · from {amount(from)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {/* One continuous grid instead of a grid per collection: the old bands
          stranded the single Lumina card in a row of its own (measured
          2026-09-21), and a flat grid fills even rows at every width. */}
      <ResultsGrid
        items={caskets}
        itemKey={({ item }) => item.sku}
        emptyTitle="No models in this catalogue yet"
        className="casket-grid"
        renderItem={({ model, item }) => <CasketCard model={model} item={item} />}
      />
    </div>
  );
}

/**
 * One model, one card. The photograph leads at the column's full width; the
 * figures stay under it, but only the ones a family reads at a glance: the
 * name, the cover, the regular price, the senior line, and one primary action.
 * The detail view owns the SKU, the long cover note and the full caption.
 */
function CasketCard({ model, item }: SellableCasket) {
  const photo = casketSamplePhoto(model);
  const href = casketDetailHref(model.model);
  return (
    <ProductCard
      href={href}
      eyebrow={`${model.family} family`}
      title={item.name}
      supporting={coverLine(model)}
      price={amount(model.srp)}
      priceNote="regular SRP"
      senior={
        <>
          Senior 61–100 · {amount(model.seniorPrice)} · {amount(model.seniorDiscount)} off
        </>
      }
      caption={`${photo.label}. ${COFFIN_SAMPLE_NOTE}`}
      actions={
        <>
          <CatalogueActions
            item={cartItemOf(item)}
            displayPrice={item.display_price}
            prefill={casketRequest(model)}
            secondaryAsLink
          />
          <Link href={href} className="catalogue-actions__link catalogue-actions__link--detail">
            View details
          </Link>
        </>
      }
      photo={{
        src: photo.card.src,
        srcSet: photo.card.srcSet,
        width: photo.card.width,
        height: photo.card.height,
        // /products' one grid is ~28rem a column at 1440 (`.casket-grid`),
        // so the hint matches the real box and the browser picks the 880w
        // derivative — never the 440w one stretched past its pixels
        // (eye-friendly pass, 2026-09-21).
        sizes: "(max-width: 40rem) 92vw, (max-width: 70rem) 45vw, 28rem",
        alt: `Illustrative sample coffin — ${photo.alt}`,
      }}
    />
  );
}

export function CasketInclusionTable() {
  return (
    <>
      <div className="table-wrapper" tabIndex={0}>
        <table className="table price-table">
          <caption>
            What comes with each casket family, and the package&rsquo;s chapel day rates.
          </caption>
          <thead>
            <tr>
              <th scope="col">Casket family</th>
              {CASKET_INCLUSION_COLUMNS.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
              <th scope="col">Common chapel</th>
              <th scope="col">Private chapel</th>
            </tr>
          </thead>
          <tbody>
            {CASKET_INCLUSIONS.map((row) => (
              <tr key={row.family}>
                <th scope="row">{row.family}</th>
                {CASKET_INCLUSION_COLUMNS.map((c) => (
                  <td key={c.key}>{row[c.key] ? "YES" : "NO"}</td>
                ))}
                <td className="table__numeric">{amount(row.commonChapelPerDay)} / day</td>
                <td className="table__numeric">
                  {amount(row.privateChapelPerDay)} / day
                  {row.privateChapelDiscounted ? <sup>*</sup> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
        {CASKET_INCLUSION_NOTES.miscFee} {CASKET_INCLUSION_NOTES.discountedPrice}
      </p>
    </>
  );
}

/** The sellable model lines plus the per-family inclusion reference. */
export function CasketCatalogue({ caskets }: { caskets: SellableCasket[] }) {
  return (
    <div className="stack-4">
      <CasketModelCards caskets={caskets} />
      <section className="stack-3" aria-labelledby="casket-inclusions-title">
        <h3 className="section-title" id="casket-inclusions-title">
          What is included per casket family
        </h3>
        <CasketInclusionTable />
      </section>
    </div>
  );
}

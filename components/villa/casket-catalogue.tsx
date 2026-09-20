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
  COFFIN_COVER_UNSTATED,
  COFFIN_TIER_NOTE,
  coffinCover,
  php,
  type CasketModel,
} from "@/lib/villa-pricing";

/**
 * The 2026 casket catalogue — every model with its published figures, grouped by
 * the collection the sheet files it under, with the per-family inclusion
 * reference table below it.
 *
 *  - CasketModelGrid: the shop itself. Every model is a card in `.shop-grid` —
 *    the client's photograph leads at the column's full width (a measured
 *    448×336 at 1440, three across), then the family, the cover the model's own
 *    name states, the catalogue SKU, the regular SRP and the senior-citizen
 *    price, the caption of what the photograph actually is, and the two actions
 *    ("View details" and the shared CatalogueActions pair — one-click Add to
 *    cart on the exact catalogue SKU/price, plus the prefilled Request order).
 *    Every published figure stays: SRP, senior SRP, senior discount, discounted
 *    price, the SKU and the model's own detail route.
 *
 *    On the photographs: the client supplied 14 usable 2026 photographs and none
 *    of them is named after a 2026 sheet model (open client question — see
 *    lib/client-photos.ts). Each model therefore shows the photograph selected
 *    by the explicit 24-row table in lib/media.ts (the cover its own name states
 *    and its collection's price band), and EVERY card carries the sample chip
 *    and the sheet's own substitution note (COFFIN_TIER_NOTE). A family never
 *    reads a picture as a promise: it reads exactly what the photograph is.
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

export function CasketModelCards({ caskets }: { caskets: SellableCasket[] }) {
  return (
    <div className="stack-5">
      {CASKET_COLLECTIONS.map((collection) => {
        const inCollection = caskets.filter((c) => c.model.collection === collection);
        if (inCollection.length === 0) return null;
        const from = Math.min(...inCollection.map((c) => c.model.srp));
        const to = Math.max(...inCollection.map((c) => c.model.srp));
        return (
          <section
            key={collection}
            className="stack-3"
            aria-labelledby={`collection-${collection.replace(/\W+/g, "-")}`}
          >
            <header className="band-head">
              <h3
                className="band-head__title"
                id={`collection-${collection.replace(/\W+/g, "-")}`}
              >
                {collection}
              </h3>
              <span className="band-head__count">
                {inCollection.length} model{inCollection.length === 1 ? "" : "s"} · {
                  amount(from) === amount(to) ? amount(from) : `${amount(from)} – ${amount(to)}`
                }
              </span>
            </header>
            <ResultsGrid
              items={inCollection}
              itemKey={({ item }) => item.sku}
              emptyTitle="No models in this collection yet"
              renderItem={({ model, item }) => <CasketCard model={model} item={item} />}
            />
          </section>
        );
      })}
    </div>
  );
}

/**
 * One model, one card. The photograph leads at the column's full width; every
 * published figure stays under it; the sample chip and the sheet's substitution
 * note travel with the picture.
 */
function CasketCard({ model, item }: SellableCasket) {
  const photo = casketSamplePhoto(model);
  const href = casketDetailHref(model.model);
  return (
    <ProductCard
      href={href}
      chip="Sample photograph"
      eyebrow={`${model.family} family`}
      title={item.name}
      supporting={
        <>
          {coffinCover(model.model) ?? COFFIN_COVER_UNSTATED} ·{" "}
          <code>{item.sku}</code>
        </>
      }
      price={amount(model.srp)}
      priceNote="regular SRP"
      senior={
        <>
          Senior citizen {amount(model.seniorPrice)} — {amount(model.seniorDiscount)} off
          (61–100, no insurance benefit)
        </>
      }
      caption={`${photo.label}. ${COFFIN_TIER_NOTE}`}
      actions={
        <>
          <Link href={href} className="btn btn--secondary btn--sm">
            View details
          </Link>
          <CatalogueActions
            item={cartItemOf(item)}
            displayPrice={item.display_price}
            prefill={casketRequest(model)}
          />
        </>
      }
      photo={{
        src: photo.card.src,
        srcSet: photo.card.srcSet,
        width: photo.card.width,
        height: photo.card.height,
        sizes: "(max-width: 40rem) 92vw, (max-width: 70rem) 45vw, 26rem",
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

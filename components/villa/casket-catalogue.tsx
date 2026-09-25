import Link from "next/link";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { ProductCard } from "@/components/kit";
import { casketSamplePhoto } from "@/lib/media";
import type { CasketListingItem } from "@/lib/casket-listing";
import {
  CASKET_INCLUSION_COLUMNS,
  CASKET_INCLUSION_NOTES,
  CASKET_INCLUSIONS,
  COFFIN_SAMPLE_NOTE,
  coffinCover,
  php,
} from "@/lib/villa-pricing";

/**
 * The 2026 casket catalogue's card and inclusion reference.
 *
 *  - CasketCard: one model in the shop grammar. The client's photograph leads at
 *    the column's full width, then the family, the model name, ONE short
 *    supporting line (the cover its own name states), the regular SRP, one
 *    compact senior-citizen line and ONE primary action (Add to cart on the
 *    exact catalogue SKU/price) with the quieter Request order beside it. The
 *    photograph and the title are the detail path; the SKU, the long cover note
 *    and the full substitution sentence live on /products/[sku].
 *    Every published figure stays: SRP, senior SRP, senior discount and the
 *    model's own detail route. The listing's rail and sort live in
 *    app/(public)/products/products-listing.tsx; this module owns only the card
 *    and the reference table.
 *
 *    On the photographs: the client supplied 14 usable 2026 photographs and none
 *    of them is named after a 2026 sheet model (open client question — see
 *    lib/client-photos.ts). Each model therefore shows the photograph selected
 *    by the explicit 24-row table in lib/media.ts and EVERY card carries the
 *    short illustration line (`COFFIN_SAMPLE_NOTE`). The full substitution
 *    sentence (COFFIN_TIER_NOTE) prints once below the tier band and on the
 *    detail view; a family never reads a picture as a promise.
 *  - CasketInclusionTable reads "PRICE LIST FOR 2026 III": the per-family row of
 *    flowers / tarp / lapida / family car / 1 doz roses / thank-you card and the
 *    package's common & private chapel day rate, with the sheet's own footnotes.
 *
 * tests/unit/villa-pricing.test.ts pins every figure; tests/unit/
 * price-surfacing.test.tsx pins that each one actually reaches the page.
 */

/** ₱-prefixed amount for a row. */
function amount(n: number): string {
  return php(n);
}

/** The catalogue shape the shared cart pair takes. */
function cartItemOf(item: CasketListingItem["item"]) {
  return {
    sku: item.sku,
    name: item.name,
    itemType: item.item_type,
    unitPriceCents: item.unit_price_cents,
    currency: item.currency,
  };
}

/** The prefilled request every casket line carries — the sheet's own two prices. */
function casketRequest(model: CasketListingItem["modelRecord"]) {
  return {
    note: `Regular SRP ${amount(model.srp)}; senior-citizen price ${amount(
      model.seniorPrice,
    )} (61–100, no insurance benefit). Casket: ${model.collection}.`,
  };
}

/** The one short supporting line a card prints: the sheet's cover, or the office confirms it. */
function coverLine(model: CasketListingItem["modelRecord"]): string {
  return coffinCover(model.model) ?? "Cover confirmed by the office";
}

/**
 * One model, one card. The photograph leads at the column's full width; the
 * figures stay under it, but only the ones a family reads at a glance: the
 * name, the cover, the regular price, the senior line, and one primary action.
 * The detail view owns the SKU, the long cover note and the full caption.
 */
export function CasketCard({ item }: { item: CasketListingItem }) {
  const model = item.modelRecord;
  const photo = casketSamplePhoto(model);
  return (
    <ProductCard
      href={item.href}
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
            item={cartItemOf(item.item)}
            displayPrice={item.item.display_price}
            prefill={casketRequest(model)}
            secondaryAsLink
          />
          <Link href={item.href} className="catalogue-actions__link catalogue-actions__link--detail">
            View details
          </Link>
        </>
      }
      photo={{
        src: photo.card.src,
        srcSet: photo.card.srcSet,
        width: photo.card.width,
        height: photo.card.height,
        // /products' one grid is ~17rem a column at 1440 beside the rail
        // (`.casket-grid`), so the hint matches the real box and the browser
        // picks the 880w derivative — never the 440w one stretched past its
        // pixels (eye-friendly pass, 2026-09-21).
        sizes: "(max-width: 40rem) 46vw, (max-width: 70rem) 45vw, 18rem",
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

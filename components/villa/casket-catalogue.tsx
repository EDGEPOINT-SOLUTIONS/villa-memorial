import Link from "next/link";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import { CasketPriceGrid } from "@/components/villa/casket-detail";
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
 *  - CasketModelCards: one LEDGER per collection (the composition grammar in
 *    styles/components.css). The collection's first model leads at full size,
 *    beside its complete facts; that collection's other models follow as
 *    hairline-separated rows, EACH CARRYING ITS OWN PHOTOGRAPH, its own figures,
 *    its own detail link and its own two actions. Every model therefore keeps
 *    everything it had — name, SRP, senior SRP, discount and discounted price,
 *    the catalogue SKU, "View details", "Add to cart" (the exact catalogue
 *    SKU/price through the shared CatalogueActions pair) and "Request order"
 *    (the prefilled contact capture — an enquiry, never a reservation).
 *
 *    On the photographs: the client supplied 14 usable 2026 photographs and none
 *    of them is named after a 2026 sheet model (open client question — see
 *    lib/client-photos.ts). Each model therefore shows the closest photograph BY
 *    THE COVER ITS OWN NAME STATES AND ITS COLLECTION'S PRICE BAND (the rule and
 *    its reasons: `CASKET_MODEL_PHOTO_RULES` in lib/media.ts), and every
 *    published photograph — the lead's and the rows' — is chipped and captioned
 *    as a sample with the sheet's own substitution note (COFFIN_TIER_NOTE). A
 *    family never reads a picture as a promise: it reads exactly what the
 *    photograph is.
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
    <div className="stack-4">
      {CASKET_COLLECTIONS.map((collection) => {
        const inCollection = caskets.filter((c) => c.model.collection === collection);
        const [lead, ...rest] = inCollection;
        if (!lead) return null;
        const sample = casketSamplePhoto(lead.model);
        const leadHref = casketDetailHref(lead.model.model);
        return (
          <section key={collection} className="ledger" aria-label={collection}>
            <article className="ledger__lead">
              <figure className="ledger__media ledger__media--chip">
                {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
                <img
                  src={sample.src}
                  srcSet={sample.srcSet}
                  sizes="(max-width: 48rem) 92vw, 30rem"
                  alt={`Illustrative sample coffin — ${sample.alt}`}
                  loading="lazy"
                />
                <span className="casket-sample__chip">Sample photograph</span>
                <figcaption className="ledger__caption">
                  <strong>{sample.label}</strong> — a sample from the client&rsquo;s own 2026
                  photographs, chosen for this collection&rsquo;s cover and finish. {COFFIN_TIER_NOTE}
                </figcaption>
              </figure>
              <div className="ledger__body">
                <p className="ledger__eyebrow">
                  {collection} · {inCollection.length} model{inCollection.length === 1 ? "" : "s"}
                </p>
                <h3 className="ledger__title">
                  <Link href={leadHref}>{lead.item.name}</Link>
                </h3>
                <p className="ledger__note">
                  {lead.model.family} family ·{" "}
                  {coffinCover(lead.model.model) ?? COFFIN_COVER_UNSTATED} ·{" "}
                  <code className="text-sm">{lead.item.sku}</code>
                </p>
                <CasketPriceGrid model={lead.model} />
                <p className="ledger__figure">
                  {lead.item.display_price} <span className="ledger__unit">catalogue price</span>
                </p>
                <div className="ledger__actions">
                  <Link href={leadHref} className="btn btn--secondary">
                    View details
                  </Link>
                  <CatalogueActions
                    item={cartItemOf(lead.item)}
                    displayPrice={lead.item.display_price}
                    prefill={casketRequest(lead.model)}
                  />
                </div>
              </div>
            </article>

            {rest.length > 0 ? (
              <ul className="ledger__list">
                {rest.map(({ model, item }) => {
                  const href = casketDetailHref(model.model);
                  const photo = casketSamplePhoto(model);
                  return (
                    <li className="ledger__entry" key={item.sku}>
                      <div className="ledger__row ledger__row--model">
                        <figure className="model-photo">
                          {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
                          <img
                            src={photo.src}
                            srcSet={photo.srcSet}
                            sizes="(max-width: 40rem) 6rem, 8rem"
                            alt={`Illustrative sample coffin — ${photo.alt}`}
                            loading="lazy"
                          />
                          <figcaption className="model-photo__label">
                            <span className="model-photo__chip">Sample</span> {photo.label}
                          </figcaption>
                        </figure>
                        <h4 className="ledger__row-title">
                          <Link href={href}>{item.name}</Link>
                        </h4>
                        <span className="ledger__row-figure">{amount(model.srp)}</span>
                        <p className="ledger__row-meta">
                          {model.family} family ·{" "}
                          {coffinCover(model.model) ?? COFFIN_COVER_UNSTATED} ·{" "}
                          <code>{item.sku}</code> · senior {amount(model.seniorPrice)} after{" "}
                          {amount(model.seniorDiscount)} off
                        </p>
                        <div className="ledger__row-actions">
                          <Link href={href} className="btn btn--secondary btn--sm">
                            View details
                          </Link>
                          <CatalogueActions
                            item={cartItemOf(item)}
                            displayPrice={item.display_price}
                            prefill={casketRequest(model)}
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
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

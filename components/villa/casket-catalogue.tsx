import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CatalogueActions } from "@/components/villa/catalogue-actions";
import type { CatalogItem } from "@/lib/api-client/commerce";
import { casketDetailHref } from "@/lib/catalogue-skus";
import { casketSamplePhoto } from "@/lib/media";
import {
  CASKET_COLLECTIONS,
  CASKET_INCLUSION_COLUMNS,
  CASKET_INCLUSION_NOTES,
  CASKET_INCLUSIONS,
  php,
  type CasketModel,
} from "@/lib/villa-pricing";

/**
 * The 2026 casket catalogue — every model as a sellable card, with the
 * per-family inclusion reference table below it.
 *
 *  - CasketModelCards: one card per model on sheet A's "For package" table,
 *    carrying the sheet's SRP / senior SRP / discount / discounted price AND the
 *    three real actions: "View details" (the model's own /products/[sku] page),
 *    "Add to cart" through the shared CatalogueActions pair with the card's exact
 *    catalogue SKU/name/type/price (the same cart the rest of the storefront
 *    uses) and "Request order" (the prefilled contact capture — an enquiry,
 *    never a reservation). The catalogue binding is passed in by the page from
 *    lib/catalogue-skus.ts, so the card can never add a SKU that is not the one
 *    the fixture-contract test pins to this model's SRP. The card's photograph is
 *    the client's own sample for the collection, chipped "Sample photograph" and
 *    captioned as illustrative — the sheet's photographs are illustration-only
 *    and name no model (see the provisional binding in lib/media.ts).
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

/** ₱-prefixed amount for a card line. */
function amount(n: number): string {
  return php(n);
}

export function CasketModelCards({ caskets }: { caskets: SellableCasket[] }) {
  return (
    <div className="stack-4">
      {CASKET_COLLECTIONS.map((collection) => {
        const inCollection = caskets.filter((c) => c.model.collection === collection);
        if (inCollection.length === 0) return null;
        return (
          <section key={collection} className="stack-3" aria-label={collection}>
            <h3 className="casket-collection__title">{collection}</h3>
            <div className="catalog-grid">
              {inCollection.map(({ model, item }) => {
                const sample = casketSamplePhoto(model);
                return (
                  <article key={item.sku} className="item-card">
                    <div className="casket-card__media">
                      {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
                      <img
                        src={sample.src}
                        alt={`Illustrative sample coffin — ${sample.label}`}
                        loading="lazy"
                      />
                      <span className="casket-sample__chip">Sample photograph</span>
                    </div>
                    <div className="item-card__body">
                      <div className="row row--space">
                        <Badge tone="accent">Casket</Badge>
                        <code className="text-sm text-muted">{item.sku}</code>
                      </div>
                      <h4 className="item-card__title">
                        <Link href={casketDetailHref(model.model)}>{item.name}</Link>
                      </h4>
                      <p className="item-card__meta">{model.family} family</p>
                      <dl className="casket-card__prices">
                        <div>
                          <dt>Regular SRP</dt>
                          <dd>{amount(model.srp)}</dd>
                        </div>
                        <div>
                          <dt>Senior SRP</dt>
                          <dd>{amount(model.srp)}</dd>
                        </div>
                        <div>
                          <dt>Senior discount</dt>
                          <dd>− {amount(model.seniorDiscount)}</dd>
                        </div>
                        <div>
                          <dt>Discounted price</dt>
                          <dd>{amount(model.seniorPrice)}</dd>
                        </div>
                      </dl>
                      <div className="item-card__price">{item.display_price}</div>
                      <div className="item-card__actions stack-2">
                        <Link
                          href={casketDetailHref(model.model)}
                          className="btn btn--secondary btn--sm btn--block"
                        >
                          View details
                        </Link>
                        <CatalogueActions
                          item={{
                            sku: item.sku,
                            name: item.name,
                            itemType: item.item_type,
                            unitPriceCents: item.unit_price_cents,
                            currency: item.currency,
                          }}
                          displayPrice={item.display_price}
                          prefill={{
                            price: item.display_price,
                            note: `Regular SRP ${amount(model.srp)}; senior-citizen price ${amount(model.seniorPrice)} (61–100, no insurance benefit). Casket: ${model.collection}.`,
                          }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function CasketInclusionTable() {
  return (
    <>
      <div className="table-wrapper">
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

/** The sellable model cards plus the per-family inclusion reference. */
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

import {
  CASKET_INCLUSION_COLUMNS,
  CASKET_INCLUSION_NOTES,
  CASKET_INCLUSIONS,
  COFFIN_COVER_UNSTATED,
  COFFIN_TIER_NOTE,
  coffinCover,
  php,
  type CasketModel,
} from "@/lib/villa-pricing";
import { casketSamplePhoto } from "@/lib/media";
import type { CatalogItem } from "@/lib/api-client/commerce";

/**
 * Casket detail blocks — what /products/[sku] renders, mounted by that page only.
 *
 * Every value comes from the catalogue entry (name, SKU, display price) or
 * lib/villa-pricing.ts (SRP, senior discount, discounted price, the sheet III
 * inclusion row, the cover line). Nothing is typed into the view.
 *
 * Imagery is the client's own sample photograph cropped from the TYPES OF COFFIN
 * sheet by scripts/crop-client-sheet-tiles.mjs. The sheet says the sample photos
 * are "(Illustration purposes only)" and the sheet never maps its five samples to
 * the 24 named models, so this view captions the photo as the CLOSEST SAMPLE and
 * repeats the sheet's substitution note — it never claims a model ships as
 * photographed (the collection binding is provisional: lib/media.ts).
 */

/** The model's illustrative photograph, its caption and the sheet's note. */
export function CasketSampleFigure({ model }: { model: CasketModel }) {
  const sample = casketSamplePhoto(model);
  return (
    <figure className="casket-sample">
      <div className="casket-sample__media">
        {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
        <img
          src={sample.src}
          alt={`Illustrative sample coffin — ${sample.label}. Not a photograph of the ${model.model} model itself.`}
        />
        <span className="casket-sample__chip">Sample photograph</span>
      </div>
      <figcaption className="casket-sample__caption">
        <strong>{sample.label}</strong> — the closest sample photograph on the client&rsquo;s
        TYPES OF COFFIN sheet for {model.model}. {COFFIN_TIER_NOTE}
      </figcaption>
    </figure>
  );
}

/** The model's own facts: where the sheet files it and what cover it names. */
export function CasketFacts({ model, item }: { model: CasketModel; item: CatalogItem }) {
  const cover = coffinCover(model.model);
  return (
    <dl className="casket-facts">
      <div>
        <dt>Collection</dt>
        <dd>{model.collection}</dd>
      </div>
      <div>
        <dt>Inclusions family</dt>
        <dd>{model.family}</dd>
      </div>
      <div>
        <dt>Lid / cover</dt>
        <dd>{cover ?? COFFIN_COVER_UNSTATED}</dd>
      </div>
      <div>
        <dt>Catalogue code</dt>
        <dd>
          <code>{item.sku}</code>
        </dd>
      </div>
    </dl>
  );
}

/** Sheet A's four published price figures for the model. */
export function CasketPriceGrid({ model }: { model: CasketModel }) {
  return (
    <dl className="casket-prices">
      <div>
        <dt>Regular SRP</dt>
        <dd>{php(model.srp)}</dd>
      </div>
      <div>
        <dt>Senior-citizen SRP</dt>
        <dd>{php(model.srp)}</dd>
      </div>
      <div>
        <dt>Senior-citizen discount</dt>
        <dd>− {php(model.seniorDiscount)}</dd>
      </div>
      <div>
        <dt>Senior-citizen discounted price</dt>
        <dd>{php(model.seniorPrice)}</dd>
      </div>
    </dl>
  );
}

/**
 * Sheet III's inclusion row for the model's family: the six YES/NO columns plus
 * the package's own common/private chapel day rates and the sheet's footnotes.
 */
export function CasketInclusionPanel({ model }: { model: CasketModel }) {
  const row = CASKET_INCLUSIONS.find((r) => r.family === model.family);
  if (!row) return null;
  return (
    <div className="stack-3">
      <ul className="casket-inclusions">
        {CASKET_INCLUSION_COLUMNS.map((column) => {
          const included = row[column.key];
          return (
            <li
              key={column.key}
              className={included ? "casket-inclusion" : "casket-inclusion casket-inclusion--no"}
            >
              <span className="casket-inclusion__mark" aria-hidden="true">
                {included ? "✓" : "–"}
              </span>
              <span className="casket-inclusion__label">{column.label}</span>
              <span className="casket-inclusion__state">{included ? "Included" : "Not included"}</span>
            </li>
          );
        })}
      </ul>
      <dl className="casket-chapel">
        <div>
          <dt>Common chapel</dt>
          <dd>{php(row.commonChapelPerDay)} / day</dd>
        </div>
        <div>
          <dt>Private chapel</dt>
          <dd>
            {php(row.privateChapelPerDay)} / day
            {row.privateChapelDiscounted ? <sup>*</sup> : null}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted" style={{ margin: 0 }}>
        {CASKET_INCLUSION_NOTES.miscFee} {CASKET_INCLUSION_NOTES.discountedPrice}
      </p>
    </div>
  );
}

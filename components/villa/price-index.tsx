import type { ReactNode } from "react";
import { Banknote } from "lucide-react";
import { casketModelPhotoId, casketSamplePhoto } from "@/lib/media";
import {
  CASKET_COLLECTIONS,
  CASKET_MODELS,
  php,
  type CasketModel,
} from "@/lib/villa-pricing";

/**
 * The /price-list redesign's shared shapes (`villa-price-list-redesign-plan`,
 * captain approved 2026-09-30).
 *
 * Everything here renders the product's own grammar: the home's centred
 * `.home-band-head`, the Phase 0 CTA rungs, and the ladder's type roles. No
 * figure is authored here — every amount is passed in from the page, which reads
 * it from its owning store (`lib/api-client/pricing.ts`, `CASKET_MODELS`,
 * `CASH_ASSISTANCE`, `lib/plan-content.ts`).
 */

/* ------------------------------- band head ------------------------------- */

/**
 * PriceBandHead — the home's `.home-band-head`: gold hairline · kicker ·
 * section title · one-line lead · at most one action. The title is TeX Gyre
 * Bonum at the page-title step, weight 500 — never bold (the captain's type
 * rule, and the `.home-band-head__title` declaration already carries it).
 */
export function PriceBandHead({
  id,
  kicker,
  title,
  lead,
  action,
}: {
  id: string;
  kicker: string;
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="home-band-head">
      <p className="home-band-head__kicker">{kicker}</p>
      <h2 id={id} className="home-band-head__title">
        {title}
      </h2>
      {lead ? <p className="home-band-head__lead">{lead}</p> : null}
      {action}
    </div>
  );
}

/* ------------------------------ from figure ------------------------------ */

/**
 * PriceIndexFrom — a band's headline figure. A price list is scanned for its
 * numbers, so each band opens on its “from” figure; the figure is the loudest
 * type in the band (the ladder's top step, TeX Gyre Bonum weight 500) and the
 * words stay a caption under it.
 */
export function PriceIndexFrom({
  figures,
}: {
  figures: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <div className="price-index__from">
      {figures.map((figure) => (
        <p key={figure.label} className="price-index__from-figure">
          <span className="price-index__from-label">{figure.label}</span>
          <span className="price-index__from-value">{figure.value}</span>
        </p>
      ))}
    </div>
  );
}

/* --------------------------- the coffin index --------------------------- */

/** One collection's models, grouped in the sheet's own collection order. */
export function collectionGroups(
  models: ReadonlyArray<CasketModel> = CASKET_MODELS,
): ReadonlyArray<{ collection: string; models: CasketModel[] }> {
  return CASKET_COLLECTIONS.map((collection) => ({
    collection,
    models: models.filter((model) => model.collection === collection),
  })).filter((group) => group.models.length > 0);
}

/** The cheapest regular SRP of a collection — a derived read, never typed. */
function fromPrice(models: ReadonlyArray<CasketModel>): number {
  return models.reduce((min, model) => Math.min(min, model.srp), Number.POSITIVE_INFINITY);
}

/**
 * PriceIndexCollections — one small sample photograph per collection (not one
 * per model: “a photograph printed many times is not many photographs”), the
 * model count and the collection's from-figure. The photographs are the client's
 * own samples and labelled as illustrations.
 */
export function PriceIndexCollections({
  groups,
}: {
  groups: ReadonlyArray<{ collection: string; models: CasketModel[] }>;
}) {
  // One photograph per collection, and never the same photograph twice: the
  // first model whose sample photo is still unused represents its collection
  // (the catalogue has five distinct sample photographs for four collections).
  const used = new Set<string>();
  const picks = groups.map((group) => {
    const distinct = group.models.find(
      (model) =>
        !used.has(casketModelPhotoId({ collection: group.collection, model: model.model })),
    );
    const lead = distinct ?? group.models[0];
    used.add(casketModelPhotoId({ collection: group.collection, model: lead.model }));
    return { group, lead };
  });
  return (
    <ul className="price-index__collections">
      {picks.map(({ group, lead }) => {
        const photo = casketSamplePhoto({ collection: group.collection, model: lead.model });
        return (
          <li key={group.collection} className="price-index__collection">
            <span className="price-index__collection-photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded client photograph */}
              <img
                src={photo.card.src}
                srcSet={photo.card.srcSet}
                sizes="(max-width: 48rem) 45vw, 12rem"
                width={photo.card.width}
                height={photo.card.height}
                alt={`Sample casket from ${group.collection} — illustration only`}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="price-index__collection-name">{group.collection}</span>
            <span className="price-index__collection-meta">
              {group.models.length} {group.models.length === 1 ? "model" : "models"}
            </span>
            <span className="price-index__collection-from">{php(fromPrice(group.models))}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * PriceIndexModels — the 24-model price index: every model's regular SRP and
 * senior-citizen price, grouped by collection. Two columns on a desk, one on a
 * phone. This is the casket price list the page never carried.
 */
export function PriceIndexModels({
  groups,
}: {
  groups: ReadonlyArray<{ collection: string; models: CasketModel[] }>;
}) {
  return (
    <div className="price-index__models">
      {groups.map((group) => (
        <table key={group.collection} className="table price-index__model-table">
          <caption>{group.collection}</caption>
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Cover</th>
              <th scope="col" className="table__numeric">
                Regular
              </th>
              <th scope="col" className="table__numeric">
                Senior
              </th>
            </tr>
          </thead>
          <tbody>
            {group.models.map((model) => (
              <tr key={model.model}>
                <th scope="row">{model.model}</th>
                <td className="text-sm">
                  {model.model.match(/(Full Split|Flexi|Full|Half)$/)?.[1] ?? "—"}
                </td>
                <td className="table__numeric">{php(model.srp)}</td>
                <td className="table__numeric">{php(model.seniorPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

/** The labelled “cash assistance” ledger the package band prints. */
export function PriceIndexLedger({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <div className="price-index__ledger">
      <h3 className="price-index__ledger-title">
        <Banknote size={16} aria-hidden="true" />
        {title}
      </h3>
      <table className="table">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className="table__numeric">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

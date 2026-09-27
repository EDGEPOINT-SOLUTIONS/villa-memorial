/**
 * The /products listing's ONE filter + sort model (pure — used by the page's
 * server half AND by the client listing, so both always agree).
 *
 * `/products` is the casket catalogue: 24 models filed under four collections,
 * each with a published regular SRP and a senior-citizen price. The captain's
 * 2026-09-25 storefront direction makes it a product listing like /lots — a
 * sticky left rail, a results count with a sort control, and an even
 * picture-first grid — so the same model shape applies: the query string is the
 * SERIALISATION of the view (a filtered URL is shareable and survives a reload)
 * and the client filters in place without a navigation.
 *
 * FACET COUNTS follow the refine-panel rule: an option's count is what the
 * reader would see if they picked it, scoped by every OTHER group's selection.
 * Zero-count options stay in the panel, dimmed, never hidden.
 *
 * THE COVER is read from the model name exactly as the sheet prints it
 * (Half / Full / Full Split / Flexi); a model whose name states none (Lumina)
 * is honestly `Unstated`, never guessed — the detail page is where the office's
 * cover line lives.
 */
import type { CatalogItem } from "@/lib/api-client/commerce";
import { casketDetailHref, COFFIN_SKUS } from "@/lib/catalogue-skus";
import {
  orderedPesoBounds,
  parsePesoBound,
  priceBandsFrom,
  tokenList,
  uniqueKnown,
  type PriceBand,
} from "@/lib/listing-model";
import { CASKET_MODELS, type CasketModel } from "@/lib/villa-pricing";

export const CASKET_COVERS = ["Half", "Full", "Full Split", "Flexi"] as const;
export type CasketCover = (typeof CASKET_COVERS)[number] | "Unstated";

/** The cover category a model's own printed name states, or "Unstated". */
export function casketCover(model: string): CasketCover {
  if (/Full Split$/.test(model)) return "Full Split";
  if (/Flexi$/.test(model)) return "Flexi";
  if (/Half$/.test(model)) return "Half";
  if (/Full$/.test(model)) return "Full";
  return "Unstated";
}

/** One model as the listing renders and filters it — plain and serialisable. */
export type CasketListingItem = {
  sku: string;
  href: string;
  name: string;
  model: string;
  collection: string;
  family: string;
  cover: CasketCover;
  /** The published regular SRP in integer centavos (the card's figure). */
  priceCents: number;
  seniorPriceCents: number;
  seniorDiscountCents: number;
  currency: string;
  /** The catalogue entry, for the cart action and its display price. */
  item: CatalogItem;
  /** The sheet model, for the request prefill. */
  modelRecord: CasketModel;
};

export type CasketFilters = {
  collections: string[];
  covers: string[];
  priceMinCents: number | null;
  priceMaxCents: number | null;
};

export const EMPTY_CASKET_FILTERS: CasketFilters = {
  collections: [],
  covers: [],
  priceMinCents: null,
  priceMaxCents: null,
};

/**
 * Bind the sheet's models to the LIVE catalogue entries, in the sheet's order.
 *
 * WHERE THE FIGURE COMES FROM (changed 2026-09-27). Filters and printed prices now read
 * the CATALOGUE — `item.unit_price_cents` and `item.senior_price_cents` — because the
 * catalogue is the live selling record the staff admin edits and the CART charges. A
 * surface that printed the sheet constant instead was showing a number the admin could not
 * change, while the cart charged one they could: the two agreed only because a fixture
 * contract pins the catalogue's seed to the sheet, so the first real price edit would have
 * made the card and the cart disagree in front of a family.
 *
 * The sheet still owns provenance — it is what the catalogue's recorded seed is pinned
 * back to (`tests/fixture-contract/catalog-sources.test.ts`) and what orders the models.
 *
 * `seniorDiscountCents` is DERIVED (`regular - senior`) rather than read from a third
 * recorded figure, so there is one number to keep honest instead of two.
 *
 * A model the catalogue does not carry is left out rather than shown unshoppable; a casket
 * with no recorded senior price prints no senior line rather than ₱0.
 */
export function buildCasketListing(
  items: ReadonlyArray<CatalogItem>,
): CasketListingItem[] {
  const bySku = new Map(items.map((item) => [item.sku, item]));
  return CASKET_MODELS.flatMap((model) => {
    const sku = COFFIN_SKUS.find((entry) => entry.model === model.model)?.sku;
    const item = sku ? bySku.get(sku) : undefined;
    if (!item) return [];
    const priceCents = item.unit_price_cents;
    const seniorPriceCents = item.senior_price_cents ?? 0;
    return [
      {
        sku: item.sku,
        href: casketDetailHref(model.model),
        name: item.name,
        model: model.model,
        collection: model.collection,
        family: model.family,
        cover: casketCover(model.model),
        priceCents,
        seniorPriceCents,
        seniorDiscountCents: seniorPriceCents > 0 ? priceCents - seniorPriceCents : 0,
        currency: item.currency,
        item,
        modelRecord: model,
      },
    ];
  });
}

export type CasketsSort = "" | "price-asc" | "price-desc" | "name";

/** ?sort= — one validator; anything else is the sheet's own order. */
export function parseCasketsSort(value?: string): CasketsSort {
  return value === "price-asc" || value === "price-desc" || value === "name" ? value : "";
}

/** The known facet ids, derived from the listing rows themselves. */
export type CasketFacetIds = {
  collections: readonly string[];
  covers: readonly string[];
};

export function casketFacetIds(items: CasketListingItem[]): CasketFacetIds {
  return {
    collections: [...new Set(items.map((i) => i.collection))],
    covers: [...new Set(items.map((i) => i.cover))],
  };
}

/** Reads the listing's filters out of the query string, defensively: unknown
 *  ids and unparseable amounts are dropped, never guessed. */
export function parseCasketFilters(
  params: Record<string, string | string[] | undefined>,
  known: CasketFacetIds,
): CasketFilters {
  const [min, max] = orderedPesoBounds(
    parsePesoBound(params.min),
    parsePesoBound(params.max),
  );
  return {
    collections: uniqueKnown(tokenList(params.collection), known.collections),
    covers: uniqueKnown(tokenList(params.cover), known.covers),
    priceMinCents: min,
    priceMaxCents: max,
  };
}

/** The number of active choices — the "Filters (N)" badge and the Clear state. */
export function casketFiltersCount(filters: CasketFilters): number {
  return (
    filters.collections.length +
    filters.covers.length +
    (filters.priceMinCents !== null || filters.priceMaxCents !== null ? 1 : 0)
  );
}

/** The shareable URL for a filter set + sort (always a path, never an origin). */
export function casketListingQuery(filters: CasketFilters, sort: CasketsSort): string {
  const sp = new URLSearchParams();
  if (filters.collections.length) sp.set("collection", filters.collections.join(","));
  if (filters.covers.length) sp.set("cover", filters.covers.join(","));
  if (filters.priceMinCents !== null) sp.set("min", String(Math.round(filters.priceMinCents / 100)));
  if (filters.priceMaxCents !== null) sp.set("max", String(Math.round(filters.priceMaxCents / 100)));
  if (sort) sp.set("sort", sort);
  const query = sp.toString();
  return query ? `/products?${query}` : "/products";
}

/** True when the model matches every chosen group (OR inside a group). */
export function matchesCasketFilters(
  item: CasketListingItem,
  filters: CasketFilters,
): boolean {
  if (filters.collections.length && !filters.collections.includes(item.collection)) return false;
  if (filters.covers.length && !filters.covers.includes(item.cover)) return false;
  if (filters.priceMinCents !== null && item.priceCents < filters.priceMinCents) return false;
  if (filters.priceMaxCents !== null && item.priceCents > filters.priceMaxCents) return false;
  return true;
}

export type CasketFacetCounts = {
  collections: Record<string, number>;
  covers: Record<string, number>;
};

type Group = "collections" | "covers";

/** An option's count, scoped by every group EXCEPT its own. */
function optionCount(
  items: CasketListingItem[],
  filters: CasketFilters,
  group: Group,
  predicate: (item: CasketListingItem) => boolean,
): number {
  const without = { ...filters, [group]: [] } as CasketFilters;
  return items.filter((item) => matchesCasketFilters(item, without) && predicate(item)).length;
}

/** Every group's per-option counts under the current selections. */
export function casketFacetCounts(
  items: CasketListingItem[],
  filters: CasketFilters,
  known: CasketFacetIds,
): CasketFacetCounts {
  const mapFor = (group: Group, ids: readonly string[], test: (id: string) => (item: CasketListingItem) => boolean) =>
    Object.fromEntries(
      ids.map((id) => [id, optionCount(items, filters, group, test(id))]),
    );
  return {
    collections: mapFor("collections", known.collections, (id) => (i) => i.collection === id),
    covers: mapFor("covers", known.covers, (id) => (i) => i.cover === id),
  };
}

/** The chosen order. A tie falls back to the model name so the grid is stable. */
export function sortCaskets(items: CasketListingItem[], sort: CasketsSort): CasketListingItem[] {
  if (sort === "") return items;
  const byName = (a: CasketListingItem, b: CasketListingItem) => a.model.localeCompare(b.model);
  if (sort === "name") return [...items].sort(byName);
  const direction = sort === "price-asc" ? 1 : -1;
  return [...items].sort((a, b) => (a.priceCents - b.priceCents) * direction || byName(a, b));
}

/** Up to three quick price bands drawn from the real published SRPs. */
export function casketPriceBands(items: CasketListingItem[]): PriceBand[] {
  const currency = items[0]?.currency ?? "PHP";
  return priceBandsFrom(items.map((i) => i.priceCents), currency);
}

/**
 * The /lots listing's ONE filter + sort model (pure — used by the page's server
 * half AND by the client listing component, so both always agree).
 *
 * The captain's 2026-09-20 additions made the filter panel a client-side
 * "Refine lots by" surface (no page reload) with multi-select groups, per-option
 * result counts and a price range. That means the URL is no longer the only
 * place the filter lives — but it stays the SERIALISATION of it, so a filtered
 * view is still shareable and survives a hard reload (parseLotFilters reads it
 * back; lotListingQuery writes it).
 *
 * FACET COUNTS. An option's count answers "what would I see if I picked this",
 * scoped by every OTHER group's selections (and by nothing from its own group),
 * which is the standard refine-panel behaviour. Zero-count options stay in the
 * panel — visibly dead, never hidden.
 *
 * THE AREA + SECTION groups are honest about absence: a map-only plot carries
 * neither a published area nor a section, so picking either excludes it. No
 * range is guessed for a value the record does not have.
 */
import { formatMinorUnits } from "@/lib/money";
import type { MonthlyPrice } from "@/lib/monthly-pricing";

export type LotsSort = "" | "price-asc" | "price-desc";

/** One plot as the listing renders it — a plain, serialisable view model the
 *  server builds (photograph included) and the client filters. */
export type LotListingItem = {
  key: string;
  code: string;
  /** The card's one action: the lot's page, or the plot on the park map. */
  href: string;
  status: string;
  typeId: string;
  /** The legend type's display name (the card's eyebrow). */
  typeName: string;
  hasLot: boolean;
  priceCents: number | null;
  currency: string;
  parkId: string;
  /** The park's own branch line (the band header prints it). */
  parkBranch: string;
  /** The linked lot's section (A–D), or the plot's section block prefix. */
  section: string | null;
  areaSqm: number | null;
  /**
   * The monthly-first price (Villa Memorial minutes, 2026-09-21, item 8): the
   * linked lot's section family figure from the pricing store — monthly
   * installment, recorded 72-month term and recorded total contract price. Null
   * for a map-only plot the sheet does not price (the card then says so).
   */
  monthly: MonthlyPrice | null;
  /** The supporting line the card prints (section · block · area, or map area). */
  facts: string;
  photo: { src: string; srcSet?: string; width?: number; height?: number; caption: string };
};

export type LotFilters = {
  parks: string[];
  statuses: string[];
  types: string[];
  sections: string[];
  areas: string[];
  /** Pesos → integer centavos, like every published figure in the app. */
  priceMinCents: number | null;
  priceMaxCents: number | null;
};

export const EMPTY_LOT_FILTERS: LotFilters = {
  parks: [],
  statuses: [],
  types: [],
  sections: [],
  areas: [],
  priceMinCents: null,
  priceMaxCents: null,
};

/** A price bucket the panel offers as one tap (the amounts are read from the
 *  published prices themselves; labels are built from those figures). */
export type PriceQuickRange = {
  id: string;
  label: string;
  minCents: number | null;
  maxCents: number | null;
};

/** Area buckets are fixed bands; a plot whose record carries no area matches
 *  none of them (the panel then honestly shows it nowhere). */
export const LOT_AREA_BUCKETS: { id: string; label: string; test: (sqm: number) => boolean }[] = [
  { id: "up-to-5", label: "Up to 5 sqm", test: (sqm) => sqm <= 5 },
  { id: "5-to-15", label: "5 to 15 sqm", test: (sqm) => sqm > 5 && sqm <= 15 },
  { id: "over-15", label: "Over 15 sqm", test: (sqm) => sqm > 15 },
];

/** The section part of a plot's "A · 1" block (null when the record carries none). */
export function sectionOf(sectionBlock?: string): string | null {
  if (!sectionBlock) return null;
  const head = sectionBlock.split("·")[0]?.trim();
  return head ? head : null;
}

/** ?sort= — one validator; anything else is the default order. */
export function parseLotsSort(value?: string): LotsSort {
  return value === "price-asc" || value === "price-desc" ? value : "";
}

function listOf(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

function uniqueKnown(values: string[], known: readonly string[]): string[] {
  return [...new Set(values)].filter((v) => known.includes(v));
}

/** Pesos in the URL or in the price input (digits only) → integer centavos;
 *  anything unparseable is null (an open bound), never a guessed amount. */
export function pesoInputToCents(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const cents = Number(digits) * 100;
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function pesosToCents(value: string | string[] | undefined): number | null {
  if (value === undefined || Array.isArray(value)) return null;
  return pesoInputToCents(value);
}

/** Reads the listing's filters out of the query string, defensively: unknown
 *  ids and unparseable amounts are dropped, never guessed. */
export function parseLotFilters(
  params: Record<string, string | string[] | undefined>,
  known: {
    parks: readonly string[];
    statuses: readonly string[];
    types: readonly string[];
    sections: readonly string[];
  },
): LotFilters {
  const priceMinCents = pesosToCents(params.min);
  const priceMaxCents = pesosToCents(params.max);
  // A reversed range is a typo, not an empty result set.
  const [min, max] =
    priceMinCents !== null && priceMaxCents !== null && priceMinCents > priceMaxCents
      ? [priceMaxCents, priceMinCents]
      : [priceMinCents, priceMaxCents];
  return {
    parks: uniqueKnown(listOf(params.park), known.parks),
    statuses: uniqueKnown(listOf(params.status), known.statuses),
    types: uniqueKnown(listOf(params.type), known.types),
    sections: uniqueKnown(listOf(params.section), known.sections),
    areas: uniqueKnown(
      listOf(params.area),
      LOT_AREA_BUCKETS.map((b) => b.id),
    ),
    priceMinCents: min,
    priceMaxCents: max,
  };
}

/** The number of active choices — the "Filters (N)" badge and the Clear state. */
export function lotFiltersCount(filters: LotFilters): number {
  return (
    filters.parks.length +
    filters.statuses.length +
    filters.types.length +
    filters.sections.length +
    filters.areas.length +
    (filters.priceMinCents !== null || filters.priceMaxCents !== null ? 1 : 0)
  );
}

function appendList(sp: URLSearchParams, key: string, values: string[]) {
  if (values.length) sp.set(key, values.join(","));
}

/** The shareable URL for a filter set + sort (always a path, never an origin). */
export function lotListingQuery(filters: LotFilters, sort: LotsSort): string {
  const sp = new URLSearchParams();
  appendList(sp, "park", filters.parks);
  appendList(sp, "status", filters.statuses);
  appendList(sp, "type", filters.types);
  appendList(sp, "section", filters.sections);
  appendList(sp, "area", filters.areas);
  if (filters.priceMinCents !== null) sp.set("min", String(Math.round(filters.priceMinCents / 100)));
  if (filters.priceMaxCents !== null) sp.set("max", String(Math.round(filters.priceMaxCents / 100)));
  if (sort) sp.set("sort", sort);
  const query = sp.toString();
  return query ? `/lots?${query}` : "/lots";
}

/** True when the plot matches every chosen group (OR inside a group). */
export function matchesListingFilters(item: LotListingItem, filters: LotFilters): boolean {
  if (filters.parks.length && !filters.parks.includes(item.parkId)) return false;
  if (filters.statuses.length && !filters.statuses.includes(item.status)) return false;
  if (filters.types.length && !filters.types.includes(item.typeId)) return false;
  if (
    filters.sections.length &&
    (item.section === null || !filters.sections.includes(item.section))
  ) {
    return false;
  }
  if (filters.areas.length) {
    if (item.areaSqm === null) return false;
    const sqm = item.areaSqm;
    if (!filters.areas.some((id) => LOT_AREA_BUCKETS.find((b) => b.id === id)?.test(sqm))) {
      return false;
    }
  }
  if (filters.priceMinCents !== null || filters.priceMaxCents !== null) {
    if (item.priceCents === null) return false;
    if (filters.priceMinCents !== null && item.priceCents < filters.priceMinCents) return false;
    if (filters.priceMaxCents !== null && item.priceCents > filters.priceMaxCents) return false;
  }
  return true;
}

export type FacetCounts = {
  parks: Record<string, number>;
  statuses: Record<string, number>;
  types: Record<string, number>;
  sections: Record<string, number>;
  areas: Record<string, number>;
};

type Group = "parks" | "statuses" | "types" | "sections" | "areas";

/** An option's count, scoped by every group EXCEPT its own — the refine-panel
 *  rule (a park's count must not collapse because that park is already chosen). */
function optionCount(
  items: LotListingItem[],
  filters: LotFilters,
  group: Group,
  predicate: (item: LotListingItem) => boolean,
): number {
  const without = { ...filters, [group]: [] } as LotFilters;
  return items.filter((item) => matchesListingFilters(item, without) && predicate(item)).length;
}

function countsMap(
  items: LotListingItem[],
  filters: LotFilters,
  group: Group,
  ids: readonly string[],
  predicate: (id: string) => (item: LotListingItem) => boolean,
): Record<string, number> {
  return Object.fromEntries(
    ids.map((id) => [id, optionCount(items, filters, group, predicate(id))]),
  );
}

/** Every group's per-option counts under the current selections. */
export function facetCounts(
  items: LotListingItem[],
  filters: LotFilters,
  known: {
    parks: readonly string[];
    statuses: readonly string[];
    types: readonly string[];
    sections: readonly string[];
  },
): FacetCounts {
  return {
    parks: countsMap(items, filters, "parks", known.parks, (id) => (i) => i.parkId === id),
    statuses: countsMap(items, filters, "statuses", known.statuses, (id) => (i) => i.status === id),
    types: countsMap(items, filters, "types", known.types, (id) => (i) => i.typeId === id),
    sections: countsMap(
      items,
      filters,
      "sections",
      known.sections,
      (id) => (i) => i.section === id,
    ),
    areas: countsMap(
      items,
      filters,
      "areas",
      LOT_AREA_BUCKETS.map((b) => b.id),
      (id) => (i) => {
        const bucket = LOT_AREA_BUCKETS.find((b) => b.id === id);
        return bucket !== undefined && i.areaSqm !== null && bucket.test(i.areaSqm);
      },
    ),
  };
}

/** The chosen order, applied inside each park band. Unpriced plots sort last in
 *  BOTH directions — a missing price is not a small one. */
export function sortListingItems(items: LotListingItem[], sort: LotsSort): LotListingItem[] {
  if (sort === "") return items;
  const direction = sort === "price-asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const pa = a.priceCents;
    const pb = b.priceCents;
    if (pa === null && pb === null) return a.code.localeCompare(b.code);
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (pa - pb) * direction || a.code.localeCompare(b.code);
  });
}

/** Up to three quick ranges, their boundaries read from the published prices
 *  themselves (terciles of the distinct figures) — never an invented amount. */
export function priceQuickRanges(items: LotListingItem[]): PriceQuickRange[] {
  const prices = [
    ...new Set(items.map((i) => i.priceCents).filter((p): p is number => p !== null)),
  ].sort((a, b) => a - b);
  if (prices.length < 2) return [];
  const currency = items.find((i) => i.priceCents !== null)?.currency ?? "PHP";
  const first = prices[Math.floor(prices.length / 3)];
  const second = prices[Math.floor((2 * prices.length) / 3)];
  if (first === undefined || second === undefined) return [];
  const fmt = (cents: number) => formatMinorUnits(cents, currency);
  const ranges: PriceQuickRange[] = [
    { id: "under", label: `Up to ${fmt(first)}`, minCents: null, maxCents: first },
  ];
  if (second > first) {
    ranges.push({
      id: "between",
      label: `${fmt(first)} – ${fmt(second)}`,
      minCents: first,
      maxCents: second,
    });
  }
  ranges.push({
    id: "over",
    label: `${fmt(second)} and up`,
    minCents: second,
    maxCents: null,
  });
  return ranges;
}

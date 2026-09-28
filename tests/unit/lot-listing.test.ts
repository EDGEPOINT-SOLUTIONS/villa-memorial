import { describe, expect, it } from "vitest";
import {
  EMPTY_LOT_FILTERS,
  LOT_AREA_BUCKETS,
  facetCounts,
  lotFiltersCount,
  lotListingQuery,
  matchesListingFilters,
  parseLotFilters,
  parseLotsSort,
  pesoInputToCents,
  priceQuickRanges,
  sectionOf,
  sortListingItems,
  type LotListingItem,
} from "@/lib/lot-listing";

/**
 * The /lots listing's filter + sort model (captain 2026-09-20 additions):
 * client-side filtering means the URL is a serialisation of the view, facet
 * counts answer "what would I see if I picked this", and zero-count options
 * stay visible. These tests pin the model; tests/unit/lots-listing.test.tsx
 * pins the rendered page and tests/unit/phone-layout.test.tsx the CSS.
 *
 * This module replaced lib/lots-legend.ts (single-select links → multi-select
 * refine panel); its cases are folded into the matching/counting tests below.
 */

function item(overrides: Partial<LotListingItem> = {}): LotListingItem {
  return {
    key: "villa-A-001",
    code: "A-001",
    href: "/lots/00000000-0000-4000-8000-000000000D01",
    status: "available",
    typeId: "lt-primary",
    typeName: "PRIMARY LOTS",
    hasLot: true,
    leadPriceCents: 12_800_000,
    contractPriceCents: 12_800_000,
    currency: "PHP",
    parkId: "villa",
    parkBranch: "Isabela City",
    section: "A",
    areaSqm: 2.5,
    monthly: null,
    facts: "Section A · Block 1 · 2.5 sqm",
    photo: { src: "/media/composition/prime-lot-480.webp", caption: "A photograph" },
    ...overrides,
  };
}

const PARKS = ["villa", "second-park"] as const;
const STATUSES = ["available", "reserved", "sold", "occupied"] as const;
const TYPES = ["lt-primary", "lt-premium", "lt-mausoleum"] as const;
const SECTIONS = ["A", "B"] as const;

const OPTIONS = { parks: PARKS, statuses: STATUSES, types: TYPES, sections: SECTIONS };

describe("parsing the listing's query string", () => {
  it("accepts only the simple sort vocabulary", () => {
    expect(parseLotsSort("price-asc")).toBe("price-asc");
    expect(parseLotsSort("price-desc")).toBe("price-desc");
    expect(parseLotsSort("cheapest")).toBe("");
    expect(parseLotsSort(undefined)).toBe("");
  });

  it("reads multi-select groups from comma lists and repeated params", () => {
    const filters = parseLotFilters(
      { park: "villa,second-park", status: ["available", "sold"], type: "lt-primary" },
      OPTIONS,
    );
    expect(filters.parks).toEqual(["villa", "second-park"]);
    expect(filters.statuses).toEqual(["available", "sold"]);
    expect(filters.types).toEqual(["lt-primary"]);
  });

  it("drops ids no option carries, and never guesses a price", () => {
    const filters = parseLotFilters(
      { park: "atlantis", status: "available", type: "made-up", section: "A,Z", area: "huge", min: "abc", max: "128000" },
      OPTIONS,
    );
    expect(filters.parks).toEqual([]);
    expect(filters.statuses).toEqual(["available"]);
    expect(filters.types).toEqual([]);
    expect(filters.sections).toEqual(["A"]);
    expect(filters.areas).toEqual([]);
    expect(filters.priceMinCents).toBeNull();
    expect(filters.priceMaxCents).toBe(12_800_000);
  });

  it("parses a reversed range as a range, not as no results", () => {
    const filters = parseLotFilters({ min: "600000", max: "200000" }, OPTIONS);
    expect(filters.priceMinCents).toBe(20_000_000);
    expect(filters.priceMaxCents).toBe(60_000_000);
  });

  it("round-trips through the shareable URL", () => {
    const filters = parseLotFilters(
      {
        park: "villa",
        status: "available,reserved",
        type: "lt-premium",
        section: "B",
        area: "up-to-5",
        min: "100000",
        max: "600000",
      },
      OPTIONS,
    );
    const url = lotListingQuery(filters, "price-desc");
    expect(url.startsWith("/lots?")).toBe(true);
    const query = Object.fromEntries(new URLSearchParams(url.split("?")[1]));
    expect(parseLotFilters(query, OPTIONS)).toEqual(filters);
    expect(query.sort).toBe("price-desc");
    expect(lotListingQuery({ ...EMPTY_LOT_FILTERS }, "")).toBe("/lots");
  });

  it("counts each choice for the Filters (N) badge", () => {
    expect(lotFiltersCount({ ...EMPTY_LOT_FILTERS })).toBe(0);
    expect(
      lotFiltersCount({
        ...EMPTY_LOT_FILTERS,
        parks: ["villa"],
        areas: ["up-to-5", "over-15"],
        priceMaxCents: 1,
      }),
    ).toBe(4);
  });

  it("reads the pesos the price inputs edit", () => {
    expect(pesoInputToCents("128,000")).toBe(12_800_000);
    expect(pesoInputToCents(" 250000 ")).toBe(25_000_000);
    expect(pesoInputToCents("")).toBeNull();
    expect(pesoInputToCents("₱")).toBeNull();
  });
});

describe("matching a plot against the panel", () => {
  const garden = item({
    key: "second-park-G-1",
    code: "G-1",
    status: "sold",
    typeId: "lt-garden",
    parkId: "second-park",
    section: null,
    areaSqm: null,
    leadPriceCents: null,
    hasLot: false,
  });

  it("ORs inside a group and ANDs across groups", () => {
    expect(matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS })).toBe(true);
    expect(
      matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS, parks: ["second-park", "villa"] }),
    ).toBe(true);
    expect(matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS, parks: ["villa"] })).toBe(false);
    expect(
      matchesListingFilters(garden, {
        ...EMPTY_LOT_FILTERS,
        parks: ["second-park"],
        statuses: ["sold"],
        types: ["lt-garden"],
      }),
    ).toBe(true);
    expect(
      matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS, statuses: ["available"] }),
    ).toBe(false);
  });

  it("keeps records without a section, area or price out of those groups", () => {
    expect(matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS, sections: ["A"] })).toBe(false);
    expect(matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS, areas: ["up-to-5"] })).toBe(
      false,
    );
    expect(
      matchesListingFilters(garden, { ...EMPTY_LOT_FILTERS, priceMinCents: 1 }),
    ).toBe(false);
  });

  it("bands the area and bounds the price inclusively", () => {
    const valley = item({ areaSqm: 12, leadPriceCents: 56_700_000 });
    expect(matchesListingFilters(valley, { ...EMPTY_LOT_FILTERS, areas: ["5-to-15"] })).toBe(true);
    expect(matchesListingFilters(valley, { ...EMPTY_LOT_FILTERS, areas: ["up-to-5"] })).toBe(false);
    expect(
      matchesListingFilters(valley, {
        ...EMPTY_LOT_FILTERS,
        priceMinCents: 56_700_000,
        priceMaxCents: 56_700_000,
      }),
    ).toBe(true);
    expect(
      matchesListingFilters(valley, { ...EMPTY_LOT_FILTERS, priceMinCents: 56_700_001 }),
    ).toBe(false);
  });
});

describe("facet counts", () => {
  const items = [
    item({ key: "villa-A", code: "A-001", parkId: "villa", typeId: "lt-primary", status: "available", section: "A" }),
    item({ key: "villa-B", code: "B-001", parkId: "villa", typeId: "lt-premium", status: "reserved", section: "B" }),
    item({ key: "villa-C", code: "C-001", parkId: "villa", typeId: "lt-primary", status: "sold", section: "A" }),
    item({
      key: "second-park-G",
      code: "G-1",
      parkId: "second-park",
      typeId: "lt-primary",
      status: "available",
      section: null,
      areaSqm: null,
      leadPriceCents: null,
      hasLot: false,
    }),
  ];

  it("counts an option under every OTHER group's selections", () => {
    const counts = facetCounts(items, { ...EMPTY_LOT_FILTERS, parks: ["villa"] }, OPTIONS);
    // Picking a park must not collapse the park group's own counts.
    expect(counts.parks).toEqual({ villa: 3, "second-park": 1 });
    // …while every other group is scoped by it.
    expect(counts.statuses).toEqual({ available: 1, reserved: 1, sold: 1, occupied: 0 });
    expect(counts.sections).toEqual({ A: 2, B: 1 });
    expect(counts.areas).toEqual({ "up-to-5": 3, "5-to-15": 0, "over-15": 0 });
  });

  it("keeps a zero-count option in the map, so the panel can dim it", () => {
    const counts = facetCounts(items, { ...EMPTY_LOT_FILTERS, types: ["lt-mausoleum"] }, OPTIONS);
    expect(counts.types).toEqual({ "lt-primary": 3, "lt-premium": 1, "lt-mausoleum": 0 });
  });

  it("keeps the legend-type fallback honest (a type-less plot lands in STANDARD LOT upstream)", () => {
    // The page builds typeId through parkType(), so the panel never receives an
    // undefined id — counting only ever sees the seeded vocabulary.
    const counts = facetCounts(items, { ...EMPTY_LOT_FILTERS }, OPTIONS);
    expect(Object.keys(counts.types).sort()).toEqual([...TYPES].sort());
  });
});

describe("sorting", () => {
  const items = [
    item({ key: "a", code: "A-001", leadPriceCents: 12_800_000 }),
    item({ key: "b", code: "B-001", leadPriceCents: 11_400_000 }),
    item({ key: "c", code: "C-001", leadPriceCents: 56_700_000 }),
    item({ key: "d", code: "D-001", leadPriceCents: null, hasLot: false }),
  ];

  it("orders by price with the unpriced plots last in BOTH directions", () => {
    expect(sortListingItems(items, "price-asc").map((i) => i.code)).toEqual([
      "B-001",
      "A-001",
      "C-001",
      "D-001",
    ]);
    expect(sortListingItems(items, "price-desc").map((i) => i.code)).toEqual([
      "C-001",
      "A-001",
      "B-001",
      "D-001",
    ]);
  });

  it("leaves the featured order untouched and does not mutate its input", () => {
    const before = items.map((i) => i.code);
    expect(sortListingItems(items, "").map((i) => i.code)).toEqual(before);
    sortListingItems(items, "price-asc");
    expect(items.map((i) => i.code)).toEqual(before);
  });
});

describe("the price group's quick ranges", () => {
  it("takes its boundaries from the published figures, never an invented amount", () => {
    const items = [
      item({ leadPriceCents: 11_400_000 }),
      item({ leadPriceCents: 12_800_000 }),
      item({ leadPriceCents: 56_700_000 }),
      item({ leadPriceCents: null }),
    ];
    const ranges = priceQuickRanges(items);
    expect(ranges.map((r) => r.label)).toEqual([
      "Up to ₱128,000.00",
      "₱128,000.00 – ₱567,000.00",
      "₱567,000.00 and up",
    ]);
    expect(ranges[0].maxCents).toBe(12_800_000);
    expect(ranges[1]).toMatchObject({ minCents: 12_800_000, maxCents: 56_700_000 });
    expect(ranges[2]).toMatchObject({ minCents: 56_700_000, maxCents: null });
  });

  it("offers nothing when the listing carries no published prices", () => {
    expect(priceQuickRanges([item({ leadPriceCents: null })])).toEqual([]);
    expect(priceQuickRanges([])).toEqual([]);
  });
});

describe("the section keys and area bands", () => {
  it("reads the section out of a plot's block", () => {
    expect(sectionOf("A · 1")).toBe("A");
    expect(sectionOf("B · 4")).toBe("B");
    expect(sectionOf(undefined)).toBeNull();
    expect(sectionOf("")).toBeNull();
  });

  it("bands area without inventing a value for a record that has none", () => {
    const buckets = Object.fromEntries(
      LOT_AREA_BUCKETS.map((b) => [b.id, [0, 2.5, 5, 5.1, 15, 15.1, 24].filter(b.test)]),
    );
    expect(buckets["up-to-5"]).toEqual([0, 2.5, 5]);
    expect(buckets["5-to-15"]).toEqual([5.1, 15]);
    expect(buckets["over-15"]).toEqual([15.1, 24]);
  });
});

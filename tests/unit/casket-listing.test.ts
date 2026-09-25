import { beforeAll, describe, expect, it } from "vitest";
import { listCatalogItems } from "@/lib/api-client/commerce";
import {
  buildCasketListing,
  casketCover,
  casketFacetCounts,
  casketFacetIds,
  casketFiltersCount,
  casketListingQuery,
  casketPriceBands,
  matchesCasketFilters,
  parseCasketFilters,
  parseCasketsSort,
  sortCaskets,
  EMPTY_CASKET_FILTERS,
  type CasketListingItem,
} from "@/lib/casket-listing";
import { CASKET_MODELS } from "@/lib/villa-pricing";

/**
 * The /products listing's pure filter + sort model. The page (server) and the
 * client listing both read this, so a drifting filter cannot make the two
 * disagree. The presentation is pinned by products-listing.test.tsx; the rail's
 * CSS by phone-layout.test.tsx.
 */
describe("the casket listing model", () => {
  let items: CasketListingItem[];

  beforeAll(async () => {
    items = buildCasketListing(await listCatalogItems());
  });

  it("binds every 2026 model to its live catalogue entry and its printed figures", () => {
    expect(items.length).toBe(CASKET_MODELS.length);
    for (const item of items) {
      expect(item.item.sku).toBe(item.sku);
      // The figure that filters is the figure the card prints (the sheet's SRP).
      expect(item.priceCents).toBe(item.modelRecord.srp * 100);
      expect(item.seniorPriceCents).toBe(item.modelRecord.seniorPrice * 100);
      expect(item.href).toContain("/products/");
    }
  });

  it("reads the cover from the model name, and never guesses one", () => {
    expect(casketCover("White Rose Half")).toBe("Half");
    expect(casketCover("Noble Full")).toBe("Full");
    expect(casketCover("Royal Full Split")).toBe("Full Split");
    expect(casketCover("Majesty Flexi")).toBe("Flexi");
    expect(casketCover("Lumina")).toBe("Unstated");
  });

  it("drops unknown ids and unknown sorts, and never guesses", () => {
    const known = casketFacetIds(items);
    const parsed = parseCasketFilters(
      { collection: "Lumina,Atlantis", cover: "Half", min: "600000", max: "200000", sort: "bad" },
      known,
    );
    expect(parsed.collections).toEqual(["Lumina"]);
    expect(parsed.covers).toEqual(["Half"]);
    // A reversed range is a typo, not an empty set.
    expect(parsed.priceMinCents).toBe(20_000_000);
    expect(parsed.priceMaxCents).toBe(60_000_000);
    expect(parseCasketsSort("bad")).toBe("");
    expect(parseCasketsSort("price-asc")).toBe("price-asc");
  });

  it("matches every chosen group (OR inside a group) and the price bound", () => {
    const lumina = items.find((i) => i.model === "Lumina")!;
    expect(matchesCasketFilters(lumina, EMPTY_CASKET_FILTERS)).toBe(true);
    expect(matchesCasketFilters(lumina, { ...EMPTY_CASKET_FILTERS, collections: ["Lumina"] })).toBe(true);
    expect(
      matchesCasketFilters(lumina, { ...EMPTY_CASKET_FILTERS, collections: ["The Crown Collection"] }),
    ).toBe(false);
    expect(matchesCasketFilters(lumina, { ...EMPTY_CASKET_FILTERS, covers: ["Full"] })).toBe(false);
    expect(
      matchesCasketFilters(lumina, { ...EMPTY_CASKET_FILTERS, priceMaxCents: 100 }),
    ).toBe(false);
  });

  it("counts each option under the OTHER groups' selections, keeping zero options", () => {
    const known = casketFacetIds(items);
    const counts = casketFacetCounts(items, { ...EMPTY_CASKET_FILTERS, covers: ["Half"] }, known);
    // Half covers exist only in the collections that print a Half model.
    expect(counts.collections["Lumina"]).toBe(0);
    expect(counts.collections["The White Rose Collection"]).toBeGreaterThan(0);
    expect(counts.covers["Unstated"]).toBe(1);
    // A zero-count option stays in the panel.
    expect(Object.keys(counts.collections)).toContain("The Dynasty Collection");
  });

  it("sorts by price and name, with a stable tie-break", () => {
    const asc = sortCaskets(items, "price-asc");
    for (let i = 1; i < asc.length; i++) {
      expect(asc[i].priceCents).toBeGreaterThanOrEqual(asc[i - 1].priceCents);
    }
    const desc = sortCaskets(items, "price-desc");
    for (let i = 1; i < desc.length; i++) {
      expect(desc[i].priceCents).toBeLessThanOrEqual(desc[i - 1].priceCents);
    }
    const byName = sortCaskets(items, "name").map((i) => i.model);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b)));
    // "Featured" (empty) leaves the sheet's own order untouched.
    expect(sortCaskets(items, "").map((i) => i.model)).toEqual(items.map((i) => i.model));
  });

  it("serialises the view into a shareable URL and back", () => {
    const filters = { collections: ["Lumina"], covers: [], priceMinCents: 0, priceMaxCents: null };
    const url = casketListingQuery(filters, "price-desc");
    expect(url).toBe("/products?collection=Lumina&min=0&sort=price-desc");
    expect(casketListingQuery(EMPTY_CASKET_FILTERS, "")).toBe("/products");
    expect(casketFiltersCount(filters)).toBe(2);
  });

  it("draws quick price bands from the real published SRPs", () => {
    const bands = casketPriceBands(items);
    expect(bands.length).toBeGreaterThanOrEqual(2);
    for (const band of bands) {
      expect(band.label).toMatch(/₱/);
    }
    expect(casketPriceBands([{ ...items[0], priceCents: 100 } as CasketListingItem])).toEqual([]);
  });
});

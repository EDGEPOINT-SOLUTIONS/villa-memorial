import { describe, expect, it } from "vitest";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import lotsFile from "@/lib/fixtures/property/lots.json";
import {
  CLIENT_PRICE_DOCUMENTS,
  WITHDRAWN_CATALOG_ITEMS,
  catalogPriceSource,
  catalogPriceSources,
  lotPriceSource,
} from "@/lib/catalog-sources";

/**
 * The client-source contract — the enforcement behind the captain's 2026-09-18
 * instruction that the product's sample data must BE the client's data: every
 * catalogue entry the storefront sells and every lot price it publishes must
 * trace to a document in the client's own 2026 folder, and the figure must be
 * that document's.
 *
 * `lib/catalog-sources.ts` holds the one item → document → figure map (derived
 * from lib/villa-pricing.ts, the transcription home); this suite walks the
 * recorded fixtures against it and fails with the item and the missing source,
 * the same discipline tests/unit/staff-scope-vocabulary.test.ts and
 * tests/unit/reading-budget.test.tsx apply to scopes and copy.
 */

const ITEMS = (
  catalogFile as {
    items: Array<{
      sku: string;
      name: string;
      item_type: string;
      unit_price_cents: number;
      senior_price_cents?: number | null;
    }>;
  }
).items;

const LOTS = (
  lotsFile as {
    lots: Array<{
      lot_number: string;
      section: string;
      area_sqm: number;
      price_cents: number;
    }>;
  }
).lots;

function documentTitle(document: keyof typeof CLIENT_PRICE_DOCUMENTS): string {
  return CLIENT_PRICE_DOCUMENTS[document].title;
}

describe("every published catalogue entry traces to a client document", () => {
  it("records a source for each sellable entry", () => {
    for (const item of ITEMS) {
      const source = catalogPriceSource(item.sku);
      expect(
        source,
        `${item.sku} (${item.name}) has no recorded client source — add it to lib/catalog-sources.ts or withdraw it`,
      ).toBeDefined();
      expect(Object.keys(CLIENT_PRICE_DOCUMENTS)).toContain(source!.document);
      expect(source!.section.length, `${item.sku} source section`).toBeGreaterThan(0);
    }
  });

  it("publishes exactly the figure the client's document prints", () => {
    for (const item of ITEMS) {
      // Missing sources are the previous test's failure; skip them here so this test
      // reports figure drift, not a crash.
      const source = catalogPriceSource(item.sku);
      if (!source) continue;
      expect(
        item.unit_price_cents,
        `${item.sku} (${item.name}) publishes ${item.unit_price_cents} but ${documentTitle(
          source.document,
        )} — ${source.section} — prints ${source.cents}`,
      ).toBe(source.cents);
    }
  });

  /**
   * The SECOND figure the casket sheet prints. A senior price the office can edit must
   * still start from the client's own number, or the storefront would be discounting off a
   * figure nobody transcribed. This is the pin that lets the catalogue be the live selling
   * record while the sheet stays the provenance of the seed.
   */
  it("publishes the sheet's senior figure wherever the sheet prints one", () => {
    let checked = 0;
    for (const item of ITEMS) {
      const source = catalogPriceSource(item.sku);
      if (!source?.seniorCents) continue;
      checked += 1;
      expect(
        item.senior_price_cents,
        `${item.sku} (${item.name}) carries senior ${String(item.senior_price_cents)} but ${documentTitle(
          source.document,
        )} — ${source.section} — prints ${source.seniorCents}`,
      ).toBe(source.seniorCents);
      // A senior price above the regular one is not a discount, and would print as a
      // contradiction on the card beside the regular figure.
      expect(item.senior_price_cents!, `${item.sku} senior must not exceed its regular price`).toBeLessThan(
        item.unit_price_cents,
      );
    }
    // The casket sheet prints a senior column for all 24 models; a silent drop to zero
    // would make this test pass vacuously.
    expect(checked, "the sheet prints a senior column for the 24 casket models").toBe(24);
  });

  it("records no senior price on an item the sheet gives none", () => {
    for (const item of ITEMS) {
      const source = catalogPriceSource(item.sku);
      if (source?.seniorCents) continue;
      expect(
        item.senior_price_cents ?? null,
        `${item.sku} (${item.name}) has no senior column on its sheet, so it must record none`,
      ).toBeNull();
    }
  });

  it("keeps every sourced sheet row in the catalogue (a row cannot vanish silently)", () => {
    const skus = new Set(ITEMS.map((item) => item.sku));
    for (const source of catalogPriceSources()) {
      expect(
        skus,
        `${source.sku} is sold on ${documentTitle(source.document)} (${source.section}) but is missing from commerce/catalog-items.json`,
      ).toContain(source.sku);
    }
  });

  it("keeps the four un-sourced upstream SKUs out, with the reason and the office state recorded", () => {
    const skus = new Set(ITEMS.map((item) => item.sku));
    expect(WITHDRAWN_CATALOG_ITEMS).toHaveLength(4);
    for (const withdrawn of WITHDRAWN_CATALOG_ITEMS) {
      expect(
        skus,
        `${withdrawn.sku} (${withdrawn.name}) is on no 2026 client sheet — it stays withdrawn (lib/catalog-sources.ts)`,
      ).not.toContain(withdrawn.sku);
      expect(withdrawn.reason.length, `${withdrawn.sku} withdrawal reason`).toBeGreaterThan(20);
      expect(withdrawn.officeState, `${withdrawn.sku} public state`).toMatch(/office/i);
      expect(withdrawn.upstreamCents, `${withdrawn.sku} upstream placeholder`).toBeGreaterThan(0);
    }
  });
});

describe("every published lot price traces to the 2026 lot price sheet", () => {
  it("carries the family's own area and selling price for its park section", () => {
    for (const lot of LOTS) {
      const source = lotPriceSource(lot.section);
      expect(
        source,
        `Lot ${lot.lot_number} (section ${lot.section}) has no lot price-list family — map the section in lib/catalog-sources.ts or leave the price out`,
      ).toBeDefined();
      if (!source) continue; // the missing family is reported above
      expect(
        lot.area_sqm,
        `Lot ${lot.lot_number} publishes ${lot.area_sqm} sqm but ${documentTitle(
          source.document,
        )} — ${source.section} — prints ${source.area} sqm`,
      ).toBe(source.area);
      expect(
        lot.price_cents,
        `Lot ${lot.lot_number} publishes ${lot.price_cents} but ${documentTitle(
          source.document,
        )} — ${source.section} — prints ${source.cents}`,
      ).toBe(source.cents);
    }
  });

  it("has a family only for the section letters the parks fixture uses", () => {
    for (const lot of LOTS) {
      expect(lotPriceSource(lot.section), `section ${lot.section}`).toBeDefined();
    }
    expect(lotPriceSource("Z"), "an unlisted section must not invent a family").toBeUndefined();
  });
});

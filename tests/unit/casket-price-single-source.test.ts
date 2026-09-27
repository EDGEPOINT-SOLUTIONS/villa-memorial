import { describe, expect, it } from "vitest";
import { buildCasketListing } from "@/lib/casket-listing";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { CASKET_MODELS } from "@/lib/villa-pricing";
import { catalogPriceSource } from "@/lib/catalog-sources";
import { coffinSku } from "@/lib/catalogue-skus";

/**
 * ONE PRICE PER CASKET — the guard for the defect that made the catalogue "for show".
 *
 * WHAT WAS WRONG (measured 2026-09-27). A casket card printed `model.srp` from the
 * hardcoded sheet list in `lib/villa-pricing.ts`, while the Add-to-cart beside it sent
 * `item.unit_price_cents` from the durable catalogue. The two agreed only because a fixture
 * contract pins the catalogue's SEED to the sheet — so the first real price edit in
 * /staff/catalog would have left the card showing one number and the cart charging another,
 * on the same card, in front of a family. The senior figure was worse: it existed ONLY in
 * the code list, so the office could not change it at all.
 *
 * The card, the filter, the request message, the PDP and the builder now all read the
 * CATALOGUE. These tests fail if any of that drifts back to the sheet constant.
 */
describe("a casket's displayed price is the price the cart charges", () => {
  it("takes every listing figure from the catalogue row, not the sheet model", async () => {
    const items = await listCatalogItems();
    const listing = buildCasketListing(items);
    expect(listing.length).toBe(24);

    for (const row of listing) {
      const item = items.find((i) => i.sku === row.sku);
      expect(item, `${row.sku} is in the catalogue`).toBeDefined();
      // The three figures the card and the cart consume come from the catalogue.
      expect(row.priceCents, `${row.sku} priceCents`).toBe(item!.unit_price_cents);
      expect(row.seniorPriceCents, `${row.sku} seniorPriceCents`).toBe(
        item!.senior_price_cents ?? 0,
      );
      // The discount is DERIVED, so it cannot disagree with the pair above.
      expect(row.seniorDiscountCents, `${row.sku} seniorDiscountCents`).toBe(
        row.priceCents - row.seniorPriceCents,
      );
      // And the cart item is built from the same row.
      expect(row.item.unit_price_cents).toBe(row.priceCents);
    }
  });

  it("moves every figure together when the catalogue changes", async () => {
    // Simulate exactly what a staff price edit does to the fold: raise Lumina's regular
    // and senior prices. Every consumer must follow, because there is now one source.
    const items = await listCatalogItems();
    const edited = items.map((item) =>
      item.sku === "CSK-LUMINA"
        ? { ...item, unit_price_cents: 3_500_000, senior_price_cents: 2_800_000 }
        : item,
    );
    const lumina = buildCasketListing(edited).find((row) => row.sku === "CSK-LUMINA");
    expect(lumina?.priceCents).toBe(3_500_000);
    expect(lumina?.seniorPriceCents).toBe(2_800_000);
    expect(lumina?.seniorDiscountCents).toBe(700_000);
    // The sheet constant is untouched and NO LONGER what the surface prints.
    const sheet = CASKET_MODELS.find((model) => model.model === "Lumina");
    expect(sheet?.srp).toBe(33_000);
    expect(lumina?.priceCents).not.toBe((sheet?.srp ?? 0) * 100);
  });

  it("records the sheet's own two figures for every model", async () => {
    // The catalogue's seed must still be the client's numbers; the admin may move them
    // afterwards, and `tests/fixture-contract/catalog-sources.test.ts` pins that seed.
    const items = await listCatalogItems();
    for (const model of CASKET_MODELS) {
      const sku = coffinSku(model.model);
      const source = catalogPriceSource(sku);
      const item = items.find((i) => i.sku === sku);
      expect(source, `${sku} has a recorded sheet source`).toBeDefined();
      expect(item?.unit_price_cents, `${sku} regular`).toBe(model.srp * 100);
      expect(item?.senior_price_cents, `${sku} senior`).toBe(model.seniorPrice * 100);
    }
  });

  it("gives no casket a senior price at or above its regular price", async () => {
    const listing = buildCasketListing(await listCatalogItems());
    for (const row of listing) {
      if (row.seniorPriceCents === 0) continue;
      expect(row.seniorPriceCents, `${row.sku} senior below regular`).toBeLessThan(row.priceCents);
      expect(row.seniorDiscountCents, `${row.sku} discount is positive`).toBeGreaterThan(0);
    }
  });

  it("leaves an item with no senior price without a senior figure, never a zero price", async () => {
    const items = await listCatalogItems();
    const services = items.filter((item) => item.item_type === "service");
    expect(services.length).toBeGreaterThan(0);
    for (const service of services) {
      // null, not 0: a surface must print NO senior line rather than a ₱0 discount.
      expect(service.senior_price_cents ?? null, `${service.sku} senior`).toBeNull();
    }
  });
});

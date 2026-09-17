import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import { listAdminCatalogItems, listCatalogItems } from "@/lib/api-client/commerce";
import { CATALOG_ITEM_TYPES, catalogDisplayPrice, catalogPriceUnit } from "@/lib/catalog-admin";

/**
 * Fixture↔contract tests for the recorded catalogue seed as the ADMIN store
 * reads it (lib/api-client/catalog-store.ts):
 *
 *  - identity unchanged: every recorded item still reads through the store with
 *    its SKU, type and recorded order, published by default;
 *  - the frozen order-payment-api-v1 envelope is intact: a public reader gets
 *    exactly the recorded fields (plus the app-authored photo), and the
 *    `display_price` the store DERIVES reproduces the recorded string byte for
 *    byte — the seed's "/ month" and "/ day" suffixes survive a price edit;
 *  - the admin overlay (`published`, `image`, `price_unit`) is app-authored and
 *    never claims to be part of the frozen contract.
 *
 * Fixture-mode reads are pointed at a throwaway journal so this suite can never
 * read (or write) the repo's .data/ demo store.
 */
process.env.CATALOG_STORE_PATH = path.join(
  mkdtempSync(path.join(os.tmpdir(), "vm-catalog-contract-")),
  "catalog.json",
);

const SEED = catalogFile as unknown as {
  items: Array<{
    id: number;
    sku: string;
    name: string;
    description: string | null;
    item_type: string;
    unit_price_cents: number;
    currency: string;
    display_price: string;
  }>;
};

describe("the recorded catalogue still reads through the admin store", () => {
  it("keeps every seed item's SKU, type and recorded order, published by default", async () => {
    const storefront = await listCatalogItems();
    expect(storefront.map((item) => item.sku)).toEqual(SEED.items.map((item) => item.sku));
    for (const seed of SEED.items) {
      const item = storefront.find((entry) => entry.sku === seed.sku);
      expect(item, seed.sku).toBeDefined();
      expect(item!.item_type).toBe(seed.item_type);
      expect(item!.unit_price_cents).toBe(seed.unit_price_cents);
      expect(item!.currency).toBe(seed.currency);
    }
    const admin = await listAdminCatalogItems();
    expect(admin).toHaveLength(SEED.items.length);
    expect(admin.every((record) => record.published)).toBe(true);
  });

  it("derives the recorded display_price exactly (the '/ month' and '/ day' suffixes survive)", async () => {
    for (const seed of SEED.items) {
      const unit = catalogPriceUnit(seed.display_price);
      expect(
        catalogDisplayPrice(seed.unit_price_cents, seed.currency, unit),
        `${seed.sku} display price`,
      ).toBe(seed.display_price);
    }
    // The suffixes really are seeded from the recording, not invented by type.
    const storefront = await listCatalogItems();
    expect(storefront.find((item) => item.sku === "PKG-BASIC")!.display_price).toBe(
      "₱600.00 / month",
    );
    expect(storefront.find((item) => item.sku === "CHP-COMMON-DAY")!.display_price).toBe(
      "₱1,500.00 / day",
    );
    expect(storefront.find((item) => item.sku === "CSK-IMPERIAL-FLEXI")!.display_price).toBe(
      "₱160,000.00",
    );
  });

  it("serves the frozen envelope fields on every public reader", async () => {
    for (const item of await listCatalogItems()) {
      expect(Number.isInteger(item.id)).toBe(true);
      expect(typeof item.sku).toBe("string");
      expect(typeof item.name).toBe("string");
      expect(item.description === null || typeof item.description === "string").toBe(true);
      expect(CATALOG_ITEM_TYPES).toContain(item.item_type);
      expect(Number.isInteger(item.unit_price_cents)).toBe(true);
      expect(item.unit_price_cents).toBeGreaterThanOrEqual(0);
      expect(item.currency).toBe("PHP");
      expect(typeof item.display_price).toBe("string");
      expect(item.image).toBeNull(); // the seed carries no photo; the admin may attach one
    }
  });
});

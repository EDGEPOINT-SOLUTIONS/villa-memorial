import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import {
  createOrder,
  fixtureCreateOrder,
  getAdminOrder,
  getCatalogItem,
  getOrderByNumber,
  listCatalogItems,
  listOrders,
} from "@/lib/api-client/commerce";
import {
  CART_LINE_TYPE_LABEL,
  getCartLineCatalogDetail,
} from "@/lib/cart/cart-line-details";
import {
  ALACARTE_SKUS,
  CHAPEL_SKUS,
  EMBALMING_EXTRA_DAY_SKU,
  coffinSku,
  embalmingDaySku,
  planTierPackageSku,
} from "@/lib/catalogue-skus";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  CHAPEL_RATES,
  EMBALMING_PER_DAY_BEYOND_9,
  EMBALMING_RATES,
  PLAN_TIERS,
  planRate,
} from "@/lib/villa-pricing";

/**
 * Fixture↔contract tests pinning the recorded catalog to (a) the FROZEN
 * order-payment-api-v1 envelope, (b) the client's REAL 2026 price sheets.
 *
 * ⚠ DIVERGENCE FROM THE UPSTREAM SEED: the platform seed
 * (platform/services/catalog-pricing/db/seeds.rb) still carries placeholder
 * prices and the original names for the 11 VM line-items. This fixture now
 * carries the client's published 2026 figures — transcribed in
 * lib/villa-pricing.ts from "2026 price FV website A" (= "PRICE LIST FOR 2026
 * II"), "PRICE LIST FOR 2026 III" and COMPLETE MEMORIAL PACKAGE.jpg — so the
 * storefront can actually sell them. SKUs are unchanged; four names now match
 * the client's own price-list labels. Upstream parity is the captain's call
 * (called out in the PR).
 */

// Fixture-mode checkout persists through the durable order store
// (lib/api-client/order-store.ts). Point it at a throwaway file so the suite never
// writes (or reads) the repo's .data/ store.
process.env.ORDERS_STORE_PATH = path.join(
  mkdtempSync(path.join(os.tmpdir(), "vm-orders-contract-")),
  "orders.json",
);

/** The 11 upstream SKUs — identity must never change, whatever the price. */
const UPSTREAM_SKUS: Array<[string, string]> = [
  // [sku, item_type]
  ["PKG-BASIC", "package"],
  ["PKG-STANDARD", "package"],
  ["PKG-PREMIUM", "package"],
  ["SRV-EMBALM-D", "service"],
  ["SRV-INTERMENT", "service"],
  ["SRV-DELIVERY", "service"],
  ["SRV-LIGHTS", "service"],
  ["SRV-VIEWING", "service"],
  ["ADD-COFFIN-LIZO-SR", "add_on"],
  ["ADD-FLOWERS", "add_on"],
  ["ADD-URN", "add_on"],
];

/**
 * The four upstream items the client's 2026 sheets do NOT price (they are not
 * on any sheet: "Lights & Sound Setup", the Lizo SR upgrade, a flower set and a
 * keepsake urn). They keep their upstream seed prices untouched — inventing a
 * 2026 figure for them would break the "prices stay the client's real figures"
 * rule. Flagged in the PR.
 */
const UNPRICED_BY_SHEETS: Array<[string, number]> = [
  // [sku, upstream placeholder cents]
  ["SRV-LIGHTS", 60000],
  ["ADD-COFFIN-LIZO-SR", 85000],
  ["ADD-FLOWERS", 25000],
  ["ADD-URN", 18000],
];

async function priceOf(sku: string): Promise<number> {
  const items = await listCatalogItems();
  const item = items.find((i) => i.sku === sku);
  if (!item) throw new Error(`No catalogue entry for ${sku}`);
  return item.unit_price_cents;
}

describe("catalog fixtures mirror the frozen API shape", () => {
  it("keeps every upstream SKU with its type (identity unchanged)", async () => {
    const items = await listCatalogItems();
    for (const [sku, type] of UPSTREAM_SKUS) {
      const item = items.find((i) => i.sku === sku);
      expect(item, `upstream ${sku} must survive`).toBeDefined();
      expect(item!.item_type).toBe(type);
    }
    expect(items.every((i) => i.currency === "PHP")).toBe(true);
    expect(items.every((i) => Number.isInteger(i.unit_price_cents))).toBe(true);
    expect(items.every((i) => i.unit_price_cents > 0)).toBe(true);
  });

  it("filters by item_type per contract query param semantics", async () => {
    const packages = await listCatalogItems("package");
    expect(packages.map((i) => i.sku)).toEqual(["PKG-BASIC", "PKG-STANDARD", "PKG-PREMIUM"]);
    const services = await listCatalogItems("service");
    expect(services.length).toBe(16);
    const addOns = await listCatalogItems("add_on");
    expect(addOns.length).toBe(27);
  });

  it("resolves by SKU or numeric id interchangeably; unknown → not_found/404", async () => {
    const bySku = await getCatalogItem("PKG-BASIC");
    const byId = await getCatalogItem(String(bySku.id));
    expect(byId.sku).toBe("PKG-BASIC");
    await expect(getCatalogItem("NOPE")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("fixture catalog file carries provenance comment block", () => {
    expect(Array.isArray((catalogFile as { comment?: string[] }).comment)).toBe(true);
  });
});

describe("the catalogue sells the client's real 2026 price list", () => {
  it("prices every casket model at sheet A's regular SRP", async () => {
    for (const model of CASKET_MODELS) {
      expect(
        await priceOf(coffinSku(model.model)),
        `${model.model} (${coffinSku(model.model)})`,
      ).toBe(model.srp * 100);
    }
  });

  it("prices the embalming day table and the per-day rate beyond nine", async () => {
    for (const r of EMBALMING_RATES) {
      expect(await priceOf(embalmingDaySku(r.days)), `embalming ${r.days} days`).toBe(
        r.amount * 100,
      );
    }
    expect(await priceOf(EMBALMING_EXTRA_DAY_SKU)).toBe(EMBALMING_PER_DAY_BEYOND_9 * 100);
  });

  it("prices the five a-la-carte fees sheet A prints", async () => {
    for (const fee of ALACARTE_SERVICE_FEES) {
      const sku = ALACARTE_SKUS[fee.service];
      expect(sku, `SKU for ${fee.service}`).toBeTruthy();
      expect(await priceOf(sku), fee.service).toBe(fee.amount * 100);
    }
  });

  it("prices chapel use per day (common & private) as sheet III prints them", async () => {
    expect(await priceOf(CHAPEL_SKUS.common)).toBe(CHAPEL_RATES[0].common.ratePerDay * 100);
    expect(await priceOf(CHAPEL_SKUS.private)).toBe(CHAPEL_RATES[0].private.ratePerDay * 100);
  });

  it("prices each plan package at the sheet's monthly amortization for its tier", async () => {
    for (const tier of PLAN_TIERS) {
      const sku = planTierPackageSku(tier.id);
      if (!sku) continue; // tiers without a cart SKU go through the request path
      expect(await priceOf(sku), `${tier.name} (${sku})`).toBe(
        planRate(tier.id, "monthly") * 100,
      );
    }
  });

  it("leaves only the four items no 2026 sheet prices with their upstream amounts", async () => {
    // A guard against silent invention: these four are on NO 2026 sheet, so
    // their upstream seed amounts stay put until the client prices them.
    for (const [sku, cents] of UNPRICED_BY_SHEETS) {
      expect(await priceOf(sku), `${sku} (not on any 2026 sheet)`).toBe(cents);
    }
  });
});

describe("checkout follows order-payment-api-v1", () => {
  const customer = { name: "Marites Santos", email: "marites@example.com", phone: "+63 917 000 1111" };

  it("returns the frozen 201 envelope; total is server-priced from the catalogue", async () => {
    const order = await createOrder({
      customer,
      items: [{ sku: "PKG-BASIC", quantity: 1 }, { sku: "ADD-FLOWERS", quantity: 2 }],
    });
    expect(Object.keys(order)).toEqual(
      expect.arrayContaining(["number", "status", "customer_name", "total_cents", "currency", "items"]),
    );
    expect(order.number).toMatch(/^ORD-\d{4}-\d{5}$/);
    expect(order.status).toBe("paid"); // M0 sandbox succeeds synchronously
    expect(order.total_cents).toBe(60000 + 25000 * 2); // server-side pricing
    expect(order.event_uuid).toBeTruthy();
  });

  it("merges duplicate SKUs and rejects invalid quantities", async () => {
    const dupes = await createOrder({
      customer,
      items: [{ sku: "ADD-URN", quantity: 1 }, { sku: "ADD-URN", quantity: 2 }],
    });
    expect(dupes.items).toHaveLength(1);
    expect(dupes.items[0].quantity).toBe(3);

    await expect(
      fixtureCreateOrder({ customer, items: [{ sku: "ADD-URN", quantity: 0 }] }),
    ).rejects.toThrowError(/positive whole numbers/);
    await expect(fixtureCreateOrder({ customer, items: [] })).rejects.toThrowError(
      /at least one item/,
    );
  });

  it("unknown SKU → uniform 404 not_found; bad customer → 422 human-readable", async () => {
    await expect(
      createOrder({ customer, items: [{ sku: "GHOST", quantity: 1 }] }),
    ).rejects.toMatchObject({ status: 404, message: "not_found" });
    await expect(
      createOrder({
        customer: { name: "", email: "nope", phone: "" },
        items: [{ sku: "ADD-URN", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ status: 422 });
  });

  it("placed orders are retrievable by number; unknown numbers → 404", async () => {
    const order = await createOrder({ customer, items: [{ sku: "PKG-PREMIUM", quantity: 1 }] });
    const fetched = await getOrderByNumber(order.number);
    expect(fetched.total_cents).toBe(order.total_cents);
    await expect(getOrderByNumber("ORD-1999-99999")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
  });

  it("persists what checkout created so the staff admin reads it — without leaking admin fields", async () => {
    const order = await createOrder({
      customer,
      items: [{ sku: "SRV-DELIVERY", quantity: 1 }],
    });

    const listed = await listOrders();
    expect(listed.map((record) => record.order.number)).toContain(order.number);

    const record = await getAdminOrder(order.number);
    expect(record).not.toBeNull();
    expect(record!.customer.email).toBe(customer.email);
    expect(record!.lifecycle_status).toBe("new");
    expect(record!.timeline.map((event) => event.status)).toEqual(["new"]);

    // The public envelope stays exactly the frozen shape: admin fields arrive only
    // through the admin seam.
    expect(Object.keys(order)).not.toContain("lifecycle_status");
    expect(Object.keys(order)).not.toContain("customer");
    expect(Object.keys(order)).not.toContain("timeline");
  });
});

describe("cart line details resolve from the real catalogue by SKU (cart expand)", () => {
  it("every purchasable catalogue item resolves to real details for its cart line", async () => {
    const items = await listCatalogItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const detail = getCartLineCatalogDetail(item.sku);
      expect(detail, `details for ${item.sku}`).toBeDefined();
      // The expand panel must show the SAME facts the card/detail page shows.
      expect(detail?.name).toBe(item.name);
      expect(detail?.itemType).toBe(item.item_type);
      expect(detail?.unitPriceCents).toBe(item.unit_price_cents);
      expect(detail?.currency).toBe(item.currency);
      expect(CART_LINE_TYPE_LABEL[detail!.itemType]).toBeTruthy();
    }
  });

  it("packages publish their what's-included description; price-list services name their scope", async () => {
    const items = await listCatalogItems();
    for (const item of items) {
      const detail = getCartLineCatalogDetail(item.sku)!;
      if (item.item_type === "package") {
        expect(detail.description).toBeTruthy();
        expect(detail.description).toMatch(/casket|embalming/i);
      } else if (item.description) {
        // Where a description is published it must be the sheet's own scope or
        // collection, never invented inclusions.
        expect(detail.description).toMatch(
          /2026|a-la-carte|catalogue|chapel|when the family does not take a package/i,
        );
      } else {
        // No description published — the cart page shows its honest fallback.
        expect(detail.description).toBeNull();
      }
    }
  });

  it("unknown SKU → undefined so the cart page renders its graceful state", () => {
    expect(getCartLineCatalogDetail("NOT-A-SKU")).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import {
  createOrder,
  fixtureCreateOrder,
  getCatalogItem,
  getOrderByNumber,
  listCatalogItems,
} from "@/lib/api-client/commerce";
import {
  CART_LINE_TYPE_LABEL,
  getCartLineCatalogDetail,
} from "@/lib/cart/cart-line-details";

/**
 * Fixture↔contract tests pinning the recorded catalog to Keb's REAL seeds
 * (platform/services/catalog-pricing/db/seeds.rb) and the checkout flow to
 * the FROZEN order-payment-api-v1 envelope.
 */

const SEED_ITEMS: Array<[string, string, number, string]> = [
  // [sku, name, unit_price_cents, item_type] — must match seeds.rb exactly
  ["PKG-BASIC", "Basic Package", 150000, "package"],
  ["PKG-STANDARD", "Standard Package", 280000, "package"],
  ["PKG-PREMIUM", "Premium Package", 520000, "package"],
  ["SRV-EMBALM-D", "Additional Embalming Day", 45000, "service"],
  ["SRV-INTERMENT", "Interment Service", 120000, "service"],
  ["SRV-DELIVERY", "Delivery & Pick-up", 35000, "service"],
  ["SRV-LIGHTS", "Lights & Sound Setup", 60000, "service"],
  ["SRV-VIEWING", "Viewing Room Extension", 80000, "service"],
  ["ADD-COFFIN-LIZO-SR", "Casket Upgrade: Lizo SR", 85000, "add_on"],
  ["ADD-FLOWERS", "Flower Arrangement Set", 25000, "add_on"],
  ["ADD-URN", "Keepsake Urn", 18000, "add_on"],
];

describe("catalog fixtures mirror the seeded line-items + frozen API shape", () => {
  it("contains all 11 seeded items with exact SKUs, names, prices, types", async () => {
    const items = await listCatalogItems();
    expect(items.map((i) => i.sku)).toEqual(SEED_ITEMS.map(([sku]) => sku));
    items.forEach((item, idx) => {
      const [, name, cents, type] = SEED_ITEMS[idx];
      expect(item.name).toBe(name);
      expect(item.unit_price_cents).toBe(cents);
      expect(item.item_type).toBe(type);
      expect(item.currency).toBe("PHP");
      expect(Number.isInteger(item.unit_price_cents)).toBe(true);
    });
  });

  it("filters by item_type per contract query param semantics", async () => {
    const packages = await listCatalogItems("package");
    expect(packages.map((i) => i.sku)).toEqual(["PKG-BASIC", "PKG-STANDARD", "PKG-PREMIUM"]);
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
});

describe("checkout follows order-payment-api-v1", () => {
  const customer = { name: "Marites Santos", email: "marites@example.com", phone: "+63 917 000 1111" };

  it("returns the frozen 201 envelope; total is server-priced from seeds", async () => {
    const order = await createOrder({
      customer,
      items: [{ sku: "PKG-BASIC", quantity: 1 }, { sku: "ADD-FLOWERS", quantity: 2 }],
    });
    expect(Object.keys(order)).toEqual(
      expect.arrayContaining(["number", "status", "customer_name", "total_cents", "currency", "items"]),
    );
    expect(order.number).toMatch(/^ORD-\d{4}-\d{5}$/);
    expect(order.status).toBe("paid"); // M0 sandbox succeeds synchronously
    expect(order.total_cents).toBe(150000 + 25000 * 2); // server-side pricing
    expect(order.event_uuid).toBeTruthy();
  });

  it("merges duplicate SKUs and rejects invalid quantities", async () => {
    const dupes = await createOrder({
      customer,
      items: [{ sku: "ADD-URN", quantity: 1 }, { sku: "ADD-URN", quantity: 2 }],
    });
    expect(dupes.items).toHaveLength(1);
    expect(dupes.items[0].quantity).toBe(3);

    expect(() =>
      fixtureCreateOrder({ customer, items: [{ sku: "ADD-URN", quantity: 0 }] }),
    ).toThrowError(/positive whole numbers/);
    expect(() => fixtureCreateOrder({ customer, items: [] })).toThrowError(/at least one item/);
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

  it("fixture catalog file carries provenance comment block", () => {
    expect(Array.isArray((catalogFile as { comment?: string[] }).comment)).toBe(true);
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

  it("packages publish their what's-included description; services/add-ons stay null (real data)", async () => {
    const items = await listCatalogItems();
    for (const item of items) {
      const detail = getCartLineCatalogDetail(item.sku)!;
      if (item.item_type === "package") {
        expect(detail.description).toBeTruthy();
        expect(detail.description).toMatch(/casket|embalming/i);
      } else {
        // No description is published today — the cart page must show its
        // honest placeholder, never invented inclusions.
        expect(detail.description).toBeNull();
      }
    }
  });

  it("unknown SKU → undefined so the cart page renders its graceful state", () => {
    expect(getCartLineCatalogDetail("NOT-A-SKU")).toBeUndefined();
  });
});

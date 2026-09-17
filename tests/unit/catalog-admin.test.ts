import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import {
  createCatalogItem,
  createOrder,
  getAdminCatalogItem,
  getCatalogItem,
  listAdminCatalogItems,
  listCatalogItems,
  updateCatalogItem,
} from "@/lib/api-client/commerce";
import {
  CATALOG_DESCRIPTION_MAX_LENGTH,
  CATALOG_NAME_MAX_LENGTH,
  CATALOG_SKU_MAX_LENGTH,
  catalogDisplayPrice,
  catalogPriceUnit,
  parseMajorToMinorUnits,
  validateCatalogDraft,
} from "@/lib/catalog-admin";

/**
 * The catalogue administration rules and the durable store behind them
 * (lib/catalog-admin.ts + lib/api-client/catalog-store.ts):
 *  - field-by-field validation with integer minor units only;
 *  - create/update round trips that change what the STOREFRONT reader sees;
 *  - case-insensitive SKU uniqueness, id allocation and deactivation;
 *  - durability (the journal on disk) and honest failures (corrupt store → 500).
 *
 * Every test points CATALOG_STORE_PATH (and ORDERS_STORE_PATH for checkout) at
 * its own throwaway files, so nothing here touches the repo's .data/ demo store.
 */

const SEED_ITEMS = (catalogFile as unknown as { items: Array<Record<string, unknown>> }).items;

const customer = {
  name: "Test Buyer",
  email: "buyer@example.test",
  phone: "+63 900 000 0000",
};

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-catalog-unit-"));
  process.env.CATALOG_STORE_PATH = path.join(dir, "catalog.json");
  process.env.ORDERS_STORE_PATH = path.join(dir, "orders.json");
});

afterEach(async () => {
  delete process.env.CATALOG_STORE_PATH;
  delete process.env.ORDERS_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

/* ------------------------------ pure rules ------------------------------ */

describe("catalog draft validation (one rule shared by form, route and store)", () => {
  const validDraft = {
    sku: "SRV-NEW-ITEM",
    name: "New memorial service",
    description: "A service the office adds.",
    item_type: "service",
    unit_price_cents: 600000,
    currency: "php",
    image: "/media/hero-1.jpg",
    published: true,
  };

  it("accepts a complete draft, trims text and normalises currency", () => {
    const check = validateCatalogDraft({ ...validDraft, sku: "  SRV-NEW-ITEM  ", currency: "php" });
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.draft).toEqual({
      sku: "SRV-NEW-ITEM",
      name: "New memorial service",
      description: "A service the office adds.",
      item_type: "service",
      unit_price_cents: 600000,
      currency: "PHP",
      image: "/media/hero-1.jpg",
      published: true,
    });
  });

  it("treats empty description/image as absent and defaults published to true", () => {
    const check = validateCatalogDraft({
      ...validDraft,
      description: "   ",
      image: "",
      published: undefined,
    });
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.draft.description).toBeNull();
    expect(check.draft.image).toBeNull();
    expect(check.draft.published).toBe(true);
    expect(check.draft.unit_price_cents).toBe(600000);
  });

  it("rejects a missing name, a bad SKU, a missing type and an over-long description", () => {
    const check = validateCatalogDraft({
      ...validDraft,
      sku: "has spaces",
      name: "   ",
      item_type: "bundle",
      description: "x".repeat(CATALOG_DESCRIPTION_MAX_LENGTH + 1),
    });
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.errors.name).toMatch(/name is required/i);
    expect(check.errors.sku).toMatch(/letters, numbers/i);
    expect(check.errors.item_type).toMatch(/package, service or add-on/i);
    expect(check.errors.description).toMatch(/under 600/);
  });

  it("enforces the SKU and name length limits and the currency shape", () => {
    const longSku = validateCatalogDraft({ ...validDraft, sku: "A".repeat(CATALOG_SKU_MAX_LENGTH + 1) });
    expect(longSku.ok).toBe(false);
    if (!longSku.ok) expect(longSku.errors.sku).toMatch(/under 64/);
    expect(validateCatalogDraft({ ...validDraft, sku: "A" }).ok).toBe(false);

    const longName = validateCatalogDraft({ ...validDraft, name: "N".repeat(CATALOG_NAME_MAX_LENGTH + 1) });
    expect(longName.ok).toBe(false);
    if (!longName.ok) expect(longName.errors.name).toMatch(/under 120/);

    const badCurrency = validateCatalogDraft({ ...validDraft, currency: "PESO" });
    expect(badCurrency.ok).toBe(false);
    if (!badCurrency.ok) expect(badCurrency.errors.currency).toMatch(/three-letter/i);
  });

  it("keeps prices to non-negative integer minor units (never floats)", () => {
    const floatPrice = validateCatalogDraft({ ...validDraft, unit_price_cents: 6000.5 });
    expect(floatPrice.ok).toBe(false);
    if (!floatPrice.ok) expect(floatPrice.errors.unit_price_cents).toMatch(/integer centavos/i);

    const negative = validateCatalogDraft({ ...validDraft, unit_price_cents: -1 });
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.errors.unit_price_cents).toMatch(/cannot be negative/i);

    expect(validateCatalogDraft({ ...validDraft, unit_price_cents: 0 }).ok).toBe(true);
    expect(validateCatalogDraft({ ...validDraft, unit_price_cents: "600000" }).ok).toBe(false);
  });

  it("only accepts photo sources the app can render (data URL, /media path, http URL)", () => {
    const bad = validateCatalogDraft({ ...validDraft, image: "javascript:alert(1)" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.image).toMatch(/library/i);

    for (const image of ["/media/chapel-common.jpg", "https://cdn.example/x.jpg", "data:image/png;base64,AAAA"]) {
      expect(validateCatalogDraft({ ...validDraft, image }).ok, image).toBe(true);
    }
  });
});

describe("the price control bridges pesos to integer minor units", () => {
  it("parses everyday amounts, rejects anything that is not money", () => {
    expect(parseMajorToMinorUnits("6000")).toBe(600000);
    expect(parseMajorToMinorUnits("6,000")).toBe(600000);
    expect(parseMajorToMinorUnits("₱1,500")).toBe(150000);
    expect(parseMajorToMinorUnits("6000.5")).toBe(600050);
    expect(parseMajorToMinorUnits("0")).toBe(0);
    expect(parseMajorToMinorUnits("")).toBeNull();
    expect(parseMajorToMinorUnits("abc")).toBeNull();
    expect(parseMajorToMinorUnits("-5")).toBeNull();
    expect(parseMajorToMinorUnits("1.234")).toBeNull();
    expect(parseMajorToMinorUnits("1e3")).toBeNull();
    expect(parseMajorToMinorUnits("9999999999999")).toBeNull();
  });

  it("reproduces every recorded seed display string from its amount + unit suffix", () => {
    for (const seed of SEED_ITEMS) {
      const unit = catalogPriceUnit(String(seed.display_price));
      expect(
        catalogDisplayPrice(
          seed.unit_price_cents as number,
          seed.currency as string,
          unit,
        ),
        String(seed.sku),
      ).toBe(seed.display_price);
    }
    expect(catalogPriceUnit("₱600.00 / month")).toBe("/ month");
    expect(catalogPriceUnit("₱1,500.00 / day")).toBe("/ day");
    expect(catalogPriceUnit("₱160,000.00")).toBe("");
  });
});

/* ------------------------------ store round trip ------------------------ */

describe("the durable catalogue store serves the storefront readers", () => {
  it("keeps every recorded seed item, in recorded order, published by default", async () => {
    const items = await listCatalogItems();
    expect(items.map((item) => item.sku)).toEqual(SEED_ITEMS.map((seed) => seed.sku));
    const admin = await listAdminCatalogItems();
    expect(admin.every((record) => record.published)).toBe(true);
  });

  it("creates an item that the storefront reads, and persists it to the journal", async () => {
    const created = await createCatalogItem({
      sku: "SRV-NEW-ITEM",
      name: "New memorial service",
      description: "A service the office adds.",
      item_type: "service",
      unit_price_cents: 600000,
      currency: "PHP",
      image: "/media/hero-1.jpg",
      published: true,
    });
    // Ids derive from the recorded seed's highest id, so a restart cannot collide.
    expect(created.item.id).toBeGreaterThan(Math.max(...SEED_ITEMS.map((s) => s.id as number)));
    expect(created.item.display_price).toBe("₱6,000.00");
    expect(created.item.image).toBe("/media/hero-1.jpg");
    expect(created.published).toBe(true);

    const storefront = await listCatalogItems();
    const seen = storefront.find((item) => item.sku === "SRV-NEW-ITEM");
    expect(seen).toBeDefined();
    expect(seen!.unit_price_cents).toBe(600000);
    expect(seen!.item_type).toBe("service");

    // Durable: the journal on disk carries the created record (survives a restart).
    const journal = await readFile(process.env.CATALOG_STORE_PATH as string, "utf8");
    expect(journal).toContain("SRV-NEW-ITEM");
    expect(journal).toContain("item_created");
  });

  it("refuses a duplicate SKU whatever the case, and changes nothing", async () => {
    await expect(
      createCatalogItem({
        sku: "pkg-basic",
        name: "Impostor",
        description: null,
        item_type: "package",
        unit_price_cents: 1,
        currency: "PHP",
        image: null,
        published: true,
      }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { sku: expect.stringMatching(/already used/i) },
    });
    expect((await listAdminCatalogItems()).length).toBe(SEED_ITEMS.length);
  });

  it("edits by SKU or id and the storefront sees the new price and display string", async () => {
    const draft = {
      sku: "PKG-BASIC",
      name: "Basic Package (2027)",
      description: "Casket (standard), embalming included, delivery within city",
      item_type: "package" as const,
      unit_price_cents: 70000,
      currency: "PHP",
      image: null,
      published: true,
    };
    const updated = await updateCatalogItem("PKG-BASIC", draft);
    expect(updated.item.name).toBe("Basic Package (2027)");
    // The recorded "/ month" suffix is preserved across the price edit.
    expect(updated.item.display_price).toBe("₱700.00 / month");

    const byId = await updateCatalogItem(String(updated.item.id), {
      ...draft,
      name: "Basic Package",
      unit_price_cents: 71000,
    });
    expect(byId.item.sku).toBe("PKG-BASIC");
    expect(byId.item.display_price).toBe("₱710.00 / month");

    const storefront = await getCatalogItem("PKG-BASIC");
    expect(storefront.name).toBe("Basic Package");
    expect(storefront.unit_price_cents).toBe(71000);
    expect(storefront.display_price).toBe("₱710.00 / month");
  });

  it("re-prices checkout from the edited item and lists it at the new price", async () => {
    await updateCatalogItem("PKG-BASIC", {
      sku: "PKG-BASIC",
      name: "Basic Package",
      description: null,
      item_type: "package",
      unit_price_cents: 123400,
      currency: "PHP",
      image: null,
      published: true,
    });
    const order = await createOrder({
      customer,
      items: [{ sku: "PKG-BASIC", quantity: 1 }],
    });
    expect(order.total_cents).toBe(123400);
    expect(order.items[0].unit_price_cents).toBe(123400);
  });

  it("deactivates instead of deleting: gone from the storefront, still readable by staff", async () => {
    await updateCatalogItem("SRV-DELIVERY", {
      sku: "SRV-DELIVERY",
      name: "Transfer / delivery of remains",
      description: null,
      item_type: "service",
      unit_price_cents: 250000,
      currency: "PHP",
      image: null,
      published: false,
    });

    const storefront = await listCatalogItems();
    expect(storefront.map((item) => item.sku)).not.toContain("SRV-DELIVERY");
    await expect(getCatalogItem("SRV-DELIVERY")).rejects.toMatchObject({
      status: 404,
      message: "not_found",
    });
    // Checkout refuses a deactivated item for the same reason.
    await expect(
      createOrder({ customer, items: [{ sku: "SRV-DELIVERY", quantity: 1 }] }),
    ).rejects.toMatchObject({ status: 404, message: "not_found" });

    const admin = await getAdminCatalogItem("SRV-DELIVERY");
    expect(admin).not.toBeNull();
    expect(admin!.published).toBe(false);

    // And it can be put back on the storefront.
    await updateCatalogItem("SRV-DELIVERY", {
      sku: "SRV-DELIVERY",
      name: "Transfer / delivery of remains",
      description: null,
      item_type: "service",
      unit_price_cents: 250000,
      currency: "PHP",
      image: null,
      published: true,
    });
    expect((await listCatalogItems()).map((item) => item.sku)).toContain("SRV-DELIVERY");
  });

  it("refuses an unknown id and a rename onto another SKU", async () => {
    await expect(
      updateCatalogItem("999999", {
        sku: "SRV-X",
        name: "X",
        description: null,
        item_type: "service",
        unit_price_cents: 1,
        currency: "PHP",
        image: null,
        published: true,
      }),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      updateCatalogItem("PKG-BASIC", {
        sku: "PKG-STANDARD",
        name: "Basic Package",
        description: null,
        item_type: "package",
        unit_price_cents: 60000,
        currency: "PHP",
        image: null,
        published: true,
      }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { sku: expect.any(String) } });

    // A pure case correction of one's own SKU is not a clash.
    const renamed = await updateCatalogItem("PKG-BASIC", {
      sku: "pkg-basic",
      name: "Basic Package",
      description: null,
      item_type: "package",
      unit_price_cents: 60000,
      currency: "PHP",
      image: null,
      published: true,
    });
    expect(renamed.item.sku).toBe("pkg-basic");
  });

  it("stores a device-uploaded data URL as the item photo and rejects one too large", async () => {
    const dataUrl = `data:image/jpeg;base64,${"A".repeat(120_000)}`;
    const created = await createCatalogItem({
      sku: "SRV-PHOTO",
      name: "Service with a device photo",
      description: null,
      item_type: "service",
      unit_price_cents: 10000,
      currency: "PHP",
      image: dataUrl,
      published: true,
    });
    expect(created.item.image).toBe(dataUrl);
    expect((await listCatalogItems()).find((item) => item.sku === "SRV-PHOTO")!.image).toBe(dataUrl);
    expect(await readFile(process.env.CATALOG_STORE_PATH as string, "utf8")).toContain(
      "data:image/jpeg",
    );

    await expect(
      createCatalogItem({
        sku: "SRV-HUGE-PHOTO",
        name: "Too large",
        description: null,
        item_type: "service",
        unit_price_cents: 1,
        currency: "PHP",
        image: `data:image/png;base64,${"A".repeat(4_000_001)}`,
        published: true,
      }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { image: expect.any(String) } });
  });

  it("fails honestly (500) when the journal on disk is corrupt", async () => {
    await writeFile(process.env.CATALOG_STORE_PATH as string, "{ not json", "utf8");
    await expect(listCatalogItems()).rejects.toMatchObject({ status: 500 });
  });
});

describe("live mode refuses catalogue administration honestly", () => {
  it("answers 503 (never a fake write) when the gateway is configured", async () => {
    vi.stubEnv("COMMERCE_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    try {
      const live = await import("@/lib/api-client/commerce");
      await expect(live.listAdminCatalogItems()).rejects.toMatchObject({
        status: 503,
        message: expect.stringContaining("fixture-mode only"),
      });
      await expect(live.createCatalogItem({})).rejects.toMatchObject({ status: 503 });
      await expect(live.updateCatalogItem("PKG-BASIC", {})).rejects.toMatchObject({ status: 503 });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";

/**
 * Real catalogue detail for a cart line, keyed by the line's SKU — used by the
 * cart page's per-line expand control ("show this item's details again").
 *
 * Client-safe on purpose: it reads the SAME recorded commerce fixture the cart
 * context already uses to rehydrate display fields (lib/cart/cart-context.tsx),
 * so the details match the catalogue/detail pages exactly and NOTHING is
 * invented. Tolerant reader in the codebase style: unknown or malformed SKUs
 * yield undefined and the cart page renders a graceful state instead of
 * crashing (extra fields are ignored, missing description → null).
 */

export type CartLineItemType = "package" | "service" | "add_on";

export type CartLineCatalogDetail = {
  sku: string;
  name: string;
  itemType: CartLineItemType;
  description: string | null;
  unitPriceCents: number;
  currency: string;
};

/** Same label map the detail page uses for catalogue item types. */
export const CART_LINE_TYPE_LABEL: Record<CartLineItemType, string> = {
  package: "Package",
  service: "Service",
  add_on: "Add-on",
};

const rawItems: unknown =
  (catalogFile as { items?: unknown }).items ?? [];

const BY_SKU = new Map<string, CartLineCatalogDetail>();
if (Array.isArray(rawItems)) {
  for (const entry of rawItems) {
    if (typeof entry !== "object" || entry === null) continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.sku !== "string" || typeof e.name !== "string") continue;
    const itemType = e.item_type;
    if (itemType !== "package" && itemType !== "service" && itemType !== "add_on") {
      continue;
    }
    const cents = Number(e.unit_price_cents);
    const currency = typeof e.currency === "string" ? e.currency : "PHP";
    BY_SKU.set(e.sku, {
      sku: e.sku,
      name: e.name,
      itemType,
      description: typeof e.description === "string" ? e.description : null,
      unitPriceCents: Number.isInteger(cents) ? cents : 0,
      currency,
    });
  }
}

/** Detail for a cart line by SKU, or undefined when the catalogue no longer
 * knows the SKU (the cart page then shows an honest fallback). */
export function getCartLineCatalogDetail(sku: string): CartLineCatalogDetail | undefined {
  return BY_SKU.get(sku);
}

/** Every purchasable catalogue SKU the fixture store knows (test contract:
 * each of these must resolve to real details with a real price). */
export function listKnownCartLineSkus(): string[] {
  return [...BY_SKU.keys()];
}

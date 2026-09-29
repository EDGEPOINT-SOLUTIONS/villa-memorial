import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";

/**
 * Real catalogue detail for a quote line, keyed by the line's SKU — used by the
 * quote page's per-line expand control ("show this item's details again").
 *
 * Client-safe on purpose: it reads the SAME recorded commerce fixture the quote
 * basket already uses to rehydrate display fields
 * (lib/quote-basket/quote-basket-context.tsx), so the details match the
 * catalogue/detail pages exactly and NOTHING is invented. Tolerant reader in the
 * codebase style: unknown or malformed SKUs yield undefined and the quote page
 * renders a graceful state instead of crashing (extra fields are ignored,
 * missing description → null).
 *
 * A LOT line is not a catalogue SKU: its identity and figures belong to the plot
 * and the pricing store, so the line carries its own snapshot and this module
 * says so honestly (no catalogue detail for a lot; the row renders the line's
 * own detail).
 */

export type QuoteLineItemType = "package" | "service" | "add_on" | "lot";

export type QuoteLineCatalogDetail = {
  sku: string;
  name: string;
  itemType: Exclude<QuoteLineItemType, "lot">;
  description: string | null;
  unitPriceCents: number;
  currency: string;
};

/** Same label map the detail page uses for catalogue item types. */
export const QUOTE_LINE_TYPE_LABEL: Record<QuoteLineItemType, string> = {
  package: "Package",
  service: "Service",
  add_on: "Add-on",
  lot: "Lot",
};

const rawItems: unknown = (catalogFile as { items?: unknown }).items ?? [];

const BY_SKU = new Map<string, QuoteLineCatalogDetail>();
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

/** Detail for a quote line by SKU, or undefined when the catalogue no longer
 * knows the SKU (the quote page then shows an honest fallback). */
export function getQuoteLineCatalogDetail(sku: string): QuoteLineCatalogDetail | undefined {
  return BY_SKU.get(sku);
}

/** Every purchasable catalogue SKU the fixture store knows (test contract: each
 * of these must resolve to real details with a real price). */
export function listKnownQuoteLineSkus(): string[] {
  return [...BY_SKU.keys()];
}

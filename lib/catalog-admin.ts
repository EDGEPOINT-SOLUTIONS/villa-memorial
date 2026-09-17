/**
 * Catalog administration rules — PURE, client + server, no I/O.
 *
 * The catalogue admin (app/(staff)/staff/catalog) edits the items the public
 * storefront sells. Every rule the form, the BFF route and the durable store
 * share lives here so the three can never drift:
 *
 *   - the draft shape and the field-level validation (`validateCatalogDraft`
 *     returns one message per control, keyed by field name);
 *   - the field limits (`CATALOG_*_MAX_LENGTH`) and the SKU grammar;
 *   - the money input bridge: staff type pesos, the wire carries integer minor
 *     units (`parseMajorToMinorUnits`) — a float never crosses the API.
 *
 * WHAT IS APP-AUTHORED HERE (flagged loudly, web/AGENTS.md trap)
 * The frozen order-payment-api-v1 catalogue entry is
 * `{id, sku, name, description, item_type, unit_price_cents, currency,
 * display_price}` — it has NO publish flag, NO photo and NO write endpoint.
 * `AdminCatalogItem` therefore WRAPS that envelope with the app-authored
 * `published` state, `image` photo and `price_unit` presentation suffix (see
 * lib/api-client/catalog-store.ts). Live mode refuses these writes with 503
 * instead of inventing a contract (lib/api-client/commerce.ts
 * ADMIN_CATALOG_NOT_WIRED); the contract ask is recorded in the PR.
 */
import { formatMinorUnits } from "@/lib/money";

export type CatalogItemType = "package" | "service" | "add_on";

export const CATALOG_ITEM_TYPES: readonly CatalogItemType[] = [
  "package",
  "service",
  "add_on",
] as const;

export const CATALOG_ITEM_TYPE_LABEL: Record<CatalogItemType, string> = {
  package: "Package",
  service: "Service",
  add_on: "Add-on",
};

/** Field limits — "sensible length limits" from the admin brief. */
export const CATALOG_SKU_MIN_LENGTH = 2;
export const CATALOG_SKU_MAX_LENGTH = 64;
export const CATALOG_NAME_MAX_LENGTH = 120;
export const CATALOG_DESCRIPTION_MAX_LENGTH = 600;
export const CATALOG_CURRENCY_LENGTH = 3;
/** Device uploads arrive as data URLs (lib/device-upload.ts) — large by design. */
export const CATALOG_IMAGE_MAX_LENGTH = 4_000_000;
/** ₱1,000,000,000.00 — a typo guard, not a pricing policy. */
export const CATALOG_PRICE_MAX_CENTS = 100_000_000_000;

/** SKU grammar: letters/digits first, then letters/digits/dot/dash/underscore. */
export const CATALOG_SKU_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;
const IMAGE_SRC_PATTERN = /^(?:data:image\/|\/|https?:\/\/)/i;

/** The frozen envelope fields the storefront consumes, plus the app-authored photo. */
export type CatalogItemRecord = {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  item_type: CatalogItemType;
  unit_price_cents: number;
  currency: string;
  /** Presentation-only, DERIVED from unit_price_cents + currency + price_unit. */
  display_price: string;
  /** App-authored storefront photo — not part of the frozen contract. */
  image: string | null;
};

/** One catalogue item as the admin store keeps it: frozen envelope + app-authored state. */
export type AdminCatalogItem = {
  item: CatalogItemRecord;
  /** Storefront visibility. Deactivating is the retirement tool — items are never deleted. */
  published: boolean;
  /**
   * Presentation-only unit suffix preserved from the recorded display price
   * ("/ month", "/ day"). Empty for everything else. Never a price: the amount
   * always comes from unit_price_cents.
   */
  price_unit: string;
  updated_at: string;
};

/** What a create/edit form submits (JSON on the wire) — money in integer minor units. */
export type CatalogDraft = {
  sku: string;
  name: string;
  description: string | null;
  item_type: CatalogItemType;
  unit_price_cents: number;
  currency: string;
  image: string | null;
  published: boolean;
};

export type CatalogDraftErrors = Partial<Record<keyof CatalogDraft, string>>;

export type CatalogDraftValidation =
  | { ok: true; draft: CatalogDraft }
  | { ok: false; errors: CatalogDraftErrors };

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Validates one draft field by field. Uniqueness is NOT here — it needs the
 * store's live records and is enforced under the store lock (case-insensitive).
 */
export function validateCatalogDraft(raw: unknown): CatalogDraftValidation {
  const errors: CatalogDraftErrors = {};
  const r =
    typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};

  const sku = typeof r.sku === "string" ? r.sku.trim() : "";
  if (sku.length < CATALOG_SKU_MIN_LENGTH) {
    errors.sku = `A SKU is required (at least ${CATALOG_SKU_MIN_LENGTH} characters).`;
  } else if (sku.length > CATALOG_SKU_MAX_LENGTH) {
    errors.sku = `Keep the SKU under ${CATALOG_SKU_MAX_LENGTH} characters.`;
  } else if (!CATALOG_SKU_PATTERN.test(sku)) {
    errors.sku = "Use letters, numbers, dots, dashes or underscores — e.g. SRV-NEW-ITEM.";
  }

  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (name.length === 0) {
    errors.name = "A name is required — it is what the storefront shows.";
  } else if (name.length > CATALOG_NAME_MAX_LENGTH) {
    errors.name = `Keep the name under ${CATALOG_NAME_MAX_LENGTH} characters.`;
  }

  let description: string | null = null;
  if (r.description != null && typeof r.description !== "string") {
    errors.description = "The description must be text.";
  } else if (typeof r.description === "string" && r.description.trim().length > 0) {
    const trimmed = r.description.trim();
    if (trimmed.length > CATALOG_DESCRIPTION_MAX_LENGTH) {
      errors.description = `Keep the description under ${CATALOG_DESCRIPTION_MAX_LENGTH} characters.`;
    } else {
      description = trimmed;
    }
  }

  const itemType = r.item_type;
  if (
    typeof itemType !== "string" ||
    !CATALOG_ITEM_TYPES.includes(itemType as CatalogItemType)
  ) {
    errors.item_type = "Choose the item type — package, service or add-on.";
  }

  const cents = r.unit_price_cents;
  if (typeof cents !== "number" || Number.isNaN(cents)) {
    errors.unit_price_cents = "Enter a price.";
  } else if (!isInteger(cents)) {
    errors.unit_price_cents =
      "Prices are integer centavos (minor units) — ₱6,000.00 is 600000, never a decimal.";
  } else if (cents < 0) {
    errors.unit_price_cents = "A price cannot be negative.";
  } else if (cents > CATALOG_PRICE_MAX_CENTS) {
    errors.unit_price_cents = "That price looks too large — check the amount and try again.";
  }

  const currency = typeof r.currency === "string" ? r.currency.trim().toUpperCase() : "";
  if (!CURRENCY_PATTERN.test(currency)) {
    errors.currency = "Currency is a three-letter code, e.g. PHP.";
  }

  let image: string | null = null;
  if (r.image != null && typeof r.image !== "string") {
    errors.image = "The photo must be an image path or URL.";
  } else if (typeof r.image === "string" && r.image.trim().length > 0) {
    const trimmed = r.image.trim();
    if (trimmed.length > CATALOG_IMAGE_MAX_LENGTH) {
      errors.image = "That photo is too large to store — choose a smaller file.";
    } else if (!IMAGE_SRC_PATTERN.test(trimmed)) {
      errors.image =
        "Use a photo from the library, an /media/… path, an https URL or a device upload.";
    } else {
      image = trimmed;
    }
  }

  const published = r.published;
  if (published != null && typeof published !== "boolean") {
    errors.published = "Choose whether the item is on the storefront.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    draft: {
      sku,
      name,
      description,
      item_type: itemType as CatalogItemType,
      unit_price_cents: cents as number,
      currency,
      image,
      published: published == null ? true : (published as boolean),
    },
  };
}

/**
 * Pesos → integer minor units for the price control. Staff type an amount
 * ("6,000", "6000.5"), the wire carries 600000 / 600050. Returns null for
 * anything that is not a non-negative amount with at most two decimals, so the
 * caller renders the field error and no float ever reaches the API.
 */
export function parseMajorToMinorUnits(input: string): number | null {
  const cleaned = input.trim().replace(/[₱,\s]/g, "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= CATALOG_PRICE_MAX_CENTS ? cents : null;
}

/** The display string a record publishes: money + its presentation-only unit. */
export function catalogDisplayPrice(
  cents: number,
  currency: string,
  priceUnit: string,
): string {
  const base = formatMinorUnits(cents, currency);
  const unit = priceUnit.trim();
  return unit.length > 0 ? `${base} ${unit}` : base;
}

/**
 * One-time SEED migration: read the presentation suffix off a RECORDED display
 * price ("₱600.00 / month" → "/ month") so the store reproduces the recorded
 * strings exactly when the price is edited. This is fixture seeding, not
 * display-string parsing on the live path — the live reader still shows
 * `display_price` verbatim (lib/money.ts rule).
 */
export function catalogPriceUnit(displayPrice: string): string {
  const match = /[0-9][0-9,]*\.[0-9]{2}(\s+\/.*)$/.exec(displayPrice.trim());
  return match ? match[1].trim() : "";
}

/**
 * Storefront SKUs for the client's 2026 price list — the single place where a
 * transcribed sheet row (lib/villa-pricing.ts) is bound to the catalogue entry
 * that makes it sellable (lib/fixtures/commerce/catalog-items.json).
 *
 * Why this module exists: every public price-list surface (products, services,
 * plans, lots) must offer the SAME action for the SAME sheet line — "Add to
 * cart" with the exact catalogue SKU/name/price, or the prefilled request path.
 * Views must never hand-type a SKU, and the fixture-contract tests pin every SKU
 * below to a catalogue entry whose unit_price_cents equals the sheet figure.
 *
 * The keys are the sheet's own labels (the `service` strings of
 * ALACARTE_SERVICE_FEES), so a re-transcription that renames a line fails the
 * catalogue-contract test instead of silently shipping an actionless row.
 */
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  CHAPEL_RATES,
  type CasketModel,
  type PlanTier,
} from "@/lib/villa-pricing";

/** UPPER-KEBAB slug of a sheet label ("White Rose Half" → "WHITE-ROSE-HALF"). */
export function catalogueSlug(label: string): string {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** One SKU per casket model on sheet A's "For package" table. */
export function coffinSku(model: string): string {
  return `CSK-${catalogueSlug(model)}`;
}

/** The 24 casket SKUs, in the sheet's order (same order as CASKET_MODELS). */
export const COFFIN_SKUS: ReadonlyArray<{ model: string; sku: string }> =
  CASKET_MODELS.map((m) => ({ model: m.model, sku: coffinSku(m.model) }));

/**
 * The sheet model a casket SKU sells — the record /products/[sku] renders. The
 * SKU comes from the URL, so the lookup is case-insensitive and returns
 * undefined for anything the catalogue does not carry (the page then 404s).
 */
export function coffinModelForSku(sku: string): CasketModel | undefined {
  const wanted = sku.trim().toUpperCase();
  const entry = COFFIN_SKUS.find((e) => e.sku.toUpperCase() === wanted);
  return entry ? CASKET_MODELS.find((m) => m.model === entry.model) : undefined;
}

/** The public detail route of a casket model (/products/[sku]). */
export function casketDetailHref(model: string): string {
  return `/products/${encodeURIComponent(coffinSku(model))}`;
}

/** One SKU per embalming day count on sheet A's per-day table (3–9 days). */
export function embalmingDaySku(days: number): string {
  return `SRV-EMBALM-${days}D`;
}

/** The five a-la-carte fees sheet A prints under "If they will not get the package". */
export const ALACARTE_SKUS: Readonly<Record<string, string>> = {
  Retrieval: "SRV-RETRIEVAL",
  Delivery: "SRV-DELIVERY",
  "Viewing equipment": "SRV-VIEWING",
  "ORD coffin": "SRV-ORD-COFFIN",
  Interment: "SRV-INTERMENT",
};

/** One SKU per a-la-carte fee the sheet prices (Retrieval … Interment). */
export const ALACARTE_LINES: ReadonlyArray<{
  service: string;
  sku: string;
  amount: number;
}> = ALACARTE_SERVICE_FEES.map((f) => {
  const sku = ALACARTE_SKUS[f.service];
  if (!sku) {
    throw new Error(
      `No catalogue SKU for the a-la-carte line "${f.service}" — add it to ALACARTE_SKUS.`,
    );
  }
  return { service: f.service, sku, amount: f.amount };
});

/** The sheet's ">9 +1500 /day" line — one additional embalming day. */
export const EMBALMING_EXTRA_DAY_SKU = "SRV-EMBALM-D";

/** Sheet III's two chapel products, both priced per day. */
export const CHAPEL_SKUS = {
  common: "CHP-COMMON-DAY",
  private: "CHP-PRIVATE-DAY",
} as const;

/** The sheet's own per-day chapel rates, read for callers that need them. */
export const CHAPEL_PER_DAY = {
  common: CHAPEL_RATES[0].common.ratePerDay,
  private: CHAPEL_RATES[0].private.ratePerDay,
} as const;

/**
 * PROVISIONAL tier → package mapping. The client's plan sheet prices five
 * tiers, but the platform catalogue (and the package pages) sell three
 * packages; PKG-BASIC was already documented as the Bronze 1 plan. Until the
 * importer names every tier, only these three tiers have a quote-basket SKU and the
 * others route to the request path (the plan's five-tier schedule itself is
 * published on lib/villa-pricing.ts and every rate is requestable).
 */
export const PLAN_TIER_PACKAGE_SKUS: Readonly<Partial<Record<PlanTier, string>>> = {
  bronze1: "PKG-BASIC",
  silver1: "PKG-STANDARD",
  gold: "PKG-PREMIUM",
};

/** The catalogue SKU for a plan tier, when one exists (else undefined). */
export function planTierPackageSku(tier: PlanTier): string | undefined {
  return PLAN_TIER_PACKAGE_SKUS[tier];
}

/** The tier a package SKU sells, when the mapping knows it (else undefined). */
export function planTierForPackageSku(sku: string): PlanTier | undefined {
  const entry = (Object.entries(PLAN_TIER_PACKAGE_SKUS) as Array<[PlanTier, string | undefined]>)
    .find(([, value]) => value === sku);
  return entry?.[0];
}

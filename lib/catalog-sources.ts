/**
 * Where every published price comes from — the ONE item → client document →
 * figure map.
 *
 * Why this module exists (captain's 2026-09-18 instruction: the product's sample
 * data must BE the client's data, not merely plausible): the storefront sells a
 * catalogue and publishes lot prices, and the next person asking "where does
 * this price come from?" must not have to re-read the client's PDFs. Every
 * figure below is DERIVED from `lib/villa-pricing.ts` (the single transcription
 * home of the client's 2026 sheets) — no amount is restated here — and
 * `tests/fixture-contract/catalog-sources.test.ts` walks the recorded catalogue
 * and the property lots against it, failing with the item and the missing
 * source when a published price traces to no client document.
 *
 * The client documents (all in `VILLA MEMORIAL PROJECT 2026`):
 *  · sheet A   — "2026 price FV website A.pdf" (= "PRICE LIST FOR 2026 II",
 *                byte-identical): the "If they will not get the package"
 *                a-la-carte fees, the embalming day table, and the "For package"
 *                casket catalogue (24 models, REGULAR SRP);
 *  · sheet III — "PRICE LIST FOR 2026 III.pdf": chapel use per day, the ₱1,000
 *                miscellaneous fee, the per-family inclusions;
 *  · package   — "COMPLETE MEMORIAL PACKAGE.jpg": the plan's payment-mode table
 *                (the catalogue sells the plan at its MONTHLY amortization);
 *  · lot sheet — "PRICE LIST FOR 2026.pdf", LOT ONLY block: the five lot
 *                families with their own areas (Prime Lots ₱128,000 @ 2.5 sqm,
 *                Premium Lots ₱114,000 @ 2.5 sqm, Condo-type ₱75,000 @ 2.5 sqm,
 *                Garden Niches ₱567,000 @ 12 sqm, Mausoleum ₱1,073,000 @ 24 sqm);
 *  · contract  — "purchase application form 2026 (1).docx": the office's real
 *                contact numbers (Tel No. 09176178489 / 09171839262), seeded into
 *                the landing content document (see lib/fixtures/landing/content.json);
 *                "Service contract 2025.docx" names more products with a BLANK
 *                amount column (ROD, ARABESQUE, Lizo JR/SR, Lights …) — a pricing
 *                reference only, never a source for a figure.
 *
 * WITHDRAWN items — the platform's upstream seed carried four line items no
 * client document prices. Two of them (a Lights line, Lizo JR/SR) are named on
 * the client's 2025 service contract with a blank amount column — real products
 * the office quotes per family, but nothing publishable — and the other two
 * (a flower set, a keepsake urn) appear on no client document at all. They were
 * removed from the sellable catalogue rather than published at an invented
 * figure (WITHDRAWN_CATALOG_ITEMS below records which SKUs went and why, for
 * the platform-parity track). Where one is genuinely sold, the honest public
 * state is "ask the office": the cart's line-details fallback says so for a
 * stale line, and nothing re-adds a price.
 */
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  CHAPEL_RATES,
  EMBALMING_PER_DAY_BEYOND_9,
  EMBALMING_RATES,
  PLAN_TIERS,
  SEED_PRICING,
  planRate,
} from "@/lib/villa-pricing";
import {
  ALACARTE_SKUS,
  CHAPEL_SKUS,
  EMBALMING_EXTRA_DAY_SKU,
  coffinSku,
  embalmingDaySku,
  planTierPackageSku,
} from "@/lib/catalogue-skus";

/** The client's own documents, keyed by the id every source record names. */
export const CLIENT_PRICE_DOCUMENTS = {
  sheetA: {
    title: "2026 price FV website A.pdf (= PRICE LIST FOR 2026 II)",
    covers: "a-la-carte fees, the embalming day table, the “For package” casket catalogue",
  },
  sheetIII: {
    title: "PRICE LIST FOR 2026 III.pdf",
    covers: "chapel use per day, the ₱1,000 miscellaneous fee, the per-family inclusions",
  },
  packageSheet: {
    title: "COMPLETE MEMORIAL PACKAGE.jpg",
    covers: "the plan's five tiers × four payment modes (the catalogue sells the monthly mode)",
  },
  lotSheet: {
    title: "PRICE LIST FOR 2026.pdf — LOT ONLY block",
    covers: "the five lot families with their own areas (regular selling prices)",
  },
} as const;

export type ClientPriceDocumentId = keyof typeof CLIENT_PRICE_DOCUMENTS;

/** One sellable catalogue entry's provenance: document + sheet section + figure. */
export type CatalogPriceSource = {
  sku: string;
  document: ClientPriceDocumentId;
  /** The sheet's own section/label the figure sits under. */
  section: string;
  /** The figure the sheet prints, in the catalogue's minor units (centavos). */
  cents: number;
};

/**
 * Every sellable catalogue entry, derived from the client's sheets. The list is
 * built from `lib/villa-pricing.ts`, never typed: add a sheet row there and the
 * map (and its contract test) grow with it.
 */
export function catalogPriceSources(): CatalogPriceSource[] {
  const sources: CatalogPriceSource[] = [];

  // sheet A · "If they will not get the package" — the five a-la-carte fees.
  for (const fee of ALACARTE_SERVICE_FEES) {
    const sku = ALACARTE_SKUS[fee.service];
    if (!sku) throw new Error(`No catalogue SKU for the a-la-carte line "${fee.service}".`);
    sources.push({
      sku,
      document: "sheetA",
      section: `If they will not get the package · ${fee.service}`,
      cents: fee.amount * 100,
    });
  }

  // sheet A · the embalming day table (3–9 days) and the ">9 +1500/day" line.
  for (const rate of EMBALMING_RATES) {
    sources.push({
      sku: embalmingDaySku(rate.days),
      document: "sheetA",
      section: `Embalming · ${rate.days} days`,
      cents: rate.amount * 100,
    });
  }
  sources.push({
    sku: EMBALMING_EXTRA_DAY_SKU,
    document: "sheetA",
    section: "Embalming · beyond 9 days (+1,500 / day)",
    cents: EMBALMING_PER_DAY_BEYOND_9 * 100,
  });

  // sheet A · "For package" — one entry per casket model, at REGULAR SRP.
  for (const model of CASKET_MODELS) {
    sources.push({
      sku: coffinSku(model.model),
      document: "sheetA",
      section: `For package · ${model.model} (REGULAR SRP)`,
      cents: model.srp * 100,
    });
  }

  // sheet III · chapel use only, per day (common 1,500 / private 3,500).
  sources.push({
    sku: CHAPEL_SKUS.common,
    document: "sheetIII",
    section: "If the service is not with us · chapel use only · common chapel / day",
    cents: CHAPEL_RATES[0].common.ratePerDay * 100,
  });
  sources.push({
    sku: CHAPEL_SKUS.private,
    document: "sheetIII",
    section: "If the service is not with us · chapel use only · private chapel / day",
    cents: CHAPEL_RATES[0].private.ratePerDay * 100,
  });

  // package sheet · the monthly amortization of each tier the catalogue carries.
  for (const tier of PLAN_TIERS) {
    const sku = planTierPackageSku(tier.id);
    if (!sku) continue; // tiers without a cart SKU go through the request path
    sources.push({
      sku,
      document: "packageSheet",
      section: `Payment mode · Monthly · ${tier.name}`,
      cents: planRate(tier.id, "monthly") * 100,
    });
  }

  return sources;
}

/** The source record for a catalogue SKU, or undefined when none is recorded. */
export function catalogPriceSource(sku: string): CatalogPriceSource | undefined {
  const wanted = sku.trim().toUpperCase();
  return catalogPriceSources().find((source) => source.sku.toUpperCase() === wanted);
}

/**
 * Catalogue items WITHDRAWN for having no 2026 client source. They are recorded
 * here (not in the fixture) so the platform-parity track can see exactly which
 * SKUs left and why, and so the contract test fails if one reappears in the
 * recorded catalogue without a client document behind it.
 */
export type WithdrawnCatalogItem = {
  sku: string;
  name: string;
  /** The upstream platform seed's placeholder amount, in centavos. */
  upstreamCents: number;
  /** Why it left the sellable catalogue. */
  reason: string;
  /** Where a family is told to go instead. */
  officeState: string;
};

export const WITHDRAWN_CATALOG_ITEMS: ReadonlyArray<WithdrawnCatalogItem> = [
  {
    sku: "SRV-LIGHTS",
    name: "Lights & Sound Setup",
    upstreamCents: 60000,
    reason:
      "named on the client's 2025 service contract (a “Lights” line, amount blank) but no client document prices it, and sheet A's own Viewing equipment fee (₱4,500) already covers lights, curtains and carpets — selling it would publish an invented figure and double-bill a sourced line",
    officeState: "ask the office — the set-up is arranged with the service",
  },
  {
    sku: "ADD-COFFIN-LIZO-SR",
    name: "Casket Upgrade: Lizo SR",
    upstreamCents: 85000,
    reason:
      "the 2025 service contract names Lizo ____JR / ____SR (amount blank) but no client document prices either, and sheet A's “For package” catalogue prices the 24 sellable models (Lumina … Imperial Flexi) with no Lizo among them",
    officeState: "choose a casket from the 2026 catalogue, or ask the office",
  },
  {
    sku: "ADD-FLOWERS",
    name: "Flower Arrangement Set",
    upstreamCents: 25000,
    reason:
      "no client document prices a flower set — the package sheet prints flowers as FREE with every package",
    officeState: "included with a package; ask the office for anything more",
  },
  {
    sku: "ADD-URN",
    name: "Keepsake Urn",
    upstreamCents: 18000,
    reason:
      "the client's urn set-ups are photographed but no client document prices one, so no publishable figure exists",
    officeState: "ask the office — urn set-ups are quoted per family",
  },
];

/** The withdrawn SKUs, for the catalogue contract test's absence check. */
export const WITHDRAWN_CATALOG_SKUS: ReadonlyArray<string> = WITHDRAWN_CATALOG_ITEMS.map(
  (item) => item.sku,
);

/* ============================ lot prices ============================ */

/**
 * The 2026 lot sheet prices lots by FAMILY, with the family's own area — never
 * per plot. The demo lots carry the family of their park section, the same
 * section ↔ legend mapping the park fixtures use (lib/park-types.ts and the
 * parks fixture's provenance: A PRIMARY LOTS, B PREMIUM LOTS, C GARDEN NICHES,
 * D MAUSOLEUM). The sheet, the landing rails and the purchase form's
 * classification call the primary family "Prime Lots"/"Lawn Lot Prime".
 */
export const LOT_FAMILY_BY_SECTION: Readonly<Record<string, string>> = {
  A: "Prime Lots",
  B: "Premium Lots",
  C: "Garden Niches",
  D: "Mausoleum",
};

export type LotPriceSource = {
  document: ClientPriceDocumentId;
  section: string;
  family: string;
  area: number;
  /** The family's regular selling price, in centavos. */
  cents: number;
};

/** The lot-only category of the recorded seed (the sheet's first block). */
const LOT_ONLY = SEED_PRICING.lotCategories.find((category) => category.caption === "Lot only");

/**
 * The sheet's family figure for a park section, or undefined when the section
 * has no family on the sheet.
 */
export function lotPriceSource(section: string): LotPriceSource | undefined {
  const family = LOT_FAMILY_BY_SECTION[section.trim().toUpperCase()];
  if (!family || !LOT_ONLY) return undefined;
  const row = LOT_ONLY.rows.find((candidate) => candidate.product === family);
  if (!row) return undefined;
  return {
    document: "lotSheet",
    section: `LOT ONLY · ${family}`,
    family,
    area: row.area,
    cents: row.regular.selling * 100,
  };
}

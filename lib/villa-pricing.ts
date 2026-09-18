/**
 * Villa Memorial — real 2026 public product & price content (as provided).
 * Display content only; storefront CHECKOUT continues to run on the frozen
 * commerce contract items (this data never drives cart math).
 *
 * Provenance — every figure in this module is transcribed from the client's own
 * 2026 sheets (`/home/gab/firstmate/data/villa-memorial-media-originals/`, also
 * rasterised under public/media/doc-*.jpg), never from memory or a brochure:
 *
 *  · "2026 price FV website A.pdf" — byte-identical (md5 4673379394…) to
 *    "PRICE LIST FOR 2026 II.pdf". Carries: "If they will not get the package"
 *    (embalming per day + the five a-la-carte fees), "For package" (the casket
 *    catalogue with SRP / senior discount / discounted price).
 *  · "PRICE LIST FOR 2026 III.pdf" — chapel-use-only rates (common & private,
 *    regular & senior, 3–9 days), the ₱1,000 miscellaneous-fee note, and the
 *    per-casket-family inclusion rows (flowers, tarp, lapida, family car,
 *    1 doz roses, thank-you card, common/private chapel day rate).
 *  · "PRICE LIST FOR 2026.jpg" — the four lot-price families. Since the pricing
 *    store phase these are NOT constants here: the plan tables and the lot
 *    families live in `lib/fixtures/commerce/pricing.json` and are editable
 *    from /staff/plans and /staff/pricing. Public surfaces read the CURRENT
 *    document through `lib/api-client/pricing.ts`; the exports below are the
 *    RECORDED SEED for static consumers and tests.
 *  · "COMPLETE MEMORIAL PACKAGE.jpg" — the plan's standard payment-mode table
 *    + CASH_ASSISTANCE, VMP_ELIGIBILITY, VMP_NOTES.
 *  · "TYPES OF COFFIN.jpg" — the senior payment-mode table + SENIOR_TERMS, the
 *    coffin tier photography/descriptions and the substitution note.
 *
 * tests/unit/villa-pricing.test.ts pins every one of those figures (including
 * the ones now in the fixture), so a future transcription slip cannot ship.
 */
import pricingSeedFile from "@/lib/fixtures/commerce/pricing.json";
import {
  assertPricingDocument,
  lotCategoryFromPriceOf,
  planRateOf,
  planTermOptionsOf,
  PLAN_TERM_DEFS,
  type LotCategory,
  type PaymentRow,
  type PricingDocument,
} from "@/lib/pricing-model";

export type { LotCategory, LotPriceRow, PaymentRow } from "@/lib/pricing-model";

/** Villa Memorial Plan tiers, in the client's order (bronze → gold). */
export type PlanTier = "bronze1" | "bronze2" | "silver1" | "silver2" | "gold";

/** Payment modes a planholder may choose (the reference page's term selector). */
export type PlanTerm = "monthly" | "quarterly" | "semi" | "annual";

export const PLAN_TIERS: ReadonlyArray<{ id: PlanTier; name: string }> = [
  { id: "bronze1", name: "Bronze 1" },
  { id: "bronze2", name: "Bronze 2" },
  { id: "silver1", name: "Silver 1" },
  { id: "silver2", name: "Silver 2" },
  { id: "gold", name: "Gold" },
];

/**
 * The four plan terms exactly as the client's payment-mode sheets name them —
 * the ONE definition, shared with the pricing store's validator
 * (`lib/pricing-model.ts`). `paymentsPerYear` documents the arithmetic
 * invariant the tables must keep (monthly × 12 = quarterly × 4 = semi-annual ×
 * 2 = annual); an office edit that breaks it is refused by the store, and a
 * transcription slip can never ship unnoticed.
 */
export { PLAN_TERM_DEFS as PLAN_TERMS };

/* ===========================================================================
 * RECORDED PRICING SEED — plan tables + lot families
 *
 * These used to be constants here. They now live in the fixture store
 * (`lib/fixtures/commerce/pricing.json`) so the office can edit them without a
 * developer. The exports below are the RECORDED SEED (the client's own 2026
 * sheets) kept for STATIC consumers — the staff pickers, the agent lot cards
 * and the tests that pin the sheet — NOT the value a public page must print:
 * public surfaces read the CURRENT document through
 * `loadPricingDocument()` (lib/api-client/pricing.ts) and derive every figure
 * with `planRateOf` / `lotCategoryFromPriceOf`.
 * ========================================================================= */

/**
 * The validated recorded seed document (plan tables + lot families). Exported
 * for tests and static consumers — public pages read the store.
 */
export const SEED_PRICING: PricingDocument = assertPricingDocument(pricingSeedFile);

/** The plan's standard payment-mode table (COMPLETE MEMORIAL PACKAGE sheet) — recorded seed. */
export const VMP_PAYMENTS: PaymentRow[] = SEED_PRICING.plans.regular;

/** The senior-citizen payment-mode table (TYPES OF COFFIN sheet) — recorded seed. */
export const SENIOR_PAYMENTS: PaymentRow[] = SEED_PRICING.plans.senior;

/** The four lot families (PRICE LIST FOR 2026) — recorded seed. */
export const LOT_PRICE_CATEGORIES: LotCategory[] = SEED_PRICING.lotCategories;

/**
 * The client's TYPES OF COFFIN sheet — the five tiers with their photography.
 * The `lid` line is the sheet's own sentence for that tier (Bronze 2, Silver 2
 * and Gold come with a FULL glass lid; only Bronze 1 and Silver 1 are
 * half-glass), pinned by tests/unit/villa-pricing.test.ts because an earlier
 * transcription had Bronze 2 published as half-glass.
 */
export const COFFINS = [
  { tier: "Bronze 1", photo: "/media/bronze-casket.jpg", lid: "Half-glass lid", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors." },
  { tier: "Bronze 2", photo: "/media/bronze-casket.jpg", lid: "Full glass lid", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors." },
  { tier: "Silver 1", photo: "/media/silver-casket.jpg", lid: "Half-glass lid", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors. Slightly bigger than Bronze and more elegant." },
  { tier: "Silver 2", photo: "/media/silver-casket.jpg", lid: "Full glass lid (cover convertible to full-glass or half-glass)", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors. Slightly bigger than Bronze and more elegant; cover convertible to full-glass or half-glass." },
  { tier: "Gold", photo: "/media/gold-casket.jpg", lid: "Full-glass lid (cover can be full-glass or half-glass)", description: "Special metal coffin with smooth finish, classy handles and beautiful interiors. More stylish and sophisticated; cover can be full-glass or half-glass." },
] as const;

/**
 * The client's substitution note, printed under the tier photography on the
 * TYPES OF COFFIN sheet. Published with the photos on /products and beside each
 * casket detail view's sample photograph.
 */
export const COFFIN_TIER_NOTE =
  "Illustration purposes only. In case the coffin is not available, we will provide another with equal or greater value.";

/**
 * The cover/lid a model's own sheet name states, with the sheet's lid line for
 * that cover.
 *
 * PROVISIONAL derivation, not a printed sheet row: the sheet describes lids per
 * SAMPLE coffin (Bronze 1 half-glass … Gold convertible) and names the 24
 * catalogue models by cover variant, stepping the price up ₱10,000 per variant
 * (Half → Full → Full Split → Flexi) exactly as its cover ladder does. The line
 * below is therefore the variant the model's own name states; the exact cover a
 * family receives is still confirmed by the office. Open client question —
 * flagged in AGENTS.md and the casket-catalogue PR.
 */
export const COFFIN_COVERS: ReadonlyArray<{ variant: string; lid: string }> = [
  { variant: "Full Split", lid: "Full glass lid, split cover" },
  { variant: "Flexi", lid: "Full glass lid, cover convertible to full-glass or half-glass" },
  { variant: "Full", lid: "Full glass lid" },
  { variant: "Half", lid: "Half-glass lid" },
];

/**
 * The lid line for a model, or undefined when its name states no cover (Lumina)
 * — the view then says the cover is confirmed by the office rather than
 * inventing one (COFFIN_COVER_UNSTATED).
 */
export function coffinCover(model: string): string | undefined {
  return COFFIN_COVERS.find((c) => model.trim().endsWith(c.variant))?.lid;
}

/** Shown for a model whose sheet name states no cover. */
export const COFFIN_COVER_UNSTATED =
  "The 2026 sheet names no cover for this model — its sample coffins are photographed with half-glass and full-glass lids, and the office confirms the exact cover.";

export const SENIOR_TERMS = [
  "Must be 61–100 years old",
  "Senior citizens have no insurance benefit",
  "Pay-the-balance arrangement",
  "With FREE flowers",
  "With complete memorial package",
  "Transferable / assignable (terms apply)",
];

export const CASH_ASSISTANCE = [
  { tiers: "Bronze 1 & 2", amount: 10000 },
  { tiers: "Silver 1 & 2", amount: 20000 },
  { tiers: "Gold", amount: 30000 },
];

export const VMP_PACKAGE = [
  { service: "Retrieval & delivery", detail: "Retrieval of the deceased to the morgue and delivery of the same in casket. Good for the first 25 kms only." },
  // Embalming is INCLUDED in the package with no fixed day count: the client's
  // "2026 price FV website A" (byte-identical to PRICE LIST FOR 2026 II) prices
  // embalming per day (3 days 6,000 … 9 days 15,000, +1,500/day beyond) and
  // states that table applies only when the family does NOT take a package.
  // There is no 1-day option in the list — never state a day count here.
  { service: "Preparation & casketing", detail: "Embalming with make-up and dressing. The type of coffin differs with the plan." },
  { service: "Viewing equipment", detail: "State-of-the-Art and classy equipment which includes lights, curtains and carpets." },
  { service: "Interment", detail: "Several cars will be ready and bring the deceased to its final destination." },
];

export const VMP_ELIGIBILITY = ["Age 1–60 years old", "In good health", "Resident of the Philippines"];

export const VMP_NOTES = {
  contestability: "Inception date is 30 days after payment. Contestability period is 7 months after payment.",
  assign: "The plan is assignable and transferable to anyone. Transfer/assignment fee is ₱1,000.",
  extras: "All packages include FREE flowers and a tarpaulin.",
  serving:
    "Served by Funeraria Villa & ZC-Arcega Funeral Homes, underwritten by Villa Agency Insurance Services. Affiliated parlors: Funeraria Villa – Capilla de San Jose, Isabela City, Basilan · Funeraria Villa – National Highway, Brgy. Salvacion, Panabo City · Villa ZC-Arcega Funeral Homes – Zamboanga City · all Villa-affiliated funeral parlors around Mindanao.",
  adjust: "Amortization can be adjusted to 8 years and 10 years.",
};

/**
 * One lot family's entry-level “from” figures (the recorded seed). Same shape
 * and rules as `lotCategoryFromPriceOf` in lib/pricing-model.ts — this wrapper
 * exists for STATIC surfaces and tests; a public page reads the current
 * document's categories and calls the model function directly.
 */
export function lotCategoryFromPrice(categoryTitle: string): {
  category: { title: string; caption: string };
  /** The row the "from" figure belongs to (the family's cheapest product). */
  product: string;
  selling: number;
  monthly: number;
} | null {
  return lotCategoryFromPriceOf(LOT_PRICE_CATEGORIES, categoryTitle);
}

export function php(n: number): string {
  return "₱" + n.toLocaleString("en-PH");
}

/** Pesos with centavos — the plan price display (₱600.00 / month). */
export function php2(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * The RECORDED SEED plan rate — kept for STATIC surfaces (the landing picker)
 * and tests. A public page must read the current document
 * (`loadPricingDocument()`) and call `planRateOf` so an office edit is what the
 * visitor sees.
 */
export function planRate(tier: PlanTier, term: PlanTerm, senior = false): number {
  return planRateOf(SEED_PRICING.plans, tier, term, senior);
}

/** The four terms a given tier can be paid in — recorded seed (see planRate). */
export function planTermOptions(tier: PlanTier, senior = false): Array<{ term: PlanTerm; label: string; per: string; amount: number }> {
  return planTermOptionsOf(SEED_PRICING.plans, tier, senior);
}

/** All five inclusions shown on the package page (client's COMPLETE MEMORIAL
 * PACKAGE sheet: the four service blocks + the free flowers/tarpaulin block). */
export const VMP_INCLUSIONS: Array<{ service: string; detail: string }> = [
  ...VMP_PACKAGE,
  {
    service: "Free flowers and tarpaulin",
    detail: "Free! flowers and tarpaulin are included with the complete memorial package.",
  },
] as const;

/* ===========================================================================
 * 2026 CASKET CATALOGUE — "2026 price FV website A" (= "PRICE LIST FOR 2026
 * II"), section "For package". One row per casket the client sells, with the
 * regular SRP, the senior-citizen SRP and the senior discount printed against
 * it, and the discounted price that results. Rendered on /products.
 * ========================================================================= */

/** The casket families sheet III prints one inclusion row for. */
export type CasketFamily =
  | "Lumina"
  | "White Rose"
  | "Angelica"
  | "Magnolia"
  | "Noble"
  | "Royal"
  | "Monarch"
  | "Majesty"
  | "Emperor"
  | "Imperial";

export type CasketModel = {
  /** The collection header the sheet groups the model under. */
  collection: string;
  /** Sheet III's inclusion row for this model. */
  family: CasketFamily;
  /** Model name exactly as printed ("White Rose Half", "Majesty Flexi"). */
  model: string;
  /** Regular SRP. The sheet prints the same amount in the senior SRP column. */
  srp: number;
  /** Senior-citizen discount, printed as an amount (20% of SRP on every row). */
  seniorDiscount: number;
  /** Senior-citizen discounted price (srp − seniorDiscount). */
  seniorPrice: number;
};

export const CASKET_MODELS: ReadonlyArray<CasketModel> = [
  { collection: "Lumina", family: "Lumina", model: "Lumina", srp: 33000, seniorDiscount: 6600, seniorPrice: 26400 },
  { collection: "The White Rose Collection", family: "White Rose", model: "White Rose Half", srp: 62000, seniorDiscount: 12400, seniorPrice: 49600 },
  { collection: "The White Rose Collection", family: "White Rose", model: "White Rose Full", srp: 68000, seniorDiscount: 13600, seniorPrice: 54400 },
  { collection: "The White Rose Collection", family: "Angelica", model: "Angelica Half", srp: 65000, seniorDiscount: 13000, seniorPrice: 52000 },
  { collection: "The White Rose Collection", family: "Angelica", model: "Angelica Full", srp: 70000, seniorDiscount: 14000, seniorPrice: 56000 },
  { collection: "The White Rose Collection", family: "Magnolia", model: "Magnolia Half", srp: 70000, seniorDiscount: 14000, seniorPrice: 56000 },
  { collection: "The White Rose Collection", family: "Magnolia", model: "Magnolia Full", srp: 75000, seniorDiscount: 15000, seniorPrice: 60000 },
  { collection: "The Crown Collection", family: "Noble", model: "Noble Half", srp: 80000, seniorDiscount: 16000, seniorPrice: 64000 },
  { collection: "The Crown Collection", family: "Noble", model: "Noble Full", srp: 90000, seniorDiscount: 18000, seniorPrice: 72000 },
  { collection: "The Crown Collection", family: "Noble", model: "Noble Full Split", srp: 95000, seniorDiscount: 19000, seniorPrice: 76000 },
  { collection: "The Crown Collection", family: "Royal", model: "Royal Half", srp: 85000, seniorDiscount: 17000, seniorPrice: 68000 },
  { collection: "The Crown Collection", family: "Royal", model: "Royal Full", srp: 95000, seniorDiscount: 19000, seniorPrice: 76000 },
  { collection: "The Crown Collection", family: "Royal", model: "Royal Full Split", srp: 100000, seniorDiscount: 20000, seniorPrice: 80000 },
  { collection: "The Crown Collection", family: "Monarch", model: "Monarch Half", srp: 100000, seniorDiscount: 20000, seniorPrice: 80000 },
  { collection: "The Crown Collection", family: "Monarch", model: "Monarch Full", srp: 110000, seniorDiscount: 22000, seniorPrice: 88000 },
  { collection: "The Dynasty Collection", family: "Majesty", model: "Majesty Full", srp: 120000, seniorDiscount: 24000, seniorPrice: 96000 },
  { collection: "The Dynasty Collection", family: "Majesty", model: "Majesty Full Split", srp: 130000, seniorDiscount: 26000, seniorPrice: 104000 },
  { collection: "The Dynasty Collection", family: "Majesty", model: "Majesty Flexi", srp: 140000, seniorDiscount: 28000, seniorPrice: 112000 },
  { collection: "The Dynasty Collection", family: "Emperor", model: "Emperor Full", srp: 130000, seniorDiscount: 26000, seniorPrice: 104000 },
  { collection: "The Dynasty Collection", family: "Emperor", model: "Emperor Full Split", srp: 140000, seniorDiscount: 28000, seniorPrice: 112000 },
  { collection: "The Dynasty Collection", family: "Emperor", model: "Emperor Flexi", srp: 150000, seniorDiscount: 30000, seniorPrice: 120000 },
  { collection: "The Dynasty Collection", family: "Imperial", model: "Imperial Full", srp: 140000, seniorDiscount: 28000, seniorPrice: 112000 },
  { collection: "The Dynasty Collection", family: "Imperial", model: "Imperial Full Split", srp: 150000, seniorDiscount: 30000, seniorPrice: 120000 },
  { collection: "The Dynasty Collection", family: "Imperial", model: "Imperial Flexi", srp: 160000, seniorDiscount: 32000, seniorPrice: 128000 },
];

/** The sheet's collection headers, in the order it prints them. */
export const CASKET_COLLECTIONS: ReadonlyArray<string> = CASKET_MODELS.reduce<string[]>(
  (acc, m) => (acc.includes(m.collection) ? acc : [...acc, m.collection]),
  [],
);

/* ===========================================================================
 * "PRICE LIST FOR 2026 III" — the per-family inclusion rows: which of
 * flowers / tarp / lapida / family car / 1 doz roses / thank-you card come
 * with the casket, and the package's own common/private chapel day rate.
 * ========================================================================= */

export type CasketInclusion = {
  family: CasketFamily;
  flowers: boolean;
  tarp: boolean;
  lapida: boolean;
  familyCar: boolean;
  dozenRoses: boolean;
  thankYouCard: boolean;
  /** Package rate per day for the common chapel (sheet prints 1500/DAY). */
  commonChapelPerDay: number;
  /** Package rate per day for the private chapel (sheet prints 3000/DAY). */
  privateChapelPerDay: number;
  /** The sheet marks Lumina's private-chapel rate "*Discounted Price". */
  privateChapelDiscounted: boolean;
};

/** The six YES/NO inclusion columns, in the sheet's left-to-right order. */
export type CasketInclusionKey =
  | "flowers"
  | "tarp"
  | "lapida"
  | "familyCar"
  | "dozenRoses"
  | "thankYouCard";

export const CASKET_INCLUSION_COLUMNS: ReadonlyArray<{
  key: CasketInclusionKey;
  label: string;
}> = [
  { key: "flowers", label: "Flowers" },
  { key: "tarp", label: "Tarp" },
  { key: "lapida", label: "Lapida" },
  { key: "familyCar", label: "Family car" },
  { key: "dozenRoses", label: "1 doz roses" },
  { key: "thankYouCard", label: "Thank you card" },
];

function inclusion(family: CasketFamily, yes: ReadonlyArray<CasketInclusionKey>): CasketInclusion {
  return {
    family,
    flowers: yes.includes("flowers"),
    tarp: yes.includes("tarp"),
    lapida: yes.includes("lapida"),
    familyCar: yes.includes("familyCar"),
    dozenRoses: yes.includes("dozenRoses"),
    thankYouCard: yes.includes("thankYouCard"),
    commonChapelPerDay: 1500,
    privateChapelPerDay: 3000,
    privateChapelDiscounted: family === "Lumina",
  };
}

/** The three inclusions every family above Lumina carries. */
const LAPIDA_ETC = ["flowers", "tarp", "lapida"] as const;

export const CASKET_INCLUSIONS: ReadonlyArray<CasketInclusion> = [
  inclusion("Lumina", []),
  inclusion("White Rose", LAPIDA_ETC),
  inclusion("Angelica", LAPIDA_ETC),
  inclusion("Magnolia", LAPIDA_ETC),
  inclusion("Noble", [...LAPIDA_ETC, "dozenRoses", "thankYouCard"]),
  inclusion("Royal", [...LAPIDA_ETC, "dozenRoses", "thankYouCard"]),
  inclusion("Monarch", [...LAPIDA_ETC, "dozenRoses", "thankYouCard"]),
  inclusion("Majesty", [...LAPIDA_ETC, "familyCar", "dozenRoses", "thankYouCard"]),
  inclusion("Emperor", [...LAPIDA_ETC, "familyCar", "dozenRoses", "thankYouCard"]),
  inclusion("Imperial", [...LAPIDA_ETC, "familyCar", "dozenRoses", "thankYouCard"]),
];

/** Sheet III's own footnotes to the inclusion table. */
export const CASKET_INCLUSION_NOTES = {
  miscFee:
    "Note: PhP 1,000 is added as miscellaneous fee to cover for any incidental expense. Add this to the rates.",
  discountedPrice: "* Discounted price (printed against Lumina's private-chapel rate).",
};

/* ===========================================================================
 * "2026 price FV website A" top block — "If they will not get the package".
 * The a-la-carte prices, charged when a family does NOT take a package (the
 * same scope the package pages state for embalming). Rendered on /services.
 * ========================================================================= */

export const EMBALMING_RATES: ReadonlyArray<{ days: number; amount: number }> = [
  { days: 3, amount: 6000 },
  { days: 4, amount: 7500 },
  { days: 5, amount: 9000 },
  { days: 6, amount: 10500 },
  { days: 7, amount: 12000 },
  { days: 8, amount: 13500 },
  { days: 9, amount: 15000 },
];

/** Beyond nine days the sheet adds ₱1,500 per extra day (">9 +1500 /day"). */
export const EMBALMING_PER_DAY_BEYOND_9 = 1500;

export const ALACARTE_SERVICE_FEES: ReadonlyArray<{ service: string; amount: number }> = [
  { service: "Retrieval", amount: 2500 },
  { service: "Delivery", amount: 2500 },
  { service: "Viewing equipment", amount: 4500 },
  { service: "ORD coffin", amount: 5000 },
  { service: "Interment", amount: 5000 },
];

/**
 * The sheet's own bottom-line figure under the five fees above (₱19,500). It is
 * printed unlabelled; tests/unit/villa-pricing.test.ts asserts it stays the
 * exact sum of ALACARTE_SERVICE_FEES so the two can never disagree publicly.
 */
export const ALACARTE_SERVICE_TOTAL = 19500;

/** The sheet heads this block exactly this way — the rates' own scope. */
export const ALACARTE_SCOPE = "If they will not get the package:";

/** The sheet's label for what the package price already covers. */
export const PACKAGE_SCOPE = "For package:";

/* ===========================================================================
 * "PRICE LIST FOR 2026 III" — chapel use rates when the service is not with
 * Villa ("If the service is not with us, chapel use only"): per-day rate, the
 * 3–9 day total, and the senior-citizen total. Rendered on /services.
 * ========================================================================= */

export type ChapelRateRow = {
  days: number;
  common: { ratePerDay: number; regular: number; senior: number };
  private: { ratePerDay: number; regular: number; senior: number };
};

export const CHAPEL_RATES: ReadonlyArray<ChapelRateRow> = [
  { days: 3, common: { ratePerDay: 1500, regular: 4500, senior: 4320 }, private: { ratePerDay: 3500, regular: 10500, senior: 10080 } },
  { days: 4, common: { ratePerDay: 1500, regular: 6000, senior: 5760 }, private: { ratePerDay: 3500, regular: 14000, senior: 13440 } },
  { days: 5, common: { ratePerDay: 1500, regular: 7500, senior: 7200 }, private: { ratePerDay: 3500, regular: 17500, senior: 16800 } },
  { days: 6, common: { ratePerDay: 1500, regular: 9000, senior: 8640 }, private: { ratePerDay: 3500, regular: 21000, senior: 20160 } },
  { days: 7, common: { ratePerDay: 1500, regular: 10500, senior: 10080 }, private: { ratePerDay: 3500, regular: 24500, senior: 23520 } },
  { days: 8, common: { ratePerDay: 1500, regular: 12000, senior: 11520 }, private: { ratePerDay: 3500, regular: 28000, senior: 26880 } },
  { days: 9, common: { ratePerDay: 1500, regular: 13500, senior: 12960 }, private: { ratePerDay: 3500, regular: 31500, senior: 30240 } },
];

/**
 * Sheet III's chapel footnotes. Every figure and condition the sheet prints is
 * kept; the wording is compressed to the page's reading budget (captain
 * 2026-09-18) — the full sheet sentences live in the repo docs, not on the
 * customer page.
 */
export const CHAPEL_NOTES = {
  scope: "If the service is not with us: chapel use only.",
  miscFee: "₱1,000 miscellaneous fee is added to every rate.",
  seniorPerDay: "Sheet footnote: senior rate is ₱1,800/day common, ₱4,200/day private.",
  privateChapelOnly: "Chapel only: ₱700 groceries, 3-day minimum.",
};

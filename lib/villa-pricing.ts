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
 *  · "PRICE LIST FOR 2026.jpg" — LOT_PRICE_CATEGORIES (four families, 6-year
 *    amortization, regular + senior).
 *  · "COMPLETE MEMORIAL PACKAGE.jpg" — VMP_PAYMENTS, CASH_ASSISTANCE,
 *    VMP_ELIGIBILITY, VMP_NOTES (the plan's standard table).
 *  · "TYPES OF COFFIN.jpg" — SENIOR_PAYMENTS, SENIOR_TERMS, the coffin tier
 *    photography/descriptions and the equal-or-greater-value substitution note.
 *
 * tests/unit/villa-pricing.test.ts pins every one of those figures, so a future
 * transcription slip cannot ship; this module is the only place a public price
 * may live.
 */

export type PaymentRow = { mode: string; bronze1: number; bronze2: number; silver1: number; silver2: number; gold: number };

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
 * The four plan terms exactly as the client's payment-mode sheets name them.
 * `paymentsPerYear` documents the arithmetic invariant the tables must keep
 * (monthly × 12 = quarterly × 4 = semi-annual × 2 = annual) — asserted in
 * tests/unit/villa-pricing.test.ts so a transcription slip like the former
 * ₱500 Bronze-1 monthly cannot ship unnoticed.
 */
export const PLAN_TERMS: ReadonlyArray<{
  id: PlanTerm;
  label: string;
  mode: PaymentRow["mode"];
  per: string;
  paymentsPerYear: number;
}> = [
  { id: "monthly", label: "Monthly", mode: "Monthly", per: "/ month", paymentsPerYear: 12 },
  { id: "quarterly", label: "Quarterly", mode: "Quarterly", per: "/ quarter", paymentsPerYear: 4 },
  { id: "semi", label: "Semi-Annual", mode: "Semi-annual", per: "/ semi-annual", paymentsPerYear: 2 },
  { id: "annual", label: "Annual", mode: "Annual", per: "/ year", paymentsPerYear: 1 },
];

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

export const SENIOR_PAYMENTS: PaymentRow[] = [
  { mode: "Annual", bronze1: 6600, bronze2: 8400, silver1: 11400, silver2: 13200, gold: 18000 },
  { mode: "Semi-annual", bronze1: 3300, bronze2: 4200, silver1: 5700, silver2: 6600, gold: 9000 },
  { mode: "Quarterly", bronze1: 1650, bronze2: 2100, silver1: 2850, silver2: 3300, gold: 4500 },
  { mode: "Monthly", bronze1: 550, bronze2: 700, silver1: 950, silver2: 1100, gold: 1500 },
];

export const SENIOR_TERMS = [
  "Must be 61–100 years old",
  "Senior citizens have no insurance benefit",
  "Pay-the-balance arrangement",
  "With FREE flowers",
  "With complete memorial package",
  "Transferable / assignable (terms apply)",
];

export const VMP_PAYMENTS: PaymentRow[] = [
  { mode: "Annual", bronze1: 7200, bronze2: 9240, silver1: 12000, silver2: 13440, gold: 18240 },
  { mode: "Semi-annual", bronze1: 3600, bronze2: 4620, silver1: 6000, silver2: 6720, gold: 9120 },
  { mode: "Quarterly", bronze1: 1800, bronze2: 2310, silver1: 3000, silver2: 3360, gold: 4560 },
  // Bronze 1 monthly is ₱600 on the client's payment-mode sheet (and on the
  // reference package page): annual 7,200 ÷ 12. It was mis-keyed as 500 here,
  // which published a wrong public price — pinned by tests/unit/villa-pricing.test.ts.
  { mode: "Monthly", bronze1: 600, bronze2: 770, silver1: 1000, silver2: 1120, gold: 1520 },
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

export type LotPriceRow = {
  product: string;
  area: number;
  regular: { selling: number; annual: number; semi: number; quarter: number; monthly: number };
  senior: { selling: number; annual: number; semi: number; quarter: number; monthly: number };
};

function row(product: string, area: number, r: [number, number, number, number, number], s: [number, number, number, number, number]): LotPriceRow {
  return {
    product,
    area,
    regular: { selling: r[0], annual: r[1], semi: r[2], quarter: r[3], monthly: r[4] },
    senior: { selling: s[0], annual: s[1], semi: s[2], quarter: s[3], monthly: s[4] },
  };
}

export const LOT_PRICE_CATEGORIES: Array<{ title: string; caption: string; rows: LotPriceRow[] }> = [
  {
    title: "1. Lot Only",
    // `caption` = the family name as printed on the 2026 sheet (the package
    // page's price module renders the prototype's table captions exactly).
    caption: "Lot only",
    rows: [
      row("Mausoleum", 24, [1073000, 178833, 92993, 48285, 16095], [924462, 154077, 80120, 41601, 13867]),
      row("Garden Niches", 12, [567000, 94500, 49140, 25515, 8505], [491400, 81900, 42588, 22113, 7371]),
      row("Prime Lots", 2.5, [128000, 21333, 11093, 5760, 1920], [112521, 18753, 9752, 5063, 1688]),
      row("Premium Lots", 2.5, [114000, 19000, 9880, 5130, 1710], [99859, 16643, 8654, 4494, 1498]),
      row("Condo-type", 2.5, [75000, 12500, 6500, 3375, 1125], [64910, 10818, 5626, 2921, 974]),
    ],
  },
  {
    title: "2. Lot + Interment (1st Burial Only)",
    caption: "Lot + interment (1st burial only)",
    rows: [
      row("Mausoleum", 24, [1106000, 184333, 95853, 49770, 16590], [951054, 158509, 82425, 42797, 14266]),
      row("Garden Niches", 12, [600000, 100000, 52000, 27000, 9000], [517992, 86332, 44893, 23310, 7770]),
      row("Prime Lots", 2.5, [161000, 26833, 13953, 7245, 2415], [139113, 23185, 12056, 6260, 2087]),
      row("Premium Lots", 2.5, [147000, 24500, 12740, 6615, 2205], [126451, 21075, 10959, 5690, 1897]),
      row("Condo-type", 2.5, [97000, 16167, 8407, 4365, 1455], [82638, 13773, 7162, 3719, 1240]),
    ],
  },
  {
    title: "3. Lot + Interment + VMP",
    caption: "Lot + interment + VMP",
    rows: [
      row("Mausoleum", 24, [1135000, 189167, 98367, 50129, 17025], [979854, 163309, 84921, 44093, 14698]),
      row("Garden Niches", 12, [629000, 104833, 54513, 27781, 9435], [546792, 91132, 47389, 24606, 8202]),
      row("Prime Lots", 2.5, [190000, 31667, 16467, 8392, 2850], [167913, 27985, 14552, 7556, 2519]),
      row("Premium Lots", 2.5, [176000, 29333, 15253, 7773, 2640], [155251, 25875, 13455, 6986, 2329]),
      row("Condo-type", 2.5, [126000, 21000, 10920, 5565, 1890], [111438, 18573, 9658, 5015, 1672]),
    ],
  },
  {
    title: "4. Mausoleum + Construction",
    caption: "Mausoleum + construction",
    rows: [
      row("Mausoleum + Construction", 24, [1573000, 262167, 136327, 70785, 23595], [1258400, 209733, 109061, 56628, 18876]),
      row("Mausoleum + Construction + 1st Interment", 24, [1607000, 267833, 139273, 72315, 24105], [1285600, 214267, 111419, 57852, 19284]),
      row("Mausoleum + Construction + 1st Interment + Life Plan", 24, [1639000, 273167, 142047, 73755, 24585], [1311200, 218533, 113637, 59004, 19668]),
    ],
  },
];

/**
 * One LOT_PRICE_CATEGORIES family's entry-level "from" figures: the lowest
 * regular selling price in that family and that row's matching monthly
 * installment (the client's 6-year amortization). The home page's "Services we
 * offer" cards render "from ₱75,000 · ₱1,125 / month, 6 yrs" through this, so
 * the meta line can never drift from the 2026 sheet (and no view restates an
 * amount). Unknown/absent family → null; the view then omits the meta line.
 */
export function lotCategoryFromPrice(categoryTitle: string): {
  category: { title: string; caption: string };
  /** The row the "from" figure belongs to (the family's cheapest product). */
  product: string;
  selling: number;
  monthly: number;
} | null {
  const category = LOT_PRICE_CATEGORIES.find((c) => c.title === categoryTitle);
  if (!category || category.rows.length === 0) return null;
  const row = category.rows.reduce((min, r) => (r.regular.selling < min.regular.selling ? r : min));
  return {
    category: { title: category.title, caption: category.caption },
    product: row.product,
    selling: row.regular.selling,
    monthly: row.regular.monthly,
  };
}

export function php(n: number): string {
  return "₱" + n.toLocaleString("en-PH");
}

/** Pesos with centavos — the plan price display (₱600.00 / month). */
export function php2(n: number): string {
  return "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * One plan rate: the client's published amount for a tier × term, regular or
 * senior-citizen table. The Plan Term selector reads through this function so
 * prices are never copied into a view.
 */
export function planRate(tier: PlanTier, term: PlanTerm, senior = false): number {
  const def = PLAN_TERMS.find((t) => t.id === term);
  if (!def) throw new Error(`Unknown plan term: ${term}`);
  const rows = senior ? SENIOR_PAYMENTS : VMP_PAYMENTS;
  const row = rows.find((r) => r.mode === def.mode);
  if (!row) throw new Error(`No ${def.mode} row in the ${senior ? "senior" : "standard"} table`);
  return row[tier];
}

/** The four terms a given tier can be paid in, ready for the selector. */
export function planTermOptions(tier: PlanTier, senior = false): Array<{ term: PlanTerm; label: string; per: string; amount: number }> {
  return PLAN_TERMS.map((t) => ({
    term: t.id,
    label: t.label,
    per: t.per,
    amount: planRate(tier, t.id, senior),
  }));
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

/** Sheet III's chapel footnotes — published verbatim beside the table. */
export const CHAPEL_NOTES = {
  scope: "If the service is not with us, chapel use only.",
  miscFee:
    "Note: PhP 1,000 is added as miscellaneous fee to cover for any incidental expense. Add this to the rates.",
  seniorPerDay:
    "Senior Citizen rate is ₱1,800/day for Common Chapel and ₱4,200/day for Private Chapel.",
  privateChapelOnly: "If use of chapel only: ₱700 worth of groceries, minimum of 3 days.",
};

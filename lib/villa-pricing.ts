/**
 * Villa Memorial — real 2026 public product & price content (as provided).
 * Display content only; storefront CHECKOUT continues to run on the frozen
 * commerce contract items (this data never drives cart math).
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

export const COFFINS = [
  { tier: "Bronze 1", photo: "/media/bronze-casket.jpg", lid: "Half-glass lid", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors." },
  { tier: "Bronze 2", photo: "/media/bronze-casket.jpg", lid: "Half-glass lid", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors." },
  { tier: "Silver 1", photo: "/media/silver-casket.jpg", lid: "Half-glass lid", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors. Slightly bigger than Bronze and more elegant." },
  { tier: "Silver 2", photo: "/media/silver-casket.jpg", lid: "Half-glass lid (convertible to full-glass)", description: "Wooden/metal coffin with smooth finish, elegant handles and beautiful interiors. Slightly bigger than Bronze and more elegant; cover convertible to full-glass or half-glass." },
  { tier: "Gold", photo: "/media/gold-casket.jpg", lid: "Full-glass lid (convertible to half-glass)", description: "Special metal coffin with smooth finish, classy handles and beautiful interiors. More stylish and sophisticated; cover can be full-glass or half-glass." },
] as const;

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
  { service: "Retrieval & delivery", detail: "Retrieval of the deceased to the morgue and delivery in casket — good for the first 25 km only." },
  { service: "Preparation & casketing", detail: "7 days of embalming with make-up and dressing; the type of coffin differs per plan." },
  { service: "Viewing equipment", detail: "State-of-the-art, classy equipment including lights, curtains and carpets." },
  { service: "Interment", detail: "Several cars ready to bring the deceased to its final destination." },
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

export const LOT_PRICE_CATEGORIES: Array<{ title: string; rows: LotPriceRow[] }> = [
  {
    title: "1. Lot Only",
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
    rows: [
      row("Mausoleum + Construction", 24, [1573000, 262167, 136327, 70785, 23595], [1258400, 209733, 109061, 56628, 18876]),
      row("Mausoleum + Construction + 1st Interment", 24, [1607000, 267833, 139273, 72315, 24105], [1285600, 214267, 111419, 57852, 19284]),
      row("Mausoleum + Construction + 1st Interment + Life Plan", 24, [1639000, 273167, 142047, 73755, 24585], [1311200, 218533, 113637, 59004, 19668]),
    ],
  },
];

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
    detail: "Flowers and a tarpaulin are included with the complete memorial package.",
  },
] as const;

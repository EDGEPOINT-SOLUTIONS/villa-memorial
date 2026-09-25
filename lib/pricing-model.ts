/**
 * Plan rates + lot prices — the PURE model, its arithmetic invariants and its
 * validators. No IO, no React: the fixture store
 * (`lib/api-client/pricing-store.ts`) validates reads and writes through here,
 * and the public pages render the stored document through the accessors below.
 *
 * Why this module exists (web/AGENTS.md, "never invent a figure"): the 2026 plan
 * tables and lot price list used to be constants inside lib/villa-pricing.ts, so
 * an office edit needed a developer. They now live in the fixture store
 * (`lib/fixtures/commerce/pricing.json`, recorded from the client's own sheets)
 * and every public surface reads the stored document. This module is the one
 * place that says what a *valid* document is:
 *
 *  · plan tables — both the regular (COMPLETE MEMORIAL PACKAGE sheet) and the
 *    senior table (TYPES OF COFFIN sheet) carry the four payment modes exactly
 *    once, every amount is a whole peso, and each tier keeps the schedule's
 *    ratio: annual × 1 = semi-annual × 2 = quarterly × 4 = monthly × 12;
 *  · senior figures must never exceed the regular figure for the same cell, in
 *    either table;
 *  · lot rows carry every term (selling · annual · semi-annual · quarterly ·
 *    monthly) for both tables, whole-peso amounts, and keep the sheet's
 *    six-year amortization: annual × 6 equals the selling price within the
 *    documented peso rounding (LOT_AMORTIZATION_ROUNDING — the client's sheet
 *    prints rounded schedules, e.g. ₱112,521 senior selling vs ₱18,753 × 6);
 *  · names are unique: one row per payment mode in each plan table, and one
 *    category title / product name per lot table (product names may repeat
 *    ACROSS families — the sheet's Mausoleum appears in three — but never
 *    inside one).
 *
 * The invariants are the ones tests/unit/villa-pricing.test.ts has asserted
 * since the ₱500 → ₱600 Bronze-1 defect: a bad edit must be refused by the same
 * rule the test pins, not quietly published.
 */

import { ApiError } from "@/lib/api-client/api-error";

/* ------------------------------- plan model ------------------------------- */

export type PlanTier = "bronze1" | "bronze2" | "silver1" | "silver2" | "gold";

/** The five tiers, in the client's order (bronze → gold). */
export const PLAN_TIER_IDS: ReadonlyArray<PlanTier> = [
  "bronze1",
  "bronze2",
  "silver1",
  "silver2",
  "gold",
];

export type PlanTerm = "monthly" | "quarterly" | "semi" | "annual";

/**
 * The four payment terms exactly as the client's sheets name them, with the
 * arithmetic ratio each must keep (`paymentsPerYear`). This is the ONE term
 * definition: lib/villa-pricing.ts re-exports it as PLAN_TERMS.
 */
export const PLAN_TERM_DEFS: ReadonlyArray<{
  id: PlanTerm;
  label: string;
  /** The row label the client's tables print. */
  mode: string;
  per: string;
  paymentsPerYear: number;
}> = [
  { id: "monthly", label: "Monthly", mode: "Monthly", per: "/ month", paymentsPerYear: 12 },
  { id: "quarterly", label: "Quarterly", mode: "Quarterly", per: "/ quarter", paymentsPerYear: 4 },
  { id: "semi", label: "Semi-Annual", mode: "Semi-annual", per: "/ semi-annual", paymentsPerYear: 2 },
  { id: "annual", label: "Annual", mode: "Annual", per: "/ year", paymentsPerYear: 1 },
];

export type PaymentRow = {
  mode: string;
  bronze1: number;
  bronze2: number;
  silver1: number;
  silver2: number;
  gold: number;
};

export type PlanPricing = {
  /** The standard table (COMPLETE MEMORIAL PACKAGE sheet). */
  regular: PaymentRow[];
  /** The senior-citizen table (TYPES OF COFFIN sheet). */
  senior: PaymentRow[];
};

/* -------------------------------- lot model -------------------------------- */

export type LotTerm = "selling" | "annual" | "semi" | "quarter" | "monthly";

export type LotFigures = Record<LotTerm, number>;

export type LotPriceRow = {
  product: string;
  area: number;
  regular: LotFigures;
  senior: LotFigures;
};

export type LotCategory = {
  title: string;
  /** The family name as printed on the 2026 sheet. */
  caption: string;
  rows: LotPriceRow[];
};

export const LOT_TERMS: ReadonlyArray<LotTerm> = [
  "selling",
  "annual",
  "semi",
  "quarter",
  "monthly",
];

/** The sheet prints rounded schedules; six annuals may miss the selling price by this much. */
export const LOT_AMORTIZATION_ROUNDING = 3;

/**
 * The lot sheet's recorded amortization term: SIX YEARS. Every lot family is
 * priced so `annual × 6 ≈ selling` (the invariant checked below), and the sheet
 * itself heads the columns "6 years amortization". This is the ONE source of the
 * payment term the monthly-price surfaces print (Villa Memorial minutes,
 * 2026-09-21, item 8) — a view reads it, never types "72".
 */
export const LOT_AMORTIZATION_YEARS = 6;

/** The same term in months — what the minutes' "X months" column prints. */
export const LOT_AMORTIZATION_MONTHS = LOT_AMORTIZATION_YEARS * 12;

/* ------------------------------ the document ------------------------------ */

/**
 * An open client question carried beside the prices. Questions are fixture
 * metadata, NOT part of the editable document — a save can never drop or
 * rewrite one, so a flagged conflict stays visible until the client answers.
 */
export type PricingQuestion = {
  id: string;
  /** Which screen shows it. */
  scope: "plans" | "lots";
  title: string;
  detail: string;
  /** Where the discrepancy is recorded. */
  source: string;
};

export type PricingDocument = {
  version: 1;
  updated_at: string | null;
  updated_by: string | null;
  plans: PlanPricing;
  lotCategories: LotCategory[];
};

/* --------------------------- structural reading --------------------------- */

/** Thrown by the strict readers; callers turn it into a 500 (fixture) or a 422 (save). */
export class PricingShapeError extends Error {}

function shape(what: string): never {
  throw new PricingShapeError(what);
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    shape(`${what} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) shape(`${what} is missing`);
  return value;
}

function asAmount(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    shape(`${what} must be a whole number of pesos`);
  }
  return value;
}

function asArea(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    shape(`${what} must be a number of square metres`);
  }
  return value;
}

const MODES = PLAN_TERM_DEFS.map((t) => t.mode);

/** One plan row, field by field (extra keys ignored, missing/invalid → shape error). */
export function readPaymentRow(raw: unknown, what: string): PaymentRow {
  const r = asRecord(raw, what);
  const mode = asString(r.mode, `${what} payment mode`);
  if (!MODES.includes(mode)) shape(`${what} payment mode “${mode}” is not one of ${MODES.join(", ")}`);
  const row = { mode } as PaymentRow;
  for (const tier of PLAN_TIER_IDS) {
    row[tier] = asAmount(r[tier], `${what} ${tier}`);
  }
  return row;
}

/** Both plan tables, structurally. Semantics (terms/invariants) are validatePlanPricing's job. */
export function readPlanPricing(raw: unknown): PlanPricing {
  const r = asRecord(raw, "plans");
  if (!Array.isArray(r.regular)) shape("plans.regular must be a list of payment rows");
  if (!Array.isArray(r.senior)) shape("plans.senior must be a list of payment rows");
  return {
    regular: r.regular.map((row, i) => readPaymentRow(row, `regular row ${i + 1}`)),
    senior: r.senior.map((row, i) => readPaymentRow(row, `senior row ${i + 1}`)),
  };
}

function readLotFigures(raw: unknown, what: string): LotFigures {
  const r = asRecord(raw, what);
  const figures = {} as LotFigures;
  for (const term of LOT_TERMS) {
    figures[term] = asAmount(r[term], `${what} ${term}`);
  }
  return figures;
}

/** One lot product row, field by field. */
export function readLotPriceRow(raw: unknown, what: string): LotPriceRow {
  const r = asRecord(raw, what);
  return {
    product: asString(r.product, `${what} product name`),
    area: asArea(r.area, `${what} area`),
    regular: readLotFigures(r.regular, `${what} regular figures`),
    senior: readLotFigures(r.senior, `${what} senior figures`),
  };
}

/** All four lot families, structurally. */
export function readLotCategories(raw: unknown): LotCategory[] {
  if (!Array.isArray(raw)) shape("lotCategories must be a list of families");
  return raw.map((category, ci) => {
    const c = asRecord(category, `lot family ${ci + 1}`);
    if (!Array.isArray(c.rows) || c.rows.length === 0) {
      shape(`lot family ${ci + 1} must carry at least one product row`);
    }
    return {
      title: asString(c.title, `lot family ${ci + 1} title`),
      caption: asString(c.caption, `lot family ${ci + 1} caption`),
      rows: c.rows.map((row, ri) =>
        readLotPriceRow(row, `lot family ${ci + 1} row ${ri + 1}`),
      ),
    };
  });
}

/** The full stored document, structurally. */
export function readPricingDocument(raw: unknown): PricingDocument {
  const r = asRecord(raw, "pricing document");
  return {
    version: 1,
    updated_at: typeof r.updated_at === "string" && r.updated_at.length > 0 ? r.updated_at : null,
    updated_by: typeof r.updated_by === "string" && r.updated_by.length > 0 ? r.updated_by : null,
    plans: readPlanPricing(r.plans),
    lotCategories: readLotCategories(r.lotCategories),
  };
}

/** The fixture's read-only client questions (never part of a saved document). */
export function readPricingQuestions(raw: unknown): PricingQuestion[] {
  if (!Array.isArray(raw)) shape("pricing questions must be a list");
  return raw.map((question, i) => {
    const q = asRecord(question, `pricing question ${i + 1}`);
    const scope = asString(q.scope, `pricing question ${i + 1} scope`);
    if (scope !== "plans" && scope !== "lots") {
      shape(`pricing question ${i + 1} scope must be plans or lots`);
    }
    return {
      id: asString(q.id, `pricing question ${i + 1} id`),
      scope,
      title: asString(q.title, `pricing question ${i + 1} title`),
      detail: asString(q.detail, `pricing question ${i + 1} detail`),
      source: asString(q.source, `pricing question ${i + 1} source`),
    };
  });
}

/* ------------------------------- validators ------------------------------- */

export type PricingVerdict<T> = { ok: true; value: T } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function pesos(n: number): string {
  return `₱${n.toLocaleString("en-PH")}`;
}

/** Semantic rules for a structurally-read plan pricing pair. */
export function checkPlanPricing(pricing: PlanPricing): string | null {
  for (const [table, rows] of [
    ["regular", pricing.regular],
    ["senior", pricing.senior],
  ] as const) {
    const label = table === "regular" ? "Regular table" : "Senior table";
    const modes = new Set<string>();
    for (const row of rows) {
      if (modes.has(row.mode)) return `${label}: the ${row.mode} row appears twice.`;
      modes.add(row.mode);
      if (!MODES.includes(row.mode)) {
        return `${label}: “${row.mode}” is not a 2026 payment mode (${MODES.join(", ")}).`;
      }
      for (const tier of PLAN_TIER_IDS) {
        const amount = row[tier];
        if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) {
          return `${label} table · ${tier}: every amount must be a whole number of pesos — check the ${row.mode} figure.`;
        }
      }
    }
    for (const term of PLAN_TERM_DEFS) {
      if (!modes.has(term.mode)) return `${label} is missing the ${term.mode} row.`;
    }
    if (rows.length !== PLAN_TERM_DEFS.length) {
      return `${label}: expected ${PLAN_TERM_DEFS.length} payment modes (${MODES.join(", ")}), found ${rows.length}.`;
    }
  }

  const byMode = (rows: PaymentRow[], mode: string) => rows.find((r) => r.mode === mode)!;

  // Senior figures never exceed the regular figure for the same cell — checked
  // before the schedule ratio so the most specific problem is the one reported.
  for (const term of PLAN_TERM_DEFS) {
    const regular = byMode(pricing.regular, term.mode);
    const senior = byMode(pricing.senior, term.mode);
    for (const tier of PLAN_TIER_IDS) {
      if (senior[tier] > regular[tier]) {
        return `Senior table · ${tier}: the ${term.label} figure ${pesos(senior[tier])} is higher than the regular ${pesos(regular[tier])}. Senior rates must not exceed the regular rate.`;
      }
    }
  }

  for (const [table, rows] of [
    ["Regular", pricing.regular],
    ["Senior", pricing.senior],
  ] as const) {
    for (const tier of PLAN_TIER_IDS) {
      // The ratio check is expressed against the annual row, once per tier.
      const annual = byMode(rows, "Annual")[tier];
      for (const term of PLAN_TERM_DEFS) {
        if (term.paymentsPerYear === 1) continue;
        const expected = byMode(rows, term.mode)[tier] * term.paymentsPerYear;
        if (annual !== expected) {
          return `${table} table · ${tier}: ${term.label} ${pesos(byMode(rows, term.mode)[tier])} × ${term.paymentsPerYear} = ${pesos(expected)}, but the annual figure is ${pesos(annual)}. Fix one of the two so the schedule agrees.`;
        }
      }
    }
  }
  return null;
}

/** Semantic rules for structurally-read lot families. */
export function checkLotCategories(categories: LotCategory[]): string | null {
  if (categories.length === 0) return "At least one lot family is required.";
  const titles = new Set<string>();
  for (const category of categories) {
    if (titles.has(category.title.toLowerCase())) {
      return `Two lot families are called “${category.title}” — family names must be unique.`;
    }
    titles.add(category.title.toLowerCase());
    const products = new Set<string>();
    for (const row of category.rows) {
      const key = row.product.toLowerCase();
      if (products.has(key)) {
        return `“${category.title}” lists “${row.product}” twice — product names must be unique inside a family.`;
      }
      products.add(key);
      if (typeof row.area !== "number" || !Number.isFinite(row.area) || row.area < 0) {
        return `“${row.product || "A row"}” · area must be a number of square metres.`;
      }
      // Senior figures never exceed the regular figure for the same cell —
      // checked before the amortization drift so the most specific problem wins.
      for (const term of LOT_TERMS) {
        if (row.senior[term] > row.regular[term]) {
          return `“${row.product}”: the senior ${term === "selling" ? "selling price" : term} ${pesos(row.senior[term])} is higher than the regular ${pesos(row.regular[term])}. Senior figures must not exceed the regular figure.`;
        }
      }
      for (const [table, figures] of [
        ["Regular", row.regular],
        ["Senior", row.senior],
      ] as const) {
        for (const term of LOT_TERMS) {
          const amount = figures[term];
          if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0) {
            return `“${row.product || "A row"}” · ${table} ${term}: every amount must be a whole number of pesos.`;
          }
        }
        const drift = Math.abs(figures.annual * LOT_AMORTIZATION_YEARS - figures.selling);
        if (drift > LOT_AMORTIZATION_ROUNDING) {
          return `“${row.product}” · ${table}: ${pesos(figures.annual)} × ${LOT_AMORTIZATION_YEARS} = ${pesos(figures.annual * LOT_AMORTIZATION_YEARS)} but the selling price is ${pesos(figures.selling)} — the six-year amortization must agree within ${pesos(LOT_AMORTIZATION_ROUNDING)}.`;
        }
      }
    }
  }
  return null;
}

/** The save path for a plan-rates edit: structural read → semantic rules. */
export function validatePlanPricingDraft(raw: unknown): PricingVerdict<PlanPricing> {
  let pricing: PlanPricing;
  try {
    pricing = readPlanPricing(raw);
  } catch (err) {
    if (err instanceof PricingShapeError) return fail(err.message);
    throw err;
  }
  const error = checkPlanPricing(pricing);
  return error ? fail(error) : { ok: true, value: pricing };
}

/** The save path for a lot-prices edit: structural read → semantic rules. */
export function validateLotCategoriesDraft(raw: unknown): PricingVerdict<LotCategory[]> {
  let categories: LotCategory[];
  try {
    categories = readLotCategories(raw);
  } catch (err) {
    if (err instanceof PricingShapeError) return fail(err.message);
    throw err;
  }
  const error = checkLotCategories(categories);
  return error ? fail(error) : { ok: true, value: categories };
}

/** Validates a whole document (store reads and seed loading). Shape errors throw ApiError 500. */
export function assertPricingDocument(raw: unknown): PricingDocument {
  let document: PricingDocument;
  try {
    document = readPricingDocument(raw);
    const planError = checkPlanPricing(document.plans);
    if (planError) throw new PricingShapeError(planError);
    const lotError = checkLotCategories(document.lotCategories);
    if (lotError) throw new PricingShapeError(lotError);
  } catch (err) {
    if (err instanceof PricingShapeError) {
      throw new ApiError(`malformed pricing document: ${err.message}`, 500);
    }
    throw err;
  }
  return document;
}

/* ------------------------------ price access ------------------------------ */

/**
 * One plan rate from a pricing document: the client's published amount for a
 * tier × term, regular or senior. Public surfaces read through this (never a
 * constant) so an office edit is what the page prints.
 */
export function planRateOf(
  pricing: PlanPricing,
  tier: PlanTier,
  term: PlanTerm,
  senior = false,
): number {
  const def = PLAN_TERM_DEFS.find((t) => t.id === term);
  if (!def) throw new Error(`Unknown plan term: ${term}`);
  const rows = senior ? pricing.senior : pricing.regular;
  const row = rows.find((r) => r.mode === def.mode);
  if (!row) throw new Error(`No ${def.mode} row in the ${senior ? "senior" : "standard"} table`);
  return row[tier];
}

/** The four terms a given tier can be paid in, ready for the selector. */
export function planTermOptionsOf(
  pricing: PlanPricing,
  tier: PlanTier,
  senior = false,
): Array<{ term: PlanTerm; label: string; per: string; amount: number }> {
  return PLAN_TERM_DEFS.map((t) => ({
    term: t.id,
    label: t.label,
    per: t.per,
    amount: planRateOf(pricing, tier, t.id, senior),
  }));
}

/**
 * One lot family's entry-level "from" figures: the lowest regular selling price
 * in that family and that row's matching monthly installment (the client's
 * 6-year amortization). Unknown/absent family → null; the view then omits the
 * meta line rather than guessing.
 */
export function lotCategoryFromPriceOf(
  categories: ReadonlyArray<LotCategory>,
  categoryTitle: string,
): {
  category: { title: string; caption: string };
  product: string;
  selling: number;
  monthly: number;
} | null {
  const category = categories.find((c) => c.title === categoryTitle);
  if (!category || category.rows.length === 0) return null;
  const row = category.rows.reduce((min, r) => (r.regular.selling < min.regular.selling ? r : min));
  return {
    category: { title: category.title, caption: category.caption },
    product: row.product,
    selling: row.regular.selling,
    monthly: row.regular.monthly,
  };
}

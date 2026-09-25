/**
 * Monthly-first pricing — the ONE derivation the plan and lot surfaces read
 * (Villa Memorial minutes, 2026-09-21, item 8: "display the monthly payment
 * price instead of the full or total price for Memorial Plans and Lots", with
 * the payment term and the total contract price where the approved data records
 * them).
 *
 * WHY THIS MODULE EXISTS. The monthly installment, the term and the total are
 * now the head line of a card, a detail page and the price list. If each view
 * derived (or typed) them they would drift, and a guessed figure would read as a
 * published one. This module is the ONE place that reads the approved figures —
 * and the ONE place that says which fields the approved data does NOT carry.
 *
 * WHAT THE APPROVED 2026 DATA RECORDS
 *  · LOTS — the lot sheet prices every family by a SIX-YEAR amortization
 *    (`annual × 6 ≈ selling`, enforced by lib/pricing-model.ts) and prints the
 *    monthly installment. A lot's term is therefore recorded (72 months), and
 *    its total contract price is the sheet's recorded selling figure.
 *  · PLANS — the plan sheet prints the four payment modes (monthly … annual)
 *    but NO term in months and NO total contract price. The only term sentence
 *    the sheet carries ("amortization can be adjusted to 8 and 10 years") names
 *    possibilities, not the contract's default, so the plan's term is PENDING
 *    Villa Funeraria confirmation and no total is shown. Never fill either in.
 *
 * Pure module: no IO, no React. The card/detail components
 * (components/villa/monthly-price.tsx) and the price tables render what these
 * helpers return.
 */
import {
  LOT_AMORTIZATION_MONTHS,
  planRateOf,
  type LotCategory,
  type LotFigures,
  type PlanPricing,
  type PlanTier,
} from "@/lib/pricing-model";

/** The recorded lot term as the minutes' column prints it ("6 years (72 months)"). */
export const LOT_TERM_MONTHS = LOT_AMORTIZATION_MONTHS;
export const LOT_TERM_LABEL = `6 years (${LOT_AMORTIZATION_MONTHS} months)`;

/**
 * The honest state for a term the approved data does not record. Naming Villa
 * Funeraria (the client that must approve pricing and terms) is deliberate: the
 * reader learns WHO still has to confirm, not just that a number is missing.
 */
export const PENDING_TERM_LABEL = "Payment term pending Villa Funeraria confirmation";

export type PaymentTerm =
  | { status: "recorded"; months: number; label: string }
  | { status: "pending"; label: string };

/** The monthly-first view of one product: the installment, its term, its total. */
export type MonthlyPrice = {
  /** The monthly installment to lead with. */
  monthly: number;
  term: PaymentTerm;
  /** The recorded total contract price, or null when the approved data records none. */
  total: number | null;
};

/** One lot product row's monthly-first price (term + total recorded). */
export function lotMonthlyPrice(figures: LotFigures): MonthlyPrice {
  return {
    monthly: figures.monthly,
    term: { status: "recorded", months: LOT_TERM_MONTHS, label: LOT_TERM_LABEL },
    total: figures.selling,
  };
}

/** One plan tier's monthly-first price. Term and total are not recorded → honest pending. */
export function planMonthlyPrice(
  pricing: PlanPricing,
  tier: PlanTier,
  senior = false,
): MonthlyPrice {
  return {
    monthly: planRateOf(pricing, tier, "monthly", senior),
    term: { status: "pending", label: PENDING_TERM_LABEL },
    total: null,
  };
}

/**
 * The monthly-first price of a lot family's product row, searched across the
 * current document in family order. The first match is the LOT ONLY family
 * (family 1), which is the price a lot-only purchase carries; an unknown
 * family/product returns null and the view renders its honest fallback rather
 * than a guessed amount.
 */
export function lotFamilyMonthlyPrice(
  categories: ReadonlyArray<LotCategory>,
  family: string,
  product?: string,
): MonthlyPrice | null {
  const wanted = (product ?? family).trim();
  for (const category of categories) {
    const row = category.rows.find((candidate) => candidate.product === wanted);
    if (row) return lotMonthlyPrice(row.regular);
  }
  return null;
}

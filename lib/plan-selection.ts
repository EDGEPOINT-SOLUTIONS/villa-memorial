/**
 * What the plan buy card's current selection can do — the one place the
 * tier × term × senior decision lives, so the UI and its tests can never drift.
 *
 * The catalogue prices each plan package at its published MONTHLY amortization
 * (lib/fixtures/commerce/catalog-items.json, pinned by the fixture-contract
 * test), so:
 *  - a monthly, non-senior selection on a tier the catalogue carries adds that
 *    exact SKU to the cart (the amount shown is the amount carted);
 *  - every other selection — another term, a tier without a SKU, or the
 *    senior-citizen rate (the office must qualify eligibility) — opens the
 *    prefilled request naming the tier, the term and the sheet's amount.
 *
 * The plan's rate card itself is untouched: every amount here comes from the
 * CURRENT pricing document (lib/api-client/pricing.ts → planRateOf), never a
 * constant, so an office edit is what the visitor requests.
 */
import { planTierPackageSku } from "@/lib/catalogue-skus";
import {
  PLAN_TERM_DEFS,
  planRateOf,
  type PlanPricing,
  type PlanTier,
  type PlanTerm,
} from "@/lib/pricing-model";
import { PLAN_TIERS, php2 } from "@/lib/villa-pricing";
import { buildRequestHref, type RequestPrefill } from "@/lib/public-forms/request-prefill";

export type PlanSelectionAction =
  | { kind: "cart"; sku: string }
  | { kind: "request"; href: string; prefill: RequestPrefill };

/**
 * The prefilled request for a tier × term × senior selection — used for every
 * selection the cart cannot take, and as the fallback when a catalogue lookup
 * hiccups, so the visitor always lands on the same request with the amount they
 * saw.
 */
export function planRequestAction({
  pricing,
  tier,
  term,
  senior,
  sku,
}: {
  pricing: PlanPricing;
  tier: PlanTier;
  term: PlanTerm;
  senior: boolean;
  sku?: string;
}): Extract<PlanSelectionAction, { kind: "request" }> {
  const termDef = PLAN_TERM_DEFS.find((t) => t.id === term);
  if (!termDef) throw new Error(`Unknown plan term: ${term}`);
  const tierName = PLAN_TIERS.find((t) => t.id === tier)?.name ?? tier;
  const amount = planRateOf(pricing, tier, term, senior);
  const prefill: RequestPrefill = {
    item: `${tierName} plan — ${termDef.label}`,
    sku,
    price: `${php2(amount)} ${termDef.per}`,
    note: senior
      ? "Senior-citizen rates (61–100 years old, no insurance benefit)."
      : "Villa Memorial Plan enquiry.",
  };
  return { kind: "request", href: buildRequestHref(prefill), prefill };
}

export function planSelectionAction({
  pricing,
  tier,
  term,
  senior,
}: {
  pricing: PlanPricing;
  tier: PlanTier;
  term: PlanTerm;
  senior: boolean;
}): PlanSelectionAction {
  const sku = planTierPackageSku(tier);

  if (sku && term === "monthly" && !senior) {
    return { kind: "cart", sku };
  }

  return planRequestAction({ pricing, tier, term, senior, sku });
}

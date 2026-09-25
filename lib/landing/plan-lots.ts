/**
 * "Memorial plans & garden lots" — the ONE reading of a home card's live figures.
 *
 * The home band (components/landing/landing-view.tsx) and the staff editor
 * (components/landing/landing-page-editor.tsx) both render the SAME card, so the
 * derivation lives here once:
 *
 *   · a lot/structure card binds to a lot family + product row in the editable
 *     pricing store and, since the minutes' item 8 (2026-09-21), LEADS with that
 *     row's monthly installment, its six-year term and its recorded total
 *     contract price — with the row's area and the family's own caption
 *     ("2.5 sqm · lot only · regular") as the supporting line;
 *   · a plan card binds to a plan tier and leads with its regular monthly rate
 *     ("₱600.00 / month"), naming the term as pending Villa Funeraria
 *     confirmation — the plan sheet records no month count.
 *
 * The monthly-first derivation itself lives in lib/monthly-pricing.ts (the ONE
 * home for the term and the total); this module only binds a card to its price
 * source. No amount is ever authored in the content document; a binding that no
 * longer resolves (a family/product/tier renamed away) returns null, and the
 * card renders its name with an honest "ask the office" figure instead of a
 * stale one.
 */
import { type LotCategory, type PlanPricing } from "@/lib/pricing-model";
import { lotMonthlyPrice, planMonthlyPrice, type MonthlyPrice } from "@/lib/monthly-pricing";
import { PLAN_TIERS, php2 } from "@/lib/villa-pricing";
import type { PlanLotCard, PlanLotKind } from "@/lib/api-client/landing";

/** The card's type word (the captain's vocabulary: Garden lot / Structure / Life plan). */
export function planLotKindLabel(kind: PlanLotKind): string {
  if (kind === "structure") return "Structure";
  if (kind === "plan") return "Life plan";
  return "Garden lot";
}

export type PlanLotCardFigures = {
  /** The monthly installment, formatted — the card's headline (e.g. "₱600.00"). */
  price: string;
  /** What the headline is (always "/ month" — the monthly installment). */
  unit: string;
  /** The one supporting line under the name. */
  supporting: string;
  /** The full monthly-first price (term + recorded total) the card renders. */
  monthly: MonthlyPrice;
};

/** Numbers print without a trailing ".0" (the sheet's 2.5 sqm stays 2.5). */
function formatArea(area: number): string {
  return Number.isInteger(area) ? String(area) : String(area);
}

/**
 * A card's live figures from the CURRENT pricing document, or null when its
 * binding no longer resolves. The caller renders an honest fallback then.
 */
export function planLotCardFigures(
  card: PlanLotCard,
  lotCategories: ReadonlyArray<LotCategory>,
  planPricing: PlanPricing,
): PlanLotCardFigures | null {
  if (card.kind === "plan") {
    const tier = PLAN_TIERS.find((t) => t.id === card.tier);
    if (!tier) return null;
    const monthly = planMonthlyPrice(planPricing, tier.id, false);
    return { price: php2(monthly.monthly), unit: "/ month", supporting: card.text, monthly };
  }
  const family = lotCategories.find((c) => c.title === card.category);
  const row = family?.rows.find((r) => r.product === card.product);
  if (!family || !row) return null;
  const monthly = lotMonthlyPrice(row.regular);
  return {
    price: php2(monthly.monthly),
    unit: "/ month",
    supporting: `${formatArea(row.area)} sqm · ${family.caption.toLowerCase()} · regular`,
    monthly,
  };
}

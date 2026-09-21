/**
 * "Memorial plans & garden lots" — the ONE reading of a home card's live figures.
 *
 * The home band (components/landing/landing-view.tsx) and the staff editor
 * (components/landing/landing-page-editor.tsx) both render the SAME card, so the
 * derivation lives here once:
 *
 *   · a lot/structure card binds to a lot family + product row in the editable
 *     pricing store and prints that row's regular selling price, its area and the
 *     family's own caption ("2.5 sqm · lot only · regular") — the captain's line;
 *   · a plan card binds to a plan tier and prints its regular monthly rate
 *     ("from ₱600 / month"), with the card's authored supporting line under it.
 *
 * No amount is ever authored in the content document; a binding that no longer
 * resolves (a family/product/tier renamed away) returns null, and the card
 * renders its name with an honest "ask the office" figure instead of a stale one.
 */
import { planRateOf, type LotCategory, type PlanPricing } from "@/lib/pricing-model";
import { PLAN_TIERS, php } from "@/lib/villa-pricing";
import type { PlanLotCard, PlanLotKind } from "@/lib/api-client/landing";

/** The card's type word (the captain's vocabulary: Garden lot / Structure / Life plan). */
export function planLotKindLabel(kind: PlanLotKind): string {
  if (kind === "structure") return "Structure";
  if (kind === "plan") return "Life plan";
  return "Garden lot";
}

export type PlanLotCardFigures = {
  /** The headline figure, formatted (e.g. "₱114,000" or "from ₱600"). */
  price: string;
  /** What the figure is ("/ month"), or null for a lot's selling price. */
  unit: string | null;
  /** The one supporting line under the name. */
  supporting: string;
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
    return {
      price: `from ${php(planRateOf(planPricing, tier.id, "monthly"))}`,
      unit: "/ month",
      supporting: card.text,
    };
  }
  const family = lotCategories.find((c) => c.title === card.category);
  const row = family?.rows.find((r) => r.product === card.product);
  if (!family || !row) return null;
  return {
    price: php(row.regular.selling),
    unit: null,
    supporting: `${formatArea(row.area)} sqm · ${family.caption.toLowerCase()} · regular`,
  };
}

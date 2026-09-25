"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CartLine } from "@/lib/cart/cart-context";
import { planRequestAction, planSelectionAction } from "@/lib/plan-selection";
import {
  PLAN_TERM_DEFS,
  planRateOf,
  type PlanPricing,
  type PlanTier,
  type PlanTerm,
} from "@/lib/pricing-model";
import { PENDING_TERM_LABEL } from "@/lib/monthly-pricing";
import { PLAN_TIERS, php2 } from "@/lib/villa-pricing";
import { planTierPackageSku } from "@/lib/catalogue-skus";
import { AddToCartControl } from "./add-to-cart";

/** One plan tier that the catalogue can actually price (else the request path). */
export type TierCartItem = { tier: PlanTier; cartItem: Omit<CartLine, "quantity"> };

type Props = {
  /**
   * The CURRENT plan tables (lib/api-client/pricing.ts `loadPricingDocument()`),
   * handed down by the server page: the selector must print the office's
   * published rates, never a build-time constant.
   */
  pricing: PlanPricing;
  /** The catalogue item this page sells (the cart line for the page's own SKU). */
  item: Omit<CartLine, "quantity">;
  /** The tier this page's package corresponds to (e.g. PKG-BASIC = Bronze 1). */
  ownTier: PlanTier;
  /** Tiers that have a catalogue SKU (lib/catalogue-skus.ts → PLAN_TIER_PACKAGE_SKUS). */
  tierItems?: TierCartItem[];
};

/**
 * Plan tier × Plan Term selector — the approved prototype's buy card
 * (docs/prototypes/villa-home-ui/package.html): Package/SKU chips, headline
 * price, five tier pills, the four term buttons and the senior-citizen switch,
 * then the buy actions.
 *
 * Every amount comes through lib/villa-pricing.ts (`planRate`), so the four
 * term buttons, the headline price and the senior-citizen switch can never
 * disagree with the client's payment-mode sheets. Every tier × term stays
 * actionable — lib/plan-selection.ts decides per selection whether the cart
 * takes it (the catalogue prices the monthly amortization) or the prefilled
 * request opens. A request is an enquiry, never a reservation.
 */
export function PlanTermSelector({ pricing, item, ownTier, tierItems = [] }: Props) {
  const [tier, setTier] = useState<PlanTier>(ownTier);
  const [term, setTerm] = useState<PlanTerm>("monthly");
  const [senior, setSenior] = useState(false);

  const termDef = PLAN_TERM_DEFS.find((t) => t.id === term)!;
  const amount = planRateOf(pricing, tier, term, senior);
  const tierName = PLAN_TIERS.find((t) => t.id === tier)?.name ?? "Bronze 1";
  const action = planSelectionAction({ pricing, tier, term, senior });

  const cartItem = tier === ownTier ? item : tierItems.find((t) => t.tier === tier)?.cartItem;
  // "request" carries the selection's own prefill; the cart case only falls
  // back here when the catalogue lookup hiccuped, so build the same request.
  const requestHref =
    action.kind === "request"
      ? action.href
      : planRequestAction({ pricing, tier, term, senior, sku: planTierPackageSku(tier) }).href;

  return (
    <>
      <div className="buy-card__chips">
        <Badge tone="accent">{item.itemType === "package" ? "Package" : "Service"}</Badge>
        <Badge tone="neutral">{action.kind === "cart" ? action.sku : item.sku}</Badge>
      </div>

      <div>
        <div className="buy-card__label" id="buy-title">
          Price
        </div>
        <div className="buy-card__price">
          {php2(amount)} <span>{termDef.per}</span>
        </div>
        {/* The monthly installment leads and the contract's own term is named
            honestly (minutes item 8, 2026-09-21): the plan sheet records the
            payment modes but no month count, so it stays pending rather than
            being guessed. */}
        <p className="plan-note">{PENDING_TERM_LABEL}.</p>
      </div>

      <div>
        <div className="buy-card__label buy-card__field-label" id="plan-tier-label">
          Plan tier
        </div>
        <div className="tier-row" role="group" aria-labelledby="plan-tier-label">
          {PLAN_TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={t.id === tier}
              onClick={() => setTier(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="buy-card__label buy-card__field-label" id="plan-term-label">
          Plan term
        </div>
        <div className="term-grid" role="group" aria-labelledby="plan-term-label">
          {PLAN_TERM_DEFS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="term-btn"
              aria-pressed={t.id === term}
              onClick={() => setTerm(t.id)}
            >
              <span className="term-btn__name">{t.label}</span>
              <span className="term-btn__price">{php2(planRateOf(pricing, tier, t.id, senior))}</span>
              <span className="term-btn__check" aria-hidden="true">
                ✓
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="senior-toggle">
        <input type="checkbox" checked={senior} onChange={(e) => setSenior(e.target.checked)} />
        Use senior-citizen rates (61–100, no insurance benefit)
      </label>

      <div className="plan-buy-actions">
        {action.kind === "cart" && cartItem ? (
          <AddToCartControl
            withIcon
            item={{
              sku: cartItem.sku,
              name: cartItem.name,
              itemType: cartItem.itemType,
              unitPriceCents: cartItem.unitPriceCents,
              currency: cartItem.currency,
            }}
          />
        ) : (
          <Link
            className="btn btn--primary btn--block"
            href={requestHref}
            aria-label={`Request ${tierName} plan, ${termDef.label}, ${php2(amount)} ${termDef.per}`}
          >
            Request this plan — {php2(amount)} {termDef.per}
          </Link>
        )}
        <Link href="/cart" className="btn btn--secondary btn--block">
          View cart
        </Link>
      </div>

      <p className="plan-note">
        {action.kind === "cart"
          ? "The cart takes the published monthly amortization; the office confirms the plan and the first payment date."
          : "The office confirms this term and the final price — the request opens with everything you chose, and nothing is reserved."}
      </p>
      <p className="plan-note">
        No. of months — Monthly 12 payments/yr · Quarterly 4 · Semi-Annual 2 · Annual 1.
      </p>
      <p className="plan-note">
        Inception date is 30 days after initial payment; contestability 7 months after
        payment. Plan is assignable/transferable (₱1,000 fee).
      </p>
    </>
  );
}

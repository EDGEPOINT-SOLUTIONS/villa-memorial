"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CartLine } from "@/lib/cart/cart-context";
import {
  PLAN_TIERS,
  PLAN_TERMS,
  php2,
  planRate,
  type PlanTier,
  type PlanTerm,
} from "@/lib/villa-pricing";
import { AddToCartControl } from "./add-to-cart";

type Props = {
  /** The catalogue item this page sells (the cart line for the page's own SKU). */
  item: Omit<CartLine, "quantity">;
  /** The tier this page's package corresponds to (PKG-BASIC = Bronze 1). */
  ownTier: PlanTier;
};

/**
 * Plan tier × Plan Term selector — the approved prototype's buy card
 * (docs/prototypes/villa-home-ui/package.html): Package/SKU chips, headline
 * price, five tier pills, the four term buttons and the senior-citizen switch,
 * then Add to cart + View cart.
 *
 * Every amount comes through lib/villa-pricing.ts (`planRate`), so the four
 * term buttons, the headline price and the senior-citizen switch can never
 * disagree with the client's payment-mode sheets. The cart itself still runs on
 * the frozen catalogue item (its prices are placeholders pending the 2026
 * import), so the real Add-to-cart control is offered for this page's own plan;
 * choosing another tier offers the advisor path instead of adding a line the
 * catalogue cannot price.
 */
export function PlanTermSelector({ item, ownTier }: Props) {
  const [tier, setTier] = useState<PlanTier>(ownTier);
  const [term, setTerm] = useState<PlanTerm>("monthly");
  const [senior, setSenior] = useState(false);

  const termDef = PLAN_TERMS.find((t) => t.id === term)!;
  const amount = planRate(tier, term, senior);
  const tierName = PLAN_TIERS.find((t) => t.id === tier)?.name ?? "Bronze 1";
  const isOwnPlan = tier === ownTier && !senior;

  return (
    <>
      <div className="buy-card__chips">
        <Badge tone="accent">{item.itemType === "package" ? "Package" : "Service"}</Badge>
        <Badge tone="neutral">{item.sku}</Badge>
      </div>

      <div>
        <div className="buy-card__label" id="buy-title">
          Price
        </div>
        <div className="buy-card__price">
          {php2(amount)} <span>{termDef.per}</span>
        </div>
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
          {PLAN_TERMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="term-btn"
              aria-pressed={t.id === term}
              onClick={() => setTerm(t.id)}
            >
              <span className="term-btn__name">{t.label}</span>
              <span className="term-btn__price">{php2(planRate(tier, t.id, senior))}</span>
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
        {isOwnPlan ? (
          <AddToCartControl
            withIcon
            item={{
              sku: item.sku,
              name: item.name,
              itemType: item.itemType,
              unitPriceCents: item.unitPriceCents,
              currency: item.currency,
            }}
          />
        ) : (
          <Link className="btn btn--primary btn--block" href="/contact">
            Talk to an advisor about {tierName}
          </Link>
        )}
        <Link href="/cart" className="btn btn--secondary btn--block">
          View cart
        </Link>
      </div>

      <p className="plan-note">
        No. of months — Monthly 12 payments/yr · Quarterly 4 · Semi-Annual 2 · Annual 1. Inception
        date is 30 days after initial payment; contestability 7 months after payment. Plan is
        assignable/transferable (₱1,000 fee).
      </p>
    </>
  );
}

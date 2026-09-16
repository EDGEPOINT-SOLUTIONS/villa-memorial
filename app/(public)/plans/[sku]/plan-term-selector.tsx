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
 * Plan tier × Plan Term selector — the reference package page's buy card.
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
      <div className="row row--space">
        <Badge tone="accent">{item.itemType === "package" ? "Package" : "Service"}</Badge>
        <Badge tone="neutral">{item.sku}</Badge>
      </div>

      <div>
        <div className="detail-sticky__label" id="buy-title">Price</div>
        <div className="detail-sticky__price">
          {php2(amount)} <small className="plan-term-per">{termDef.per}</small>
        </div>
        <p className="plan-term-note" role="status" aria-live="polite">
          {tierName} · {termDef.label}
          {senior ? " · senior-citizen rate" : ""}
        </p>
      </div>

      <div>
        <div className="detail-sticky__label" id="plan-tier-label">
          Plan tier
        </div>
        <div className="plan-tier-row" role="group" aria-labelledby="plan-tier-label">
          {PLAN_TIERS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`plan-tier-btn${t.id === tier ? " plan-tier-btn--on" : ""}`}
              aria-pressed={t.id === tier}
              onClick={() => setTier(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="detail-sticky__label" id="plan-term-label">
          Plan term
        </div>
        <div className="plan-term-grid" role="group" aria-labelledby="plan-term-label">
          {PLAN_TERMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`plan-term-btn${t.id === term ? " plan-term-btn--on" : ""}`}
              aria-pressed={t.id === term}
              onClick={() => setTerm(t.id)}
            >
              <span className="plan-term-btn__name">{t.label}</span>
              <span className="plan-term-btn__price">{php2(planRate(tier, t.id, senior))}</span>
              <span className="plan-term-btn__check" aria-hidden="true">
                ✓
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="plan-senior-toggle">
        <input type="checkbox" checked={senior} onChange={(e) => setSenior(e.target.checked)} />
        Use senior-citizen rates (61–100, no insurance benefit)
      </label>

      {isOwnPlan ? (
        <div className="plan-buy-actions">
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
        </div>
      ) : (
        <Link className="btn btn--primary btn--block" href="/contact">
          Talk to an advisor about {tierName}
        </Link>
      )}
      <Link href="/cart" className="btn btn--secondary btn--sm btn--block">
        View cart
      </Link>

      <p className="text-sm text-muted" style={{ margin: 0 }}>
        Monthly 12 payments/yr · Quarterly 4 · Semi-Annual 2 · Annual 1. Inception is 30 days
        after initial payment; contestability 7 months after payment. Assignable and transferable
        (₱1,000 fee). Online checkout currently bills the storefront catalogue item; the plan
        enrolment flow follows the 2026 catalogue import.
      </p>
    </>
  );
}

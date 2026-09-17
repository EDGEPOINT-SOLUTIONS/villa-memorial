import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";

// The buy card's add control calls useRouter ("Go to checkout"); the server
// render under test only needs the hook to resolve.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
import { PlanTermSelector } from "@/app/(public)/plans/[sku]/plan-term-selector";
import { SEED_PRICING, php2, planRate } from "@/lib/villa-pricing";

/** The recorded seed plan tables — the buy card reads them here. */
const pricing = SEED_PRICING.plans;

/**
 * The plan buy card's rendered contract: it opens on the page's own tier at the
 * client's published monthly amount and offers the cart, while the five tier
 * pills and four terms stay present (the non-cart selections render the
 * prefilled request — see tests/unit/plan-selection.test.ts for the decision
 * table itself).
 */
const item = {
  sku: "PKG-BASIC",
  name: "Basic Package",
  itemType: "package" as const,
  unitPriceCents: 60000,
  currency: "PHP",
};

function render(props: Parameters<typeof PlanTermSelector>[0]) {
  return renderToStaticMarkup(
    createElement(CartProvider, null, createElement(PlanTermSelector, props)),
  );
}

describe("the plan buy card opens on the page's own tier", () => {
  it("shows the sheet's monthly amount and the real add-to-cart control", () => {
    const html = render({ pricing, item, ownTier: "bronze1" });
    expect(html).toContain(`${php2(planRate("bronze1", "monthly"))}`);
    expect(html).toContain("/ month");
    expect(html).toContain("Add to cart");
    expect(html).toContain("PKG-BASIC");
    for (const tier of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html).toContain(tier);
    }
    for (const term of ["Monthly", "Quarterly", "Semi-Annual", "Annual"]) {
      expect(html).toContain(term);
    }
    expect(html).toContain("Use senior-citizen rates");
  });

  it("falls back to the request path when the tier has no catalogue SKU", () => {
    // Bronze 2 has no package SKU, so even the opening state must be actionable
    // through the request — the card never renders a dead end.
    const html = render({ pricing, item, ownTier: "bronze2" });
    expect(html).toContain("Request this plan");
    expect(html).toContain("/contact?item=");
    expect(html).toContain(`${php2(planRate("bronze2", "monthly"))}`);
  });
});

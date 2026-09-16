import { describe, expect, it } from "vitest";
import { planSelectionAction } from "@/lib/plan-selection";
import { PLAN_TERMS, php2, planRate } from "@/lib/villa-pricing";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";

/**
 * The plan buy card's selection contract: every tier × term × senior choice is
 * actionable, and the split between "cart" and "request" is exactly the
 * catalogue's coverage — the catalogue prices the monthly amortization, so the
 * monthly selection of a tier it carries goes to the cart and everything else
 * opens the prefilled request (never a dead end, never a wrong amount).
 */
function requestParams(action: ReturnType<typeof planSelectionAction>) {
  if (action.kind !== "request") throw new Error("expected a request action");
  const url = new URL(action.href, "https://villa.test");
  return parseRequestPrefill(url.searchParams)!;
}

describe("plan tier × term selection", () => {
  it("sends a monthly, non-senior selection on a catalogue tier to the cart", () => {
    expect(planSelectionAction({ tier: "bronze1", term: "monthly", senior: false })).toEqual({
      kind: "cart",
      sku: "PKG-BASIC",
    });
    expect(planSelectionAction({ tier: "silver1", term: "monthly", senior: false })).toEqual({
      kind: "cart",
      sku: "PKG-STANDARD",
    });
    expect(planSelectionAction({ tier: "gold", term: "monthly", senior: false })).toEqual({
      kind: "cart",
      sku: "PKG-PREMIUM",
    });
  });

  it("opens the request for a tier the catalogue does not carry", () => {
    for (const tier of ["bronze2", "silver2"] as const) {
      const action = planSelectionAction({ tier, term: "monthly", senior: false });
      expect(action.kind).toBe("request");
    }
  });

  it("opens the request for every non-monthly term (the cart prices monthly)", () => {
    for (const term of PLAN_TERMS) {
      if (term.id === "monthly") continue;
      for (const tier of ["bronze1", "silver1", "gold"] as const) {
        const action = planSelectionAction({ tier, term: term.id, senior: false });
        expect(action.kind, `${tier} ${term.id}`).toBe("request");
        // The request names the tier, the term and THAT term's sheet amount.
        const prefill = requestParams(action);
        expect(prefill.price).toBe(`${php2(planRate(tier, term.id))} ${term.per}`);
      }
    }
  });

  it("opens the request for every senior selection, naming the eligibility condition", () => {
    for (const tier of ["bronze1", "gold"] as const) {
      const action = planSelectionAction({ tier, term: "monthly", senior: true });
      expect(action.kind).toBe("request");
      const prefill = requestParams(action);
      expect(prefill.price).toBe(`${php2(planRate(tier, "monthly", true))} / month`);
      expect(prefill.note).toMatch(/Senior-citizen rates \(61–100/);
    }
  });

  it("never quotes an amount the sheet does not print", () => {
    // Every amount a selection exposes must equal a real planRate() figure for
    // its term: the cart's SKUs carry the monthly rate (pinned by the catalogue
    // contract test), every request carries its own term's figure here.
    for (const tier of ["bronze1", "silver1", "gold"] as const) {
      for (const term of PLAN_TERMS) {
        const action = planSelectionAction({ tier, term: term.id, senior: false });
        if (action.kind === "cart") continue; // monthly on a carried tier
        const prefill = requestParams(action);
        expect(prefill.price).toBe(`${php2(planRate(tier, term.id))} ${term.per}`);
      }
    }
  });
});

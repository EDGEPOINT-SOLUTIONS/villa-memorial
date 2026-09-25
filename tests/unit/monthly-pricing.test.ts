import { describe, expect, it } from "vitest";
import { parseCss, readStyle } from "../helpers/css-rules";
import {
  LOT_AMORTIZATION_MONTHS,
  LOT_AMORTIZATION_YEARS,
  planRateOf,
} from "@/lib/pricing-model";
import {
  LOT_TERM_LABEL,
  LOT_TERM_MONTHS,
  PENDING_TERM_LABEL,
  lotFamilyMonthlyPrice,
  lotMonthlyPrice,
  planMonthlyPrice,
} from "@/lib/monthly-pricing";
import { LOT_PRICE_CATEGORIES, PLAN_TIERS, SEED_PRICING } from "@/lib/villa-pricing";

/**
 * Monthly-first pricing (Villa Memorial minutes, 2026-09-21, item 8).
 *
 * The minutes requires the monthly installment to lead for Memorial Plans and
 * Lots, with the payment term and the total contract price shown where the
 * approved 2026 data records them. These cases pin the ONE derivation
 * (lib/monthly-pricing.ts) against the recorded sheet figures:
 *
 *   · LOTS record a term (six years / 72 months) and a total contract price
 *     (the sheet's selling figure) — both must match the fixture exactly;
 *   · PLANS record NO term and NO total, so both are the honest pending state —
 *     a guessed month count or a synthesised total is a defect.
 */
describe("the recorded lot amortization term", () => {
  it("is the sheet's six years, in one home", () => {
    expect(LOT_AMORTIZATION_YEARS).toBe(6);
    expect(LOT_AMORTIZATION_MONTHS).toBe(72);
    expect(LOT_TERM_MONTHS).toBe(LOT_AMORTIZATION_MONTHS);
    expect(LOT_TERM_LABEL).toBe("6 years (72 months)");
  });
});

describe("a lot's monthly-first price is the recorded family figure", () => {
  it("leads with the monthly installment, keeps the 72-month term, records the total", () => {
    for (const category of LOT_PRICE_CATEGORIES) {
      for (const row of category.rows) {
        const price = lotMonthlyPrice(row.regular);
        expect(price.monthly, `${category.title} · ${row.product}`).toBe(row.regular.monthly);
        expect(price.total, `${category.title} · ${row.product}`).toBe(row.regular.selling);
        expect(price.term).toEqual({
          status: "recorded",
          months: LOT_AMORTIZATION_MONTHS,
          label: LOT_TERM_LABEL,
        });
      }
    }
  });

  it("derives a home card's family figure through the same rule", () => {
    const premium = lotFamilyMonthlyPrice(LOT_PRICE_CATEGORIES, "Premium Lots");
    expect(premium).not.toBeNull();
    expect(premium!.monthly).toBe(1710);
    expect(premium!.total).toBe(114000);

    const mausoleum = lotFamilyMonthlyPrice(LOT_PRICE_CATEGORIES, "Mausoleum");
    expect(mausoleum!.monthly).toBe(16095);
    expect(mausoleum!.total).toBe(1073000);
  });

  it("returns null for a family the sheet does not price — never a guessed amount", () => {
    expect(lotFamilyMonthlyPrice(LOT_PRICE_CATEGORIES, "5. Invented Family")).toBeNull();
    expect(lotFamilyMonthlyPrice([], "Premium Lots")).toBeNull();
  });
});

describe("a plan's monthly-first price is honest about what is unrecorded", () => {
  it("leads with the live monthly rate and marks BOTH term and total as missing", () => {
    for (const tier of PLAN_TIERS) {
      const price = planMonthlyPrice(SEED_PRICING.plans, tier.id, false);
      expect(price.monthly, tier.name).toBe(planRateOf(SEED_PRICING.plans, tier.id, "monthly", false));
      expect(price.total, `${tier.name} total`).toBeNull();
      expect(price.term).toEqual({ status: "pending", label: PENDING_TERM_LABEL });
    }
  });

  it("reads the senior monthly column when asked", () => {
    const senior = planMonthlyPrice(SEED_PRICING.plans, "bronze1", true);
    expect(senior.monthly).toBe(550);
    expect(senior.total).toBeNull();
    expect(senior.term.status).toBe("pending");
  });

  it("never invents a month count — the pending wording names the client", () => {
    expect(PENDING_TERM_LABEL).toMatch(/pending/i);
    expect(PENDING_TERM_LABEL).toMatch(/Villa Funeraria/);
    expect(PENDING_TERM_LABEL).not.toMatch(/\d+\s*months/);
  });
});

/**
 * The captain's 2026-09-25 feedback: 28px+ bold figures read fake. Every price
 * headline is capped at body size + ONE rung (`--text-lg`, 18px), and the
 * supporting lines (unit · term · total) stay smaller — hierarchy comes from
 * weight and colour, not size. A future edit that bumps one back to the old
 * `--text-2xl`/`--text-3xl` fails here, naming the class.
 */
describe("the monthly figures are right-sized (captain 2026-09-25)", () => {
  const rules = parseCss(readStyle("styles/components.css"));
  const body = (selector: string) =>
    rules.find((rule) => rule.depth === 0 && rule.selector === selector)?.body ?? "";

  it("caps every price headline at body + one rung", () => {
    for (const selector of [".shop-card__price", ".plan-tier__price", ".buy-card__price"]) {
      expect(body(selector), selector).toMatch(/font-size:\s*var\(--text-lg\)/);
      expect(body(selector), selector).not.toMatch(/var\(--text-(2xl|3xl|display)\)/);
    }
  });

  it("keeps the unit, term and total smaller than the headline", () => {
    const supporting = rules.find(
      (rule) => rule.depth === 0 && rule.selector.startsWith(".monthly-price__unit,"),
    );
    expect(supporting?.selector).toContain(".monthly-price__term");
    expect(supporting?.selector).toContain(".monthly-price__total");
    expect(supporting?.body).toMatch(/font-size:\s*var\(--text-sm\)/);
  });
});

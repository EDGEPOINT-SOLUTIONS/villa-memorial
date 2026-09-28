import { describe, expect, it } from "vitest";
import {
  checkLotCategories,
  checkPlanPricing,
  LOT_AMORTIZATION_ROUNDING,
  PLAN_TERM_DEFS,
  validateLotCategoriesDraft,
  validatePlanPricingDraft,
  type LotCategory,
  type PlanPricing,
} from "@/lib/pricing-model";
import { SEED_PRICING } from "@/lib/villa-pricing";

/**
 * The editing rules the two staff screens enforce. These are the same rules the
 * public price pins assert (tests/unit/villa-pricing.test.ts) turned into
 * validation: a bad edit must be REFUSED by the rule the repo already relies on,
 * with a plain explanation, never written and then rendered.
 */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const plan = (): PlanPricing => clone(SEED_PRICING.plans);
const lots = (): LotCategory[] => clone(SEED_PRICING.lotCategories);

/** Find a row by mode (every test's document has the four modes). */
const row = (pricing: PlanPricing, table: "regular" | "senior", mode: string) =>
  pricing[table].find((r) => r.mode === mode)!;

describe("plan-table validation", () => {
  it("accepts the recorded 2026 seed", () => {
    expect(checkPlanPricing(plan())).toBeNull();
  });

  it("refuses a term column that breaks the schedule ratio (the ₱500 → ₱600 defect)", () => {
    const pricing = plan();
    // The regression the repo was founded on: a monthly figure that does not
    // agree with the annual row (here the former ₱500 Bronze-1 monthly).
    row(pricing, "regular", "Monthly").bronze1 = 700;
    const error = checkPlanPricing(pricing);
    expect(error).toMatch(/monthly/i);
    expect(error).toMatch(/× 12/);
    expect(error).toMatch(/7,200/);
    // Quarterly and semi-annual are checked against the annual row too.
    const q = plan();
    row(q, "regular", "Quarterly").gold = 4500;
    expect(checkPlanPricing(q)).toMatch(/× 4/);
    const s = plan();
    row(s, "regular", "Semi-annual").gold = 9000;
    expect(checkPlanPricing(s)).toMatch(/× 2/);
  });

  it("refuses a senior figure above the regular figure for the same cell", () => {
    const pricing = plan();
    row(pricing, "senior", "Monthly").bronze1 = 700; // regular monthly is 600
    const error = checkPlanPricing(pricing);
    expect(error).toMatch(/must not exceed/);
    // Equality is fine when the whole column agrees: copy the regular Bronze 1
    // schedule into the senior table cell by cell.
    const equal = plan();
    const regular = row(equal, "regular", "Monthly").bronze1;
    for (const term of PLAN_TERM_DEFS) {
      row(equal, "senior", term.mode).bronze1 = row(equal, "regular", term.mode).bronze1;
    }
    expect(row(equal, "senior", "Monthly").bronze1).toBe(regular);
    expect(checkPlanPricing(equal)).toBeNull();
  });

  it("requires every payment mode exactly once in both tables", () => {
    const missing = plan();
    missing.regular = missing.regular.filter((r) => r.mode !== "Monthly");
    expect(checkPlanPricing(missing)).toMatch(/missing the Monthly row/);

    const duped = plan();
    duped.senior = duped.senior.map((r) =>
      r.mode === "Semi-annual" ? { ...r, mode: "Quarterly" } : r,
    );
    const error = checkPlanPricing(duped);
    expect(error).toMatch(/appears twice|expected 4/);
  });

  it("refuses a fractional or negative amount with a plain sentence", () => {
    const fractional = validatePlanPricingDraft({
      regular: plan().regular.map((r) =>
        r.mode === "Monthly" ? { ...r, bronze1: 600.5 } : r,
      ),
      senior: plan().senior,
    });
    expect(fractional.ok).toBe(false);
    if (!fractional.ok) expect(fractional.error).toMatch(/whole number of pesos/);

    const negative = validatePlanPricingDraft({
      regular: plan().regular.map((r) => (r.mode === "Monthly" ? { ...r, gold: -1 } : r)),
      senior: plan().senior,
    });
    expect(negative.ok).toBe(false);
  });

  it("returns the checked tables when the draft is valid", () => {
    const verdict = validatePlanPricingDraft(plan());
    expect(verdict.ok).toBe(true);
    if (verdict.ok) {
      expect(verdict.value.regular.find((r) => r.mode === "Monthly")!.bronze1).toBe(600);
    }
  });

  it("keeps one term definition (four modes, the schedule's ratios)", () => {
    expect(PLAN_TERM_DEFS.map((t) => t.mode)).toEqual([
      "Monthly",
      "Quarterly",
      "Semi-annual",
      "Annual",
    ]);
    expect(PLAN_TERM_DEFS.map((t) => t.paymentsPerYear)).toEqual([12, 4, 2, 1]);
  });
});

describe("lot-table validation", () => {
  it("accepts the recorded 2026 seed", () => {
    expect(checkLotCategories(lots())).toBeNull();
  });

  it("refuses a selling price whose six-year annual schedule misses it", () => {
    const categories = lots();
    const target = categories[0].rows.find((r) => r.product === "Prime Lots")!;
    target.regular.selling = 130000; // annual stays 21,333 → × 6 = 127,998
    const error = checkLotCategories(categories);
    expect(error).toMatch(/six-year amortization/);
    expect(error).toMatch(/127,998/);
  });

  it("allows the sheet's documented rounding (≤ ₱3) but not more", () => {
    const within = lots();
    // 112,521 sells; the sheet prints the senior annual as 18,753 (× 6 = 112,518
    // → ₱3 short — the exact rounding the client printed).
    const prime = within[0].rows.find((r) => r.product === "Prime Lots")!;
    prime.senior.selling = 112521;
    prime.senior.annual = 18753;
    expect(Math.abs(prime.senior.annual * 6 - prime.senior.selling)).toBe(
      LOT_AMORTIZATION_ROUNDING,
    );
    expect(checkLotCategories(within)).toBeNull();

    const beyond = lots();
    const over = beyond[0].rows.find((r) => r.product === "Prime Lots")!;
    over.regular.selling = 128000;
    over.regular.annual = 21000; // × 6 = 126,000 → ₱2,000 short
    expect(checkLotCategories(beyond)).toMatch(/six-year amortization/);
  });

  it("refuses a monthly installment that can never pay the lot", () => {
    // The 2026-09-21 review's monthly/total finding. The sheet's monthly is not
    // selling ÷ 72 (it carries a financing cost), so the rule enforced here is the lower
    // bound the sheet DOES keep: six years of the monthly must cover the contract price.
    const categories = lots();
    const target = categories[0].rows.find((r) => r.product === "Prime Lots")!;
    target.regular.monthly = 1000; // 1,000 × 72 = 72,000 < 128,000
    target.senior.monthly = 900; // keep senior ≤ regular so this rule is the one reported
    const error = checkLotCategories(categories);
    expect(error).toMatch(/can never pay the lot/);
    expect(error).toMatch(/72,000/);
  });

  it("refuses a senior figure above the regular figure, cell by cell", () => {
    const selling = lots();
    selling[0].rows[0].senior.selling = selling[0].rows[0].regular.selling + 1;
    expect(checkLotCategories(selling)).toMatch(/must not exceed/);

    const monthly = lots();
    monthly[1].rows[2].senior.monthly = monthly[1].rows[2].regular.monthly + 1;
    expect(checkLotCategories(monthly)).toMatch(/must not exceed/);
  });

  it("refuses duplicate family titles and duplicate product names inside a family", () => {
    const duplicatedFamily = lots();
    duplicatedFamily[1].title = duplicatedFamily[0].title;
    expect(checkLotCategories(duplicatedFamily)).toMatch(/must be unique/);

    const duplicatedProduct = lots();
    duplicatedProduct[0].rows[1].product = duplicatedProduct[0].rows[0].product;
    expect(checkLotCategories(duplicatedProduct)).toMatch(/twice/);
  });

  it("refuses fractional amounts and a missing term in the draft shape", () => {
    const fractional = validateLotCategoriesDraft(
      lots().map((c, i) =>
        i === 0
          ? {
              ...c,
              rows: c.rows.map((r, j) =>
                j === 0
                  ? { ...r, regular: { ...r.regular, monthly: r.regular.monthly + 0.25 } }
                  : r,
              ),
            }
          : c,
      ),
    );
    expect(fractional.ok).toBe(false);
    if (!fractional.ok) expect(fractional.error).toMatch(/whole number of pesos/);

    const missingTerm = clone(lots());
    const broken = missingTerm[0].rows[0].regular as Record<string, unknown>;
    delete broken.quarter;
    const verdict = validateLotCategoriesDraft(missingTerm);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/quarter/);
  });

  it("requires at least one family and at least one row per family", () => {
    expect(checkLotCategories([])).toMatch(/at least one lot family/i);

    const emptyFamily = validateLotCategoriesDraft([{ title: "Empty", caption: "", rows: [] }]);
    expect(emptyFamily.ok).toBe(false);
    if (!emptyFamily.ok) expect(emptyFamily.error).toMatch(/at least one product row/);
  });
});

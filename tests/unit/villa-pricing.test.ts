/**
 * Villa Memorial Plan pricing invariants.
 *
 * Regression home for the ₱500 → ₱600 defect: the client's payment-mode sheets
 * (COMPLETE MEMORIAL PACKAGE.jpg standard, TYPES OF COFFIN.jpg senior) publish
 * one amount per tier per term, and the four term columns must stay in the
 * exact ratio of the schedule (annual × 1 = semi-annual × 2 = quarterly × 4 =
 * monthly × 12). A transcription slip such as the former Bronze-1 monthly of
 * ₱500 breaks that ratio while still rendering happily — which is why the
 * fixture-contract test (which reads the same module) could not catch it.
 */
import { describe, expect, it } from "vitest";
import {
  LOT_PRICE_CATEGORIES,
  PLAN_TERMS,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  VMP_INCLUSIONS,
  VMP_PACKAGE,
  VMP_PAYMENTS,
  php2,
  planRate,
  planTermOptions,
} from "@/lib/villa-pricing";

describe("Villa Memorial Plan payment-mode tables", () => {
  it("publishes the client's Bronze 1 monthly rate (₱600, not ₱500)", () => {
    expect(planRate("bronze1", "monthly")).toBe(600);
    expect(planRate("bronze1", "monthly", true)).toBe(550);
  });

  it("keeps every term column in the schedule's ratio", () => {
    for (const rows of [VMP_PAYMENTS, SENIOR_PAYMENTS]) {
      const annual = rows.find((r) => r.mode === "Annual");
      const semi = rows.find((r) => r.mode === "Semi-annual");
      const quarterly = rows.find((r) => r.mode === "Quarterly");
      const monthly = rows.find((r) => r.mode === "Monthly");
      expect(annual && semi && quarterly && monthly).toBeTruthy();
      for (const tier of PLAN_TIERS.map((t) => t.id)) {
        expect(annual![tier]).toBe(monthly![tier] * 12);
        expect(annual![tier]).toBe(semi![tier] * 2);
        expect(annual![tier]).toBe(quarterly![tier] * 4);
      }
    }
  });

  it("exposes one selector option per term, priced from the table", () => {
    const options = planTermOptions("silver1");
    expect(options.map((o) => o.term)).toEqual(PLAN_TERMS.map((t) => t.id));
    expect(options).toEqual([
      { term: "monthly", label: "Monthly", per: "/ month", amount: 1000 },
      { term: "quarterly", label: "Quarterly", per: "/ quarter", amount: 3000 },
      { term: "semi", label: "Semi-Annual", per: "/ semi-annual", amount: 6000 },
      { term: "annual", label: "Annual", per: "/ year", amount: 12000 },
    ]);
  });

  it("formats plan money with centavos (₱600.00)", () => {
    expect(php2(600)).toBe("₱600.00");
    expect(php2(18240)).toBe("₱18,240.00");
  });
});

describe("2026 price list structure", () => {
  it("carries the client's four product families with five products each (3 mausoleum variants)", () => {
    expect(LOT_PRICE_CATEGORIES.map((c) => c.title)).toEqual([
      "1. Lot Only",
      "2. Lot + Interment (1st Burial Only)",
      "3. Lot + Interment + VMP",
      "4. Mausoleum + Construction",
    ]);
    expect(LOT_PRICE_CATEGORIES.slice(0, 3).map((c) => c.rows.length)).toEqual([5, 5, 5]);
    expect(LOT_PRICE_CATEGORIES[3].rows.length).toBe(3);
  });

  it("keeps lot amortization at six years for every product (annual × 6 ≈ selling)", () => {
    for (const category of LOT_PRICE_CATEGORIES) {
      for (const row of category.rows) {
        // The sheet prints rounded schedules (e.g. ₱112,521 senior selling vs
        // ₱18,753 × 6 = ₱112,518), so allow the rounding drift the client printed.
        expect(Math.abs(row.regular.annual * 6 - row.regular.selling)).toBeLessThanOrEqual(3);
        expect(Math.abs(row.senior.annual * 6 - row.senior.selling)).toBeLessThanOrEqual(3);
      }
    }
  });

  it("shows five package inclusions (four service blocks + flowers/tarpaulin)", () => {
    expect(VMP_INCLUSIONS).toHaveLength(5);
    expect(VMP_INCLUSIONS.slice(0, 4)).toEqual(VMP_PACKAGE);
    expect(VMP_INCLUSIONS[4].service).toMatch(/flowers/i);
  });
});

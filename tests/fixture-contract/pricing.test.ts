import { describe, expect, it } from "vitest";
import pricingFile from "@/lib/fixtures/commerce/pricing.json";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import { readPricingQuestions } from "@/lib/pricing-model";
import {
  LOT_PRICE_CATEGORIES,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  SEED_PRICING,
  VMP_PAYMENTS,
} from "@/lib/villa-pricing";

/**
 * Fixture-contract tests for the PRICING store seed
 * (lib/fixtures/commerce/pricing.json).
 *
 * The seed is app-recorded sheet content, not a service response: no
 * catalog-pricing contract exists (see lib/api-client/pricing.ts), so these
 * tests pin it to (a) the module's validated re-exports the static surfaces read,
 * (b) the recorded commerce catalogue's plan monthly amounts — the same figure
 * must appear in both places — and (c) the two open client questions that must
 * stay visible and outside the editable document.
 */

const RAW = pricingFile as unknown as Record<string, unknown>;
const CATALOG = catalogFile as unknown as { items: Array<{ sku: string; unit_price_cents: number }> };

function catalogPriceCents(sku: string): number {
  const item = CATALOG.items.find((i) => i.sku === sku);
  expect(item, `catalogue item ${sku}`).toBeTruthy();
  return item!.unit_price_cents;
}

const monthlyOf = (rows: typeof VMP_PAYMENTS, tier: (typeof PLAN_TIERS)[number]["id"]) =>
  rows.find((r) => r.mode === "Monthly")![tier];

describe("the pricing seed records the client's 2026 sheets", () => {
  it("carries provenance and the four editable slices", () => {
    expect(RAW._provenance).toBeTruthy();
    expect(RAW.version).toBe(1);
    expect(RAW.updated_at).toBeNull();
    expect(Object.keys(SEED_PRICING.plans)).toEqual(["regular", "senior"]);
    expect(SEED_PRICING.plans.regular).toHaveLength(4);
    expect(SEED_PRICING.plans.senior).toHaveLength(4);
    expect(SEED_PRICING.lotCategories).toHaveLength(4);
  });

  it("is the same document lib/villa-pricing.ts re-exports to static surfaces", () => {
    // The seed is read once and validated at import (assertPricingDocument); the
    // three legacy exports must be the seed's own values, so a static picker can
    // never contradict the store.
    expect(VMP_PAYMENTS).toEqual(SEED_PRICING.plans.regular);
    expect(SENIOR_PAYMENTS).toEqual(SEED_PRICING.plans.senior);
    expect(LOT_PRICE_CATEGORIES).toEqual(SEED_PRICING.lotCategories);
  });

  it("keeps the plan monthly figures equal to the recorded catalogue's plan SKUs", () => {
    // The storefront sells the monthly amortization: the catalogue seed and the
    // price-list seed must not drift. The three cart tiers:
    expect(monthlyOf(VMP_PAYMENTS, "bronze1") * 100).toBe(catalogPriceCents("PKG-BASIC"));
    expect(monthlyOf(VMP_PAYMENTS, "silver1") * 100).toBe(catalogPriceCents("PKG-STANDARD"));
    expect(monthlyOf(VMP_PAYMENTS, "gold") * 100).toBe(catalogPriceCents("PKG-PREMIUM"));
  });

  it("keeps every family's product rows unique and priced (no blank cell)", () => {
    for (const category of SEED_PRICING.lotCategories) {
      const names = category.rows.map((r) => r.product);
      expect(new Set(names).size, `${category.title} product names`).toBe(names.length);
      for (const row of category.rows) {
        for (const term of ["selling", "annual", "semi", "quarter", "monthly"] as const) {
          expect(row.regular[term], `${row.product} regular ${term}`).toBeGreaterThan(0);
          expect(row.senior[term], `${row.product} senior ${term}`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("the open client questions stay visible and outside the editable document", () => {
  const questions = readPricingQuestions(RAW.questions);

  it("carries both flagged conflicts with their screens and sources", () => {
    expect(questions.map((q) => q.id)).toEqual([
      "senior-rate-sheet-conflict",
      "lot-a001-fixture-vs-sheet",
    ]);
    expect(questions.find((q) => q.id === "senior-rate-sheet-conflict")!.scope).toBe("plans");
    expect(questions.find((q) => q.id === "senior-rate-sheet-conflict")!.detail).toMatch(
      /₱1,800 \/ ₱4,200/,
    );
    expect(questions.find((q) => q.id === "lot-a001-fixture-vs-sheet")!.scope).toBe("lots");
    expect(questions.find((q) => q.id === "lot-a001-fixture-vs-sheet")!.detail).toMatch(/A-001/);
    expect(questions.find((q) => q.id === "lot-a001-fixture-vs-sheet")!.detail).toMatch(/₱85,000/);
  });

  it("is not part of the stored document shape (a save can never drop one)", () => {
    expect("questions" in SEED_PRICING).toBe(false);
    // The seed's own document fields are exactly version/updated_at/updated_by/plans/lotCategories.
    expect(Object.keys(SEED_PRICING).sort()).toEqual(
      ["lotCategories", "plans", "updated_at", "updated_by", "version"].sort(),
    );
  });
});

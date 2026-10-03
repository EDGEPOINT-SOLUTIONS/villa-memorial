import { describe, expect, it } from "vitest";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import pricingFile from "@/lib/fixtures/commerce/pricing.json";
import seedFile from "@/lib/fixtures/lifecycle/engagements.json";
import { planRateOf } from "@/lib/pricing-model";
import { SEED_PRICING } from "@/lib/villa-pricing";

/**
 * Lifecycle fixture contract.
 *
 * No contract under docs/08-delivery/contracts/ names a lifecycle / engagement
 * record — the shape is PROVISIONAL (a plan membership, a booked service, a
 * product sale, a monthly-paid lot). These tests pin what the recorded demo rows
 * DO promise while it waits:
 *
 *  - every figure is the client's own 2026 sheet figure: a plan's amount is the
 *    published ANNUAL total for its tier (`planRateOf`), every product/service
 *    amount is the catalogue line's own SRP, and a lot's amount is the lot
 *    sheet's `selling` figure for its family;
 *  - the amortization data is coherent (whole amounts, at least one installment,
 *    a real first due date), and the schedule is DERIVED, never stored;
 *  - ids and references are unique, so a recording can never collide.
 */

type EngagementSeed = {
  id: string;
  reference: string;
  kind: "plan" | "service" | "lot" | "product";
  item: { sku: string; name: string };
  amount_cents: number;
  mode: string;
  installments: number;
  first_due_on: string;
};

const engagements = (seedFile as { engagements: EngagementSeed[] }).engagements;

const catalogBySku = new Map(
  (catalogFile as { items: Array<{ sku: string; unit_price_cents: number }> }).items.map((item) => [
    item.sku,
    item.unit_price_cents,
  ]),
);

type LotRow = {
  product: string;
  regular: { selling: number };
};
const lotSellingByFamily = new Map(
  ((pricingFile as { lotCategories: Array<{ title: string; rows: LotRow[] }> }).lotCategories.find(
    (category) => category.title.startsWith("1."),
  )?.rows ?? []).map((row) => [row.product, row.regular.selling] as const),
);

const PLAN_SKUS: Record<string, string> = {
  "PLAN-SILVER2-ANNUAL": "silver2",
  "PLAN-GOLD-ANNUAL": "gold",
  "PLAN-SILVER1-ANNUAL": "silver1",
  "PLAN-BRONZE2-ANNUAL": "bronze2",
};

const LOT_FAMILIES: Record<string, string> = {
  "LOT-CONDO-2.5": "Condo-type",
  "LOT-NICHE-12": "Garden Niches",
};

describe("lifecycle seed — every figure is the client's own sheet figure", () => {
  it("pins every plan amount to the published annual figure for its tier", () => {
    const plans = engagements.filter((row) => row.kind === "plan");
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      const tier = PLAN_SKUS[plan.item.sku];
      expect(tier, `plan ${plan.reference} maps to a tier`).toBeTruthy();
      expect(plan.amount_cents, `${plan.reference} (${plan.item.name})`).toBe(
        planRateOf(SEED_PRICING.plans, tier as never, "annual", false) * 100,
      );
    }
  });

  it("pins every product and single service line to its catalogue SRP", () => {
    for (const row of engagements) {
      if (row.kind === "plan" || row.kind === "lot") continue;
      if (row.item.sku === "CHP-COMMON-DAY") {
        // Two days of the common chapel: the sheet's per-day line × 2.
        expect(row.amount_cents).toBe((catalogBySku.get("CHP-COMMON-DAY") ?? 0) * 2);
        continue;
      }
      const price = catalogBySku.get(row.item.sku);
      expect(price, `${row.reference} names a catalogue line`).toBeTruthy();
      expect(row.amount_cents, `${row.reference} (${row.item.name})`).toBe(price);
    }
  });

  it("pins every lot amount to the lot sheet's selling figure for its family", () => {
    const lots = engagements.filter((row) => row.kind === "lot");
    expect(lots.length).toBeGreaterThan(0);
    for (const lot of lots) {
      const family = LOT_FAMILIES[lot.item.sku];
      expect(family, `lot ${lot.reference} maps to a family`).toBeTruthy();
      expect(lot.amount_cents, `${lot.reference} (${lot.item.name})`).toBe(
        (lotSellingByFamily.get(family as string) ?? 0) * 100,
      );
    }
  });
});

describe("lifecycle seed — the amortization data is coherent", () => {
  it("carries a whole amount, a real installment count and a real first due date", () => {
    for (const row of engagements) {
      expect(Number.isInteger(row.amount_cents) && row.amount_cents > 0, row.reference).toBe(true);
      expect(Number.isInteger(row.installments) && row.installments >= 1, row.reference).toBe(true);
      if (row.mode !== "one_time") {
        expect(row.installments, `${row.reference} is term-paid`).toBeGreaterThanOrEqual(1);
      } else {
        expect(row.installments, `${row.reference} is one-time`).toBe(1);
      }
      expect(row.first_due_on, row.reference).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps every id and reference unique", () => {
    expect(new Set(engagements.map((row) => row.id)).size).toBe(engagements.length);
    expect(new Set(engagements.map((row) => row.reference)).size).toBe(engagements.length);
  });
});

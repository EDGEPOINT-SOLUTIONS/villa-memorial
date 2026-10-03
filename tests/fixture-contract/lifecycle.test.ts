import { describe, expect, it } from "vitest";
import pricingFile from "@/lib/fixtures/commerce/pricing.json";
import catalogFile from "@/lib/fixtures/commerce/catalog-items.json";
import seedFile from "@/lib/fixtures/lifecycle/engagements.json";
import { planRateOf } from "@/lib/pricing-model";
import { SEED_PRICING } from "@/lib/villa-pricing";

/**
 * Lifecycle fixture contract.
 *
 * No contract under docs/08-delivery/contracts/ names a lifecycle / engagement
 * record — the shape is PROVISIONAL (a plan membership, a booked service, a
 * product sale, a monthly-paid lot).
 *
 * CLEAN START (captain, 2026-10-02/03): the recorded demo engagements and payments
 * are REMOVED. The four registers (/staff/members, /staff/services, /staff/lots,
 * /staff/products) begin empty; the office records an outcome through
 * /api/staff/lifecycle when a prospect decides. The notice templates remain as the
 * office's own configuration. The figures those outcomes must use are still the
 * client's own 2026 sheets, and the helpers below pin the sources they read.
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
const noticeTemplates = (seedFile as { notice_templates: Array<{ id: string; active: boolean }> })
  .notice_templates;

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

describe("lifecycle seed starts clean", () => {
  it("carries no recorded engagements or payments", () => {
    expect(engagements).toEqual([]);
    expect((seedFile as { payments: unknown[] }).payments).toEqual([]);
  });

  it("keeps the office's notice templates as configuration", () => {
    expect(noticeTemplates.length).toBeGreaterThan(0);
    for (const template of noticeTemplates) {
      expect(template.id.length).toBeGreaterThan(0);
      expect(typeof template.active).toBe("boolean");
    }
  });

  it("still resolves the client's own 2026 figures an outcome must use", () => {
    // A plan's annual total, a catalogue line's SRP and a lot family's selling
    // figure all remain readable — the outcome pages quote these, not invented sums.
    expect(planRateOf(SEED_PRICING.plans, "silver2", "annual", false)).toBeGreaterThan(0);
    expect(catalogBySku.size).toBeGreaterThan(0);
    expect(lotSellingByFamily.size).toBeGreaterThan(0);
  });
});

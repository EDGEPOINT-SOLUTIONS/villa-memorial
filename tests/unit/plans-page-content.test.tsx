import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PlansPage from "@/app/(public)/plans/page";
import PriceListPage from "@/app/(public)/price-list/page";
import {
  getPageDocument,
  savePageDocument,
  seedPageDocuments,
} from "@/lib/api-client/content-pages";
import type { ContentBlock } from "@/lib/content-catalog";

/**
 * The Plans page's content home (Phase 2 of the content-catalogue plan,
 * data/villa-content-catalog-plan/report.md §9/§11):
 *
 *   · the five tiers and their per-tier inclusion checklists are the "Villa
 *     Memorial Plan" page document, so a save in Pages & content is what the
 *     next visitor reads;
 *   · each tier renders as ONE premium card (captain 2026-09-21): name ·
 *     "Starting from" · the live monthly rate · a one-line description · one
 *     enquiry action · the inclusion list PRINTED under "Key features:" (never
 *     a dropdown), with an optional staff-attached photo;
 *   · the package details, eligibility, senior terms and the four plan notes
 *     moved to the consolidated /price-list page (captain's 2026-09-21
 *     addendum) — net /plans is the hero + the five tier cards + two chips;
 *   · the rates stay a LIVE read of the pricing store (that edit reaching the
 *     price list is pinned by tests/unit/pricing-admin-render.test.tsx);
 *   · the mixed 42-item catalogue left the page.
 */

function tier(
  document: Awaited<ReturnType<typeof getPageDocument>>,
  id: string,
): Extract<ContentBlock, { type: "checklist" }> {
  const block = document?.blocks.find((entry) => entry.id === id);
  if (!block || block.type !== "checklist") throw new Error(`missing checklist ${id}`);
  return block;
}

describe("the Plans page content home", () => {
  it("renders the seed's five tiers as one printed-column card each", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    for (const heading of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html, heading).toContain(heading);
    }
    // One row of five cards on desktop (the wrap ladder is pinned by
    // tests/unit/plans-tiers-layout.test.ts).
    expect(html).toContain('class="plan-tiers"');
    expect((html.match(/class="plan-tier[ "]/g) ?? []).length).toBe(5);
    // The inclusion checklist prints IN the card — never a disclosure.
    expect(html).not.toContain("<details");
    expect((html.match(/class="plan-tier__features"/g) ?? []).length).toBe(5);
    expect((html.match(/Key features:/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(html).toContain("Complete memorial package");
    // The captain's card anatomy: a "Starting from" subtitle, a live rate, a
    // one-line description read from the block, and one enquiry action.
    expect(html).toContain("Starting from");
    expect(html).toContain("per month · regular rate");
    expect(html).toContain("Wooden or metal coffin with a smooth finish");
    expect((html.match(/Ask about this plan/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect((html.match(/class="btn btn--accent"/g) ?? []).length).toBe(5);
  });

  it("renders a tier photo when the document attaches one, text-only otherwise", async () => {
    const seed = seedPageDocuments().find((doc) => doc.key === "plans");
    expect(seed, "the plans seed").toBeTruthy();
    const edited = structuredClone(seed!);
    const gold = edited.blocks.find((block) => block.id === "plans-tier-gold");
    if (!gold || gold.type !== "checklist") throw new Error("missing gold checklist");
    gold.image = {
      id: "plans-gold-photo",
      src: "/media/client/casket-white-gold-wreath-lid-card-440.webp",
      alt: "Gold tier coffin",
      caption: null,
      sample: false,
    };

    await savePageDocument("plans", edited, "Sam Staff");
    const html = renderToStaticMarkup(await PlansPage());
    // The card grows a media panel; the other four stay text-only.
    expect((html.match(/class="plan-tier plan-tier--media"/g) ?? []).length).toBe(1);
    expect(html).toContain("/media/client/casket-white-gold-wreath-lid-card-440.webp");
    expect(html).toContain('alt="Gold tier coffin"');
  });

  it("moves the package details, eligibility, senior terms and notes to /price-list", async () => {
    const plans = renderToStaticMarkup(await PlansPage());
    // Net /plans: the hero and the five tier cards carry no plan-terms blocks.
    expect(plans).not.toContain('id="package-details"');
    expect(plans).not.toContain("Complete memorial package includes");
    expect(plans).not.toContain("Eligibility for the regular rate");
    expect(plans).not.toContain("Inception date is 30 days after payment.");

    // The consolidated Price list carries the same document copy instead.
    const priceList = renderToStaticMarkup(await PriceListPage());
    expect(priceList).toContain("Retrieval &amp; delivery");
    expect(priceList).toContain("Age 1–60 years old");
    expect(priceList).toContain("Must be 61–100 years old");
    expect(priceList).toContain("Inception date is 30 days after payment.");
    expect(priceList).toContain("Transfer/assignment fee is ₱1,000.");
    expect(priceList).toContain("All packages include FREE flowers and a tarpaulin.");
    expect(priceList).toContain("Amortization can be adjusted to 8 years and 10 years.");
  });

  it("reads each tier's own monthly rate live from the pricing store", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    // The seed's Bronze 1 regular monthly rate is ₱600.00 (villa-pricing test).
    expect(html).toContain("₱600.00");
    expect(html).toContain("Starting from");
  });

  it("prints a saved checklist edit on the next request", async () => {
    const seed = seedPageDocuments().find((doc) => doc.key === "plans");
    expect(seed, "the plans seed").toBeTruthy();
    const edited = structuredClone(seed!);
    const gold = edited.blocks.find((block) => block.id === "plans-tier-gold");
    if (!gold || gold.type !== "checklist") throw new Error("missing gold checklist");
    gold.items = [
      ...gold.items,
      { id: "plans-gold-carriage", label: "A horse-drawn carriage", checked: true },
    ];

    await savePageDocument("plans", edited, "Sam Staff");
    const html = renderToStaticMarkup(await PlansPage());
    expect(html).toContain("A horse-drawn carriage");
  });

  it("keeps the document readable after a save", async () => {
    const plans = await getPageDocument("plans");
    expect(plans?.key).toBe("plans");
    // The tier helper is exercised so a renamed/removed tier fails loudly.
    expect(tier(plans, "plans-tier-bronze1").items.length).toBeGreaterThan(0);
  });
});

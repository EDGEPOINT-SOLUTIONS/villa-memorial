import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PlansPage from "@/app/(public)/plans/page";
import PriceListPage from "@/app/(public)/price-list/page";
import {
  getPageDocument,
  savePageDocument,
  seedPageDocuments,
} from "@/lib/api-client/content-pages";

/**
 * The Plans page's anatomy and content home (rebuilt 2026-09-30 by
 * `villa-plans-redesign-plan`; the captain approved the Revision 4 board:
 * "Im good with the plans page, please implement it").
 *
 * The page is now ONE complete pricing surface:
 *   · the five tier columns — equal height, one whole 3:2 coffin photograph
 *     each, the LIVE regular monthly figure and its annual equivalent, the lid
 *     and the cash assistance, one gold enquiry;
 *   · the comparison matrix — the coffin, the four regular terms, the four
 *     senior terms and the cash assistance (no toggle: every mode is visible);
 *   · the shared inclusions — printed ONCE (the client's per-tier checklists are
 *     identical, so a per-column repeat would be dishonest as well as noisy);
 *   · the three add-ons and the FAQ accordion.
 *
 * The rates stay a LIVE read of the pricing store; the tier names and one-line
 * descriptions are the editable "Villa Memorial Plan" page document, read
 * through `lib/plan-content.ts`. `/price-list` keeps the full 2026 sheets.
 */

const TIER_IDS = ["bronze1", "bronze2", "silver1", "silver2", "gold"] as const;

function tierBlock(document: Awaited<ReturnType<typeof getPageDocument>>, id: string) {
  const block = document?.blocks.find((entry) => entry.id === `plans-tier-${id}`);
  if (!block || block.type !== "checklist") throw new Error(`missing checklist plans-tier-${id}`);
  return block;
}

describe("the Plans page pricing surface", () => {
  it("renders the seed's five tiers as one equal-height column each", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    for (const heading of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html, heading).toContain(heading);
    }
    expect(html).toContain('class="plan-tiers"');
    expect((html.match(/class="plan-tier"/g) ?? []).length).toBe(5);
    expect((html.match(/class="plan-tier__price"/g) ?? []).length).toBe(5);
    // One whole coffin photograph per tier.
    expect((html.match(/class="plan-tier__media"/g) ?? []).length).toBe(5);
    expect(html).toContain("/media/client/casket-white-closed-wide-960.webp");
    // One gold enquiry per tier — the per-item rung.
    expect((html.match(/Ask about this plan/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect((html.match(/class="btn btn--accent"/g) ?? []).length).toBe(5);
  });

  it("prints one live monthly figure and its annual equivalent per tier, whole pesos", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    // The seed's Bronze 1 regular monthly rate is ₱600; the annual is ₱7,200.
    expect(html).toContain("₱600");
    expect(html).toContain("₱7,200 a year");
    // The unrecorded plan term is named exactly once, in the band note.
    expect(
      (html.match(/Payment term pending Villa Funeraria confirmation/g) ?? []).length,
    ).toBe(1);
  });

  it("compares every term and both rate classes in the matrix, with the cash assistance", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    expect(html).toContain("The coffin");
    expect(html).toContain("Your rate — regular");
    expect(html).toContain("Senior citizen rate — ages 61–100, no insurance benefit");
    expect(html).toContain("Cash assistance with hospital benefit");
    // A senior figure that is not a regular figure, and the per-tier cash table.
    expect(html).toContain("₱550");
    expect(html).toContain("₱30,000");
    // Every tier column is addressable for the tier↔matrix reading aid.
    expect((html.match(/data-plan-col="4"/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("prints the shared inclusions ONCE and the FAQ as an accordion", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    // The eight inclusions render once — never five times.
    expect((html.match(/Complete memorial package<\/span>/g) ?? []).length).toBe(1);
    expect(html).toContain("plan-included__list");
    // The FAQ is a native `<details>` accordion (no client state).
    expect((html.match(/<details class="plan-faq__item"/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(html).toContain("Who can apply for the regular rate?");
  });

  it("renders the three add-on cross-sells", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    expect(html).toContain("The services, by the piece");
    expect(html).toContain("A place in the park");
    expect(html).toContain("The chapel");
    expect(html).toContain('href="/services"');
    expect(html).toContain('href="/lots/price-list-2026"');
    expect(html).toContain('href="/facilities"');
  });

  it("reads a saved tier description on the next request", async () => {
    const seed = seedPageDocuments().find((doc) => doc.key === "plans");
    expect(seed, "the plans seed").toBeTruthy();
    const edited = structuredClone(seed!);
    const gold = edited.blocks.find((block) => block.id === "plans-tier-gold");
    if (!gold || gold.type !== "checklist") throw new Error("missing gold checklist");
    gold.summary = "A bespoke gold coffin, finished for the family.";

    await savePageDocument("plans", edited, "Sam Staff");
    const html = renderToStaticMarkup(await PlansPage());
    expect(html).toContain("A bespoke gold coffin");
  });

  it("prints an inclusion shared by every tier in the shared band", async () => {
    const seed = seedPageDocuments().find((doc) => doc.key === "plans");
    expect(seed, "the plans seed").toBeTruthy();
    const edited = structuredClone(seed!);
    for (const id of TIER_IDS) {
      const block = edited.blocks.find((entry) => entry.id === `plans-tier-${id}`);
      if (block && block.type === "checklist") {
        block.items = [
          ...block.items,
          { id: "plans-shared-carriage", label: "A horse-drawn carriage", checked: true },
        ];
      }
    }

    await savePageDocument("plans", edited, "Sam Staff");
    const html = renderToStaticMarkup(await PlansPage());
    expect(html).toContain("A horse-drawn carriage");
    // Shared by every tier, so it prints exactly once.
    expect((html.match(/A horse-drawn carriage/g) ?? []).length).toBe(1);
  });

  it("keeps the document readable after a save", async () => {
    const plans = await getPageDocument("plans");
    expect(plans?.key).toBe("plans");
    expect(tierBlock(plans, "bronze1").items.length).toBeGreaterThan(0);
  });
});

describe("the price list keeps the 2026 sheets and links back to the plan", () => {
  it("still carries the package inclusions and the full schedules", async () => {
    const priceList = renderToStaticMarkup(await PriceListPage());
    expect(priceList).toContain("Retrieval &amp; delivery");
    expect(priceList).toContain("Age 1–60 years old");
    expect(priceList).toContain("Must be 61–100 years old");
    expect(priceList).toContain("Inception date is 30 days after payment.");
    expect(priceList).toContain("Transfer/assignment fee is ₱1,000.");
    expect(priceList).toContain("All packages include FREE flowers and a tarpaulin.");
    expect(priceList).toContain("Amortization can be adjusted to 8 years and 10 years.");
    // It links back to the plan page.
    expect(priceList).toContain('href="/plans"');
  });
});

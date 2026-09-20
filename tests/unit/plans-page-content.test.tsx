import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PlansPage from "@/app/(public)/plans/page";
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
 *   · the package details, eligibility and notes come from the same document;
 *   · the rates stay a LIVE read of the pricing store (that edit reaching the
 *     page is pinned by tests/unit/pricing-admin-render.test.tsx);
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
  it("renders the seed's five tiers and their inclusion checklists", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    for (const heading of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html, heading).toContain(heading);
    }
    // Each tier's checklist is a closed disclosure with its inclusion items.
    expect(html).toContain("Bronze 1 inclusions");
    expect((html.match(/sv-disclosure/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect(html).toContain("Complete memorial package");
  });

  it("prints the package details, eligibility and notes from the document", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    expect(html).toContain("Complete memorial package includes");
    expect(html).toContain("Retrieval &amp; delivery");
    expect(html).toContain("Age 1–60 years old");
    expect(html).toContain("Inception date is 30 days after payment.");
    expect(html).toContain("Transfer/assignment fee is ₱1,000.");
  });

  it("reads each tier's own monthly rate live from the pricing store", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    // The seed's Bronze 1 regular monthly rate is ₱600.00 (villa-pricing test).
    expect(html).toContain("₱600.00");
    expect(html).toContain("Regular rate from");
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

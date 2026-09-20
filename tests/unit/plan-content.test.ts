import { describe, expect, it } from "vitest";
import { seedPageDocuments } from "@/lib/api-client/content-pages";
import { planContentFromDocument } from "@/lib/plan-content";
import { readPageDocument } from "@/lib/content-catalog";

/**
 * The typed reading of the Plans page document (Phase 2). Every plan surface
 * reads the same values through this module, so these invariants are what keep
 * the sub-pages, the staff terms module, the builder and the lot price list
 * from drifting from the editable document.
 */
const seed = seedPageDocuments().find((doc) => doc.key === "plans")!;

describe("planContentFromDocument", () => {
  it("reads the five tiers in the client's order, each with its checklist", () => {
    const content = planContentFromDocument(seed);
    expect(content.tiers.map((tier) => tier.tier)).toEqual([
      "bronze1",
      "bronze2",
      "silver1",
      "silver2",
      "gold",
    ]);
    for (const tier of content.tiers) {
      expect(tier.items.length, tier.heading).toBeGreaterThan(0);
      expect(tier.items.every((item) => item.label.trim().length > 0)).toBe(true);
      // The premium tier card's one-line description is read from the block.
      expect(tier.summary.trim().length, tier.heading).toBeGreaterThan(0);
    }
    // The seed ships text-only cards; a staff-attached photo is optional.
    expect(content.tiers.every((tier) => tier.image === null)).toBe(true);
  });

  it("reads the package inclusions as label/detail pairs", () => {
    const content = planContentFromDocument(seed);
    expect(content.packageInclusions).toHaveLength(5);
    expect(content.packageInclusions[0]).toEqual({
      label: "Retrieval & delivery",
      detail: expect.stringMatching(/first 25 kms/),
    });
    expect(content.packageInclusions.map((row) => row.label)).toContain(
      "Free flowers and tarpaulin",
    );
  });

  it("reads eligibility, senior terms and the five notes", () => {
    const content = planContentFromDocument(seed);
    expect(content.eligibility).toEqual([
      "Age 1–60 years old",
      "In good health",
      "Resident of the Philippines",
    ]);
    expect(content.seniorTerms).toContain("Must be 61–100 years old");
    expect(content.notes.contestability).toMatch(/Contestability period is 7 months/);
    expect(content.notes.assign).toMatch(/assignable and transferable/);
    expect(content.notes.extras).toMatch(/FREE flowers/);
    expect(content.notes.adjust).toMatch(/8 years and 10 years/);
    expect(content.notes.serving).toMatch(/underwritten by Villa Agency/);
  });

  it("returns honest empties for a document that carries none of the blocks", () => {
    const content = planContentFromDocument(readPageDocument({ key: "plans", blocks: [] }));
    expect(content.tiers).toEqual([]);
    expect(content.packageInclusions).toEqual([]);
    expect(content.eligibility).toEqual([]);
    expect(content.notes.contestability).toBe("");
    expect(planContentFromDocument(null).tiers).toEqual([]);
  });

  it("reads a tier's optional image when the document carries one", () => {
    const withImage = readPageDocument({
      key: "plans",
      blocks: [
        {
          id: "plans-tier-gold",
          type: "checklist",
          heading: "Gold",
          mode: "printed",
          summary: "A special metal coffin.",
          image: { id: "i1", src: "/media/client/x-card-440.webp", alt: "A white coffin", caption: null, sample: false },
          items: [{ id: "c1", label: "Flowers", checked: true }],
        },
      ],
    });
    const content = planContentFromDocument(withImage);
    expect(content.tiers).toHaveLength(1);
    expect(content.tiers[0]?.image?.src).toBe("/media/client/x-card-440.webp");
    expect(content.tiers[0]?.summary).toBe("A special metal coffin.");
  });
});

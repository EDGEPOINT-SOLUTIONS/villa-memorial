import { describe, expect, it } from "vitest";
import {
  CONTENT_RATE_REFS,
  PAGE_DOCUMENTS,
  emptyBlock,
  readPageDocument,
  validateCatalogueEntry,
  validatePageDocument,
  type ContentValidationContext,
} from "@/lib/content-catalog";

/**
 * The content catalogue's pure model (Phase 0 of
 * data/villa-content-catalog-plan/report.md): the page-document + entry schema,
 * the shared block vocabulary (a plan tier's checklist is one block), and the
 * rules the store, the BFF route and the editor all run.
 */

const CONTEXT: ContentValidationContext = {
  skus: new Set(["CSK-WHITE-ROSE-FULL", "SRV-EMBALM-3D", "CHP-PRIVATE-DAY"]),
  rateRefs: new Set(CONTENT_RATE_REFS),
};

function parkDocument(overrides: Record<string, unknown> = {}) {
  return {
    key: "park",
    title: "Villa Memorial Park",
    hero: {
      eyebrow: "Interactive park map",
      headline: "Villa Memorial Park",
      lead: "Walk the grounds.",
      image: null,
      background: null,
      backgroundTransparency: 100,
    },
    tabs: [
      { id: "tab-view", label: "Park view", href: "/map", note: null },
      { id: "tab-lots", label: "Lots", href: "/map?tab=lots", note: null },
    ],
    blocks: [],
    entries: [],
    updated_at: null,
    updated_by: null,
    ...overrides,
  };
}

describe("the five page documents", () => {
  it("lists the captain's full names in the approved order", () => {
    expect(PAGE_DOCUMENTS.map((doc) => [doc.key, doc.label])).toEqual([
      ["home", "Home"],
      ["park", "Villa Memorial Park"],
      ["services", "Funeraria Memorial Services"],
      ["plans", "Villa Memorial Plan"],
      ["coffins", "Coffins & caskets"],
    ]);
  });

  it("keeps Home on the landing editor and the park on the page editor with blocks", () => {
    const home = PAGE_DOCUMENTS.find((doc) => doc.key === "home");
    const park = PAGE_DOCUMENTS.find((doc) => doc.key === "park");
    expect(home?.editor).toBe("landing");
    expect(park?.editor).toBe("page");
    expect(park?.blocks).toBe(true);
  });
});

describe("readPageDocument", () => {
  it("drops unknown block types and takes honest defaults", () => {
    const raw = parkDocument({
      blocks: [{ type: "mystery", text: "no" }, { type: "paragraph", heading: "Hi", body: ["There"] }],
      unknown: true,
    });
    const doc = readPageDocument(raw);
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]?.type).toBe("paragraph");
    expect(doc.key).toBe("park");
  });

  it("falls back to the page's own name for the title", () => {
    const doc = readPageDocument({ key: "plans" });
    expect(doc.title).toBe("Villa Memorial Plan");
    expect(doc.hero.backgroundTransparency).toBe(100);
  });
});

describe("validatePageDocument", () => {
  it("accepts the seeded park document", () => {
    const verdict = validatePageDocument(parkDocument(), CONTEXT);
    expect(verdict.ok).toBe(true);
  });

  it("refuses an empty hero headline", () => {
    const verdict = validatePageDocument(
      parkDocument({ hero: { ...parkDocument().hero, headline: "  " } }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("headline");
  });

  it("refuses a tab whose destination is not a route", () => {
    const verdict = validatePageDocument(
      parkDocument({ tabs: [{ id: "x", label: "Bad", href: "javascript:alert(1)", note: null }] }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
  });

  it("refuses a transparent-but-out-of-range hero background transparency", () => {
    const verdict = validatePageDocument(
      parkDocument({ hero: { ...parkDocument().hero, backgroundTransparency: 140 } }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
  });

  it("refuses an emoji anywhere in the authored text", () => {
    const verdict = validatePageDocument(
      parkDocument({ hero: { ...parkDocument().hero, lead: "A quiet place 🌿" } }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("Alegreya");
  });

  it("refuses a price block that names a SKU the catalogue does not carry", () => {
    const verdict = validatePageDocument(
      parkDocument({
        blocks: [{ id: "b1", type: "priceTable", heading: "Prices", binding: { kind: "sku", sku: "GONE-1" }, note: null }],
      }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("GONE-1");
  });

  it("accepts a price block bound to a live SKU and to a plan rate table", () => {
    const verdict = validatePageDocument(
      parkDocument({
        blocks: [
          { id: "b1", type: "priceTable", heading: "Chapel", binding: { kind: "sku", sku: "CHP-PRIVATE-DAY" }, note: null },
          { id: "b2", type: "priceTable", heading: "Plan", binding: { kind: "matrix", ref: "plans.regular" }, note: null },
        ],
      }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(true);
  });

  it("refuses a name the pricing store does not carry as a rate table", () => {
    const verdict = validatePageDocument(
      parkDocument({
        blocks: [{ id: "b1", type: "priceTable", heading: "Plan", binding: { kind: "matrix", ref: "plans.mystery" }, note: null }],
      }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
  });

  it("refuses a sample image without its caption", () => {
    const verdict = validatePageDocument(
      parkDocument({
        blocks: [
          {
            id: "b1",
            type: "gallery",
            heading: "",
            images: [{ id: "i1", src: "/media/x.webp", alt: "A room", caption: null, sample: true }],
          },
        ],
      }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("sample");
  });

  it("refuses a table row that does not match its columns", () => {
    const verdict = validatePageDocument(
      parkDocument({
        blocks: [{ id: "b1", type: "table", heading: "Sizes", caption: null, columns: ["A", "B"], rows: [["one"]] }],
      }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("columns");
  });

  it("refuses a key that is not one of the five documents", () => {
    const verdict = validatePageDocument(parkDocument({ key: "store" }), CONTEXT);
    expect(verdict.ok).toBe(false);
  });
});

describe("the shared block vocabulary", () => {
  it("creates a ready checklist block with one checked inclusion", () => {
    const block = emptyBlock("checklist");
    expect(block.type).toBe("checklist");
    if (block.type === "checklist") {
      // The captain's 2026-09-21 direction: inclusions print in the card, never
      // behind a dropdown — a fresh checklist opens printed.
      expect(block.mode).toBe("printed");
      expect(block.summary).toBe("");
      expect(block.image).toBeNull();
      expect(block.items).toHaveLength(1);
      expect(block.items[0]?.checked).toBe(true);
    }
  });

  it("reads a checklist's optional summary and image, defaulting both honestly", () => {
    const doc = readPageDocument({
      key: "plans",
      blocks: [
        { id: "tier", type: "checklist", heading: "Bronze 1", mode: "printed", items: [] },
        {
          id: "tier2",
          type: "checklist",
          heading: "Gold",
          mode: "printed",
          summary: "A special metal coffin.",
          image: { id: "i1", src: "/media/x.webp", alt: "A coffin", caption: null, sample: false },
          items: [{ id: "c1", label: "Flowers", checked: true }],
        },
      ],
    });
    const [bare, full] = doc.blocks;
    if (bare?.type !== "checklist" || full?.type !== "checklist") throw new Error("expected checklists");
    expect(bare.summary).toBe("");
    expect(bare.image).toBeNull();
    expect(full.summary).toBe("A special metal coffin.");
    expect(full.image?.src).toBe("/media/x.webp");
  });

  it("refuses a tier checklist image without alt text and a sample without its caption", () => {
    const noAlt = validatePageDocument(
      parkDocument({
        blocks: [
          {
            id: "tier",
            type: "checklist",
            heading: "Gold",
            mode: "printed",
            items: [{ id: "c1", label: "Flowers", checked: true }],
            image: { id: "i1", src: "/media/x.webp", alt: "", caption: null, sample: false },
          },
        ],
      }),
      CONTEXT,
    );
    expect(noAlt.ok).toBe(false);
    if (!noAlt.ok) expect(noAlt.errors.join(" ")).toContain("alt text");

    const sampleNoCaption = validatePageDocument(
      parkDocument({
        blocks: [
          {
            id: "tier",
            type: "checklist",
            heading: "Gold",
            mode: "printed",
            items: [{ id: "c1", label: "Flowers", checked: true }],
            image: { id: "i1", src: "/media/x.webp", alt: "A coffin", caption: null, sample: true },
          },
        ],
      }),
      CONTEXT,
    );
    expect(sampleNoCaption.ok).toBe(false);
    if (!sampleNoCaption.ok) expect(sampleNoCaption.errors.join(" ")).toContain("sample");
  });

  it("gives every block type a distinct ready shape", () => {
    for (const type of [
      "paragraph",
      "bullets",
      "checklist",
      "steps",
      "gallery",
      "table",
      "priceTable",
      "priceList",
      "note",
      "links",
    ] as const) {
      const block = emptyBlock(type);
      expect(block.type).toBe(type);
      expect(block.id.length).toBeGreaterThan(3);
    }
  });
});

describe("validateCatalogueEntry", () => {
  it("accepts an entry bound to a live SKU", () => {
    const verdict = validateCatalogueEntry(
      {
        id: "e1",
        kind: "product",
        sku: "CSK-WHITE-ROSE-FULL",
        key: "white-rose-full",
        title: "White Rose Full casket",
        summary: "Full glass lid.",
        group: "The White Rose Collection",
        media: { hero: null, gallery: [] },
        blocks: [],
        price: { kind: "sku", sku: "CSK-WHITE-ROSE-FULL" },
      },
      CONTEXT,
    );
    expect(verdict.ok).toBe(true);
  });

  it("refuses an entry whose price binds to a missing SKU", () => {
    const verdict = validateCatalogueEntry(
      { id: "e1", kind: "product", key: "gone", title: "Gone", summary: "", price: { kind: "sku", sku: "GONE-1" } },
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
  });
});

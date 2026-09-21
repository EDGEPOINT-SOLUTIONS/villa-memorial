import { describe, expect, it } from "vitest";
import {
  CONTENT_RATE_REFS,
  CONTENT_RICHTEXT_NODES_MAX,
  CONTENT_SPECS_COLUMNS_MAX,
  PAGE_DOCUMENTS,
  emptyBlock,
  readCatalogueEntry,
  readContentSpecs,
  readPageDocument,
  readRichTextDoc,
  referencedImageBytes,
  validateCatalogueEntry,
  validateContentSpecs,
  validatePageDocument,
  validateRichText,
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
      textColour: null,
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

  it("accepts an image-only hero (no eyebrow, headline or lead)", () => {
    const verdict = validatePageDocument(
      parkDocument({
        hero: {
          ...parkDocument().hero,
          eyebrow: "",
          headline: "",
          lead: "",
          image: "/media/hero-1.jpg",
        },
      }),
      CONTEXT,
    );
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.value.hero.image).toBe("/media/hero-1.jpg");
  });

  it("accepts a hero text colour and refuses a value that is not a CSS colour", () => {
    const good = validatePageDocument(
      parkDocument({ hero: { ...parkDocument().hero, textColour: "#ffffff" } }),
      CONTEXT,
    );
    expect(good.ok).toBe(true);

    const bad = validatePageDocument(
      parkDocument({ hero: { ...parkDocument().hero, textColour: "url(https://evil.test/x.png)" } }),
      CONTEXT,
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.join(" ")).toContain("text colour");
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
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("Inter");
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
  const baseEntry = {
    id: "e1",
    kind: "product",
    sku: "CSK-WHITE-ROSE-FULL",
    key: "white-rose-full",
    title: "White Rose Full casket",
    summary: "Full glass lid.",
    group: "The White Rose Collection",
    media: { hero: null, gallery: [] },
    gallery: [],
    specs: null,
    blocks: [],
    price: { kind: "sku", sku: "CSK-WHITE-ROSE-FULL" },
  };

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

  it("accepts a rich description, a gallery and per-variant specs", () => {
    const verdict = validateCatalogueEntry(
      {
        ...baseEntry,
        description: { nodes: [{ type: "paragraph", spans: [{ text: "A solid casket." }] }] },
        gallery: [{ id: "g1", src: "/media/x.webp", alt: "A casket", caption: null, sample: false }],
        specs: { columns: ["Material", "Finish"], rows: [["Metal", "White"]] },
      },
      CONTEXT,
    );
    expect(verdict.ok).toBe(true);
  });

  it("keeps the entry gallery uncapped while the in-block gallery stays capped at 12", () => {
    const images = Array.from({ length: 20 }, (_, i) => ({
      id: `g${i}`,
      src: "/media/x.webp",
      alt: `Casket ${i}`,
      caption: null,
      sample: false,
    }));
    const entry = validateCatalogueEntry({ ...baseEntry, gallery: images }, CONTEXT);
    expect(entry.ok).toBe(true);

    const block = validatePageDocument(
      parkDocument({ blocks: [{ id: "b", type: "gallery", heading: "", images }] }),
      CONTEXT,
    );
    expect(block.ok).toBe(false);
  });

  it("refuses a 16-column specs table on the entry, naming the column", () => {
    const columns = Array.from({ length: CONTENT_SPECS_COLUMNS_MAX }, (_, i) => `Header ${i + 1}`);
    const verdict = validateCatalogueEntry(
      { ...baseEntry, specs: { columns: [...columns, "Weight"], rows: [] } },
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("Weight");
  });

  it("runs the glyph gate over the rich description, gallery and specs", () => {
    const verdict = validateCatalogueEntry(
      {
        ...baseEntry,
        description: { nodes: [{ type: "paragraph", spans: [{ text: "A quiet place \ud83c\udf3f" }] }] },
      },
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("Inter");
  });

  it("reads the new authored fields from a stored entry", () => {
    const entry = readCatalogueEntry({
      ...baseEntry,
      description: { nodes: [{ type: "heading", level: 2, text: "About" }] },
      gallery: [{ id: "g1", src: "/media/x.webp", alt: "A casket", caption: null, sample: false }],
      specs: { columns: ["Material"], rows: [["Metal"]] },
    });
    expect(entry.description?.nodes).toHaveLength(1);
    expect(entry.gallery).toHaveLength(1);
    expect(entry.specs?.columns).toEqual(["Material"]);
  });
});

describe("the rich-text description", () => {
  const doc = {
    nodes: [
      { type: "heading", level: 2, text: "About this model" },
      { type: "paragraph", spans: [{ text: "Solid " }, { text: "hardwood", marks: ["bold"] }] },
      { type: "bulletList", items: [[{ text: "Half lid" }], [{ text: "Full lid", marks: ["italic"] }]] },
      { type: "orderedList", items: [[{ text: "Choose a model" }]] },
    ],
  };

  it("reads a typed node tree, never an HTML string", () => {
    const read = readRichTextDoc(doc);
    expect(read.nodes.map((node) => node.type)).toEqual(["heading", "paragraph", "bulletList", "orderedList"]);
    expect(JSON.stringify(read)).not.toContain("<p>");
  });

  it("drops unknown node types and heading levels the page cannot use", () => {
    const read = readRichTextDoc({
      nodes: [
        { type: "html", text: "<b>hi</b>" },
        { type: "heading", level: 1, text: "Too big" },
        { type: "heading", level: 3, text: "Fine" },
      ],
    });
    expect(read.nodes).toEqual([{ type: "heading", level: 3, text: "Fine" }]);
  });

  it("filters marks to the bold/italic vocabulary", () => {
    const read = readRichTextDoc({
      nodes: [{ type: "paragraph", spans: [{ text: "hi", marks: ["bold", "underline", "blink"] }] }],
    });
    const [node] = read.nodes;
    if (node?.type !== "paragraph") throw new Error("expected a paragraph");
    expect(node.spans[0]?.marks).toEqual(["bold"]);
  });

  it("accepts a valid document and refuses one with no text", () => {
    expect(validateRichText(doc).ok).toBe(true);
    const empty = validateRichText({ nodes: [{ type: "paragraph", spans: [] }] });
    expect(empty.ok).toBe(false);
  });

  it("refuses more than the node cap", () => {
    const nodes = Array.from({ length: CONTENT_RICHTEXT_NODES_MAX + 1 }, () => ({
      type: "paragraph",
      spans: [{ text: "one" }],
    }));
    const verdict = validateRichText({ nodes });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain(String(CONTENT_RICHTEXT_NODES_MAX));
  });

  it("refuses an over-long span and a javascript: link", () => {
    const long = validateRichText({ nodes: [{ type: "paragraph", spans: [{ text: "x".repeat(2001) }] }] });
    expect(long.ok).toBe(false);
    const badLink = validateRichText({
      nodes: [{ type: "paragraph", spans: [{ text: "click", href: "javascript:alert(1)" }] }],
    });
    expect(badLink.ok).toBe(false);
  });
});

describe("the specifications table", () => {
  it("reads a specs table defensively", () => {
    const read = readContentSpecs({ columns: ["A"], rows: [["1"]], extra: true });
    expect(read).toEqual({ columns: ["A"], rows: [["1"]] });
  });

  it("accepts 15 columns and refuses a 16th by name", () => {
    const columns = Array.from({ length: CONTENT_SPECS_COLUMNS_MAX }, (_, i) => `Header ${i + 1}`);
    expect(validateContentSpecs({ columns, rows: [columns.map(() => "")] }).ok).toBe(true);

    const tooMany = validateContentSpecs({ columns: [...columns, "Weight"], rows: [] });
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) {
      expect(tooMany.errors.join(" ")).toContain("Weight");
      expect(tooMany.errors.join(" ")).toContain(String(CONTENT_SPECS_COLUMNS_MAX + 1));
    }
  });

  it("refuses a row whose cells do not match the columns", () => {
    const verdict = validateContentSpecs({ columns: ["A", "B"], rows: [["only one"]] });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("columns");
  });

  it("counts only stored data-URL payload for the gallery size guard", () => {
    expect(referencedImageBytes([{ id: "a", src: "/media/x.webp", alt: "x", caption: null, sample: false }])).toBe(0);
    const dataUrl = `data:image/png;base64,${"A".repeat(500)}`;
    expect(
      referencedImageBytes([{ id: "b", src: dataUrl, alt: "x", caption: null, sample: false }]),
    ).toBe(dataUrl.length);
  });
});

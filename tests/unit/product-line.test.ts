import { describe, expect, it } from "vitest";
import {
  CASKET_PRODUCT_LINES,
  casketProductLines,
  productLineForSku,
  productLineId,
  productLineVariants,
  resolveSpecs,
} from "@/lib/product-line";
import {
  CONTENT_SPECS_COLUMNS_MAX,
  readProductLine,
  validateProductLine,
  type ContentSpecs,
  type ContentValidationContext,
} from "@/lib/content-catalog";
import { CASKET_MODELS } from "@/lib/villa-pricing";

/**
 * The product-line model (P0 of data/villa-pdp-cms-plan/report.md §4): the four
 * captain-confirmed lines derived from the sheet's collections, the per-variant
 * specs resolution with line-level shared defaults (captain's Q1), and the line's
 * save rule.
 */

const CONTEXT: ContentValidationContext = {
  skus: new Set(CASKET_PRODUCT_LINES.flatMap((line) => line.variantSkus)),
  rateRefs: new Set<string>(),
};

describe("the four derived lines", () => {
  it("groups the sheet's 24 models into the four collections", () => {
    expect(CASKET_PRODUCT_LINES.map((line) => line.name)).toEqual([
      "Lumina",
      "The White Rose Collection",
      "The Crown Collection",
      "The Dynasty Collection",
    ]);
    expect(CASKET_PRODUCT_LINES.flatMap((line) => line.variantSkus)).toHaveLength(CASKET_MODELS.length);
    expect(CASKET_PRODUCT_LINES.map((line) => line.variantSkus.length)).toEqual([1, 6, 8, 9]);
  });

  it("seeds a stable id from the collection slug and a casketCollection source", () => {
    expect(productLineId("The White Rose Collection")).toBe("the-white-rose-collection");
    const line = CASKET_PRODUCT_LINES[1];
    expect(line?.id).toBe("the-white-rose-collection");
    expect(line?.source).toEqual({ kind: "casketCollection", collection: "The White Rose Collection" });
  });

  it("returns a fresh copy an editor can mutate", () => {
    const copy = casketProductLines();
    copy[0]!.name = "Changed";
    expect(CASKET_PRODUCT_LINES[0]?.name).toBe("Lumina");
  });
});

describe("productLineForSku", () => {
  it("resolves a casket SKU to its collection's line, case-insensitively", () => {
    expect(productLineForSku("CSK-WHITE-ROSE-FULL")?.id).toBe("the-white-rose-collection");
    expect(productLineForSku("csk-lumina")?.id).toBe("lumina");
    expect(productLineForSku("NOT-A-SKU")).toBeUndefined();
  });

  it("pairs each variant SKU with its sheet model", () => {
    const variants = productLineVariants(CASKET_PRODUCT_LINES[0]!);
    expect(variants).toEqual([{ sku: "CSK-LUMINA", model: "Lumina" }]);
    expect(productLineVariants(CASKET_PRODUCT_LINES[1]!)).toHaveLength(6);
  });
});

describe("readProductLine", () => {
  it("takes honest defaults for a record that only names its collection", () => {
    const line = readProductLine({
      name: "The Crown Collection",
      source: { kind: "casketCollection", collection: "The Crown Collection" },
    });
    expect(line.id).toBe("");
    expect(line.variantSkus).toEqual([]);
    expect(line.sharedSpecs).toBeNull();
    expect(line.updated_at).toBeNull();
  });

  it("keeps a manual source and a stored shared specs table", () => {
    const line = readProductLine({
      id: "legacy",
      name: "Legacy line",
      source: { kind: "something-else" },
      variantSkus: ["CSK-LUMINA"],
      sharedSpecs: { columns: ["Material"], rows: [["Metal"]] },
    });
    expect(line.source).toEqual({ kind: "manual" });
    expect(line.sharedSpecs?.rows).toEqual([["Metal"]]);
  });
});

describe("validateProductLine", () => {
  it("accepts a derived line whose variants the catalogue carries", () => {
    expect(validateProductLine(CASKET_PRODUCT_LINES[0], CONTEXT).ok).toBe(true);
  });

  it("refuses a variant the catalogue does not carry", () => {
    const verdict = validateProductLine(
      { ...CASKET_PRODUCT_LINES[0], variantSkus: ["GONE-1"] },
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("GONE-1");
  });

  it("refuses a repeated variant", () => {
    const verdict = validateProductLine(
      { ...CASKET_PRODUCT_LINES[0], variantSkus: ["CSK-LUMINA", "CSK-LUMINA"] },
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
  });

  it("refuses shared specs over the ≤15-column cap, naming the column", () => {
    const columns = Array.from({ length: CONTENT_SPECS_COLUMNS_MAX + 1 }, (_, i) => `H${i + 1}`);
    const verdict = validateProductLine(
      { ...CASKET_PRODUCT_LINES[0], sharedSpecs: { columns, rows: [] } },
      CONTEXT,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.errors.join(" ")).toContain("H16");
  });
});

describe("resolveSpecs", () => {
  const shared: ContentSpecs = {
    columns: ["Attribute", "Detail"],
    rows: [
      ["Material", "Metal"],
      ["Finish", "White"],
      ["Warranty", "5 years"],
    ],
  };

  it("returns null when neither the line nor the variant authors a table", () => {
    expect(resolveSpecs(null, null)).toEqual({ ok: true, value: null });
    expect(resolveSpecs({ sharedSpecs: null }, { columns: [], rows: [] })).toEqual({ ok: true, value: null });
  });

  it("prints the line's table when the variant has none", () => {
    const resolved = resolveSpecs({ sharedSpecs: shared }, null);
    expect(resolved).toEqual({ ok: true, value: shared });
  });

  it("prints the variant's table when the line has none", () => {
    const own: ContentSpecs = { columns: ["Weight"], rows: [["12 kg"]] };
    expect(resolveSpecs(null, own)).toEqual({ ok: true, value: own });
  });

  it("overrides by first cell, appends variant-only rows and unions the columns", () => {
    const resolved = resolveSpecs(
      { sharedSpecs: shared },
      {
        columns: ["Attribute", "Detail", "Weight"],
        rows: [
          ["Finish", "Gold", "12 kg"],
          ["Lining", "Satin", ""],
        ],
      },
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value?.columns).toEqual(["Attribute", "Detail", "Weight"]);
    expect(resolved.value?.rows).toEqual([
      ["Material", "Metal", ""],
      ["Finish", "Gold", "12 kg"],
      ["Warranty", "5 years", ""],
      ["Lining", "Satin", ""],
    ]);
  });

  it("lets a blank variant cell inherit the line's value (the delta rule)", () => {
    const resolved = resolveSpecs(
      { sharedSpecs: shared },
      { columns: ["Attribute", "Detail"], rows: [["Finish", ""]] },
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.value?.rows[1]).toEqual(["Finish", "White"]);
  });

  it("refuses a column union over the ≤15 cap, naming the 16th column", () => {
    const sharedTen: ContentSpecs = {
      columns: Array.from({ length: 10 }, (_, i) => `H${i + 1}`),
      rows: [],
    };
    const variantTen: ContentSpecs = {
      columns: Array.from({ length: 10 }, (_, i) => `V${i + 1}`),
      rows: [],
    };
    const resolved = resolveSpecs({ sharedSpecs: sharedTen }, variantTen);
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) {
      expect(resolved.errors.join(" ")).toContain("V6");
      expect(resolved.errors.join(" ")).toContain(String(CONTENT_SPECS_COLUMNS_MAX));
    }
  });
});

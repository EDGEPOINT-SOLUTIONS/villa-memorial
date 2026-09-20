/**
 * Product lines — the pure half of the PDP variant model (P0 of
 * data/villa-pdp-cms-plan/report.md §4).
 *
 * THE MODEL. A PRODUCT LINE is the captain-confirmed grouping behind "choose a
 * model" (Q4): one line per casket collection on the client's sheet (Lumina ·
 * The White Rose Collection · The Crown Collection · The Dynasty Collection),
 * and every casket MODEL is a variant. This module derives those four lines
 * straight from `CASKET_MODELS`, so a re-transcription that renames a model
 * cannot leave the lines stale — no line is hand-listed here.
 *
 * SPECS RESOLUTION (Q1: per-variant specs with line-level shared defaults). A
 * line may carry `sharedSpecs` typed once; a variant authors only what differs.
 * `resolveSpecs` produces the table a page actually prints:
 *   • columns = the line's columns, then any variant column not already present
 *     (the union; over the ≤15 cap it REFUSES and names the offending column);
 *   • rows = the line's rows, cell-by-cell overridden by a variant row whose
 *     first cell matches, then variant-only rows appended. A blank variant cell
 *     inherits the line's value — the variant authors its deltas, not a copy.
 *
 * This module is PURE (no I/O, no stores). The line's persistence lives in the
 * sibling entry store, and the save rule is `validateProductLine` in
 * lib/content-catalog.ts. Money never appears here: a specs cell is text.
 */
import {
  CONTENT_SPECS_COLUMNS_MAX,
  type ContentSpecs,
  type ContentValidation,
  type ProductLine,
} from "@/lib/content-catalog";
import { CASKET_COLLECTIONS, CASKET_MODELS } from "@/lib/villa-pricing";
import { catalogueSlug, coffinModelForSku, coffinSku } from "@/lib/catalogue-skus";

/** The stable key a collection seeds ("The White Rose Collection" → white-rose-collection). */
export function productLineId(collection: string): string {
  return catalogueSlug(collection).toLowerCase();
}

/** The sheet's models in one collection, in the sheet's order. */
export function casketModelsForCollection(collection: string): string[] {
  return CASKET_MODELS.filter((model) => model.collection === collection).map((model) => model.model);
}

/** The ordered variant SKUs of one collection — each model's own catalogue SKU. */
export function casketVariantSkus(collection: string): string[] {
  return casketModelsForCollection(collection).map((model) => coffinSku(model));
}

/**
 * The four lines the captain confirmed, derived from the sheet's collections.
 * `sharedSpecs` starts empty; the store holds whatever staff type once per line.
 */
export const CASKET_PRODUCT_LINES: ReadonlyArray<ProductLine> = CASKET_COLLECTIONS.map((collection) => ({
  id: productLineId(collection),
  name: collection,
  source: { kind: "casketCollection", collection },
  variantSkus: casketVariantSkus(collection),
  sharedSpecs: null,
  updated_at: null,
  updated_by: null,
}));

/** A fresh, mutable copy of the four derived lines (the editor never mutates the constant). */
export function casketProductLines(): ProductLine[] {
  return CASKET_PRODUCT_LINES.map((line) => structuredClone(line));
}

/** The line a casket SKU belongs to, or undefined for a SKU the sheet does not group. */
export function productLineForSku(sku: string): ProductLine | undefined {
  const wanted = sku.trim().toUpperCase();
  return CASKET_PRODUCT_LINES.find((line) =>
    line.variantSkus.some((candidate) => candidate.toUpperCase() === wanted),
  );
}

/** One variant of a line: its SKU and the sheet model it sells (null for a manual SKU). */
export type ProductLineVariant = { sku: string; model: string | null };

/** The line's variants, each paired with its sheet model name. */
export function productLineVariants(line: Pick<ProductLine, "variantSkus">): ProductLineVariant[] {
  return line.variantSkus.map((sku) => ({
    sku,
    model: coffinModelForSku(sku)?.model ?? null,
  }));
}

function columnKey(column: string): string {
  return column.trim().toLowerCase();
}

function cellKey(cell: string | undefined): string {
  return (cell ?? "").trim().toLowerCase();
}

/**
 * The merged specification table a page prints for one variant. Returns `null`
 * when neither the line nor the variant authors a table (a PDP with no specs
 * shows none — never an empty table). Refuses when the column union exceeds the
 * ≤15 cap, naming the column that broke it.
 */
export function resolveSpecs(
  line: Pick<ProductLine, "sharedSpecs"> | null | undefined,
  variant: ContentSpecs | null | undefined,
): ContentValidation<ContentSpecs | null> {
  const shared = line?.sharedSpecs ?? null;
  const own = variant ?? null;
  if (!shared && !own) return { ok: true, value: null };

  const columns: string[] = [];
  const seen = new Set<string>();
  for (const column of [...(shared?.columns ?? []), ...(own?.columns ?? [])]) {
    const key = columnKey(column);
    if (key && !seen.has(key)) {
      seen.add(key);
      columns.push(column.trim());
    }
  }
  if (columns.length === 0) return { ok: true, value: null };
  if (columns.length > CONTENT_SPECS_COLUMNS_MAX) {
    const overflow = columns[CONTENT_SPECS_COLUMNS_MAX];
    return {
      ok: false,
      errors: [
        `The merged specifications would have ${columns.length} columns — “${overflow}” is the ${CONTENT_SPECS_COLUMNS_MAX + 1}th; a table keeps at most ${CONTENT_SPECS_COLUMNS_MAX}.`,
      ],
    };
  }

  const index = new Map(columns.map((column, i) => [columnKey(column), i]));
  const blank = () => new Array<string>(columns.length).fill("");
  const place = (cells: readonly string[], sourceColumns: readonly string[]): string[] => {
    const row = blank();
    sourceColumns.forEach((column, i) => {
      const at = index.get(columnKey(column));
      if (at !== undefined) row[at] = cells[i] ?? "";
    });
    return row;
  };

  const sharedRows = shared?.rows ?? [];
  const variantRows = own?.rows ?? [];
  const sharedKeys = new Set(sharedRows.map((row) => cellKey(row[0])));
  const overrides = new Map<string, string[]>();
  const appended: string[][] = [];
  for (const row of variantRows) {
    const key = cellKey(row[0]);
    if (sharedKeys.has(key)) overrides.set(key, row);
    else appended.push(row);
  }

  const rows: string[][] = [];
  for (const row of sharedRows) {
    const merged = place(row, shared?.columns ?? []);
    const override = overrides.get(cellKey(row[0]));
    if (override) {
      (own?.columns ?? []).forEach((column, i) => {
        const value = override[i] ?? "";
        if (!value.trim()) return; // a delta leaves the line's value in place
        const at = index.get(columnKey(column));
        if (at !== undefined) merged[at] = value;
      });
    }
    rows.push(merged);
  }
  for (const row of appended) rows.push(place(row, own?.columns ?? []));

  return { ok: true, value: { columns, rows } };
}

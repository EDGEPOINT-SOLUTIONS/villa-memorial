/**
 * Paper-content model — the ordered content of a printable document sheet.
 *
 * One pure, format-agnostic description is rendered three ways from the same data:
 *  - on-screen document sheet (components/paper/paper-sheet.tsx),
 *  - a real .docx file (lib/export/docx.ts),
 *  - a real .pdf file (lib/export/pdf.ts).
 *
 * Because every renderer consumes the same blocks, the on-screen page, the Word file
 * and the PDF cannot drift apart. Content is assembled by the domain builders
 * (lib/contracts/purchase-paper.ts, later the service contract's own) — this module
 * carries no Villa vocabulary and no document data, only the block grammar.
 */

/** One cell of a bordered grid. A label cell is emphasised and shows “Label: value”. */
export type PaperCell = {
  /** Optional field label; renders emphasised with the value beside it. */
  label?: string;
  value: string;
  /** Horizontal grid units this cell covers (1 when absent). */
  span?: number;
};

/** One grid line of a bordered table. `head` rows render shaded/bold. */
export type PaperTable = {
  kind: "table";
  columns: number;
  /** Optional fractional widths (must sum ≈1 and match `columns`); fall back to even. */
  widths?: number[];
  head?: string[];
  /** Label column on the left should render emphasised (first cell bold). */
  emphasizeFirstCell?: boolean;
  rows: PaperCell[][];
};

export type PaperLine = {
  kind: "line";
  text: string;
  bold?: boolean;
  caps?: boolean;
  align?: "left" | "center" | "right" | "justify";
  /** Size in points (renderers scale to the sheet). */
  size?: number;
  /** Leading/section spacing in points after this line. */
  spaceAfter?: number;
};

export type PaperSpace = {
  kind: "space";
  points: number;
};

export type PaperPageBreak = {
  kind: "pagebreak";
};

export type PaperBlock = PaperTable | PaperLine | PaperSpace | PaperPageBreak;

/** Convenience constructors the domain builders use. */
export const line = (
  text: string,
  opts: Omit<PaperLine, "kind" | "text"> = {},
): PaperLine => ({ kind: "line", text, ...opts });

export const table = (
  columns: number,
  rows: PaperCell[][],
  opts: Partial<Omit<PaperTable, "kind" | "columns" | "rows">> = {},
): PaperTable => ({ kind: "table", columns, rows, ...opts });

export const space = (points: number): PaperSpace => ({ kind: "space", points });

export const pageBreak = (): PaperPageBreak => ({ kind: "pagebreak" });

/**
 * Peso amount → the paper's written figure. `null` (uncaptured) prints an em dash —
 * the honest empty convention this repo already uses on printed artifacts. This formats
 * only; it never adds, subtracts or derives (finance is dev domain).
 */
export function pesoText(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const pesos = Math.floor(abs / 100);
  const centavos = abs % 100;
  const digits = String(pesos).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = `${digits}.${String(centavos).padStart(2, "0")}`;
  return `${negative ? "-" : ""}₱${body}`;
}

/** A filled value or the honest blank convention (em dash) used on paper sheets. */
export function paperValue(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? "—" : trimmed;
}

/** Filename-safe stem from buyer/party names and a lot number, for export files. */
export function paperFileStem(parts: Array<string | null | undefined>): string {
  const safe = parts
    .flatMap((p) => (p ?? "").split(/\s+/))
    .map((word) => word.replace(/[^A-Za-z0-9-]/g, ""))
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-");
  return safe || "document";
}

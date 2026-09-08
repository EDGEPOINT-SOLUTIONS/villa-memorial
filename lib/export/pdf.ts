/**
 * Paper content → real .pdf via pdfkit (Node only — used by the export BFF route).
 *
 * Same PaperBlock grammar as the DOCX renderer and the on-screen sheet, so the three
 * artifacts cannot drift. Layout: US Letter portrait, 0.75" margins, Times family
 * (Times-Roman/Times-Bold — the standard PDF serif, metrically close to the papers'
 * Times New Roman), bordered grid tables, whole-row page breaks.
 */
import PDFDocument from "pdfkit";
import type { PaperBlock, PaperCell, PaperTable } from "@/lib/export/types";

const PAGE_W = 612; // US Letter, points
const PAGE_H = 792;
const MARGIN = 54; // 0.75 in
const CONTENT_W = PAGE_W - MARGIN * 2;
const CONTENT_H = PAGE_H - MARGIN * 2;
const CELL_PAD = 5;
const BODY_PT = 10.5;

const FONT_REGULAR = "Times-Roman";
const FONT_BOLD = "Times-Bold";

type Doc = InstanceType<typeof PDFDocument>;
type Cursor = { doc: Doc; y: number };

function cellText(cell: PaperCell): string {
  const label = cell.label ? `${cell.label}${cell.value ? ":" : ""}` : "";
  return [label, cell.value].filter((s) => s !== "").join(" ");
}

function unitWidths(table: PaperTable): number[] {
  const widths = table.widths ?? [];
  if (widths.length === table.columns) {
    return widths.map((w) => w * CONTENT_W);
  }
  return Array.from({ length: table.columns }, () => CONTENT_W / table.columns);
}

/** Height of `text` wrapped to `width`, honouring explicit line breaks. */
function wrappedHeight(doc: Doc, text: string, width: number): number {
  const fragments = text.split("\n");
  let total = 0;
  for (const fragment of fragments) {
    if (fragment === "") {
      total += 13;
      continue;
    }
    total += doc.heightOfString(fragment, { width, lineGap: 1 }) + 2;
  }
  return total;
}

function drawWrapped(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  align: "left" | "center" | "right" | "justify",
): void {
  const fragments = text.split("\n");
  let yy = y;
  for (const fragment of fragments) {
    if (fragment === "") {
      yy += 13;
      continue;
    }
    doc.text(fragment, x, yy, { width, align, lineGap: 1 });
    yy = doc.y + 2;
  }
  doc.y = y; // keep the global cursor stable; callers advance their own cursor
}

function ensureRoom(cursor: Cursor, needed: number): void {
  if (cursor.y + needed > MARGIN + CONTENT_H) {
    cursor.doc.addPage();
    cursor.y = MARGIN;
  }
}

function drawTable(cursor: Cursor, table: PaperTable): void {
  const doc = cursor.doc;
  const widths = unitWidths(table);
  const rows: PaperCell[][] = [];
  if (table.head) {
    rows.push(table.head.map((heading) => ({ label: undefined, value: heading, span: 1 })));
  }
  rows.push(...table.rows);

  const measured = rows.map((cells) => {
    let unit = 0;
    const parts = cells.map((cell) => {
      const span = cell.span ?? 1;
      let width = 0;
      for (let i = unit; i < unit + span; i += 1) width += widths[i] ?? CONTENT_W / table.columns;
      unit += span;
      const text = cellText(cell);
      return { cell, width, height: wrappedHeight(doc, text, Math.max(width - CELL_PAD * 2, 24)) };
    });
    const height = Math.max(...parts.map((p) => p.height), 16) + CELL_PAD * 2;
    return { parts, height };
  });

  for (const [index, row] of measured.entries()) {
    const isHead = Boolean(table.head) && index === 0;
    ensureRoom(cursor, row.height);
    const rowTop = cursor.y;
    let x = MARGIN;
    for (const part of row.parts) {
      const text = cellText(part.cell);
      if (isHead) {
        doc.rect(x, rowTop, part.width, row.height).fillColor("#ececec").fill();
      }
      doc.rect(x, rowTop, part.width, row.height).lineWidth(0.5).strokeColor("#000000").stroke();
      if (text !== "") {
        doc.font(isHead ? FONT_BOLD : FONT_REGULAR).fontSize(isHead ? 9.5 : 10);
        drawWrapped(doc, text, x + CELL_PAD, rowTop + CELL_PAD, part.width - CELL_PAD * 2, isHead ? "center" : "left");
      }
      x += part.width;
    }
    cursor.y = rowTop + row.height + 4;
  }
}

/** Render paper blocks to a PDF Buffer (Node). */
export async function paperToPdfBuffer(blocks: PaperBlock[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const cursor: Cursor = { doc, y: MARGIN };
    doc.font(FONT_REGULAR).fontSize(BODY_PT);

    for (const block of blocks) {
      switch (block.kind) {
        case "line": {
          const text = block.caps ? block.text.toUpperCase() : block.text;
          const size = block.size ?? BODY_PT;
          const align = block.align ?? "left";
          doc.font(block.bold ? FONT_BOLD : FONT_REGULAR).fontSize(size);
          const height = wrappedHeight(doc, text, CONTENT_W);
          const spaceAfter = block.spaceAfter ?? 2;
          ensureRoom(cursor, height + spaceAfter);
          drawWrapped(doc, text, MARGIN, cursor.y, CONTENT_W, align === "justify" ? "justify" : align === "center" ? "center" : align === "right" ? "right" : "left");
          cursor.y += height + spaceAfter;
          doc.font(FONT_REGULAR).fontSize(BODY_PT);
          break;
        }
        case "space": {
          cursor.y += block.points;
          break;
        }
        case "pagebreak": {
          doc.addPage();
          cursor.y = MARGIN;
          break;
        }
        case "table": {
          doc.font(FONT_REGULAR).fontSize(BODY_PT);
          drawTable(cursor, block);
          break;
        }
      }
    }

    doc.end();
  });
}

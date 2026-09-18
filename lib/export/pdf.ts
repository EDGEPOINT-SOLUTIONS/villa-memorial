/**
 * Paper content → real .pdf via pdfkit (Node only — used by the export BFF route).
 *
 * Same PaperBlock grammar as the DOCX renderer and the on-screen sheet, and the same
 * `PaperProfile` (lib/export/paper-profile.ts): the page size, the margins and the faces
 * come from the client's own papers, so the PDF is the reviewed sheet. Times and Arial
 * use their metric-compatible PDF base-14 faces; a face no reader is guaranteed to have
 * (Bookman Old Style on the 2026 Villa forms) is embedded from the vendored file the
 * profile names. Bordered grid tables, whole-row page breaks.
 */
import path from "node:path";
import PDFDocument from "pdfkit";
import type { PaperBlock, PaperCell, PaperTable } from "@/lib/export/types";
import {
  profilePagePt,
  profileTypeface,
  PAPER_TYPEFACES,
  type PaperProfile,
  type PaperTypefaceId,
} from "@/lib/export/paper-profile";

const CELL_PAD = 5;

type Doc = InstanceType<typeof PDFDocument>;
type Cursor = { doc: Doc; y: number };

/** The document's own page box, resolved once per render. */
type PaperBox = {
  pageW: number;
  pageH: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  contentW: number;
  bottomLimit: number;
};

function boxFor(profile: PaperProfile): PaperBox {
  const { widthPt, heightPt, marginPt } = profilePagePt(profile);
  return {
    pageW: widthPt,
    pageH: heightPt,
    top: marginPt.top,
    right: marginPt.right,
    bottom: marginPt.bottom,
    left: marginPt.left,
    contentW: widthPt - marginPt.left - marginPt.right,
    bottomLimit: heightPt - marginPt.bottom,
  };
}

/**
 * Pdfkit's built-in Times fonts are WinAnsi-encoded, so ₱ (U+20B1) has no glyph and
 * would encode to garbage bytes. The PDF prints money with its "PHP " prefix; the .docx
 * and the on-screen sheet keep the ₱ sign (U+20B1 survives both).
 */
function pdfFontText(text: string): string {
  return text.replace(/₱/g, "PHP ");
}

/**
 * The document's registered PDF faces, keyed by paper typeface. Registration is
 * per-document in pdfkit (a second document needs its own), so the registry lives in a
 * closure beside the doc rather than in module state.
 */
type FontRegistry = {
  face: (id: PaperTypefaceId) => { regular: string; bold: string };
};

function createFontRegistry(doc: Doc): FontRegistry {
  const registered = new Map<PaperTypefaceId, { regular: string; bold: string }>();
  return {
    face(id) {
      const cached = registered.get(id);
      if (cached) return cached;
      const typeface = PAPER_TYPEFACES[id];
      const names = { regular: typeface.pdf.regular, bold: typeface.pdf.bold };
      if (typeface.pdf.kind === "embedded") {
        doc.registerFont(names.regular, path.join(process.cwd(), typeface.pdf.regularFile));
        doc.registerFont(names.bold, path.join(process.cwd(), typeface.pdf.boldFile));
      }
      registered.set(id, names);
      return names;
    },
  };
}

function cellText(cell: PaperCell): string {
  const label = cell.label ? `${cell.label}${cell.value ? ":" : ""}` : "";
  return [label, cell.value].filter((s) => s !== "").join(" ");
}

function unitWidths(table: PaperTable, contentW: number): number[] {
  const widths = table.widths ?? [];
  if (widths.length === table.columns) {
    return widths.map((w) => w * contentW);
  }
  return Array.from({ length: table.columns }, () => contentW / table.columns);
}

/** Height of `text` wrapped to `width`, honouring explicit line breaks. */
function wrappedHeight(doc: Doc, text: string, width: number): number {
  const fragments = pdfFontText(text).split("\n");
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
  const fragments = pdfFontText(text).split("\n");
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

function ensureRoom(cursor: Cursor, needed: number, box: PaperBox): void {
  if (cursor.y + needed > box.bottomLimit) {
    cursor.doc.addPage();
    cursor.y = box.top;
  }
}

function drawTable(
  cursor: Cursor,
  table: PaperTable,
  profile: PaperProfile,
  box: PaperBox,
  fonts: FontRegistry,
): void {
  const doc = cursor.doc;
  const widths = unitWidths(table, box.contentW);
  const body = fonts.face(profile.body);
  const bodyPt = profile.bodyPt;
  const headPt = Math.max(bodyPt - 0.5, 8);
  const rows: PaperCell[][] = [];
  if (table.head) {
    rows.push(
      table.head.map((heading) =>
        typeof heading === "string"
          ? { label: undefined, value: heading, span: 1 }
          : { label: undefined, value: heading.text, span: heading.span ?? 1 },
      ),
    );
  }
  rows.push(...table.rows);

  const measured = rows.map((cells) => {
    let unit = 0;
    const parts = cells.map((cell) => {
      const span = cell.span ?? 1;
      let width = 0;
      for (let i = unit; i < unit + span; i += 1) width += widths[i] ?? box.contentW / table.columns;
      unit += span;
      const text = cellText(cell);
      return { cell, width, height: wrappedHeight(doc, text, Math.max(width - CELL_PAD * 2, 24)) };
    });
    const height = Math.max(...parts.map((p) => p.height), 16) + CELL_PAD * 2;
    return { parts, height };
  });

  for (const [index, row] of measured.entries()) {
    const isHead = Boolean(table.head) && index === 0;
    ensureRoom(cursor, row.height, box);
    const rowTop = cursor.y;
    let x = box.left;
    for (const part of row.parts) {
      const text = cellText(part.cell);
      if (isHead) {
        doc.rect(x, rowTop, part.width, row.height).fillColor("#ececec").fill();
        doc.fillColor("#000000");
      }
      doc.rect(x, rowTop, part.width, row.height).lineWidth(0.5).strokeColor("#000000").stroke();
      if (text !== "") {
        doc.font(isHead ? body.bold : body.regular).fontSize(isHead ? headPt : bodyPt);
        drawWrapped(
          doc,
          text,
          x + CELL_PAD,
          rowTop + CELL_PAD,
          part.width - CELL_PAD * 2,
          isHead ? "center" : "left",
        );
      }
      x += part.width;
    }
    cursor.y = rowTop + row.height + 4;
  }
}

/** Render paper blocks to a PDF Buffer (Node), on the document's own paper profile. */
export async function paperToPdfBuffer(
  blocks: PaperBlock[],
  profile: PaperProfile,
): Promise<Buffer> {
  const box = boxFor(profile);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [box.pageW, box.pageH], margin: box.top });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const cursor: Cursor = { doc, y: box.top };
    const fonts = createFontRegistry(doc);
    const bodyFace = fonts.face(profile.body);
    doc.font(bodyFace.regular).fontSize(profile.bodyPt);

    for (const block of blocks) {
      switch (block.kind) {
        case "line": {
          const text = block.caps ? block.text.toUpperCase() : block.text;
          const size = block.size ?? profile.bodyPt;
          const face = fonts.face(profileTypeface(profile, block.typeface ?? "body").id);
          const align = block.align ?? "left";
          doc.font(block.bold ? face.bold : face.regular).fontSize(size);
          const height = wrappedHeight(doc, text, box.contentW);
          const spaceAfter = block.spaceAfter ?? 2;
          ensureRoom(cursor, height + spaceAfter, box);
          drawWrapped(
            doc,
            text,
            box.left,
            cursor.y,
            box.contentW,
            align === "justify"
              ? "justify"
              : align === "center"
                ? "center"
                : align === "right"
                  ? "right"
                  : "left",
          );
          cursor.y += height + spaceAfter;
          doc.font(bodyFace.regular).fontSize(profile.bodyPt);
          break;
        }
        case "space": {
          cursor.y += block.points;
          break;
        }
        case "pagebreak": {
          doc.addPage();
          cursor.y = box.top;
          break;
        }
        case "table": {
          doc.font(bodyFace.regular).fontSize(profile.bodyPt);
          drawTable(cursor, block, profile, box, fonts);
          break;
        }
      }
    }

    doc.end();
  });
}

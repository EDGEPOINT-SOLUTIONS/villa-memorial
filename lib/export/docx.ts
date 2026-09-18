/**
 * Paper content → real .docx (OOXML) via the `docx` package.
 *
 * One renderer for the shared PaperBlock grammar (lib/export/types.ts). Works in the
 * browser (Packer.toBlob → download) and in Node/tests (Packer.toBuffer). Every page
 * property and every face comes from the document's `PaperProfile`
 * (lib/export/paper-profile.ts) — the same profile `PaperSheet` renders on screen and
 * `lib/export/pdf.ts` prints — so the Word file is the reviewed sheet, not a re-typed
 * imitation of it: the client's page size and margins, the client's body face, and the
 * letterhead in the client's heading face (Bookman Old Style on the purchase papers).
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  PageBreak,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IBordersOptions,
} from "docx";
import type { PaperBlock, PaperCell, PaperTable } from "@/lib/export/types";
import {
  blockTypeface,
  profileContentTwips,
  profilePageTwips,
  profileTypeface,
  type PaperProfile,
} from "@/lib/export/paper-profile";

const TWIPS_PER_PT = 20;

const HAIRLINE: IBordersOptions = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

const alignMap: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function runsFor(
  text: string,
  opts: { bold?: boolean; caps?: boolean; sizePt?: number; font?: string } = {},
) {
  return [
    new TextRun({
      text,
      bold: opts.bold || undefined,
      allCaps: opts.caps || undefined,
      size: opts.sizePt ? Math.round(opts.sizePt * 2) : undefined,
      font: opts.font,
    }),
  ];
}

/** Cell text may carry explicit line breaks (signature blocks). */
function paragraphsFor(
  text: string,
  opts: { bold?: boolean; center?: boolean; sizePt?: number; font?: string } = {},
) {
  return text.split("\n").map(
    (fragment) =>
      new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: opts.bold ? 0 : 60 },
        children: runsFor(fragment, { bold: opts.bold ?? false, sizePt: opts.sizePt, font: opts.font }),
      }),
  );
}

function cellText(cell: PaperCell): string {
  const label = cell.label ? `${cell.label}${cell.value ? ":" : ""}` : "";
  return [label, cell.value].filter((s) => s !== "").join(" ");
}

function tableToDocx(table: PaperTable, profile: PaperProfile): Table {
  const contentTwips = profileContentTwips(profile);
  const bodyFont = profileTypeface(profile).name;
  const rows: TableRow[] = [];

  if (table.head) {
    let unit = 0;
    rows.push(
      new TableRow({
        children: table.head.map((heading) => {
          const text = typeof heading === "string" ? heading : heading.text;
          const span = typeof heading === "string" ? 1 : heading.span ?? 1;
          const width = tableWidthFor(table, unit, span, contentTwips);
          unit += span;
          return new TableCell({
            columnSpan: span > 1 ? span : undefined,
            borders: HAIRLINE,
            shading: { type: ShadingType.CLEAR, fill: "EEEEEE" },
            width,
            children: paragraphsFor(text, { bold: true, font: bodyFont }),
          });
        }),
      }),
    );
  }

  for (const rowCells of table.rows) {
    let cursor = 0;
    const docCells: TableCell[] = rowCells.map((cell) => {
      const span = cell.span ?? 1;
      cursor += span;
      const width = tableWidthFor(table, cursor - span, span, contentTwips);
      return new TableCell({
        columnSpan: span > 1 ? span : undefined,
        borders: HAIRLINE,
        width,
        children: paragraphsFor(cellText(cell), { font: bodyFont }),
      });
    });
    rows.push(new TableRow({ children: docCells }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

/** Twips for the grid units a cell covers, from the block's fractional widths. */
function tableWidthFor(
  table: PaperTable,
  fromUnit: number,
  span: number,
  contentTwips: number,
): { size: number; type: (typeof WidthType)[keyof typeof WidthType] } {
  const widths = table.widths ?? [];
  if (widths.length !== table.columns) {
    return { size: Math.round((100 * span) / table.columns), type: WidthType.PERCENTAGE };
  }
  let fraction = 0;
  for (let i = fromUnit; i < fromUnit + span; i += 1) {
    fraction += widths[i] ?? 1 / table.columns;
  }
  return { size: Math.round(fraction * contentTwips), type: WidthType.DXA };
}

function blockToChildren(block: PaperBlock, profile: PaperProfile): Paragraph[] {
  switch (block.kind) {
    case "line": {
      return [
        new Paragraph({
          alignment: alignMap[block.align ?? "left"],
          spacing: { after: (block.spaceAfter ?? 2) * TWIPS_PER_PT },
          children: runsFor(block.text, {
            bold: block.bold ?? false,
            caps: block.caps ?? false,
            sizePt: block.size,
            font: blockTypeface(profile, block).name,
          }),
        }),
      ];
    }
    case "space": {
      return [
        new Paragraph({
          spacing: { after: block.points * TWIPS_PER_PT },
          children: [],
        }),
      ];
    }
    case "pagebreak": {
      return [new Paragraph({ children: [new PageBreak()] })];
    }
    case "table": {
      // Tables are block children of the section; returned inside a fragment is not
      // possible — tables render as a single row of the parent array, so callers must
      // flatten. See paperToDocx below for the mapping.
      return [];
    }
  }
}

/**
 * Render paper blocks into a Word document object. Tables are handled at the section
 * level (they are not paragraph children). The profile carries the document's own page
 * size, margins and faces.
 */
export function paperToDocx(blocks: PaperBlock[], profile: PaperProfile): Document {
  const body = profileTypeface(profile);
  const { widthTwips, heightTwips, marginTwips } = profilePageTwips(profile);
  const children: Array<Paragraph | Table> = [];
  for (const block of blocks) {
    if (block.kind === "table") {
      children.push(tableToDocx(block, profile));
    } else {
      children.push(...blockToChildren(block, profile));
    }
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: body.name, size: Math.round(profile.bodyPt * 2) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: widthTwips, height: heightTwips },
            margin: marginTwips,
          },
        },
        children,
      },
    ],
  });
}

/** Node/test: render to a Buffer (vitest, server-side route if ever needed). */
export async function paperToDocxBuffer(
  blocks: PaperBlock[],
  profile: PaperProfile,
): Promise<Buffer> {
  return Packer.toBuffer(paperToDocx(blocks, profile));
}

/** Browser: render to a Blob ready for a download link. */
export async function paperToDocxBlob(blocks: PaperBlock[], profile: PaperProfile): Promise<Blob> {
  return Packer.toBlob(paperToDocx(blocks, profile));
}

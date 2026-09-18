"use client";

/**
 * PaperSheet — renders the shared PaperBlock grammar as a document sheet on screen.
 *
 * Presentational only: the same blocks and the same `PaperProfile` produce the .docx and
 * .pdf exports, so the page you review is the file you get. The profile decides the
 * sheet's page width, its margins (as the sheet's padding) and its two faces; the print
 * stylesheet prints only this sheet, and the profile's `@page` rule below is what makes
 * Print yield the document's own paper (Legal 8.5 × 14 for the contract, the 8.5 × 13
 * folio for the purchase document, …) rather than the browser's default.
 */
import type { PaperBlock, PaperCell, PaperTable } from "@/lib/export/types";
import {
  paperPrintPageCss,
  paperSheetVars,
  type PaperProfile,
} from "@/lib/export/paper-profile";

function cellText(cell: PaperCell): string {
  const label = cell.label ? `${cell.label}${cell.value ? ":" : ""}` : "";
  return [label, cell.value].filter((s) => s !== "").join(" ");
}

function alignClass(align?: string): string {
  switch (align) {
    case "center":
      return "paper-line--center";
    case "right":
      return "paper-line--right";
    case "justify":
      return "paper-line--justify";
    default:
      return "";
  }
}

function TableView({ block }: { block: PaperTable }) {
  const widths =
    block.widths && block.widths.length === block.columns
      ? block.widths
      : Array.from({ length: block.columns }, () => 100 / block.columns);
  return (
    <table className="paper-table">
      <colgroup>
        {widths.map((w, i) => (
          <col key={i} style={{ width: `${w * 100}%` }} />
        ))}
      </colgroup>
      <tbody>
        {block.head ? (
          <tr>
            {block.head.map((heading, i) => {
              const text = typeof heading === "string" ? heading : heading.text;
              const span = typeof heading === "string" ? 1 : heading.span ?? 1;
              return (
                <th key={i} colSpan={span > 1 ? span : undefined}>
                  {text}
                </th>
              );
            })}
          </tr>
        ) : null}
        {block.rows.map((row, r) => {
          return (
            <tr key={r}>
              {row.map((cell, c) => {
                const span = cell.span ?? 1;
                return (
                  <td key={c} colSpan={span > 1 ? span : undefined}>
                    <span className="paper-cell__text">{cellText(cell)}</span>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PaperSheet({ blocks, profile }: { blocks: PaperBlock[]; profile: PaperProfile }) {
  return (
    <div
      className="paper-sheet"
      data-paper-sheet
      data-paper-profile={profile.id}
      style={paperSheetVars(profile) as React.CSSProperties}
    >
      {/* The profile's own page box for Print — one paper document per screen, so this
          is the only @page rule in play and the last one wins. */}
      <style>{paperPrintPageCss(profile)}</style>
      <div className="paper-sheet__sheet">
        {blocks.map((block, i) => {
          switch (block.kind) {
            case "line": {
              const classes = [
                "paper-line",
                alignClass(block.align),
                block.bold ? "paper-line--bold" : "",
                block.caps ? "paper-line--caps" : "",
                block.typeface === "heading" ? "paper-line--head" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <p
                  key={i}
                  className={classes}
                  style={{
                    ...(block.size ? { fontSize: `${block.size}pt` } : {}),
                    marginBottom: `${(block.spaceAfter ?? 2) * 2}px`,
                  }}
                >
                  {block.caps ? block.text.toUpperCase() : block.text}
                </p>
              );
            }
            case "space": {
              return <div key={i} aria-hidden="true" style={{ height: `${block.points * 2}px` }} />;
            }
            case "pagebreak": {
              return <div key={i} aria-hidden="true" className="paper-sheet__pagebreak" />;
            }
            case "table": {
              return <TableView key={i} block={block} />;
            }
          }
        })}
      </div>
    </div>
  );
}

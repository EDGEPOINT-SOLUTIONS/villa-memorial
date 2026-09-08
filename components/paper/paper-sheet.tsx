"use client";

/**
 * PaperSheet — renders the shared PaperBlock grammar as a document sheet on screen.
 *
 * Presentational only: the same blocks produce the .docx and .pdf exports, so the page
 * you review is the file you get. The sheet is set in Times (the papers' typeface) and
 * prints on Letter paper: the print stylesheet hides everything except this sheet, so
 * "Print" from any screen carrying one yields the paper document.
 */
import type { PaperBlock, PaperCell, PaperTable } from "@/lib/export/types";

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
            {block.head.map((heading, i) => (
              <th key={i}>{heading}</th>
            ))}
          </tr>
        ) : null}
        {block.rows.map((row, r) => {
          return (
            <tr key={r}>
              {row.map((cell, c) => {
                const span = cell.span ?? 1;
                const labelCell = cell.label !== undefined;
                return (
                  <td
                    key={c}
                    colSpan={span > 1 ? span : undefined}
                    className={labelCell ? "paper-cell--label" : undefined}
                  >
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

export function PaperSheet({ blocks }: { blocks: PaperBlock[] }) {
  return (
    <div className="paper-sheet" data-paper-sheet>
      <div className="paper-sheet__sheet">
        {blocks.map((block, i) => {
          switch (block.kind) {
            case "line": {
              const classes = [
                "paper-line",
                alignClass(block.align),
                block.bold ? "paper-line--bold" : "",
                block.caps ? "paper-line--caps" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <p
                  key={i}
                  className={classes}
                  style={{
                    fontSize: `${block.size ?? 10.5}pt`,
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

"use client";

/**
 * Specifications editor — the spreadsheet half of an item entry (report §7
 * section 3).
 *
 * The captain's shape: ≤15 editable column headers, unlimited rows, add/remove
 * both. The editor pages the body (25 rows visible at a time) and lets CSS
 * `content-visibility: auto` skip the off-screen pages, so a long sheet stays
 * responsive without a virtualization dependency; the public page renders the
 * whole table server-side.
 *
 * Money is never a cell: a specs cell is text. The save rule
 * (`specsErrors` in lib/content-catalog.ts) refuses a 16th column and a row whose
 * cell count does not match, naming the field.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CONTENT_CELL_MAX, CONTENT_SPECS_COLUMNS_MAX, type ContentSpecs } from "@/lib/content-catalog";

const PAGE_SIZE = 25;

/** A fresh two-column sheet, so the first click is never an empty grid. */
function blankSpecs(): ContentSpecs {
  return { columns: ["Specification", "Details"], rows: [] };
}

export function SpecsEditor({
  value,
  onChange,
}: {
  value: ContentSpecs | null;
  onChange: (next: ContentSpecs | null) => void;
}) {
  const [page, setPage] = useState(0);

  if (!value) {
    return (
      <div className="stack-2">
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          No specifications yet — the product page prints none until the office adds a table.
        </p>
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange(blankSpecs())}>
            Add specifications
          </Button>
        </div>
      </div>
    );
  }

  const specs = value;
  const pageCount = Math.max(1, Math.ceil(specs.rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const visible = specs.rows.slice(start, start + PAGE_SIZE);

  function patch(next: Partial<ContentSpecs>) {
    onChange({ ...specs, ...next });
  }

  function setName(index: number, name: string) {
    patch({ columns: specs.columns.map((column, i) => (i === index ? name : column)) });
  }

  function addColumn() {
    if (specs.columns.length >= CONTENT_SPECS_COLUMNS_MAX) return;
    patch({
      columns: [...specs.columns, `Column ${specs.columns.length + 1}`],
      rows: specs.rows.map((row) => [...row, ""]),
    });
  }

  function removeColumn(index: number) {
    if (specs.columns.length <= 1) return;
    patch({
      columns: specs.columns.filter((_, i) => i !== index),
      rows: specs.rows.map((row) => row.filter((_, i) => i !== index)),
    });
  }

  function setCell(rowIndex: number, columnIndex: number, cell: string) {
    const absolute = start + rowIndex;
    patch({
      rows: specs.rows.map((row, r) =>
        r === absolute ? row.map((value, c) => (c === columnIndex ? cell : value)) : row,
      ),
    });
  }

  function addRow() {
    patch({ rows: [...specs.rows, new Array<string>(specs.columns.length).fill("")] });
    setPage(Math.floor(specs.rows.length / PAGE_SIZE));
  }

  function removeRow(rowIndex: number) {
    const absolute = start + rowIndex;
    patch({ rows: specs.rows.filter((_, r) => r !== absolute) });
  }

  return (
    <div className="stack-3">
      <div className="specs-editor__scroll">
        <table className="specs-editor">
          <caption className="visually-hidden">Specifications — editable table</caption>
          <thead>
            <tr>
              {specs.columns.map((column, index) => (
                <th key={index} scope="col">
                  <div className="specs-editor__head">
                    <input
                      type="text"
                      value={column}
                      maxLength={CONTENT_CELL_MAX}
                      aria-label={`Column ${index + 1} header`}
                      placeholder={`Column ${index + 1}`}
                      onChange={(event) => setName(index, event.target.value)}
                    />
                    <button
                      type="button"
                      className="ed-icon-btn ed-icon-btn--danger"
                      aria-label={`Remove column ${index + 1}`}
                      disabled={specs.columns.length <= 1}
                      onClick={() => removeColumn(index)}
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
              <th scope="col" className="specs-editor__actions-head">
                <button
                  type="button"
                  className="ed-icon-btn"
                  aria-label="Add a column"
                  disabled={specs.columns.length >= CONTENT_SPECS_COLUMNS_MAX}
                  onClick={addColumn}
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, rowIndex) => (
              <tr key={start + rowIndex} className="specs-editor__row">
                {specs.columns.map((_, columnIndex) => (
                  <td key={columnIndex}>
                    <input
                      type="text"
                      value={row[columnIndex] ?? ""}
                      maxLength={CONTENT_CELL_MAX}
                      aria-label={`Row ${start + rowIndex + 1} column ${columnIndex + 1}`}
                      onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)}
                    />
                  </td>
                ))}
                <td className="specs-editor__actions">
                  <button
                    type="button"
                    className="ed-icon-btn ed-icon-btn--danger"
                    aria-label={`Remove row ${start + rowIndex + 1}`}
                    onClick={() => removeRow(rowIndex)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row row--space row--wrap" style={{ gap: "var(--space-2)", alignItems: "center" }}>
        <div className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
          <Button variant="secondary" size="sm" onClick={addRow}>
            Add row
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove the table
          </Button>
        </div>
        {specs.rows.length > PAGE_SIZE ? (
          <div className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
            <Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              ← Previous
            </Button>
            <span className="text-sm text-muted">
              Rows {start + 1}–{Math.min(start + PAGE_SIZE, specs.rows.length)} of {specs.rows.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              Next →
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted">
            {specs.rows.length === 0 ? "No rows yet." : `${specs.rows.length} row${specs.rows.length === 1 ? "" : "s"}.`}
          </span>
        )}
      </div>

      <p className="text-sm text-muted" style={{ margin: 0 }}>
        {specs.columns.length} of {CONTENT_SPECS_COLUMNS_MAX} columns used; rows are unlimited.
      </p>
    </div>
  );
}

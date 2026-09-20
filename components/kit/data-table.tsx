import type { ReactNode } from "react";
import { EmptyState } from "@/components/kit/empty-state";

/**
 * DataTable — the ONE admin table.
 *
 * The admin screens hand-roll the same markup over and over: a `.table-wrapper`
 * with `tabIndex={0}` so a keyboard user can reach the pan area, a `.table` with
 * an optional caption, a header row, body rows whose first cell is sometimes a
 * `<th scope="row">`, right-aligned `table__numeric` columns, and an honest empty
 * state. Every screen re-derived it slightly differently; this is the settled
 * shape.
 *
 * WHAT IT GUARANTEES
 *   · the pan container always declares its own horizontal scroll
 *     (`.table-wrapper { overflow-x: auto }`), so a wide table never pushes the
 *     page sideways — the scroll contains itself;
 *   · `tabIndex={0}` on that container, so the scroll area is reachable by
 *     keyboard;
 *   · an empty / no-match result renders the kit `EmptyState` INSTEAD of an empty
 *     shell — a list with nothing in it must say so, never render a bare header;
 *   · figures are right-aligned and tabular (`numeric`), labels are not.
 *
 * SORTING. A sortable column renders an `<a>` built by the caller's `sort.hrefFor`
 * — a server-driven sort (a query param), which keeps the BFF free of UI state
 * and needs no client JavaScript. `aria-sort` marks the active column. A table
 * that is not sortable passes no `sort`.
 *
 * HONESTY. This component renders what it is given. A cell whose record has no
 * value passes the missing-state wording ("Not recorded", "—") through
 * `renderCell`; it never invents a number.
 *
 * MARKUP DISCIPLINE. `className` applies to BODY cells only (a `text-sm` on the
 * labels must not shrink the header); `numeric` applies to both, so a money
 * header aligns with its column.
 */
export type DataTableColumn<Row> = {
  /** Stable identity — used as the React key for the header and each cell. */
  key: string;
  header: ReactNode;
  /** Right-align + tabular figures; applies to the header and every cell. */
  numeric?: boolean;
  /** Extra class for every body cell (never the header). */
  className?: string;
  /** Per-row class, for the one cell whose styling depends on the row itself. */
  cellClassName?: (row: Row, index: number) => string | undefined;
  /** Renders a sort control when the table also carries a `sort` descriptor. */
  sortable?: boolean;
};

export type DataTableSort = {
  key: string;
  direction: "asc" | "desc";
  /** The href for a column's next (key, direction) — built from the page's URL. */
  hrefFor: (key: string, direction: "asc" | "desc") => string;
};

export type DataTableProps<Row> = {
  caption?: ReactNode;
  columns: ReadonlyArray<DataTableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  rowKey: (row: Row, index: number) => string;
  /** Renders one body cell's content; `column` carries its alignment classes. */
  renderCell: (row: Row, column: DataTableColumn<Row>, index: number) => ReactNode;
  /** Render the first cell as the row's own `<th scope="row">`. */
  rowHeader?: boolean;
  sort?: DataTableSort;
  /** Empty / no-match state — rendered instead of the table when `rows` is empty. */
  emptyTitle: ReactNode;
  emptyHint?: ReactNode;
  /** An optional `<tfoot>` row (a totals line, a derived balance). */
  footer?: ReactNode;
  /** Accessible name for the scroll region. */
  label?: string;
};

function bodyClass<Row>(column: DataTableColumn<Row>, row: Row, index: number): string | undefined {
  const parts = [
    column.numeric ? "table__numeric" : "",
    column.cellClassName?.(row, index) ?? "",
    column.className ?? "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  renderCell,
  rowHeader = false,
  sort,
  emptyTitle,
  emptyHint,
  footer,
  label,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <div
      className="table-wrapper"
      tabIndex={0}
      role={label ? "region" : undefined}
      aria-label={label}
    >
      <table className="table">
        {caption ? <caption>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const control = column.sortable && sort;
              const ariaSort = active
                ? sort?.direction === "asc"
                  ? "ascending"
                  : "descending"
                : undefined;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.numeric ? "table__numeric" : undefined}
                  aria-sort={ariaSort}
                >
                  {control ? (
                    <a
                      href={sort.hrefFor(
                        column.key,
                        active && sort.direction === "asc" ? "desc" : "asc",
                      )}
                    >
                      {column.header}
                    </a>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              {columns.map((column, columnIndex) => {
                const content = renderCell(row, column, index);
                const className = bodyClass(column, row, index);
                if (rowHeader && columnIndex === 0) {
                  return (
                    <th key={column.key} scope="row" className={className}>
                      {content}
                    </th>
                  );
                }
                return (
                  <td key={column.key} className={className}>
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  );
}

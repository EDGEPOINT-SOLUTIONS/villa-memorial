import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable, type DataTableColumn, type DataTableProps } from "@/components/kit/data-table";

/**
 * DataTable — the one admin table. It must pan inside its own container, mark a
 * numeric column on both the header and the cells, render the empty state
 * instead of a bare shell, and offer server-driven sort links (no client JS, no
 * page state in the BFF).
 */
type Row = { id: string; name: string; amount: number; note?: string };

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "note", header: "Note", className: "text-sm" },
  { key: "amount", header: "Amount", numeric: true },
];

const rows: Row[] = [
  { id: "a", name: "Alpha", amount: 100, note: "first" },
  { id: "b", name: "Beta", amount: 250 },
];

function table(overrides: Partial<DataTableProps<Row>> = {}) {
  return (
    <DataTable<Row>
      caption="The recorded rows."
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      renderCell={(row, column) => {
        if (column.key === "name") return <span className="table__name">{row.name}</span>;
        if (column.key === "amount") return String(row.amount);
        return row.note ?? "—";
      }}
      emptyTitle="Nothing recorded"
      emptyHint="Rows appear here once recorded."
      {...overrides}
    />
  );
}

describe("kit DataTable", () => {
  it("pans inside its own container and stays keyboard-reachable", () => {
    const html = renderToStaticMarkup(table());
    expect(html).toContain('class="table-wrapper"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("The recorded rows.");
  });

  it("right-aligns a numeric column on the header and the cells", () => {
    const html = renderToStaticMarkup(table());
    // header + two body cells
    expect(html.match(/table__numeric/g) ?? []).toHaveLength(3);
  });

  it("applies a body-cell class to cells only, never the header", () => {
    const html = renderToStaticMarkup(table());
    const header = html.slice(html.indexOf("<thead"), html.indexOf("</thead>"));
    expect(header).not.toContain("text-sm");
    expect(html).toContain('class="text-sm"');
  });

  it("renders the first cell as the row's own header when asked", () => {
    const html = renderToStaticMarkup(table({ rowHeader: true }));
    expect(html).toContain('<th scope="row">');
    expect(html).toContain("Alpha");
  });

  it("supports per-row cell classes", () => {
    const withRowClass = renderToStaticMarkup(
      table({
        columns: [
          { key: "name", header: "Name" },
          {
            key: "note",
            header: "Note",
            cellClassName: (row) => (row.note ? "text-sm" : "text-sm text-muted"),
          },
        ] as DataTableColumn<Row>[],
        renderCell: (row, column) =>
          column.key === "name" ? row.name : row.note ?? "—",
      }),
    );
    expect(withRowClass).toContain('class="text-sm"');
    expect(withRowClass).toContain('class="text-sm text-muted"');
  });

  it("renders the empty state instead of a bare table when there are no rows", () => {
    const html = renderToStaticMarkup(table({ rows: [] }));
    expect(html).not.toContain("<table");
    expect(html).toContain('class="empty-state"');
    expect(html).toContain("Nothing recorded");
    expect(html).toContain("Rows appear here once recorded.");
  });

  it("renders a server-driven sort link and marks the active column", () => {
    const html = renderToStaticMarkup(
      table({
        sort: {
          key: "name",
          direction: "asc",
          hrefFor: (key, direction) => `/staff/list?sort=${key}&dir=${direction}`,
        },
      }),
    );
    expect(html).toContain('aria-sort="ascending"');
    // The active ascending column's link toggles to descending.
    expect(html).toContain('href="/staff/list?sort=name&amp;dir=desc"');
  });

  it("renders an optional totals row", () => {
    const html = renderToStaticMarkup(
      table({ footer: <tr><th scope="row">Total</th><td /><td className="table__numeric">350</td></tr> }),
    );
    expect(html).toContain("<tfoot>");
    expect(html).toContain("Total");
  });

  it("names the scroll region when a label is given", () => {
    const html = renderToStaticMarkup(table({ label: "Stock items" }));
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Stock items"');
  });
});

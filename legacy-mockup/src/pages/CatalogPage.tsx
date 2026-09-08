// Staff Commerce → Catalog. Reads the SAME store the public site sells from
// (products, packages, transport) so admin and sitefront always agree.
// Editing happens in Store & content.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { useStore } from "../lib/store";
import { money, type CatalogRecord } from "../lib/catalog";

type Row = {
  id: string;
  name: string;
  kind: string;
  price: string;
  active: boolean;
};

const columns: Column<Row>[] = [
  { key: "name", label: "Item", render: (i) => <span className="table__name">{i.name}</span> },
  { key: "kind", label: "Category", render: (i) => <Badge tone={i.kind === "Package" ? "accent" : i.kind === "Product" ? "success" : "info"}>{i.kind}</Badge> },
  { key: "price", label: "Price", numeric: true },
  { key: "status", label: "Status", render: (i) => <Badge tone={i.active ? "success" : "danger"}>{i.active ? "On sale" : "Hidden"}</Badge> },
];

function toRow(r: CatalogRecord): Row {
  return {
    id: r.sku,
    name: r.name,
    kind: r.kind,
    price: r.price === null ? "On arrangement" : money(r.price),
    active: r.active,
  };
}

export function CatalogPage() {
  const { records } = useStore();
  const rows = useMemo(
    () => records.filter((r) => r.kind === "Product" || r.kind === "Package" || r.kind === "Transport").map(toRow),
    [records],
  );

  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Catalog & packages"
        actions={<Link to="/admin/store"><Button size="sm">Manage store</Button></Link>}
      />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Products, packages and transport the customers can buy. Add or edit in{" "}
        <Link to="/admin/store">Store &amp; content</Link>.
      </p>
      <DataTable columns={columns} rows={rows} rowKey={(i) => i.id} />
    </>
  );
}

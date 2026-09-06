import { Link } from "react-router-dom";
import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { CATALOG, type CatalogItem } from "../lib/data";

const columns: Column<CatalogItem>[] = [
  { key: "name", label: "Item", render: (i) => <span className="table__name">{i.name}</span> },
  {
    key: "category",
    label: "Category",
    render: (i) => (
      <Badge tone={i.category === "Package" ? "accent" : i.category === "Service" ? "info" : "neutral"}>
        {i.category}
      </Badge>
    ),
  },
  { key: "price", label: "Price", numeric: true },
  { key: "stock", label: "Stock", render: (i) => (i.stock ? i.stock : <span className="muted">—</span>) },
];

export function CatalogPage() {
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Catalog & packages"
        actions={<Link to="/catalog/new"><Button size="sm">+ New item</Button></Link>}
      />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Services, merchandise, and packages are all configurable per tenant — prices, bundles,
        and dependencies live in configuration, not code.
      </p>
      <DataTable columns={columns} rows={CATALOG} rowKey={(i) => i.id} />
    </>
  );
}

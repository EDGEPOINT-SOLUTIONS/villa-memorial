// Inventory — Module C stock levels for merchandise. Demo data only.

import { PageHeader, Badge } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { INVENTORY, type StockItem } from "../lib/data";

const columns: Column<StockItem>[] = [
  { key: "name", label: "Item", render: (i) => <span className="table__name">{i.name}</span> },
  { key: "category", label: "Category", render: (i) => <Badge tone="neutral">{i.category}</Badge> },
  { key: "onHand", label: "On hand", numeric: true, render: (i) => (
    <span style={i.onHand <= i.reorderAt ? { color: "var(--color-status-danger)", fontWeight: 600 } : undefined}>{i.onHand}</span>
  ) },
  { key: "unit", label: "Unit" },
  { key: "reorderAt", label: "Reorder at", numeric: true },
];

export function InventoryPage() {
  const low = INVENTORY.filter((i) => i.onHand <= i.reorderAt).length;
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Inventory"
        actions={<Badge tone={low > 0 ? "warning" : "success"}>{low} low-stock item{low === 1 ? "" : "s"}</Badge>}
      />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Caskets, urns, flowers, markers, and keepsakes. Quantities below the reorder point are
        highlighted.
      </p>
      <DataTable columns={columns} rows={INVENTORY} rowKey={(i) => i.id} />
    </>
  );
}

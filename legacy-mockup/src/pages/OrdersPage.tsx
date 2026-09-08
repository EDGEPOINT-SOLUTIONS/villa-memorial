import { PageHeader, Badge } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { ORDERS, type Order } from "../lib/data";
import { useCart } from "../lib/cart";
import { money } from "../lib/shop";

const statusTone: Record<Order["status"], "warning" | "info" | "success" | "danger"> = {
  Quote: "warning",
  Confirmed: "info",
  Fulfilled: "success",
  Cancelled: "danger",
};

const columns: Column<Order>[] = [
  { key: "id", label: "Order", render: (o) => <span className="table__name">{o.id}</span> },
  { key: "customer", label: "Customer" },
  { key: "items", label: "Items", numeric: true },
  { key: "total", label: "Total", numeric: true },
  { key: "date", label: "Date" },
  { key: "status", label: "Status", render: (o) => <Badge tone={statusTone[o.status]}>{o.status}</Badge> },
];

export function OrdersPage() {
  const { placed } = useCart();
  // Public-site checkout places demo orders; surface them at the top of the
  // staff Orders queue so the buy journey round-trips in the demo.
  const demoRows: Order[] = placed.map((p) => ({
    id: p.reference,
    customer: p.name,
    items: p.lineCount,
    total: money(p.total),
    status: "Confirmed",
    date: p.date,
  }));
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Orders" />
      <DataTable
        columns={columns}
        rows={[...demoRows, ...ORDERS]}
        rowKey={(o) => o.id}
      />
    </>
  );
}

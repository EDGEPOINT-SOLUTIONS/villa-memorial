import { Link } from "react-router-dom";
import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { CUSTOMERS, type Customer } from "../lib/data";

const columns: Column<Customer>[] = [
  {
    key: "name",
    label: "Customer",
    render: (c) => (
      <Link to={`/customers/${c.id}`} className="table__name">
        {c.name}
      </Link>
    ),
  },
  { key: "type", label: "Role", render: (c) => <Badge tone="neutral">{c.type}</Badge> },
  { key: "city", label: "City" },
  { key: "activeCases", label: "Active cases", numeric: true },
  { key: "plans", label: "Plans", numeric: true },
  { key: "lots", label: "Lots", numeric: true },
];

export function CustomersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        actions={
          <Button size="sm">+ New customer</Button>
        }
      />
      <DataTable columns={columns} rows={CUSTOMERS} rowKey={(c) => c.id} />
    </>
  );
}

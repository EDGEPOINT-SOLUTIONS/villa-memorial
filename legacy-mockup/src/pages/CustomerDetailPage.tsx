import { Link, useParams } from "react-router-dom";
import { PageHeader, Card, Badge, Button, Tabs, KeyValue } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { CUSTOMERS, type Customer } from "../lib/data";
import { useState } from "react";

const historyColumns: Column<Customer["serviceHistory"][number]>[] = [
  { key: "ref", label: "Ref" },
  { key: "service", label: "Service" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount", numeric: true },
];

export function CustomerDetailPage() {
  const { id } = useParams();
  const customer = CUSTOMERS.find((c) => c.id === id);
  const [tab, setTab] = useState(0);

  if (!customer) {
    return (
      <>
        <PageHeader eyebrow="Customers" title="Customer not found" />
        <p>
          <Link to="/customers">Back to customers</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/customers">Customers</Link>}
        title={customer.name}
        actions={
          <>
            <Button variant="secondary" size="sm">
              Communication log
            </Button>
            <Link to={`/customers/new?edit=${customer.id}`}>
              <Button size="sm">Edit</Button>
            </Link>
          </>
        }
      />

      <div className="split">
        <Card title="Primary contact">
          <KeyValue
            items={[
              ["Role", <Badge key="r" tone="neutral">{customer.type}</Badge>],
              ["Phone", customer.phone],
              ["Email", customer.email],
              ["City", customer.city],
            ]}
          />
        </Card>
        <Card title="Linked summary">
          <KeyValue
            items={[
              ["Active cases", customer.activeCases],
              ["Plans", customer.plans],
              ["Lots", customer.lots],
              ["Deceased", customer.deceased.length],
            ]}
          />
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Tabs
          tabs={["Overview", "Family", "Plans", "Lots", "Cases", "Documents"]}
          active={tab}
          onChange={setTab}
        />

        {tab === 0 && (
          <div className="split">
            <Card title="Deceased (linked)">
              {customer.deceased.length === 0 ? (
                <p className="muted">No deceased persons linked.</p>
              ) : (
                <div className="stack">
                  {customer.deceased.map((d) => (
                    <div key={d.name}>
                      <div style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-lg)" }}>
                        {d.name}
                      </div>
                      <div className="life-dates">{d.dates}</div>
                      <Badge tone="info">{d.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card title="Service history">
              {customer.serviceHistory.length === 0 ? (
                <p className="muted">No service history yet.</p>
              ) : (
                <DataTable
                  columns={historyColumns}
                  rows={customer.serviceHistory}
                  rowKey={(h) => h.ref}
                />
              )}
            </Card>
          </div>
        )}

        {tab === 1 && (
          <Card title="Family members">
            <table className="table" style={{ margin: "-1px" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Relationship</th>
                </tr>
              </thead>
              <tbody>
                {customer.family.map((f) => (
                  <tr key={f.name}>
                    <td className="table__name">{f.name}</td>
                    <td>{f.relation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab >= 2 && (
          <Card title="Plans, lots & cases">
            <p className="muted">
              Cross-linked from the Plans, Property, and Cases modules. In the full system these
              are live relationships; this demo shows the summary above.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

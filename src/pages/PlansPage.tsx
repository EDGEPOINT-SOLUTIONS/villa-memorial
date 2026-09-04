import { Link } from "react-router-dom";
import { PageHeader, Badge, Button, Card, KeyValue } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { PLANS, type Plan } from "../lib/data";

const columns: Column<Plan>[] = [
  {
    key: "name",
    label: "Plan",
    render: (p) => (
      <Link to={`/plans/${p.id}`} className="table__name">
        {p.name}
      </Link>
    ),
  },
  { key: "price", label: "Price", numeric: true },
  { key: "term", label: "Term" },
  { key: "holders", label: "Holders", numeric: true },
  {
    key: "status",
    label: "Status",
    render: (p) => <Badge tone={p.status === "Active" ? "success" : p.status === "Mature" ? "accent" : "neutral"}>{p.status}</Badge>,
  },
];

export function PlansPage() {
  return (
    <>
      <PageHeader
        eyebrow="Commerce"
        title="Memorial plans"
        actions={<Button size="sm">+ New plan</Button>}
      />
      <DataTable columns={columns} rows={PLANS} rowKey={(p) => p.id} />
      <div className="grid grid--3" style={{ marginTop: "var(--space-6)" }}>
        {PLANS.slice(0, 3).map((p) => (
          <Card key={p.id} title={p.name}>
            <KeyValue
              items={[
                ["Price", p.price],
                ["Term", p.term],
                ["Holders", p.holders],
              ]}
            />
            <div style={{ marginTop: "var(--space-3)" }}>
              {p.benefits.map((b) => (
                <Badge key={b} tone="accent" >{b}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

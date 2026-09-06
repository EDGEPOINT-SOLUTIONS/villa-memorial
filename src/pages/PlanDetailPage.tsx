import { Link, useParams } from "react-router-dom";
import { PageHeader, Card, Badge, KeyValue, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { PLANS, type Plan } from "../lib/data";

type Installment = Plan["installments"][number];

const columns: Column<Installment>[] = [
  { key: "due", label: "Due date" },
  { key: "amount", label: "Amount", numeric: true },
  { key: "paid", label: "Paid", numeric: true },
  {
    key: "status",
    label: "Status",
    render: (i) => (
      <Badge tone={i.status === "Paid" ? "success" : i.status === "Overdue" ? "danger" : "warning"}>
        {i.status}
      </Badge>
    ),
  },
];

export function PlanDetailPage() {
  const { id } = useParams();
  const plan = PLANS.find((p) => p.id === id);

  if (!plan) {
    return (
      <>
        <PageHeader eyebrow="Plans" title="Plan not found" />
        <p>
          <Link to="/plans">Back to plans</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={<Link to="/plans">Plans</Link>}
        title={plan.name}
        actions={<Link to={`/plans/new?edit=${plan.id}`}><Button size="sm">Edit plan</Button></Link>}
      />

      <div className="split">
        <Card title="Plan details">
          <KeyValue
            items={[
              ["Price", plan.price],
              ["Term", plan.term],
              ["Holders", plan.holders],
              ["Status", <Badge key="s" tone={plan.status === "Active" ? "success" : "accent"}>{plan.status}</Badge>],
            ]}
          />
        </Card>
        <Card title="Benefits">
          <div className="stack">
            {plan.benefits.map((b) => (
              <div key={b}>• {b}</div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Card title="Installment schedule">
          <DataTable columns={columns} rows={plan.installments} rowKey={(i) => i.due} />
        </Card>
      </div>
    </>
  );
}

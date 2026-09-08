// Staff plan detail — reads the same store record the public site uses.

import { Link, useParams } from "react-router-dom";
import { PageHeader, Card, Badge, KeyValue } from "../components/ui";
import { useStore } from "../lib/store";
import { money } from "../lib/catalog";

export function PlanDetailPage() {
  const { id = "" } = useParams();
  const { get } = useStore();
  const plan = get(id) ?? get(`plan-${id}`);

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
        actions={
          <Link to="/admin/store">
            <button className="btn btn--secondary btn--sm">Manage in Store</button>
          </Link>
        }
      />

      <div className="split">
        <Card title="Plan details">
          <KeyValue
            items={[
              ["Price", plan.price === null ? "On arrangement" : money(plan.price)],
              ["Status", <Badge key="s" tone={plan.active ? "success" : "danger"}>{plan.active ? "On sale" : "Hidden"}</Badge>],
              ["Category", plan.kind],
            ]}
          />
        </Card>
        <Card title="What's included">
          <div className="stack">
            {plan.features.map((b) => (
              <div key={b}>• {b}</div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <Card title="Description">
          <p className="muted">{plan.detail}</p>
        </Card>
      </div>
    </>
  );
}

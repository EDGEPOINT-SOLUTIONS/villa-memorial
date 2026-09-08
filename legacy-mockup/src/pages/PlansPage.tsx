// Staff Commerce → Memorial plans. Reads the SAME store the public site uses
// (Garden Niches, Mausoleum, Premium Lots + anything added), so what the admin
// sees is exactly what the site sells. Editing happens in Store & content.

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Badge, Card, KeyValue } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { useStore } from "../lib/store";
import { money, type CatalogRecord } from "../lib/catalog";

function toPlan(r: CatalogRecord) {
  return {
    id: r.sku,
    name: r.name,
    price: r.price === null ? "On arrangement" : money(r.price),
    active: r.active,
    benefits: r.features,
  };
}

type PlanRow = ReturnType<typeof toPlan>;

const columns: Column<PlanRow>[] = [
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
  {
    key: "status",
    label: "Status",
    render: (p) => <Badge tone={p.active ? "success" : "danger"}>{p.active ? "On sale" : "Hidden"}</Badge>,
  },
];

export function PlansPage() {
  const { byKind } = useStore();
  const plans = useMemo(() => byKind("Plan").map(toPlan), [byKind]);

  return (
    <>
      <PageHeader eyebrow="Commerce" title="Memorial plans" />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        The same plans customers see on the public site. Change names, prices, images or take a
        plan off sale in <Link to="/admin/store">Store &amp; content</Link>.
      </p>
      <DataTable columns={columns} rows={plans} rowKey={(p) => p.id} />
      <div className="grid grid--3" style={{ marginTop: "var(--space-6)" }}>
        {plans.slice(0, 3).map((p) => (
          <Card key={p.id} title={p.name}>
            <KeyValue items={[["Price", p.price], ["Status", p.active ? "On sale" : "Hidden"]]} />
            <div style={{ marginTop: "var(--space-3)" }}>
              {p.benefits.map((b) => (
                <Badge key={b} tone="accent">{b}</Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

// Sales pipeline — staff view of leads moving toward arrangement. Read-only
// summary plus the lead rows behind the totals (demo data).

import { PageHeader, Badge, Card } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { PIPELINE, PIPELINE_ROWS, type PipelineRow } from "../lib/data";

const columns: Column<PipelineRow>[] = [
  { key: "name", label: "Lead", render: (r) => <span className="table__name">{r.name}</span> },
  { key: "interest", label: "Interest" },
  { key: "stage", label: "Stage", render: (r) => <Badge tone="info">{r.stage}</Badge> },
  { key: "value", label: "Value", numeric: true },
  { key: "owner", label: "Owner" },
];

export function PipelinePage() {
  return (
    <>
      <PageHeader eyebrow="Relationships" title="Sales pipeline" />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Inquiry → Consultation → Quote → Arrangement → Closed. Staff sees every lead; an agent
        sees only their own in the agent portal.
      </p>

      <div className="grid grid--5" style={{ marginBottom: "var(--space-5)" }}>
        {PIPELINE.map((s) => (
          <div key={s.id} className="kpi" style={{ cursor: "default" }}>
            <div className="kpi__label">{s.name}</div>
            <div className="kpi__value">{s.count}</div>
            <div className="small muted">{s.amount}</div>
          </div>
        ))}
      </div>

      <Card title="Open leads">
        <DataTable columns={columns} rows={PIPELINE_ROWS} rowKey={(r) => r.id} />
      </Card>
    </>
  );
}

import { useState } from "react";
import { PageHeader, Card, Badge, Button, Field, Input, Select } from "../components/ui";
import { WORKFLOWS, type WorkflowStage } from "../lib/data";

export function AdminWorkflowsPage() {
  const [wfId, setWfId] = useState(WORKFLOWS[0].id);
  const wf = WORKFLOWS.find((w) => w.id === wfId) ?? WORKFLOWS[0];

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Workflows"
        actions={<Button size="sm">+ New workflow</Button>}
      />

      <div className="toolbar">
        <Select value={wfId} onChange={(e) => setWfId(e.target.value)} style={{ width: "auto" }}>
          {WORKFLOWS.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </Select>
        <span className="chip">Configurable · no code</span>
      </div>

      <Card title={wf.name}>
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "stretch",
            overflowX: "auto",
            paddingBottom: "var(--space-4)",
          }}
        >
          {wf.stages.map((stage, i) => (
            <div key={stage.id} style={{ display: "flex", alignItems: "center" }}>
              <StageCard stage={stage} index={i} />
              {i < wf.stages.length - 1 ? (
                <span style={{ margin: "0 var(--space-2)", color: "var(--color-text-muted)" }}>→</span>
              ) : null}
            </div>
          ))}
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          <StageEditor stage={wf.stages[0]} />
        </div>
      </Card>
    </>
  );
}

function StageCard({ stage, index }: { stage: WorkflowStage; index: number }) {
  return (
    <div
      style={{
        minWidth: "160px",
        background: index === 0 ? "var(--color-bg-subtle)" : "var(--color-bg-surface-raised)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3)",
      }}
    >
      <div className="field__label" style={{ marginBottom: "var(--space-2)" }}>
        {index + 1}. {stage.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {stage.requiredDocs.map((d) => (
          <Badge key={d} tone="info">{d}</Badge>
        ))}
        {stage.requiredTasks.map((t) => (
          <Badge key={t} tone="neutral">{t}</Badge>
        ))}
        {stage.deadline ? <span className="small muted">Deadline: {stage.deadline}</span> : null}
      </div>
    </div>
  );
}

function StageEditor({ stage }: { stage: WorkflowStage }) {
  return (
    <div className="grid grid--2">
      <Field label="Stage name">
        <Input defaultValue={stage.name} />
      </Field>
      <Field label="Deadline">
        <Input defaultValue={stage.deadline} placeholder="e.g. +24h" />
      </Field>
      <Field label="Required documents" hint="Comma-separated">
        <Input defaultValue={stage.requiredDocs.join(", ")} />
      </Field>
      <Field label="Required tasks" hint="Comma-separated">
        <Input defaultValue={stage.requiredTasks.join(", ")} />
      </Field>
    </div>
  );
}

// New workflow — admin workflow configuration. Mirrors the demo pattern.
// Keep it simple: name + starting stages (a full builder already exists on the
// list screen; this is the "new blank workflow" entry point).

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Badge } from "../components/ui";
import { useToast } from "../components/toast";

export function WorkflowNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [firstStage, setFirstStage] = useState("");

  const ref = `wf-${name.trim().toLowerCase().replace(/\s+/g, "-") || "untitled"}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please add a workflow name.", "danger");
      return;
    }
    setDone(true);
    toast(`Workflow created · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/admin/workflows">Workflows</Link>} title={done ? "Workflow created" : "New workflow"} />

      {done ? (
        <Card title="Workflow created">
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{name}</strong> was created with an initial stage. Use the workflow builder to
              add stages, required documents, and required tasks.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/admin/workflows")}>Back to workflows</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Create a workflow">
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Workflow name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cremation" />
              </Field>
              <Field label="First stage" hint="Optional — you can build stages next">
                <Input value={firstStage} onChange={(e) => setFirstStage(e.target.value)} placeholder="e.g. Inquiry" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/admin/workflows")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Create workflow
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

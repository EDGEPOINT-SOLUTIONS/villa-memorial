// New memorial plan — Module B. Mirrors the CaseNewPage demo pattern.

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { PLANS } from "../lib/data";

export function PlanNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editing = PLANS.find((p) => p.id === editId);

  const [done, setDone] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [price, setPrice] = useState(editing?.price ?? "");
  const [term, setTerm] = useState(editing?.term ?? "5 years");
  const [status, setStatus] = useState<string>(editing?.status ?? "Active");
  const [benefits, setBenefits] = useState(editing ? editing.benefits.join(", ") : "");

  const ref = editing?.id ?? `plan-${PLANS.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !price.trim()) {
      toast("Please add a plan name and price.", "danger");
      return;
    }
    setDone(true);
    toast(editing ? `Plan updated · ${ref}` : `Plan created · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/plans">Memorial plans</Link>} title={done ? (editing ? "Plan updated" : "Plan created") : editing ? "Edit memorial plan" : "New memorial plan"} />

      {done ? (
        <Card title={editing ? "Plan updated" : "Plan created"}>
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{name}</strong> at {price} is now {editing ? "updated" : "sellable"}. Holders
              can be added once the first subscription or pre-need contract is signed.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/plans")}>Back to plans</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title={editing ? `Edit ${editing.name}` : "Add a memorial plan"}>
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Plan name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Garden of Roses" />
              </Field>
              <Field label="Price">
                <Input required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₱ 120,000" />
              </Field>
              <Field label="Term">
                <Select value={term} onChange={(e) => setTerm(e.target.value)}>
                  <option>3 years</option>
                  <option>5 years</option>
                  <option>7 years</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option>Active</option>
                  <option>Mature</option>
                  <option>Draft</option>
                </Select>
              </Field>
              <Field label="Benefits" hint="Comma-separated, e.g. Interment right, Chapel credit">
                <Input value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder="Interment right, Chapel credit" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/plans")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                {editing ? "Save changes" : "Create plan"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

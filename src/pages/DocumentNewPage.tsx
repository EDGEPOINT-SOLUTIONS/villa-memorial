// Generate document — Module J. Mirrors the demo pattern.

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { DOCUMENTS } from "../lib/data";

const DOC_TYPES = [
  "Service contract",
  "Official receipt",
  "Certificate",
  "Authorization",
  "Purchase agreement",
];

export function DocumentNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editing = DOCUMENTS.find((d) => d.id === editId);

  const [done, setDone] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState(editing?.type ?? DOC_TYPES[0]);
  const [related, setRelated] = useState(editing?.related ?? "");

  const ref = editing?.id ?? `doc-${DOCUMENTS.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please add a document title.", "danger");
      return;
    }
    setDone(true);
    toast(editing ? `Document updated · ${ref}` : `Document generated · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/documents">Documents</Link>} title={done ? (editing ? "Document updated" : "Document generated") : editing ? "Edit document" : "Generate document"} />

      {done ? (
        <Card title={editing ? "Document updated" : "Document generated"}>
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{name}</strong> was {editing ? "updated" : "generated"} from the {type}{" "}
              template. In the full system a generated artifact is an HTML/PDF render with a full
              status lifecycle (draft → generated → sent → signed).
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/documents")}>Back to documents</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title={editing ? `Edit ${editing.name}` : "Generate a document"}>
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Document title">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Service contract — Dela Cruz" />
              </Field>
              <Field label="Type">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {DOC_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Related reference" hint="e.g. a case, invoice, or lot id">
                <Input value={related} onChange={(e) => setRelated(e.target.value)} placeholder="e.g. CS-1042" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/documents")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                {editing ? "Save changes" : "Generate"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

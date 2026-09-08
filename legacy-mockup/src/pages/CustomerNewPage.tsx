// New customer — Module A. Mirrors the CaseNewPage demo pattern: collect
// details, confirm (toast + done card), then return to the list. Demo only —
// no backend, no persistence (consistent with the rest of the mockup).

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { CUSTOMERS } from "../lib/data";

export function CustomerNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editing = CUSTOMERS.find((c) => c.id === editId);

  const [done, setDone] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<string>(editing?.type ?? "Purchaser");
  const [city, setCity] = useState(editing?.city ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");

  const ref = editing?.id ?? `cus-${CUSTOMERS.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast("Please complete name, email, and phone.", "danger");
      return;
    }
    setDone(true);
    toast(editing ? `Customer updated · ${ref}` : `Customer created · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/customers">Customers</Link>} title={done ? (editing ? "Customer updated" : "Customer created") : editing ? "Edit customer" : "New customer"} />

      {done ? (
        <Card title={editing ? "Customer updated" : "Customer created"}>
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{name}</strong> was {editing ? "updated" : "added as a " + type.toLowerCase() + " with a family account"}.
              The CRM, plans, and property modules will pick this record up in the full system.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/customers")}>Go to customers</Button>
              {editing ? (
                <Button variant="secondary" onClick={() => navigate(`/customers/${ref}`)}>
                  Open customer record
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : (
        <Card title={editing ? `Edit ${editing.name}` : "Add a customer / family account"}>
          <form className="stack" onSubmit={submit}>
            <p className="small muted">
              One customer record can hold a family account, linked deceased persons, and their
              plans, lots, and service history.
            </p>
            <div className="form-grid">
              <Field label="Full name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Dela Cruz" />
              </Field>
              <Field label="Role">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  <option>Purchaser</option>
                  <option>Next of kin</option>
                  <option>Authorized representative</option>
                  <option>Referral</option>
                </Select>
              </Field>
              <Field label="Email">
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Field label="Phone">
                <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxxx" />
              </Field>
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Isabela City" />
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/customers")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                {editing ? "Save changes" : "Create customer"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

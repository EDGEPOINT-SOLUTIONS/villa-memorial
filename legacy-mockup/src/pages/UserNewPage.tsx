// Invite user — staff/user administration. Mirrors the demo pattern.

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { USERS } from "../lib/data";

const ROLES = [
  "Super Administrator",
  "Funeral Director",
  "Cashier",
  "Embalmer",
  "Chapel Coordinator",
  "Driver",
];

const BRANCHES = ["Head Office", "Isabela City"];

export function UserNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[1]);
  const [branch, setBranch] = useState(BRANCHES[1]);

  const ref = `u-${USERS.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast("Please add a name and email.", "danger");
      return;
    }
    setDone(true);
    toast(`Invitation sent to ${email} (${ref})`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/admin/users">Users & roles</Link>} title={done ? "User invited" : "Invite user"} />

      {done ? (
        <Card title="Invitation sent">
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              An invitation email is on its way to <strong>{email}</strong>. Once accepted,{" "}
              {name} will hold the <strong>{role}</strong> role at {branch} ({ref}).
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/admin/users")}>Back to users</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Invite a user">
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Full name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ana Santos" />
              </Field>
              <Field label="Email">
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@villamemorial.ph" />
              </Field>
              <Field label="Role">
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Branch">
                <Select value={branch} onChange={(e) => setBranch(e.target.value)}>
                  {BRANCHES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/admin/users")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                Send invite
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

// New employee — Module G. Mirrors the demo pattern.

import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Button, Card, Field, Input, Select, Badge } from "../components/ui";
import { useToast } from "../components/toast";
import { EMPLOYEES } from "../lib/data";

export function EmployeeNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const editId = params.get("edit");
  const editing = EMPLOYEES.find((e) => e.id === editId);

  const [done, setDone] = useState(false);
  const [name, setName] = useState(editing?.name ?? "");
  const [role, setRole] = useState(editing?.role ?? "Funeral Director");
  const [department, setDepartment] = useState(editing?.department ?? "Operations");

  const ref = editing?.id ?? `emp-${EMPLOYEES.length + 1}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Please add the employee's name.", "danger");
      return;
    }
    setDone(true);
    toast(editing ? `Employee updated · ${ref}` : `Employee added · ${ref}`, "success");
  }

  return (
    <>
      <PageHeader eyebrow={<Link to="/hr">Staff directory</Link>} title={done ? (editing ? "Employee updated" : "Employee added") : editing ? "Edit employee" : "New employee"} />

      {done ? (
        <Card title={editing ? "Employee updated" : "Employee added"}>
          <div className="stack">
            <Badge tone="success">Confirmed</Badge>
            <p>
              <strong>{name}</strong> was {editing ? "updated" : "added to the directory"} as {role} ({department}).
              Attendance and leave balances start on their first active day.
            </p>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <Button onClick={() => navigate("/hr")}>Back to directory</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title={editing ? `Edit ${editing.name}` : "Add an employee"}>
          <form className="stack" onSubmit={submit}>
            <div className="form-grid">
              <Field label="Full name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Althea Villanueva" />
              </Field>
              <Field label="Role">
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Funeral Director" />
              </Field>
              <Field label="Department">
                <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option>Operations</option>
                  <option>Preparation</option>
                  <option>Finance</option>
                  <option>Fleet</option>
                </Select>
              </Field>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Button type="button" variant="secondary" onClick={() => navigate("/hr")}>
                Cancel
              </Button>
              <Button type="submit" variant="accent">
                {editing ? "Save changes" : "Add employee"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

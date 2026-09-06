import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Card, Badge, Button, Tabs } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { USERS, ROLES, type User } from "../lib/data";

const userStatusTone: Record<User["status"], "success" | "warning" | "neutral"> = {
  Active: "success",
  Invited: "warning",
  Disabled: "neutral",
  "On leave": "warning",
};

const userColumns: Column<User>[] = [
  { key: "name", label: "Name", render: (u) => <span className="table__name">{u.name}</span> },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "branch", label: "Branch" },
  { key: "status", label: "Status", render: (u) => <Badge tone={userStatusTone[u.status]}>{u.status}</Badge> },
];

const MODULES = ["catalog", "orders", "billing", "accounting", "cases", "scheduling", "property", "hr", "documents"];
const ACTIONS = ["view", "create", "edit", "approve", "cancel"];

export function AdminUsersPage() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users & roles"
        actions={<Link to="/admin/users/new"><Button size="sm">+ Invite user</Button></Link>}
      />

      <Tabs tabs={["Users", "Roles", "Permission matrix"]} active={tab} onChange={setTab} />

      {tab === 0 && <DataTable columns={userColumns} rows={USERS} rowKey={(u) => u.id} />}

      {tab === 1 && (
        <div className="grid grid--2">
          {ROLES.map((r) => (
            <Card key={r.id} title={r.label} actions={<Badge tone="neutral">{r.scopes.length} scopes</Badge>}>
              <p className="small muted">{r.description}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 2 && (
        <Card title="Role × module × action">
          <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
            Scopes come from the frozen RBAC vocabulary. Roles are data — you assign scopes to
            roles here, but you cannot invent new scope strings from this screen.
          </p>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Action</th>
                  {MODULES.map((m) => (
                    <th key={m} scope="col">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACTIONS.map((a) => (
                  <tr key={a}>
                    <td className="table__name">{a}</td>
                    {MODULES.map((m) => (
                      <td key={m}>
                        <input
                          type="checkbox"
                          aria-label={`${a} ${m}`}
                          defaultChecked={(a === "view") || (a === "create" && m === "cases") || (a === "edit" && m === "cases")}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

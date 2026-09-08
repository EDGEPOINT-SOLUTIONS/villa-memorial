import { PageHeader, Card } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { AUDIT, type AuditEntry } from "../lib/data";

const columns: Column<AuditEntry>[] = [
  { key: "when", label: "When" },
  { key: "actor", label: "Actor", render: (a) => <span className="table__name">{a.actor}</span> },
  { key: "action", label: "Action" },
  { key: "target", label: "Target" },
  { key: "branch", label: "Branch" },
];

export function AdminAuditPage() {
  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit trail" />

      <div className="toolbar">
        <select className="select" style={{ width: "auto" }} defaultValue="">
          <option value="" disabled>Actor</option>
          <option>All</option>
        </select>
        <select className="select" style={{ width: "auto" }} defaultValue="">
          <option value="" disabled>Action</option>
          <option>All</option>
        </select>
        <select className="select" style={{ width: "auto" }} defaultValue="">
          <option value="" disabled>Branch</option>
          <option>All</option>
        </select>
      </div>

      <Card>
        <DataTable columns={columns} rows={AUDIT} rowKey={(a) => a.id} />
      </Card>

      <p className="small muted" style={{ marginTop: "var(--space-4)" }}>
        Read-only. Every action that touches money, inventory, schedules, or permissions is
        recorded with actor, action, target, and tenant/branch context.
      </p>
    </>
  );
}

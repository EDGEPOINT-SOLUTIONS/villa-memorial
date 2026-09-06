// Maintenance / work orders — Module D lot upkeep jobs.

import { PageHeader, Badge } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { WORK_ORDERS, type WorkOrder } from "../lib/data";

const statusTone: Record<WorkOrder["status"], "warning" | "info" | "success"> = {
  Open: "warning",
  "In progress": "info",
  Done: "success",
};

const prioTone: Record<WorkOrder["priority"], "neutral" | "warning" | "danger"> = {
  Low: "neutral",
  Medium: "warning",
  High: "danger",
};

const columns: Column<WorkOrder>[] = [
  { key: "id", label: "Work order", render: (w) => <span className="table__name">{w.id}</span> },
  { key: "lot", label: "Lot" },
  { key: "title", label: "Description" },
  { key: "priority", label: "Priority", render: (w) => <Badge tone={prioTone[w.priority]}>{w.priority}</Badge> },
  { key: "status", label: "Status", render: (w) => <Badge tone={statusTone[w.status]}>{w.status}</Badge> },
  { key: "assignee", label: "Assignee" },
];

export function WorkOrdersPage() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Maintenance & work orders" />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Upkeep jobs across the memorial park. Work orders can be raised against any lot from its
        record.
      </p>
      <DataTable columns={columns} rows={WORK_ORDERS} rowKey={(w) => w.id} />
    </>
  );
}

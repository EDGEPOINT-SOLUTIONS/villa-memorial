// Vehicle dispatch — Module H fleet & trip assignment.

import { PageHeader, Badge } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { DISPATCH_TRIPS, type DispatchTrip } from "../lib/data";

const statusTone: Record<DispatchTrip["status"], "info" | "warning" | "success"> = {
  Assigned: "info",
  "In transit": "warning",
  Completed: "success",
};

const columns: Column<DispatchTrip>[] = [
  { key: "id", label: "Trip", render: (t) => <span className="table__name">{t.id}</span> },
  { key: "vehicle", label: "Vehicle" },
  { key: "driver", label: "Driver" },
  { key: "title", label: "Run" },
  { key: "date", label: "When" },
  { key: "status", label: "Status", render: (t) => <Badge tone={statusTone[t.status]}>{t.status}</Badge> },
];

export function DispatchPage() {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Vehicle dispatch" />
      <p className="small muted" style={{ marginBottom: "var(--space-4)" }}>
        Hearses, family vehicles, and vans assigned to active cases and transfers.
      </p>
      <DataTable columns={columns} rows={DISPATCH_TRIPS} rowKey={(t) => t.id} />
    </>
  );
}

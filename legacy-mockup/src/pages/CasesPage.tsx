import { Link } from "react-router-dom";
import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { CASES, type Case } from "../lib/data";

const statusTone: Record<Case["status"], "warning" | "info" | "success" | "neutral"> = {
  Arrangement: "warning",
  Scheduled: "info",
  "In service": "info",
  Completed: "success",
  Archived: "neutral",
};

const columns: Column<Case>[] = [
  {
    key: "id",
    label: "Case",
    render: (c) => (
      <div>
        <Link to={`/cases/${c.id}`} className="table__name">
          {c.id}
        </Link>
        <div className="table__sub">{c.type}</div>
      </div>
    ),
  },
  {
    key: "deceased",
    label: "Deceased",
    render: (c) => <span style={{ fontFamily: "var(--font-serif)" }}>{c.deceased}</span>,
  },
  { key: "date", label: "Opened" },
  { key: "location", label: "Location" },
  { key: "assignee", label: "Assignee" },
  { key: "status", label: "Status", render: (c) => <Badge tone={statusTone[c.status]}>{c.status}</Badge> },
];

export function CasesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Funeral cases"
        actions={
          <Link to="/cases/new">
            <Button size="sm">+ New case</Button>
          </Link>
        }
      />
      <DataTable columns={columns} rows={CASES} rowKey={(c) => c.id} />
    </>
  );
}

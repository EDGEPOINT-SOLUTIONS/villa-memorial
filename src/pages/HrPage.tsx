import { Link } from "react-router-dom";
import { PageHeader, Badge, Button } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { EMPLOYEES, type Employee } from "../lib/data";

const statusTone: Record<Employee["status"], "success" | "warning" | "neutral"> = {
  Active: "success",
  "On leave": "warning",
  "Off duty": "neutral",
};

const columns: Column<Employee>[] = [
  {
    key: "name",
    label: "Employee",
    render: (e) => (
      <Link to={`/hr/${e.id}`} className="table__name">
        {e.name}
      </Link>
    ),
  },
  { key: "role", label: "Role" },
  { key: "department", label: "Department" },
  { key: "attendance", label: "Attendance" },
  { key: "status", label: "Status", render: (e) => <Badge tone={statusTone[e.status]}>{e.status}</Badge> },
];

export function HrPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Staff directory"
        actions={<Button size="sm">+ New employee</Button>}
      />
      <DataTable columns={columns} rows={EMPLOYEES} rowKey={(e) => e.id} />
    </>
  );
}

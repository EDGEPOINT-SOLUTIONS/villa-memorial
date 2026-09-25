import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { DataTable, StatCard } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listEmployees } from "@/lib/api-client/hr";

export const metadata = { title: "Staff directory — Admin Portal" };

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  active: "success",
  on_leave: "warning",
  separated: "neutral",
};

const DEPT_LABEL: Record<string, string> = {
  operations: "Operations",
  finance: "Finance",
  admin: "Administration",
};

export default async function HrPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["hr:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Staff directory" />
        <PageSection>
          <ForbiddenState requiredScopes={["hr:read"]} />
        </PageSection>
      </>
    );
  }

  let employees;
  try {
    employees = await listEmployees();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Staff directory" />
        <PageSection>
          <ErrorState message="Unable to load employee records." />
        </PageSection>
      </>
    );
  }

  const { q, status } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const statusFilter = (status ?? "").trim();

  let filtered = employees;
  if (query) {
    filtered = filtered.filter((e) =>
      [e.employee_number, e.first_name, e.last_name, e.role, e.department]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }
  if (statusFilter) {
    filtered = filtered.filter((e) => e.employment_status === statusFilter);
  }

  const activeCount = employees.filter((e) => e.employment_status === "active").length;
  const onLeave = employees.filter((e) => e.employment_status === "on_leave").length;

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Staff directory"
        lead="The office's staff records and who is active."
        actions={
          <span className="text-sm text-muted">
            {activeCount} active of {employees.length} total
          </span>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <StatCard label="Team" value={employees.length} sub="total staff" />
        <StatCard label="Active" value={activeCount} sub="currently working" />
        <StatCard label="On leave" value={onLeave} sub="away today" />
        <StatCard
          label="Departments"
          value={new Set(employees.map((e) => e.department)).size}
          sub="across the team"
        />
      </div>

      <PageSection>
        <form className="filter-bar" role="search">
          <input
            className="input"
            type="search"
            name="q"
            placeholder="Search by name, number, role, department…"
            defaultValue={q ?? ""}
            aria-label="Search employees"
          />
          <select
            className="select"
            name="status"
            defaultValue={statusFilter}
            aria-label="Filter by employment status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="separated">Separated</option>
          </select>
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {q || statusFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/hr">
              Clear
            </Link>
          ) : null}
        </form>

        <DataTable
          columns={[
            { key: "number", header: "Number" },
            { key: "name", header: "Name" },
            { key: "role", header: "Role", className: "text-sm" },
            { key: "department", header: "Department", className: "text-sm" },
            { key: "status", header: "Status" },
            { key: "hire_date", header: "Hire date", className: "text-sm" },
          ]}
          rows={filtered}
          rowKey={(emp) => emp.id}
          emptyTitle={
            query || statusFilter ? "No employees match your filter" : "No employees found"
          }
          emptyHint={
            query || statusFilter
              ? "Try a different search or clear the filter."
              : "Employee records will appear here once the HR service is connected."
          }
          renderCell={(emp, column) => {
            switch (column.key) {
              case "number":
                return <code>{emp.employee_number}</code>;
              case "name":
                return (
                  <span className="name-cell">
                    <span className="name-avatar" aria-hidden="true">
                      {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                    </span>
                    <Link href={`/staff/hr/${emp.id}`} className="name-cell__link">
                      {emp.first_name} {emp.last_name}
                    </Link>
                  </span>
                );
              case "role":
                return emp.role;
              case "department":
                return DEPT_LABEL[emp.department] ?? emp.department;
              case "status":
                return (
                  <Badge tone={STATUS_TONE[emp.employment_status] ?? "neutral"}>
                    {emp.employment_status.replace(/_/g, " ")}
                  </Badge>
                );
              case "hire_date":
                return emp.hire_date;
              default:
                return null;
            }
          }}
        />
      </PageSection>
    </>
  );
}

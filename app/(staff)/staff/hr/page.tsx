import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listEmployees } from "@/lib/api-client/hr";

export const metadata = { title: "Staff directory — Staff Portal" };

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
        actions={
          <span className="text-sm text-muted">
            {activeCount} active of {employees.length} total
          </span>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Team</span><span className="kpi-card__value">{employees.length}</span><span className="kpi-card__sub">total staff</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Active</span><span className="kpi-card__value">{activeCount}</span><span className="kpi-card__sub">currently working</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">On leave</span><span className="kpi-card__value">{onLeave}</span><span className="kpi-card__sub">away today</span></span></span>
        <span className="card kpi-card"><span className="kpi-card__body"><span className="kpi-card__label">Departments</span><span className="kpi-card__value">{new Set(employees.map((e) => e.department)).size}</span><span className="kpi-card__sub">across the team</span></span></span>
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

        {filtered.length === 0 ? (
          <EmptyState
            title={
              query || statusFilter ? "No employees match your filter" : "No employees found"
            }
            hint={
              query || statusFilter
                ? "Try a different search or clear the filter."
                : "Employee records will appear here once the HR service is connected."
            }
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Number</th>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Department</th>
                  <th scope="col">Status</th>
                  <th scope="col">Hire date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id}>
                    <td><code>{emp.employee_number}</code></td>
                    <td>
                      <span className="name-cell">
                        <span className="name-avatar" aria-hidden="true">{emp.first_name.charAt(0)}{emp.last_name.charAt(0)}</span>
                        <Link href={`/staff/hr/${emp.id}`} className="name-cell__link">
                          {emp.first_name} {emp.last_name}
                        </Link>
                      </span>
                    </td>
                    <td className="text-sm">{emp.role}</td>
                    <td className="text-sm">{DEPT_LABEL[emp.department] ?? emp.department}</td>
                    <td>
                      <Badge tone={STATUS_TONE[emp.employment_status] ?? "neutral"}>
                        {emp.employment_status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="text-sm">{emp.hire_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </>
  );
}

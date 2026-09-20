import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { getEmployee } from "@/lib/api-client/hr";

export const metadata = { title: "Employee — Admin Portal" };

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  active: "success",
  on_leave: "warning",
  separated: "neutral",
};

const ATTENDANCE_TONE: Record<string, "success" | "danger" | "warning"> = {
  present: "success",
  absent: "danger",
  late: "warning",
};

const LEAVE_TONE: Record<string, "success" | "warning" | "danger"> = {
  approved: "success",
  pending: "warning",
  denied: "danger",
};

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["hr:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Employee not found" />
        <PageSection>
          <ForbiddenState requiredScopes={["hr:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let employee;
  try {
    employee = await getEmployee(id);
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Employee not found" />
        <PageSection>
          <ErrorState message="We couldn't find that employee record." />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations · Staff"
        title={`${employee.first_name} ${employee.last_name}`}
        actions={
          <Link href="/staff/hr" className="btn btn--secondary btn--sm">
            Back to directory
          </Link>
        }
      />

      <PageSection>
        <div className="card">
          <div className="card__body case-summary">
            <div>
              <p className="page-header__eyebrow">Staff · {employee.employee_number}</p>
              <h2 className="case-summary__name">{employee.first_name} {employee.last_name}</h2>
              <p className="case-summary__meta">
                {employee.role} · {employee.department}
                {employee.hire_date ? ` · hired ${employee.hire_date}` : ""}
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-2)" }}>
              <Badge tone={STATUS_TONE[employee.employment_status] ?? "neutral"}>{employee.employment_status.replace(/_/g, " ")}</Badge>
              <span className="name-avatar" style={{ width: 44, height: 44, fontSize: "var(--text-md)" }} aria-hidden="true">
                {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card header={<h3>Employment details</h3>}>
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <tbody>
                <tr>
                  <th scope="row">Employee number</th>
                  <td><code>{employee.employee_number}</code></td>
                </tr>
                <tr>
                  <th scope="row">Role</th>
                  <td>{employee.role}</td>
                </tr>
                <tr>
                  <th scope="row">Department</th>
                  <td>{employee.department}</td>
                </tr>
                <tr>
                  <th scope="row">Status</th>
                  <td>
                    <Badge tone={STATUS_TONE[employee.employment_status] ?? "neutral"}>
                      {employee.employment_status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                </tr>
                <tr>
                  <th scope="row">Hire date</th>
                  <td>{employee.hire_date}</td>
                </tr>
                <tr>
                  <th scope="row">Email</th>
                  <td>{employee.email}</td>
                </tr>
                <tr>
                  <th scope="row">Phone</th>
                  <td>{employee.phone}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Recent attendance</h3>}>
          {employee.attendance.length === 0 ? (
            <p className="text-sm text-muted">No attendance records.</p>
          ) : (
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.attendance.map((a) => (
                    <tr key={a.date}>
                      <td>{a.date}</td>
                      <td>
                        <Badge tone={ATTENDANCE_TONE[a.status] ?? "neutral"}>
                          {a.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageSection>

      <PageSection>
        <Card header={<h3>Leave requests</h3>}>
          {employee.leave.length === 0 ? (
            <p className="text-sm text-muted">No leave requests on file.</p>
          ) : (
            <div className="table-wrapper" tabIndex={0}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Start</th>
                    <th scope="col">End</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.leave.map((l, idx) => (
                    <tr key={idx}>
                      <td>{l.type}</td>
                      <td>{l.start}</td>
                      <td>{l.end}</td>
                      <td>
                        <Badge tone={LEAVE_TONE[l.status] ?? "neutral"}>{l.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageSection>
    </>
  );
}

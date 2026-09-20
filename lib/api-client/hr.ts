/**
 * Typed data access for Module HR screens (employees, attendance, leave).
 *
 * ⚠️ NO frozen API contract exists for this domain yet (hr service is unbuilt —
 * D13 gap resolved 2026-08-24). Screens consume FIXTURES today through this one
 * seam. Shapes mirror docs/08-delivery/service-priorities.md D13 and the
 * platform-contracts plan's proposed C2 packet (not yet frozen).
 *
 * LIVE MODE IS UNIMPLEMENTED, and this module says so instead of lying: setting
 * `HR_BASE_URL` selects live mode and every read refuses with a named 503
 * (`HR_NOT_WIRED`). A service never answers a 501 "not wired", and reading a
 * proposed shape straight off a `fetch` would be the AGENTS.md tolerant-reader
 * trap. When Keb freezes the hr contract, the live branch is written here behind
 * the same gate (a `toEmployee` reader over `getAuthedJson`, per `property.ts`)
 * with no screen change.
 */
import employeesFile from "@/lib/fixtures/hr/employees.json";
import { ApiError } from "@/lib/api-client/api-error";
import { readShape } from "@/lib/contracts/validate";
import { liveModeEnabled } from "@/lib/live-mode";

/** Live mode is selected by `HR_BASE_URL` through the one registry (`lib/live-mode.ts`). */
export function hrLiveModeEnabled(): boolean {
  return liveModeEnabled("hr");
}

export type EmploymentStatus = "active" | "on_leave" | "separated";

export type AttendanceStatus = "present" | "absent" | "late";

export type LeaveStatus = "pending" | "approved" | "denied";

export type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
};

export type LeaveRequest = {
  type: string;
  start: string;
  end: string;
  status: LeaveStatus;
};

export type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
  employment_status: EmploymentStatus;
  hire_date: string;
  phone: string;
  email: string;
  attendance: AttendanceRecord[];
  leave: LeaveRequest[];
};

type EmployeeStore = {
  tenant_id: string;
  employees: Employee[];
};

/**
 * The tolerant-reader seam (platform-contract pre-wire, P6): the same `toX`
 * adapter a future live branch will use reads today's fixture rows, so the two
 * shapes cannot drift. Extra keys are ignored; a missing required field is a 502.
 */
export function toEmployee(raw: unknown): Employee {
  const r = readShape(raw, "employee", [
    { key: "id", type: "string" },
    { key: "employee_number", type: "string" },
    { key: "first_name", type: "string" },
    { key: "last_name", type: "string" },
    { key: "role", type: "string" },
    { key: "department", type: "string" },
    { key: "employment_status", type: "string" },
    { key: "hire_date", type: "string" },
    { key: "phone", type: "string" },
    { key: "email", type: "string" },
    { key: "attendance", type: "array" },
    { key: "leave", type: "array" },
  ]);
  const attendance = (Array.isArray(r.attendance) ? r.attendance : []).map((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    return { date: String(row.date ?? ""), status: row.status as AttendanceStatus };
  });
  const leave = (Array.isArray(r.leave) ? r.leave : []).map((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    return {
      type: String(row.type ?? ""),
      start: String(row.start ?? ""),
      end: String(row.end ?? ""),
      status: row.status as LeaveStatus,
    };
  });
  return {
    id: r.id as string,
    employee_number: r.employee_number as string,
    first_name: r.first_name as string,
    last_name: r.last_name as string,
    role: r.role as string,
    department: r.department as string,
    employment_status: r.employment_status as EmploymentStatus,
    hire_date: r.hire_date as string,
    phone: r.phone as string,
    email: r.email as string,
    attendance,
    leave,
  };
}

/** The honest reason live mode refuses: no hr contract is frozen. */
export const HR_NOT_WIRED =
  "live HR is not wired: no hr contract is frozen yet (D13). " +
  "Fixture mode serves the office's recorded employee directory.";

/**
 * Live mode has no hr contract to call yet, so refuse with a named 503 (the app's
 * shape for a surface whose service does not exist) instead of a 501 a service
 * would never return. Fixture mode is unaffected.
 */
function refuseWhenLive(): void {
  if (hrLiveModeEnabled()) {
    throw new ApiError(HR_NOT_WIRED, 503);
  }
}

export async function listEmployees(): Promise<Employee[]> {
  refuseWhenLive();
  const store = employeesFile as unknown as EmployeeStore;
  return (store.employees as unknown[]).map(toEmployee);
}

export async function getEmployee(id: string): Promise<Employee> {
  refuseWhenLive();
  const store = employeesFile as unknown as EmployeeStore;
  const raw = (store.employees as unknown[]).find(
    (e) => (e as { id?: unknown }).id === id,
  );
  if (!raw) {
    throw new ApiError("not_found", 404);
  }
  return toEmployee(raw);
}

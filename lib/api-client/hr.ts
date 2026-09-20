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

const BASE_URL = process.env.HR_BASE_URL ?? "";

export function hrLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
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
  return store.employees.map((e) => ({
    ...e,
    attendance: [...e.attendance],
    leave: [...e.leave],
  }));
}

export async function getEmployee(id: string): Promise<Employee> {
  refuseWhenLive();
  const store = employeesFile as unknown as EmployeeStore;
  const employee = store.employees.find((e) => e.id === id);
  if (!employee) {
    throw new ApiError("not_found", 404);
  }
  return {
    ...employee,
    attendance: [...employee.attendance],
    leave: [...employee.leave],
  };
}

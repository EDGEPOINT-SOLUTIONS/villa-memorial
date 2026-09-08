/**
 * Typed data access for Module HR screens (employees, attendance, leave).
 *
 * ⚠️ NO frozen API contract exists for this domain yet (hr service is unbuilt —
 * D13 gap resolved 2026-08-24). Screens consume FIXTURES today through this
 * one seam; when Keb freezes the hr contract, the live branch of each function
 * flips on via HR_BASE_URL without touching any screen code. Shapes mirror
 * docs/08-delivery/service-priorities.md D13.
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

async function requireLive(): Promise<void> {
  if (!hrLiveModeEnabled()) return;
  throw new ApiError("hr live client not wired yet", 501);
}

export async function listEmployees(): Promise<Employee[]> {
  await requireLive();
  const store = employeesFile as unknown as EmployeeStore;
  return store.employees.map((e) => ({
    ...e,
    attendance: [...e.attendance],
    leave: [...e.leave],
  }));
}

export async function getEmployee(id: string): Promise<Employee> {
  await requireLive();
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

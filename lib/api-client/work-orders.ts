/**
 * Typed read for the staff work-order list (`/staff/work-orders`).
 *
 * ⚠ PROVISIONAL — work orders are a deferred property/field-ops workflow: property-gis
 * carries lots, reservations and sales today, and the standalone field-ops service
 * (work orders, inspections) is unbuilt (`docs/02-architecture/microservices.md`:178).
 * No contract names a work-order record, so live mode answers 503 with
 * `WORK_ORDERS_NOT_WIRED` and only fixture mode serves the office's recorded list in
 * `lib/fixtures/operations/work-orders.json`.
 *
 * The reader is a tolerant reader (repo rule): field by field, extra keys ignored, a
 * malformed record is a 502, never a cast. Two invariants are deliberate and loud,
 * because both are how an invented record would pass as real:
 *
 *  · the state is the LAST recorded movement, and the trail must start at `open` on the
 *    opening day with non-decreasing dates — an order cannot be "in hand" before it was
 *    opened, and nothing is done without the day it was done;
 *  · an assignee with no `employee_number` MUST be one of `WORK_ORDER_TEAM_ASSIGNEES`
 *    (the crews/contractors the office's file names) — a free-text personal name could
 *    otherwise route work to someone who does not exist.
 */
import workOrdersFile from "@/lib/fixtures/operations/work-orders.json";
import { ApiError } from "@/lib/api-client/api-error";
import { operationsLiveModeEnabled } from "@/lib/api-client/operations";
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  isTeamAssignee,
  isWorkAssetKind,
  isWorkOrderPriority,
  isWorkOrderState,
  type WorkOrder,
  type WorkOrderAsset,
  type WorkOrderAssignee,
  type WorkOrderMove,
} from "@/lib/work-orders";

export const WORK_ORDERS_NOT_WIRED =
  "live work orders are not wired: no field-ops service or work-order contract exists, " +
  "so this list can only read the office's recorded maintenance file";

/** Live mode: any live operations gateway has no work-order surface to read. */
export function workOrdersLiveModeEnabled(): boolean {
  return operationsLiveModeEnabled();
}

/* ------------------------------------------------------------------ */
/* Tolerant field readers                                              */
/* ------------------------------------------------------------------ */

function text(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function calendarDate(raw: unknown): string | null {
  const value = text(raw);
  return value !== null && isCalendarDate(value) ? value : null;
}

function requiredCalendarDate(raw: unknown, what: string): string {
  const value = calendarDate(raw);
  if (!value) {
    throw new ApiError(`malformed work order: ${what} is not a recorded day`, 502);
  }
  return value;
}

export function toWorkOrderMove(raw: unknown): WorkOrderMove {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed work-order movement", 502);
  }
  const r = raw as Record<string, unknown>;
  if (!isWorkOrderState(r.state)) {
    throw new ApiError("malformed work-order movement", 502);
  }
  return { state: r.state, on: requiredCalendarDate(r.on, "a movement date") };
}

export function toWorkOrderAsset(raw: unknown): WorkOrderAsset {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed work-order asset", 502);
  }
  const r = raw as Record<string, unknown>;
  const label = text(r.label);
  const ref = r.ref === null || r.ref === undefined ? null : text(r.ref);
  if (!label || !isWorkAssetKind(r.kind)) {
    throw new ApiError("malformed work-order asset", 502);
  }
  return { kind: r.kind, ref, label };
}

export function toWorkOrderAssignee(raw: unknown): WorkOrderAssignee {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed work-order assignee", 502);
  }
  const r = raw as Record<string, unknown>;
  const name = text(r.name);
  if (!name) {
    throw new ApiError("malformed work-order assignee", 502);
  }
  const employeeNumber = text(r.employee_number);
  // A crew/contractor must be one the office's own file names — never an invented person.
  if (!employeeNumber && !isTeamAssignee(name)) {
    throw new ApiError(
      `malformed work order: assignee "${name}" is neither an HR employee nor a recorded crew`,
      502,
    );
  }
  return { name, employee_number: employeeNumber };
}

export function toWorkOrder(raw: unknown): WorkOrder {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed work order", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const title = text(r.title);
  if (!id || !title || !isWorkOrderPriority(r.priority)) {
    throw new ApiError("malformed work order", 502);
  }
  const openedOn = requiredCalendarDate(r.opened_on, "the opening day");
  const dueOn = r.due_on === null || r.due_on === undefined ? null : requiredCalendarDate(r.due_on, "the due date");
  const history = (Array.isArray(r.history) ? r.history : []).map(toWorkOrderMove);

  // The recorded trail is the record: it opens the order and every later day follows.
  if (history.length === 0) {
    throw new ApiError(`malformed work order ${id}: no recorded movements`, 502);
  }
  if (history[0].state !== "open" || history[0].on !== openedOn) {
    throw new ApiError(`malformed work order ${id}: the trail does not open on its opening day`, 502);
  }
  for (let i = 1; i < history.length; i += 1) {
    if (history[i].on < history[i - 1].on) {
      throw new ApiError(`malformed work order ${id}: a movement is dated before the one before it`, 502);
    }
  }
  if (dueOn && dueOn < openedOn) {
    throw new ApiError(`malformed work order ${id}: it is due before it was opened`, 502);
  }

  return {
    id,
    title,
    detail: text(r.detail),
    asset: toWorkOrderAsset(r.asset),
    priority: r.priority,
    assignee: toWorkOrderAssignee(r.assignee),
    opened_on: openedOn,
    due_on: dueOn,
    history,
  };
}

/* ------------------------------------------------------------------ */
/* The list                                                            */
/* ------------------------------------------------------------------ */

export type WorkOrderList = {
  /** The day the office recorded this list — the only clock the board reads. */
  as_of: string;
  work_orders: WorkOrder[];
};

export function workOrderListFromFixture(): WorkOrderList {
  return workOrderListFrom(workOrdersFile);
}

/** The same validation over any recorded store — the seam the reader's tests use. */
export function workOrderListFrom(store: unknown): WorkOrderList {
  const record = store as Record<string, unknown> | null;
  const asOf = record ? text(record.as_of) : null;
  if (!asOf || !isCalendarDate(asOf)) {
    throw new ApiError("malformed work-order list: no recorded day", 502);
  }
  const orders = (Array.isArray(record?.work_orders) ? record.work_orders : []).map(toWorkOrder);
  return { as_of: asOf, work_orders: orders };
}

/** What the page calls: live mode says plainly that no work-order service exists. */
export async function loadWorkOrders(): Promise<WorkOrderList> {
  if (workOrdersLiveModeEnabled()) {
    throw new ApiError(WORK_ORDERS_NOT_WIRED, 503);
  }
  return workOrderListFromFixture();
}

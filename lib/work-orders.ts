/**
 * Maintenance & work orders — the recorded list, its states and its clock (PURE).
 *
 * `/staff/work-orders` shows the office's maintenance and repairs: what needs doing,
 * which asset or plot it belongs to, who is assigned, the priority, the due date and
 * the recorded date each movement happened. This module owns the vocabulary and the
 * one derivation the board is allowed to make:
 *
 *  · the state is the LAST recorded movement (`history`), never a second stored field
 *    that could drift from its own dates — the recorded trail is the record;
 *  · `overdue` is read from the recorded due date against the list's own recorded day
 *    (`as_of`), never from a wall clock and never from an invented SLA. Work orders
 *    belong to the blueprint's §38 lifecycle (assignment → priority → execution →
 *    inspection → close, docs/04-modules/facilities-scheduling.md §38) and no contract
 *    names a service-level term, so the only clock this module reads is the office's
 *    own snapshot date.
 *
 * The field-ops service (work orders, inspections) is unbuilt
 * (`docs/02-architecture/microservices.md`:178) and no contract names a work-order
 * record, so nothing here writes and nothing here invents a figure — a work order
 * records work, not money.
 */
import { isCalendarDate } from "@/lib/chapel-booking";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

export const WORK_ORDER_STATES = ["open", "in_hand", "done"] as const;
export type WorkOrderState = (typeof WORK_ORDER_STATES)[number];

export const WORK_ORDER_STATE_LABEL: Record<WorkOrderState, string> = {
  open: "Open",
  in_hand: "In hand",
  done: "Done",
};

export const WORK_ORDER_PRIORITIES = ["high", "medium", "low"] as const;
export type WorkOrderPriority = (typeof WORK_ORDER_PRIORITIES)[number];

export const WORK_ORDER_PRIORITY_LABEL: Record<WorkOrderPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const WORK_ASSET_KINDS = ["chapel", "vehicle", "plot", "equipment"] as const;
export type WorkAssetKind = (typeof WORK_ASSET_KINDS)[number];

export const WORK_ASSET_KIND_LABEL: Record<WorkAssetKind, string> = {
  chapel: "Chapel",
  vehicle: "Vehicle",
  plot: "Plot",
  equipment: "Equipment",
};

/**
 * The crews and contractors the office's own file names. The HR directory records no
 * grounds or maintenance staff yet, so a non-employee assignee MUST be one of these
 * labels — a test fails on any other free-text name, which is how an invented person
 * would otherwise slip in.
 */
export const WORK_ORDER_TEAM_ASSIGNEES = [
  "Park maintenance crew",
  "Grounds crew",
  "Park electrician",
  "Monument mason",
] as const;

/* ------------------------------------------------------------------ */
/* Records the board reads                                             */
/* ------------------------------------------------------------------ */

export type WorkOrderMove = {
  state: WorkOrderState;
  /** The recorded day (yyyy-mm-dd) the state was entered. */
  on: string;
};

export type WorkOrderAsset = {
  kind: WorkAssetKind;
  /** The record this order is against (resource/lot/vehicle id); null when none is recorded. */
  ref: string | null;
  /** What the office calls it on the order ("Chapel A", "Plot A-003"). */
  label: string;
};

export type WorkOrderAssignee = {
  name: string;
  /** The HR directory's employee number, or null for a recorded crew/contractor. */
  employee_number: string | null;
};

export type WorkOrder = {
  id: string;
  title: string;
  detail: string | null;
  asset: WorkOrderAsset;
  priority: WorkOrderPriority;
  assignee: WorkOrderAssignee;
  opened_on: string;
  /** The day it should be finished; null when the office recorded no due date. */
  due_on: string | null;
  /** Every recorded movement, oldest first; never empty (the opening move is one). */
  history: WorkOrderMove[];
};

/* ------------------------------------------------------------------ */
/* Guards (the readers validate field by field)                        */
/* ------------------------------------------------------------------ */

export function isWorkOrderState(value: unknown): value is WorkOrderState {
  return typeof value === "string" && (WORK_ORDER_STATES as readonly string[]).includes(value);
}

export function isWorkOrderPriority(value: unknown): value is WorkOrderPriority {
  return typeof value === "string" && (WORK_ORDER_PRIORITIES as readonly string[]).includes(value);
}

export function isWorkAssetKind(value: unknown): value is WorkAssetKind {
  return typeof value === "string" && (WORK_ASSET_KINDS as readonly string[]).includes(value);
}

export function isTeamAssignee(name: string): boolean {
  return (WORK_ORDER_TEAM_ASSIGNEES as readonly string[]).includes(name);
}

/* ------------------------------------------------------------------ */
/* The board                                                           */
/* ------------------------------------------------------------------ */

export type WorkOrderView = {
  order: WorkOrder;
  /** The state the last recorded movement puts it in. */
  state: WorkOrderState;
  /** The day that movement happened — the date the state moved. */
  moved_on: string;
  /** Not done, with a recorded due date already passed on the recorded day. */
  overdue: boolean;
  /** Whole days past the due date as of the recorded day; null when not overdue. */
  days_overdue: number | null;
};

function wholeDaysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * One order as the board shows it. Overdue is a fact about the recorded days only:
 * `state !== done` and the due date (if recorded) falling before `asOf`.
 */
export function workOrderView(order: WorkOrder, asOf: string): WorkOrderView {
  const last = order.history[order.history.length - 1];
  const state = last?.state ?? "open";
  const moved_on = last?.on ?? order.opened_on;
  const due = order.due_on;
  const overdue =
    state !== "done" &&
    due !== null &&
    isCalendarDate(due) &&
    isCalendarDate(asOf) &&
    due < asOf;
  return {
    order,
    state,
    moved_on,
    overdue,
    days_overdue: overdue ? Math.max(1, wholeDaysBetween(due, asOf)) : null,
  };
}

const PRIORITY_RANK: Record<WorkOrderPriority, number> = { high: 0, medium: 1, low: 2 };

/**
 * The list as an operator reads it: overdue first (longest first), then open/in-hand
 * by due date, then by priority; finished work last. Everything left to do is above
 * everything done, and no row's order depends on a clock.
 */
export function workOrderList(orders: readonly WorkOrder[], asOf: string): WorkOrderView[] {
  const views = orders.map((order) => workOrderView(order, asOf));
  const dueRank = (view: WorkOrderView): number => {
    const due = view.order.due_on;
    return due !== null && isCalendarDate(due) ? Date.parse(`${due}T00:00:00Z`) : Number.MAX_SAFE_INTEGER;
  };
  return views.sort((a, b) => {
    const aOver = a.overdue ? 0 : 1;
    const bOver = b.overdue ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    if (a.overdue && b.overdue) {
      const days = (b.days_overdue ?? 0) - (a.days_overdue ?? 0);
      if (days !== 0) return days;
    }
    const aDone = a.state === "done" ? 1 : 0;
    const bDone = b.state === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    const due = dueRank(a) - dueRank(b);
    if (due !== 0) return due;
    const priority = PRIORITY_RANK[a.order.priority] - PRIORITY_RANK[b.order.priority];
    if (priority !== 0) return priority;
    return a.order.opened_on.localeCompare(b.order.opened_on);
  });
}

export type WorkOrderSummary = {
  open: number;
  in_hand: number;
  overdue: number;
  done: number;
};

export function workOrderSummary(views: readonly WorkOrderView[]): WorkOrderSummary {
  return {
    open: views.filter((view) => view.state === "open").length,
    in_hand: views.filter((view) => view.state === "in_hand").length,
    overdue: views.filter((view) => view.overdue).length,
    done: views.filter((view) => view.state === "done").length,
  };
}

/** The state as the board names it — "Overdue" replaces the stored state on the row. */
export function workOrderStateLabel(view: WorkOrderView): string {
  return view.overdue ? "Overdue" : WORK_ORDER_STATE_LABEL[view.state];
}

export function workOrderStateTone(
  view: WorkOrderView,
): "info" | "warning" | "success" | "danger" {
  if (view.overdue) return "danger";
  if (view.state === "open") return "info";
  if (view.state === "in_hand") return "warning";
  return "success";
}

/**
 * Where the order's asset lives in this portal, when a real screen exists for it.
 * A chapel opens the Schedule day board (rooms are scheduling resources); a vehicle
 * opens this board's own assignment view filtered to that vehicle; a plot opens its
 * lot record. Equipment has no screen yet (inventory is still a stub) — it stays
 * plain text rather than linking into a dead end.
 */
export function workOrderAssetHref(asset: WorkOrderAsset): string | null {
  if (asset.kind === "chapel") return "/staff/schedule";
  if (asset.kind === "vehicle" && asset.ref) {
    return `/staff/dispatch?view=assignments&vehicle=${encodeURIComponent(asset.ref)}`;
  }
  if (asset.kind === "plot" && asset.ref) {
    return `/staff/property/${encodeURIComponent(asset.ref)}`;
  }
  return null;
}

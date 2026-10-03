import { describe, expect, it, vi } from "vitest";
/* --- test-only demo fixture (clean start, captain 2026-10-03) --- */
vi.mock("@/lib/fixtures/operations/work-orders.json", async () => ({
  default: (await import("../fixtures/work-orders-demo.json")).default,
}));
/* --- end test-only demo fixture --- */
import workOrdersFile from "@/lib/fixtures/operations/work-orders.json";
import dispatchFile from "@/lib/fixtures/operations/dispatch.json";
import lotsFile from "@/lib/fixtures/property/lots.json";
import employeesFile from "@/lib/fixtures/hr/employees.json";
import resourcesFile from "@/lib/fixtures/scheduling/resources.json";
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  isTeamAssignee,
  isWorkAssetKind,
  isWorkOrderPriority,
  isWorkOrderState,
  WORK_ASSET_KINDS,
  WORK_ORDER_PRIORITIES,
  WORK_ORDER_STATES,
  workOrderList,
  type WorkOrder,
} from "@/lib/work-orders";

/**
 * The work-order fixture is PROVISIONAL — no service owns it (field-ops is unbuilt), so
 * this suite pins the promises the working list rests on:
 *
 *   1. every asset the order names exists in the fixture that owns it (a scheduling
 *      resource, a dispatch vehicle, a property lot) and the label is that record's own
 *      name;
 *   2. every employee assignee is an HR directory employee, and every crew/contractor
 *      assignee is one of the recorded team labels — no invented person can route work;
 *   3. the recorded trail is the state: it opens the order and every later day follows,
 *      never after the list's own recording day;
 *   4. at least one order is overdue AS OF the recorded day, so the screen demonstrates
 *      the state the captain asked for without a wall clock;
 *   5. no amount (cost, quotation, fee) appears anywhere.
 */
const store = workOrdersFile as unknown as {
  _provenance: { status?: string; note?: string[] | string };
  tenant_id: string;
  as_of: string;
  work_orders: WorkOrder[];
};

const RESOURCES = resourcesFile as unknown as {
  resources: Array<{ id: string; name: string; resource_type: string }>;
};
const VEHICLES = dispatchFile as unknown as { vehicles: Array<{ id: string; name: string }> };
const LOTS = lotsFile as unknown as { lots: Array<{ id: string; lot_number: string }> };
const EMPLOYEES = employeesFile as unknown as {
  employees: Array<{ employee_number: string; first_name: string; last_name: string }>;
};

function amountLikeKeys(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => amountLikeKeys(entry, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
      /amount|price|cost|fee|rate|cents|currency|quotation|salary/i.test(key)
        ? [`${path}.${key}`]
        : amountLikeKeys(entry, `${path}.${key}`),
    );
  }
  return [];
}

describe("the work-order fixture is the office's own recorded file", () => {
  it("carries provenance, a real recorded day and a non-empty list", () => {
    expect(store._provenance).toBeTruthy();
    expect(isCalendarDate(store.as_of)).toBe(true);
    expect(store.work_orders.length).toBeGreaterThanOrEqual(4);
  });

  it("resolves every asset to the record that owns it, label included", () => {
    for (const order of store.work_orders) {
      expect(isWorkAssetKind(order.asset.kind), order.id).toBe(true);
      const ref = order.asset.ref;
      if (order.asset.kind === "chapel" || order.asset.kind === "equipment") {
        const resource = RESOURCES.resources.find((entry) => entry.id === ref);
        expect(resource, `${order.id} names resource ${ref}`).toBeTruthy();
        expect(order.asset.label).toBe(resource!.name);
      } else if (order.asset.kind === "vehicle") {
        const vehicle = VEHICLES.vehicles.find((entry) => entry.id === ref);
        expect(vehicle, `${order.id} names vehicle ${ref}`).toBeTruthy();
        expect(order.asset.label).toBe(vehicle!.name);
      } else {
        const lot = LOTS.lots.find((entry) => entry.id === ref);
        expect(lot, `${order.id} names lot ${ref}`).toBeTruthy();
        expect(order.asset.label).toBe(`Plot ${lot!.lot_number}`);
      }
    }
  });

  it("records employees by their HR row and crews by their recorded label only", () => {
    for (const order of store.work_orders) {
      if (order.assignee.employee_number) {
        const employee = EMPLOYEES.employees.find(
          (entry) => entry.employee_number === order.assignee.employee_number,
        );
        expect(employee, `${order.id} names ${order.assignee.name}`).toBeTruthy();
        expect(`${employee!.first_name} ${employee!.last_name}`).toBe(order.assignee.name);
      } else {
        expect(
          isTeamAssignee(order.assignee.name),
          `${order.id} names a crew the office file does not record: ${order.assignee.name}`,
        ).toBe(true);
      }
    }
  });

  it("opens the order with the first movement and never moves before it or after the recording day", () => {
    for (const order of store.work_orders) {
      expect(order.history.length, order.id).toBeGreaterThan(0);
      expect(order.history[0].state, order.id).toBe("open");
      expect(order.history[0].on, order.id).toBe(order.opened_on);
      for (let index = 1; index < order.history.length; index += 1) {
        expect(
          order.history[index].on >= order.history[index - 1].on,
          `${order.id} moves backwards`,
        ).toBe(true);
      }
      for (const move of order.history) {
        expect(isWorkOrderState(move.state), order.id).toBe(true);
        expect(isCalendarDate(move.on), order.id).toBe(true);
        expect(move.on <= store.as_of, `${order.id} moved after the recording day`).toBe(true);
      }
      expect(order.opened_on <= store.as_of, order.id).toBe(true);
      expect(isWorkOrderPriority(order.priority), order.id).toBe(true);
    }
    expect(WORK_ORDER_STATES.length).toBe(3);
    expect(WORK_ORDER_PRIORITIES.length).toBe(3);
    expect(WORK_ASSET_KINDS.length).toBe(4);
  });

  it("shows the overdue state from the recorded dates alone, and covers every state", () => {
    const views = workOrderList(store.work_orders, store.as_of);
    expect(views.some((view) => view.overdue), "no order is overdue as of the recorded day").toBe(
      true,
    );
    const states = new Set(views.map((view) => view.state));
    expect([...states].sort()).toEqual(["done", "in_hand", "open"]);
    for (const view of views) {
      if (view.overdue) {
        expect(view.order.due_on).toBeTruthy();
        expect(view.order.due_on! < store.as_of).toBe(true);
        expect(view.state).not.toBe("done");
      }
    }
  });

  it("carries no amount, quotation or fee anywhere", () => {
    expect(amountLikeKeys(store)).toEqual([]);
  });
});

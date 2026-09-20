import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadWorkOrders,
  toWorkOrder,
  workOrderListFrom,
  workOrderListFromFixture,
  WORK_ORDERS_NOT_WIRED,
} from "@/lib/api-client/work-orders";
import workOrdersFile from "@/lib/fixtures/operations/work-orders.json";
import {
  workOrderAssetHref,
  workOrderList,
  workOrderStateLabel,
  workOrderStateTone,
  workOrderSummary,
  workOrderView,
  WORK_ORDER_PRIORITY_LABEL,
  WORK_ORDER_STATE_LABEL,
  WORK_ORDER_TEAM_ASSIGNEES,
  type WorkOrder,
} from "@/lib/work-orders";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * The work-order list's pure answers: the state read from the recorded trail, the
 * recorded-day overdue rule, the operator's ordering, the summary, where an asset
 * links, and the reader that refuses a trail which contradicts its own dates or an
 * assignee who is neither an employee nor a recorded crew.
 */

const AS_OF = "2026-09-10";

function order(overrides: Partial<WorkOrder> = {}): WorkOrder {
  return {
    id: "WO-TEST-0001",
    title: "Repair the east gate",
    detail: null,
    asset: { kind: "chapel", ref: "res-1", label: "Chapel A" },
    priority: "medium",
    assignee: { name: "Park maintenance crew", employee_number: null },
    opened_on: "2026-09-01",
    due_on: "2026-09-08",
    history: [{ state: "open", on: "2026-09-01" }],
    ...overrides,
  };
}

const RAW = workOrdersFile as unknown as Record<string, unknown>;

describe("the state is the last recorded movement", () => {
  it("reads open, in hand and done from the trail", () => {
    expect(workOrderView(order(), AS_OF).state).toBe("open");
    expect(
      workOrderView(
        order({ history: [{ state: "open", on: "2026-09-01" }, { state: "in_hand", on: "2026-09-03" }] }),
        AS_OF,
      ).state,
    ).toBe("in_hand");
    expect(
      workOrderView(
        order({
          history: [
            { state: "open", on: "2026-09-01" },
            { state: "in_hand", on: "2026-09-03" },
            { state: "done", on: "2026-09-05" },
          ],
        }),
        AS_OF,
      ).state,
    ).toBe("done");
  });

  it("carries the day of that movement, not the opening day", () => {
    const view = workOrderView(
      order({ history: [{ state: "open", on: "2026-09-01" }, { state: "in_hand", on: "2026-09-03" }] }),
      AS_OF,
    );
    expect(view.moved_on).toBe("2026-09-03");
  });
});

describe("overdue is read from the recorded dates only", () => {
  it("is overdue when a due date falls before the recorded day and the work is not done", () => {
    const view = workOrderView(order({ due_on: "2026-09-04" }), AS_OF);
    expect(view.overdue).toBe(true);
    expect(view.days_overdue).toBe(6);
    expect(workOrderStateLabel(view)).toBe("Overdue");
    expect(workOrderStateTone(view)).toBe("danger");
  });

  it("is not overdue on the due day or with no due date, and never when done", () => {
    expect(workOrderView(order({ due_on: AS_OF }), AS_OF).overdue).toBe(false);
    expect(workOrderView(order({ due_on: null }), AS_OF).overdue).toBe(false);
    expect(
      workOrderView(
        order({
          due_on: "2026-09-01",
          history: [{ state: "open", on: "2026-09-01" }, { state: "done", on: "2026-09-02" }],
        }),
        AS_OF,
      ).overdue,
    ).toBe(false);
  });

  it("names the remaining states and tones the way the screen prints them", () => {
    const open = workOrderView(order({ due_on: "2026-09-20" }), AS_OF);
    expect(workOrderStateLabel(open)).toBe("Open");
    expect(workOrderStateTone(open)).toBe("info");
    const inHand = workOrderView(
      order({
        due_on: "2026-09-20",
        history: [{ state: "open", on: "2026-09-01" }, { state: "in_hand", on: "2026-09-03" }],
      }),
      AS_OF,
    );
    expect(workOrderStateLabel(inHand)).toBe("In hand");
    expect(workOrderStateTone(inHand)).toBe("warning");
    const done = workOrderView(
      order({
        due_on: "2026-09-01",
        history: [{ state: "open", on: "2026-09-01" }, { state: "done", on: "2026-09-02" }],
      }),
      AS_OF,
    );
    expect(workOrderStateLabel(done)).toBe("Done");
    expect(workOrderStateTone(done)).toBe("success");
  });
});

describe("the list reads as an operator's queue", () => {
  const overdueOld = order({ id: "A", due_on: "2026-09-01" });
  const overdueNew = order({ id: "B", due_on: "2026-09-08" });
  const dueSoonHigh = order({ id: "C", due_on: "2026-09-11", priority: "high" });
  const dueSoonLow = order({ id: "D", due_on: "2026-09-11", priority: "low" });
  const noDue = order({ id: "E", due_on: null });
  const done = order({
    id: "F",
    due_on: "2026-09-02",
    history: [{ state: "open", on: "2026-09-01" }, { state: "done", on: "2026-09-02" }],
  });

  it("puts overdue first (longest first), then due dates and priority, and done last", () => {
    const views = workOrderList(
      [done, dueSoonLow, overdueNew, noDue, overdueOld, dueSoonHigh],
      AS_OF,
    );
    expect(views.map((view) => view.order.id)).toEqual(["A", "B", "C", "D", "E", "F"]);
  });

  it("summarises open, in hand, overdue and done", () => {
    const views = workOrderList([overdueOld, dueSoonHigh, dueSoonLow, done], AS_OF);
    expect(workOrderSummary(views)).toEqual({ open: 3, in_hand: 0, overdue: 1, done: 1 });
  });

  it("links an asset only where a real screen exists", () => {
    expect(workOrderAssetHref({ kind: "plot", ref: "lot-1", label: "Plot A-003" })).toBe(
      "/staff/property/lot-1",
    );
    expect(workOrderAssetHref({ kind: "chapel", ref: "res-1", label: "Chapel A" })).toBe(
      "/staff/schedule",
    );
    expect(workOrderAssetHref({ kind: "vehicle", ref: "veh-hearse-1", label: "Hearse 1" })).toBe(
      "/staff/dispatch?view=assignments&vehicle=veh-hearse-1",
    );
    expect(workOrderAssetHref({ kind: "equipment", ref: "res-3", label: "Preparation Room 1" })).toBe(
      null,
    );
  });
});

describe("the reader refuses a trail that contradicts itself", () => {
  it("serves the recorded list", () => {
    const list = workOrderListFromFixture();
    expect(list.as_of).toBe(AS_OF);
    expect(list.work_orders).toHaveLength(6);
  });

  it("refuses a store with no recorded day", () => {
    expect(() => workOrderListFrom({ ...RAW, as_of: undefined })).toThrow(ApiError);
  });

  it("refuses an order whose trail does not open it, or moves backwards", () => {
    const noHistory = structuredClone(RAW) as { work_orders: Array<Record<string, unknown>> };
    noHistory.work_orders[0].history = [];
    expect(() => workOrderListFrom(noHistory)).toThrow(/no recorded movements/);

    const wrongOpen = structuredClone(RAW) as { work_orders: Array<Record<string, unknown>> };
    wrongOpen.work_orders[0].opened_on = "2026-09-02";
    expect(() => workOrderListFrom(wrongOpen)).toThrow(/does not open on its opening day/);

    const backwards = structuredClone(RAW) as { work_orders: Array<Record<string, unknown>> };
    backwards.work_orders[1].history = [
      { state: "open", on: "2026-09-05" },
      { state: "in_hand", on: "2026-09-04" },
    ];
    expect(() => workOrderListFrom(backwards)).toThrow(/dated before/);
  });

  it("refuses a due date before the opening day", () => {
    const bad = structuredClone(RAW) as { work_orders: Array<Record<string, unknown>> };
    bad.work_orders[0].due_on = "2026-08-01";
    expect(() => workOrderListFrom(bad)).toThrow(/due before it was opened/);
  });

  it("refuses an assignee who is neither an employee number nor a recorded crew", () => {
    const invented = structuredClone(RAW) as { work_orders: Array<Record<string, unknown>> };
    invented.work_orders[0].assignee = { name: "Juan de la Cruz", employee_number: null };
    expect(() => workOrderListFrom(invented)).toThrow(/neither an HR employee nor a recorded crew/);
    expect(WORK_ORDER_TEAM_ASSIGNEES).toContain("Grounds crew");
  });

  it("refuses an order missing its priority or title", () => {
    expect(() => toWorkOrder({ id: "WO-1" })).toThrow(ApiError);
  });
});

describe("live mode is an honest refusal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("answers 503 with the named missing service when an operations gateway is configured", async () => {
    vi.stubEnv("OPERATIONS_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    const live = await import("@/lib/api-client/work-orders");
    await expect(live.loadWorkOrders()).rejects.toMatchObject({
      message: WORK_ORDERS_NOT_WIRED,
      status: 503,
    });
  });

  it("serves the recorded list in fixture mode", async () => {
    await expect(loadWorkOrders()).resolves.toMatchObject({ as_of: AS_OF });
  });
});

describe("the priority vocabulary", () => {
  it("labels high, medium and low", () => {
    expect(Object.values(WORK_ORDER_PRIORITY_LABEL)).toEqual(["High", "Medium", "Low"]);
    expect(Object.values(WORK_ORDER_STATE_LABEL)).toEqual(["Open", "In hand", "Done"]);
  });
});

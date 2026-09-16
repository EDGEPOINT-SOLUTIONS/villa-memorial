import { describe, expect, it } from "vitest";
import type { Client, Prospect, WorkItem } from "@/lib/api-client/agent";
import {
  appointmentStateLabel,
  commissionConfigured,
  findClients,
  interestLabel,
  manilaDay,
  manilaTime,
  needsYou,
  nextActionItem,
  orderWorkItems,
  prospectValueTotal,
  stageMeta,
  todayAppointments,
  workKindLabel,
  workState,
} from "@/lib/agent/agent-view";

const NOW = new Date("2026-09-16T12:00:00Z");

function item(over: Partial<WorkItem>): WorkItem {
  return {
    id: "w",
    kind: "follow_up",
    contact_id: "p1",
    contact_name: "Person",
    title: "Title",
    detail: "Detail",
    meta: [],
    due_at: "2026-09-16T09:00:00Z",
    state: "open",
    primary_action: "Call",
    secondary_action: null,
    snooze: null,
    ...over,
  };
}

describe("agent work list", () => {
  it("derives overdue, today, waiting and done from the trigger, not the date alone", () => {
    expect(workState(item({ due_at: "2026-09-14T10:00:00Z" }), NOW)).toBe("overdue");
    expect(workState(item({ due_at: "2026-09-16T09:00:00Z" }), NOW)).toBe("today");
    expect(workState(item({ due_at: "2026-09-18T09:00:00Z" }), NOW)).toBe("future");
    expect(workState(item({ state: "waiting", due_at: "2026-09-01T09:00:00Z" }), NOW)).toBe("waiting");
    expect(workState(item({ state: "done", due_at: "2026-09-01T09:00:00Z" }), NOW)).toBe("done");
  });

  it("orders overdue first, then today, waiting, future, and done last", () => {
    const items = [
      item({ id: "done", state: "done", due_at: "2026-09-01T09:00:00Z" }),
      item({ id: "waiting", state: "waiting", due_at: "2026-09-18T09:00:00Z" }),
      item({ id: "today", due_at: "2026-09-16T09:00:00Z" }),
      item({ id: "future", due_at: "2026-09-20T09:00:00Z" }),
      item({ id: "overdue-old", due_at: "2026-09-12T09:00:00Z" }),
      item({ id: "overdue-new", due_at: "2026-09-15T09:00:00Z" }),
    ];
    expect(orderWorkItems(items, NOW).map((i) => i.id)).toEqual([
      "overdue-old",
      "overdue-new",
      "today",
      "waiting",
      "future",
      "done",
    ]);
  });

  it("writes overdue in days and never labels a waiting item overdue", () => {
    expect(workKindLabel(item({ due_at: "2026-09-14T10:00:00Z" }), NOW)).toBe("Overdue · 2 days");
    expect(workKindLabel(item({ state: "waiting", due_at: "2026-09-01T10:00:00Z" }), NOW)).toBe(
      "Waiting on the family",
    );
  });

  it("picks the first non-done item as the next action", () => {
    const next = nextActionItem(
      [item({ id: "done", state: "done" }), item({ id: "hot", due_at: "2026-09-14T09:00:00Z" })],
      NOW,
    );
    expect(next?.id).toBe("hot");
  });
});

describe("agent pipeline", () => {
  it("maps every PRD stage to an agent word and a tone", () => {
    expect(stageMeta("new")).toEqual({ label: "New", tone: "" });
    expect(stageMeta("contacted")).toEqual({ label: "Contacted", tone: "warm" });
    expect(stageMeta("qualified")).toEqual({ label: "Qualified", tone: "hot" });
    expect(stageMeta("presentation")).toEqual({ label: "Meeting planned", tone: "" });
    expect(stageMeta("proposal")).toEqual({ label: "Ready to close", tone: "warm" });
    expect(stageMeta("reserved").tone).toBe("won");
    expect(stageMeta("sold").label).toBe("Sold");
    expect(stageMeta("unknown-stage").label).toBe("unknown-stage");
  });

  it("sums possible value in integer minor units and finds who needs the agent", () => {
    const people = [
      { urgency: "hot", possible_value_cents: 100 },
      { urgency: "today", possible_value_cents: 250 },
      { urgency: "warm", possible_value_cents: 1000 },
    ] as unknown as Prospect[];
    expect(prospectValueTotal(people)).toBe(1350);
    expect(needsYou(people).map((p) => p.urgency)).toEqual(["hot", "today"]);
  });

  it("labels interests in the agent's words", () => {
    expect(interestLabel("plan")).toBe("Plan");
    expect(interestLabel("lot")).toBe("Lot");
    expect(interestLabel("services")).toBe("Services");
  });
});

describe("agent clients and appointments", () => {
  it("searches clients by name, phone, or a holding label", () => {
    const clients = [
      { name: "Marites Santos", phone: "+63 917 210 4455", email: "m@example.com", holdings: [{ label: "Memorial lot A-002", detail: "reserved" }] },
      { name: "Liwayway Cruz", phone: "+63 916 887 2299", email: "l@example.com", holdings: [{ label: "Villa Memorial Plan · Silver 1", detail: "active" }] },
    ] as unknown as Client[];
    expect(findClients(clients, "marites")).toHaveLength(1);
    expect(findClients(clients, "A-002")).toHaveLength(1);
    expect(findClients(clients, "917 210")).toHaveLength(1);
    expect(findClients(clients, "silver")).toHaveLength(1);
    expect(findClients(clients, "nothing")).toHaveLength(0);
    expect(findClients(clients, "  ")).toHaveLength(2);
  });

  it("keeps the office's confirmation state explicit", () => {
    expect(appointmentStateLabel({ status: "confirmed" } as never)).toBe("Confirmed by the office");
    expect(appointmentStateLabel({ status: "waiting" } as never)).toBe(
      "Waiting for the office to confirm",
    );
    expect(
      todayAppointments([
        { day: "today" } as never,
        { day: "week" } as never,
      ]),
    ).toHaveLength(1);
  });

  it("renders office times in Manila", () => {
    expect(manilaTime("2026-09-16T10:30:00Z")).toBe("6:30 PM");
    expect(manilaDay("2026-09-16T10:30:00Z")).toBe("Sep 16");
  });
});

describe("agent commission policy", () => {
  it("never treats the unconfigured engine as configured", () => {
    expect(commissionConfigured({ configured: false })).toBe(false);
    expect(commissionConfigured({ configured: true })).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import type { AgentTask, Appointment } from "@/lib/api-client/agent";
import {
  agentAppointmentTone,
  agentDayAriaSummary,
  agentTaskDayKey,
  buildAgentCalendarEvents,
  defaultAgentMonthKey,
  firstAgentEventDay,
  groupAgentEventsByDay,
  recordedTodayKey,
} from "@/lib/agent/agent-calendar";
import { manilaDayKey, manilaTodayKey } from "@/lib/agent/agent-view";
import { addMonths, buildMonthGrid, monthLabel } from "@/lib/calendar-grid";

function appointment(
  id: string,
  starts_at: string,
  status: Appointment["status"],
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id,
    day: "week",
    starts_at,
    time_label: "",
    time_note: "",
    title: `Appointment ${id}`,
    reason: "Sales consultation",
    where: "The office · Sunrise",
    bring: [],
    status,
    contact_id: null,
    ...overrides,
  };
}

function task(id: string, due_at?: string): AgentTask {
  return { id, title: `Task ${id}`, meta: "", done: false, due_at };
}

/**
 * The appointments calendar's pure logic (captain, 2026-10-02). The month grid
 * is the shared Monday-first one, every recorded instant is keyed to its
 * Asia/Manila day, and only a task that carries a due day is placed on a cell.
 */
describe("the agent calendar month", () => {
  it("reuses the Monday-first grid and steps months across the year", () => {
    const weeks = buildMonthGrid("2026-09");
    expect(weeks[0].days[0].key).toBe("2026-08-31");
    expect(weeks[0].days[0].inMonth).toBe(false);
    for (const week of weeks) expect(week.days).toHaveLength(7);
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("keys an instant to its Asia/Manila day, never the reader's", () => {
    expect(manilaDayKey("2026-09-16T02:30:00Z")).toBe("2026-09-16");
    expect(manilaDayKey("2026-09-15T16:30:00Z")).toBe("2026-09-16");
    expect(manilaDayKey("not-a-date")).toBe("");
    expect(manilaTodayKey(new Date("2026-09-15T16:30:00Z"))).toBe("2026-09-16");
  });
});

describe("grouping the recorded activity", () => {
  it("marks appointments by their day and names the roles they carry", () => {
    const events = buildAgentCalendarEvents(
      [
        appointment("a", "2026-09-16T02:30:00Z", "confirmed", { contact_id: "prospect-1" }),
        appointment("b", "2026-09-16T06:30:00Z", "waiting"),
        appointment("c", "2026-09-17T01:00:00Z", "confirmed"),
      ],
      [],
      { "prospect-1": "Cecilia Ramos" },
    );
    expect(agentAppointmentTone(events[0].appointment!)).toBe("ok");
    expect(agentAppointmentTone(events[1].appointment!)).toBe("wait");
    const byDay = groupAgentEventsByDay(events);
    expect(byDay.get("2026-09-16")).toHaveLength(2);
    expect(byDay.get("2026-09-16")![0].id).toBe("a");
    expect(byDay.get("2026-09-16")![0].contact_name).toBe("Cecilia Ramos");
    expect(byDay.get("2026-09-16")![1].contact_name).toBeNull();
    expect(firstAgentEventDay(byDay, "2026-09")).toBe("2026-09-16");
    expect(firstAgentEventDay(byDay, "2026-10")).toBeNull();
  });

  it("places a task on its due day and leaves an undated task off the grid", () => {
    expect(agentTaskDayKey(task("dated", "2026-09-18"))).toBe("2026-09-18");
    expect(agentTaskDayKey(task("instant", "2026-09-18T02:00:00Z"))).toBe("2026-09-18");
    expect(agentTaskDayKey(task("undated"))).toBe("");
    const events = buildAgentCalendarEvents([], [task("dated", "2026-09-18"), task("undated")]);
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("task");
    expect(events[0].tone).toBe("neutral");
    expect(events[0].dayKey).toBe("2026-09-18");
  });

  it("opens on the nearest recorded day that is not behind today, else the last one", () => {
    const events = buildAgentCalendarEvents(
      [
        appointment("a", "2026-09-16T02:30:00Z", "confirmed"),
        appointment("b", "2026-09-19T07:00:00Z", "confirmed"),
      ],
      [],
    );
    expect(defaultAgentMonthKey(events, "2026-09-16")).toBe("2026-09");
    expect(defaultAgentMonthKey(events, "2026-10-02")).toBe("2026-09");
    expect(defaultAgentMonthKey([], "2026-10-02")).toBe("2026-10");
  });

  it("reads the recorded today from the fixture's own today's stops", () => {
    expect(
      recordedTodayKey(
        [
          { day: "today", starts_at: "2026-09-16T02:30:00Z" },
          { day: "week", starts_at: "2026-09-17T01:00:00Z" },
        ],
        "2026-10-02",
      ),
    ).toBe("2026-09-16");
    // A record with no today falls back to the real Manila day, never a guess.
    expect(recordedTodayKey([], "2026-10-02")).toBe("2026-10-02");
  });
});

describe("what a day announces", () => {
  it("names the day, who it is with, what it is, the time and the state", () => {
    const events = buildAgentCalendarEvents(
      [appointment("a", "2026-09-16T02:30:00Z", "confirmed", { contact_id: "prospect-1", title: "Lot viewing" })],
      [],
      { "prospect-1": "Cecilia Ramos" },
    );
    const summary = agentDayAriaSummary("2026-09-16", events);
    expect(summary).toContain("Wednesday");
    expect(summary).toContain("16 September");
    expect(summary).toContain("Cecilia Ramos");
    expect(summary).toContain("Lot viewing");
    expect(summary).toContain("10:30 AM");
    expect(summary).toContain("Confirmed by the office");
  });

  it("says a plain day is plain, and names a dated task", () => {
    expect(agentDayAriaSummary("2026-09-16", [])).toContain("nothing recorded");
    const events = buildAgentCalendarEvents([], [task("dated", "2026-09-18")]);
    expect(agentDayAriaSummary("2026-09-18", events)).toContain("Task dated (task)");
  });
});

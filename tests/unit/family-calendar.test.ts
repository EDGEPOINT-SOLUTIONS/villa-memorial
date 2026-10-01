import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  dayAriaSummary,
  defaultMonthKey,
  FAMILY_VISIT_KINDS,
  familyVisitKind,
  firstEventDay,
  groupByDay,
  monthKeyFromDay,
  monthLabel,
  visitTone,
  type CalendarAppointment,
} from "@/lib/family/family-calendar";
import { familyInstantDay, familyTodayKey } from "@/lib/family/family-view";

function appointment(
  id: string,
  starts_at: string,
  state: CalendarAppointment["state"],
): CalendarAppointment {
  return {
    id,
    kind: "office_visit",
    starts_at,
    day_label: "",
    time_label: "",
    title: `Visit ${id}`,
    reason: "Discuss a service arrangement",
    where: "The office · Sunrise, Isabela City",
    bring: [],
    state,
    action_label: "Call to set the day",
    person_id: "person-1",
    person_name: "Ernesto Dela Cruz",
  };
}

/**
 * The visit calendar's pure logic (captain, 2026-09-30). The grid starts on
 * Monday (the Philippines' own week) and every recorded instant is keyed to its
 * Asia/Manila day — the two rules that decide which cell a visit lands on.
 */
describe("the month grid", () => {
  it("starts each week on Monday and fills the leading and trailing days", () => {
    // 1 September 2026 is a Tuesday, so the first cell is Monday 31 August.
    const weeks = buildMonthGrid("2026-09");
    expect(weeks).toHaveLength(5);
    expect(weeks[0].days[0].key).toBe("2026-08-31");
    expect(weeks[0].days[0].inMonth).toBe(false);
    expect(weeks[0].days[1].key).toBe("2026-09-01");
    expect(weeks[0].days[1].inMonth).toBe(true);
    expect(weeks.at(-1)!.days.at(-1)!.key).toBe("2026-10-04");
    for (const week of weeks) expect(week.days).toHaveLength(7);
  });

  it("names the month and steps months across a year boundary", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(addMonths("2026-09", 1)).toBe("2026-10");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthKeyFromDay("2026-09-22")).toBe("2026-09");
  });
});

describe("days and instants", () => {
  it("keys an instant to its Asia/Manila day, never the reader's", () => {
    // 16:30 UTC is 00:30 the NEXT day in Manila — a visit asked about at night.
    expect(familyInstantDay("2026-09-21T16:30:00Z")).toBe("2026-09-22");
    // 01:30 UTC is 09:30 the same morning in Manila.
    expect(familyInstantDay("2026-09-22T01:30:00Z")).toBe("2026-09-22");
    expect(familyInstantDay("not-a-date")).toBe("");
    expect(familyTodayKey(new Date("2026-09-21T16:30:00Z"))).toBe("2026-09-22");
  });
});

describe("grouping and defaults", () => {
  const events = [
    appointment("a", "2026-09-22T02:00:00Z", "confirmed"),
    appointment("b", "2026-09-29T01:30:00Z", "waiting"),
    appointment("c", "2026-09-12T05:00:00Z", "past"),
    appointment("d", "2026-10-13T01:30:00Z", "confirmed"),
  ];

  it("groups visits by the day they fall on, in time order", () => {
    const byDay = groupByDay(events);
    expect([...byDay.keys()].sort()).toEqual(["2026-09-12", "2026-09-22", "2026-09-29", "2026-10-13"]);
    expect(firstEventDay(byDay, "2026-09")).toBe("2026-09-12");
    expect(firstEventDay(byDay, "2026-11")).toBeNull();
  });

  it("opens on the nearest month that is not behind the reader, else the last one", () => {
    // With an October visit ahead of 1 October, October opens.
    expect(defaultMonthKey(events, "2026-10-01")).toBe("2026-10");
    // Everything is in the past: the most recent month opens, not today's empty one.
    expect(defaultMonthKey(events.slice(0, 3), "2026-11-01")).toBe("2026-09");
    // No visits at all: today's month is honest — it is simply empty.
    expect(defaultMonthKey([], "2026-11-01")).toBe("2026-11");
  });
});

describe("the meaning of a state, in colour and in words", () => {
  it("maps each state to its tone, and the day summary names it", () => {
    expect(visitTone("confirmed")).toBe("ok");
    expect(visitTone("waiting")).toBe("wait");
    expect(visitTone("past")).toBe("neutral");
    const summary = dayAriaSummary("2026-09-22", [appointment("a", "2026-09-22T02:00:00Z", "confirmed")]);
    expect(summary).toContain("Tuesday");
    expect(summary).toContain("22 September");
    expect(summary).toContain("Ernesto Dela Cruz");
    expect(summary).toContain("Visit a");
    expect(summary).toContain("10:00 AM");
    expect(summary).toContain("Confirmed by the office");
    expect(dayAriaSummary("2026-09-22", [])).toContain("no visits");
  });
});

describe("the visit kinds a family can ask for", () => {
  it("uses the same three kinds the recorded visits carry", () => {
    expect(FAMILY_VISIT_KINDS.map((kind) => kind.key)).toEqual([
      "home_visit",
      "park_visit",
      "office_visit",
    ]);
    expect(familyVisitKind("park_visit")?.label).toBe("A walk to the lot with us");
    expect(familyVisitKind("chapel_visit")).toBeUndefined();
  });
});

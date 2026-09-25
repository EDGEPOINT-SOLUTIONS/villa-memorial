import { describe, expect, it } from "vitest";
import {
  BURIAL_WEEKDAY_LABELS,
  burialConflicts,
  burialMonthView,
  burialWeekView,
  burialsOnDay,
  conflictedBurialIds,
  formatParkTime,
  isTimeOfDay,
  nearestBurialDays,
  shiftMonthAnchor,
  upcomingBurials,
  weekStart,
  type BurialEntry,
} from "@/lib/burial-calendar";
import { burialScheduleFromFixture } from "@/lib/api-client/burial-schedule";

/**
 * The burial calendar's pure rules — the client's minutes item 2. What this
 * pins: the park-time clock, the month and week grids, the burial → light-pickup
 * linkage (one record) and the three derived conflict rules. No wall clock and no
 * React take part, so the grid the page renders is the grid these tests prove.
 */

const board = burialScheduleFromFixture();

function entry(overrides: Partial<BurialEntry>): BurialEntry {
  return {
    id: "bur-test",
    date: "2026-09-30",
    time: "09:00",
    case_number: "CASE-2026-0001",
    deceased_name: "Test Person",
    lot_number: "A-003",
    section: "A",
    coordinator: "Elena Villanueva",
    light_pickup: null,
    note: null,
    ...overrides,
  };
}

describe("the park-time clock", () => {
  it("reads a HH:MM sheet time as the park prints it", () => {
    expect(formatParkTime("09:00")).toBe("9:00 AM");
    expect(formatParkTime("14:00")).toBe("2:00 PM");
    expect(formatParkTime("00:00")).toBe("12:00 AM");
    expect(formatParkTime("23:59")).toBe("11:59 PM");
  });

  it("refuses a half-written time instead of rendering a wrong clock", () => {
    expect(isTimeOfDay("09:00")).toBe(true);
    expect(isTimeOfDay("24:00")).toBe(false);
    expect(isTimeOfDay("9:00")).toBe(false);
    expect(isTimeOfDay("09:60")).toBe(false);
    expect(isTimeOfDay("")).toBe(false);
    expect(formatParkTime("nope")).toBe("nope");
  });
});

describe("the burial-to-pickup linkage is one record", () => {
  it("carries the recorded light pickup on its own burial, never as a second event", () => {
    const santos = board.burials.find((b) => b.case_number === "CASE-2026-0001");
    expect(santos?.light_pickup).toEqual({
      time: "15:00",
      state: "scheduled",
      crew: "Delivery crew",
      note: null,
    });
    // One entry for the day, not one burial plus one pickup.
    const day = burialsOnDay(board.burials, "2026-09-30");
    expect(day).toHaveLength(2);
    expect(day.every((b) => b.light_pickup !== null)).toBe(true);
  });

  it("keeps a burial without a pickup an honest null", () => {
    const none = entry({ id: "bur-none", light_pickup: null });
    expect(none.light_pickup).toBeNull();
    expect(upcomingBurials([none], "2026-09-01")).toHaveLength(1);
  });
});

describe("the day lookup", () => {
  it("filters to one day and orders by service time then name", () => {
    const day = burialsOnDay(board.burials, "2026-09-30");
    expect(day.map((b) => b.deceased_name)).toEqual(["Pedro Santos", "Rosario Gonzales"]);
    // 09:00 before 14:00.
    expect(day[0].time).toBe("09:00");
    expect(day[1].time).toBe("14:00");
  });
});

describe("the month grid is whole Monday-first weeks", () => {
  const view = burialMonthView("2026-09", board.burials);

  it("labels the month and pads the edges", () => {
    expect(view.label).toBe("September 2026");
    expect(view.weeks).toHaveLength(5);
    expect(view.weeks.every((week) => week.length === 7)).toBe(true);
    expect(BURIAL_WEEKDAY_LABELS[0]).toBe("Mon");
    // Sep 1 2026 is a Tuesday, so the first cell is the Monday before it.
    expect(view.weeks[0][0]).toMatchObject({ date: "2026-08-31", inMonth: false });
    expect(view.weeks[0][1]).toMatchObject({ date: "2026-09-01", inMonth: true });
  });

  it("puts each burial on its own date cell", () => {
    const cells = view.weeks.flat();
    const thirtieth = cells.find((cell) => cell.date === "2026-09-30");
    expect(thirtieth?.burials.map((b) => b.deceased_name)).toEqual([
      "Pedro Santos",
      "Rosario Gonzales",
    ]);
    const inactive = cells.filter((cell) => !cell.inMonth);
    expect(inactive.map((cell) => cell.date)).toEqual([
      "2026-08-31",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });
});

describe("the week grid is the seven days around the anchor", () => {
  const view = burialWeekView("2026-09-30", board.burials);

  it("starts on Monday and ends on Sunday", () => {
    expect(view.start).toBe("2026-09-28");
    expect(view.end).toBe("2026-10-04");
    expect(view.days).toHaveLength(7);
    expect(view.label).toBe("Sep 28, 2026 → Oct 4, 2026");
    expect(weekStart("2026-09-30")).toBe("2026-09-28");
  });

  it("lists the burials on their weekday", () => {
    const wednesday = view.days.find((day) => day.date === "2026-09-30");
    expect(wednesday?.burials).toHaveLength(2);
    const monday = view.days.find((day) => day.date === "2026-09-28");
    expect(monday?.burials).toHaveLength(0);
  });
});

describe("the preparation list", () => {
  it("takes burials on or after the anchor, nearest first", () => {
    const upcoming = upcomingBurials(board.burials, "2026-09-28");
    expect(upcoming.map((b) => b.deceased_name)).toEqual(["Pedro Santos", "Rosario Gonzales"]);
    // The August interment is behind the anchor and drops out.
    expect(upcomingBurials(board.burials, "2026-09-28")).not.toContainEqual(
      expect.objectContaining({ deceased_name: "Antonio Reyes" }),
    );
  });

  it("points at the nearest recorded days around an empty one", () => {
    expect(nearestBurialDays(board.burials, "2026-09-01")).toEqual({
      previous: "2026-08-18",
      next: "2026-09-30",
    });
  });
});

describe("month navigation", () => {
  it("shifts a month and lands on its first day", () => {
    expect(shiftMonthAnchor("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftMonthAnchor("2026-09-01", -1)).toBe("2026-08-01");
    expect(shiftMonthAnchor("2026-12-15", 1)).toBe("2027-01-01");
  });
});

describe("the conflict rules read only what was recorded", () => {
  it("flags the fixture's crew set for two pickups at once", () => {
    const conflicts = burialConflicts(board.burials);
    const crew = conflicts.filter((c) => c.kind === "pickup_crew");
    expect(crew).toHaveLength(1);
    expect(crew[0].date).toBe("2026-09-30");
    expect(crew[0].burial_ids).toHaveLength(2);
    expect(crew[0].message).toContain("Delivery crew");
    expect(crew[0].message).toContain("3:00 PM");
  });

  it("flags two burials sharing one service time", () => {
    const conflicts = burialConflicts([
      entry({ id: "a", time: "10:00", deceased_name: "One" }),
      entry({ id: "b", time: "10:00", deceased_name: "Two" }),
    ]);
    const slot = conflicts.filter((c) => c.kind === "burial_slot");
    expect(slot).toHaveLength(1);
    expect(slot[0].burial_ids.sort()).toEqual(["a", "b"]);
  });

  it("flags a light pickup set before its own burial", () => {
    const conflicts = burialConflicts([
      entry({
        id: "c",
        time: "14:00",
        light_pickup: { time: "09:00", state: "scheduled", crew: "Delivery crew", note: null },
      }),
    ]);
    const order = conflicts.filter((c) => c.kind === "pickup_order");
    expect(order).toHaveLength(1);
    expect(order[0].burial_ids).toEqual(["c"]);
  });

  it("invents nothing when the sheet is clean", () => {
    const clean = [
      entry({ id: "x", date: "2026-09-30", time: "09:00" }),
      entry({ id: "y", date: "2026-09-30", time: "14:00" }),
    ];
    expect(burialConflicts(clean)).toEqual([]);
    expect(conflictedBurialIds(burialConflicts(clean)).size).toBe(0);
  });

  it("names every conflicted burial id for the cells", () => {
    const ids = conflictedBurialIds(burialConflicts(board.burials));
    expect(ids.has("bur-2026-0001-santos")).toBe(true);
    expect(ids.has("bur-2026-0004-gonzales")).toBe(true);
    expect(ids.has("bur-2026-0003-reyes")).toBe(false);
  });
});

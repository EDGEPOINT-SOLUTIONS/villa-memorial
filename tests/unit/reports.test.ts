import { describe, expect, it } from "vitest";
import {
  dateOnly,
  datePeriod,
  eachDate,
  inPeriod,
  monthBoundsOf,
  parsePeriodDate,
  percentOf,
  periodIsAll,
  periodLabel,
} from "@/lib/period";
import {
  REPORT_KEYS,
  caseRollup,
  chapelRollup,
  collectionsByMonth,
  isReportKey,
  lotRollup,
  monthLabel,
} from "@/lib/reports";

/**
 * The Reports screen's pure rules and the shared calendar window.
 *
 * Each report must be derivable from rows the page actually holds, so these are
 * the only places a bucket, a count or a percentage is decided — an empty result
 * is legal and becomes the page's honest empty state; an invented one is not.
 */

describe("the shared period window", () => {
  it("validates untrusted query dates and refuses a rolled-over calendar date", () => {
    expect(parsePeriodDate("2026-08-31")).toBe("2026-08-31");
    expect(parsePeriodDate(" 2026-08-31 ")).toBe("2026-08-31");
    expect(parsePeriodDate("2026-02-30")).toBeNull();
    expect(parsePeriodDate("31/08/2026")).toBeNull();
    expect(parsePeriodDate("")).toBeNull();
    expect(parsePeriodDate(undefined)).toBeNull();
  });

  it("swaps reversed ends and drops only the invalid one", () => {
    expect(datePeriod("2026-08-31", "2026-08-01")).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(datePeriod("nonsense", "2026-08-01")).toEqual({ from: null, to: "2026-08-01" });
    expect(datePeriod(undefined, undefined)).toEqual({ from: null, to: null });
  });

  it("treats the window inclusively, including an ISO instant's date half", () => {
    const period = { from: "2026-08-01", to: "2026-08-31" };
    expect(inPeriod("2026-08-01T09:15:00.000Z", period)).toBe(true);
    expect(inPeriod("2026-08-31", period)).toBe(true);
    expect(inPeriod("2026-09-01T00:00:00.000Z", period)).toBe(false);
    expect(inPeriod("2026-07-31", period)).toBe(false);
    expect(dateOnly("2026-08-31T23:59:59Z")).toBe("2026-08-31");
  });

  it("labels all, one-ended and two-ended windows", () => {
    expect(periodIsAll({ from: null, to: null })).toBe(true);
    expect(periodLabel({ from: null, to: null })).toBe("All recorded dates");
    expect(periodLabel({ from: "2026-08-01", to: "2026-08-31" })).toContain("2026");
    expect(periodLabel({ from: "2026-08-01", to: null })).toMatch(/^From /);
    expect(periodLabel({ from: null, to: "2026-08-31" })).toMatch(/^Up to /);
  });

  it("finds a month's own first and last day, leap years included", () => {
    expect(monthBoundsOf("2026-09-20")).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(monthBoundsOf("2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthBoundsOf("nope")).toEqual({ from: null, to: null });
  });

  it("walks each calendar day of a window, and refuses a reversed one", () => {
    expect(eachDate("2026-09-01", "2026-09-03")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
    expect(eachDate("2026-09-03", "2026-09-01")).toEqual([]);
  });

  it("rounds a share and refuses to divide by an empty whole", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(0, 0)).toBeNull();
    expect(percentOf(3, 2)).toBe(150);
  });
});

describe("report keys and labels", () => {
  it("names exactly the four office reports", () => {
    expect(REPORT_KEYS).toEqual(["collections", "sales", "occupancy", "cases"]);
    expect(isReportKey("collections")).toBe(true);
    expect(isReportKey("revenue")).toBe(false);
    expect(monthLabel("2026-08")).toBe("August 2026");
  });
});

describe("collections by month", () => {
  const payments = [
    { received_on: "2026-07-05", amount_cents: 1000 },
    { received_on: "2026-07-20", amount_cents: 500 },
    { received_on: "2026-08-02", amount_cents: 2000 },
  ];

  it("filters to the window and groups by month, newest first", () => {
    const rows = collectionsByMonth(payments, { from: "2026-07-01", to: "2026-07-31" });
    expect(rows).toEqual([{ month: "2026-07", count: 2, total_cents: 1500 }]);
  });

  it("returns no rows for a period no payment falls in — the empty state's input", () => {
    expect(collectionsByMonth(payments, { from: "2030-01-01", to: "2030-01-31" })).toEqual([]);
  });

  it("orders months newest first across a window", () => {
    const rows = collectionsByMonth(payments, { from: null, to: null });
    expect(rows.map((row) => row.month)).toEqual(["2026-08", "2026-07"]);
  });
});

describe("lot occupancy rollup", () => {
  const lots = [
    { status: "available" },
    { status: "available" },
    { status: "reserved", reserved_at: "2026-08-05T02:00:00Z" },
    { status: "sold", sold_at: "2026-06-01T02:00:00Z" },
  ];

  it("counts the snapshot by status and the arrivals inside the window", () => {
    const rows = lotRollup(lots, { from: "2026-08-01", to: "2026-08-31" });
    const available = rows.find((row) => row.status === "available");
    const reserved = rows.find((row) => row.status === "reserved");
    const sold = rows.find((row) => row.status === "sold");
    expect(available).toMatchObject({ count: 2, moved_in_period: 0 });
    expect(reserved).toMatchObject({ count: 1, moved_in_period: 1 });
    expect(sold).toMatchObject({ count: 1, moved_in_period: 0 });
  });

  it("never invents an arrival for a status the property service records without a date", () => {
    const rows = lotRollup([{ status: "available" }], { from: null, to: null });
    expect(rows[0].moved_in_period).toBe(0);
  });
});

describe("chapel occupancy rollup", () => {
  const chapels = [
    { id: "c1", name: "Chapel A", chapel_class: "common", active: true },
    { id: "c2", name: "Chapel B", chapel_class: "private", active: false },
  ];
  const bookings = [
    { resource_id: "c1", status: "confirmed", dates: ["2026-09-10", "2026-09-11"] },
    { resource_id: "c1", status: "cancelled", dates: ["2026-09-12"] },
    { resource_id: "c2", status: "hold", dates: ["2026-09-10"] },
  ];
  const blocks = [{ resource_id: "c1", from: "2026-09-11", to: "2026-09-11" }];

  it("splits booked, closed and open days and excludes closures from the ratio", () => {
    const rows = chapelRollup(chapels, bookings, blocks, {
      from: "2026-09-01",
      to: "2026-09-30",
    });
    const a = rows.find((row) => row.id === "c1");
    // 10–11 booked, 11 closed → 1 booked open day over 29 open days.
    expect(a).toMatchObject({ booked_days: 1, closed_days: 1, open_days: 29, occupancy_pct: 3 });
    const b = rows.find((row) => row.id === "c2");
    // A cancelled booking does not hold a day; a hold does.
    expect(b).toMatchObject({ booked_days: 1, closed_days: 0, open_days: 30, occupancy_pct: 3 });
    expect(b?.active).toBe(false);
  });

  it("refuses an open-ended window rather than inventing one", () => {
    expect(chapelRollup(chapels, bookings, blocks, { from: null, to: null })).toEqual([]);
  });
});

describe("cases by stage rollup", () => {
  const cases = [
    { stage: "inquiry", created_at: "2026-08-28T02:00:00Z" },
    { stage: "inquiry", created_at: "2026-08-28T03:00:00Z" },
    { stage: "viewing", created_at: "2026-08-20T02:00:00Z" },
    { stage: "completed", created_at: "2026-07-01T02:00:00Z" },
  ];

  it("counts opened cases in the ops board's stage order, zeros included", () => {
    const rows = caseRollup(cases, { from: "2026-08-01", to: "2026-08-31" });
    expect(rows.map((row) => row.stage)).toEqual([
      "inquiry",
      "retrieval",
      "preparation",
      "viewing",
      "ceremony",
      "interment",
      "completed",
    ]);
    expect(rows.find((row) => row.stage === "inquiry")).toMatchObject({ count: 2, share_pct: 67 });
    expect(rows.find((row) => row.stage === "viewing")).toMatchObject({ count: 1, share_pct: 33 });
    expect(rows.find((row) => row.stage === "completed")).toMatchObject({
      count: 0,
      share_pct: 0,
    });
  });

  it("returns zero rows for an empty period, which the page prints as its empty state", () => {
    const rows = caseRollup(cases, { from: "2030-01-01", to: "2030-01-31" });
    expect(rows.every((row) => row.count === 0)).toBe(true);
    expect(rows.every((row) => row.share_pct === null)).toBe(true);
  });
});

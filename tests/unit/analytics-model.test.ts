import { describe, expect, it } from "vitest";
import {
  ANALYTICS_RANGES,
  analyticsWindow,
  collectionsSeries,
  inquiryConversion,
  isAnalyticsRange,
  lotAvailability,
  monthlySeries,
  salesSeries,
  shortMonthLabel,
  trailingMonthWindow,
} from "@/lib/analytics";
import { duesAging, outstandingCents, outstandingTotal, overdueTotal, receivedInPeriod } from "@/lib/receivables";
import type { Lot } from "@/lib/api-client/property";
import type { Inquiry } from "@/lib/api-client/crm";

/**
 * The analytics and receivables rules, without a browser.
 *
 * Every figure is derived from records handed in, so the screen can never plot a point the
 * caller did not supply: a month with no value is not a plotted zero, a window with no
 * inquiry has a null conversion (never 0%), and an invoice that owes nothing is not a due.
 */

const NOW = new Date("2026-09-25T12:00:00Z");

describe("the analytics window", () => {
  it("covers the month, quarter and year to date", () => {
    expect(analyticsWindow("month", NOW)).toEqual({ from: "2026-09-01", to: "2026-09-25" });
    expect(analyticsWindow("quarter", NOW)).toEqual({ from: "2026-07-01", to: "2026-09-25" });
    expect(analyticsWindow("year", NOW)).toEqual({ from: "2026-01-01", to: "2026-09-25" });
  });

  it("closes the quarter on the right month for any month", () => {
    const jan = new Date("2026-01-15T00:00:00Z");
    expect(analyticsWindow("quarter", jan).from).toBe("2026-01-01");
    const apr = new Date("2026-04-15T00:00:00Z");
    expect(analyticsWindow("quarter", apr).from).toBe("2026-04-01");
  });

  it("reads the trailing months ending with the current month", () => {
    expect(trailingMonthWindow(NOW, 6)).toEqual({ from: "2026-04-01", to: "2026-09-30" });
  });

  it("validates the range vocabulary", () => {
    expect([...ANALYTICS_RANGES]).toEqual(["month", "quarter", "year"]);
    expect(isAnalyticsRange("quarter")).toBe(true);
    expect(isAnalyticsRange("fortnight")).toBe(false);
    expect(isAnalyticsRange(undefined)).toBe(false);
  });
});

describe("the monthly series", () => {
  it("groups real records by month, oldest first, and skips empty months", () => {
    const series = salesSeries(
      [
        { placed_at: "2026-06-15T09:40:00.000Z", total_cents: 460_000 },
        { placed_at: "2026-07-01T08:15:00.000Z", total_cents: 6_352_000 },
        { placed_at: "2026-07-20T03:30:00.000Z", total_cents: 450_000 },
        { placed_at: "2026-08-01T07:55:00.000Z", total_cents: 350_000 },
      ],
      { from: "2026-04-01", to: "2026-09-30" },
    );
    expect(series).toEqual([
      { month: "2026-06", label: "Jun", value: 460_000 },
      { month: "2026-07", label: "Jul", value: 6_802_000 },
      { month: "2026-08", label: "Aug", value: 350_000 },
    ]);
  });

  it("returns an empty series (a named state, not a zero line) when nothing is recorded", () => {
    expect(salesSeries([], { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
    expect(collectionsSeries([], { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
  });

  it("gives collections the payment journal's own months", () => {
    const series = collectionsSeries(
      [
        { received_on: "2026-09-10", amount_cents: 100_000 },
        { received_on: "2026-09-11", amount_cents: 50_000 },
        { received_on: "2026-07-02", amount_cents: 6_352_000 },
      ],
      { from: "2026-04-01", to: "2026-09-30" },
    );
    expect(series).toEqual([
      { month: "2026-07", label: "Jul", value: 6_352_000 },
      { month: "2026-09", label: "Sep", value: 150_000 },
    ]);
  });

  it("keeps the generic grouping honest about a zero-valued month", () => {
    const series = monthlySeries(
      [
        { at: "2026-01-01", value: 0 },
        { at: "2026-02-01", value: 5 },
      ],
      { from: "2026-01-01", to: "2026-12-31" },
      (row) => row.at,
      (row) => row.value,
    );
    expect(series).toEqual([{ month: "2026-02", label: "Feb", value: 5 }]);
  });

  it("labels a month short", () => {
    expect(shortMonthLabel("2026-08")).toBe("Aug");
    expect(shortMonthLabel("not-a-month")).toBe("not-a-month");
  });
});

describe("inquiry conversion", () => {
  const inquiries = [
    { received_at: "2026-08-19T08:00:00Z", status: "converted" },
    { received_at: "2026-08-24T16:03:00Z", status: "contacted" },
    { received_at: "2026-08-25T08:47:00Z", status: "new" },
    { received_at: "2026-09-02T08:00:00Z", status: "converted" },
  ] as unknown as Inquiry[];

  it("counts the window and rounds a whole percent", () => {
    const result = inquiryConversion(inquiries, { from: "2026-08-01", to: "2026-08-31" });
    expect(result.total).toBe(3);
    expect(result.converted).toBe(1);
    expect(result.pct).toBe(33);
  });

  it("is null — not 0% — when the window holds no inquiry", () => {
    const result = inquiryConversion(inquiries, { from: "2026-10-01", to: "2026-10-31" });
    expect(result.total).toBe(0);
    expect(result.pct).toBeNull();
  });
});

describe("lot availability", () => {
  it("counts the four watched statuses and names the rest honestly", () => {
    const lots = [
      "available",
      "available",
      "reserved",
      "sold",
      "occupied",
      "on_hold",
    ].map((status) => ({ status })) as unknown as Lot[];
    const result = lotAvailability(lots);
    expect(result).toMatchObject({
      total: 6,
      available: 2,
      reserved: 1,
      sold: 1,
      occupied: 1,
      other: 1,
    });
  });
});

describe("receivables", () => {
  const invoices = [
    { total_cents: 100_000, paid_cents: 0, due_at: "2026-09-20T08:00:00Z" }, // 5 days
    { total_cents: 100_000, paid_cents: 0, due_at: "2026-08-01T08:00:00Z" }, // 55 days
    { total_cents: 100_000, paid_cents: 0, due_at: "2026-07-01T08:00:00Z" }, // 86 days
    { total_cents: 100_000, paid_cents: 0, due_at: "2026-05-01T08:00:00Z" }, // 147 days
    { total_cents: 100_000, paid_cents: 100_000, due_at: "2026-01-01T08:00:00Z" }, // settled
  ];

  it("floors a balance at zero", () => {
    expect(outstandingCents({ total_cents: 500, paid_cents: 900, due_at: "2026-01-01" })).toBe(0);
    expect(outstandingTotal(invoices)).toBe(400_000);
  });

  it("derives the four aging buckets from the due date and the balance", () => {
    const rows = duesAging(invoices, NOW);
    expect(rows.map((row) => row.bucket)).toEqual(["0-30", "31-60", "61-90", "90+"]);
    expect(rows.map((row) => row.amount_cents)).toEqual([100_000, 100_000, 100_000, 100_000]);
    expect(rows.map((row) => row.count)).toEqual([1, 1, 1, 1]);
  });

  it("sums the overdue half with the shared date rule", () => {
    const overdue = overdueTotal(invoices, NOW);
    expect(overdue.count).toBe(4);
    expect(overdue.amount_cents).toBe(400_000);
    expect(overdueTotal([{ total_cents: 1, paid_cents: 1, due_at: "2020-01-01" }], NOW).count).toBe(0);
  });

  it("counts payments received in the window", () => {
    expect(
      receivedInPeriod(
        [
          { received_on: "2026-09-10", amount_cents: 100_000 },
          { received_on: "2026-08-31", amount_cents: 40_000 },
        ],
        { from: "2026-09-01", to: "2026-09-30" },
      ),
    ).toEqual({ total_cents: 100_000, count: 1 });
  });
});

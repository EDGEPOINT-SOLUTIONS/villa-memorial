import { describe, expect, it } from "vitest";
import {
  agingBucket,
  daysPastDue,
  displayStatus,
} from "@/lib/api-client/billing-derive";

/**
 * Rules frozen in docs/08-delivery/contracts/billing-list-api-v1.md (KEB-D4-01).
 * A fixed clock throughout — these must never depend on when the suite runs.
 */
const NOW = new Date("2026-08-29T00:00:00Z");

describe("displayStatus", () => {
  it("paid stays paid regardless of dates", () => {
    expect(displayStatus("paid", "2026-01-01", NOW)).toBe("paid");
    expect(displayStatus("paid", "2027-01-01", NOW)).toBe("paid");
  });

  it("a part-paid invoice stays partial even when long overdue", () => {
    // The rule that is easy to get wrong: lateness is carried by the aging bucket,
    // not by the status. Flipping this silently changes what the Overdue chip counts.
    expect(displayStatus("partially_paid", "2026-05-10", NOW)).toBe("partial");
    expect(displayStatus("partially_paid", "2027-05-10", NOW)).toBe("partial");
  });

  it("an untouched invoice is overdue only once its due date has passed", () => {
    expect(displayStatus("issued", "2026-08-28", NOW)).toBe("overdue");
    expect(displayStatus("issued", "2026-08-29", NOW)).toBe("pending");
    expect(displayStatus("issued", "2026-09-03", NOW)).toBe("pending");
  });

  it("treats a missing due date as not yet due", () => {
    expect(displayStatus("issued", null, NOW)).toBe("pending");
  });
});

describe("agingBucket", () => {
  it("a paid invoice is never aged — it is not owed", () => {
    expect(agingBucket("paid", "2026-03-15", NOW)).toBe("current");
  });

  it("buckets by whole days past due", () => {
    const cases: Array<[string, string]> = [
      ["2026-09-03", "current"],  // not yet due
      ["2026-08-29", "current"],  // due today
      ["2026-08-28", "1-30"],
      ["2026-08-03", "1-30"],     // 26 days
      ["2026-07-30", "1-30"],      // exactly 30 days — upper edge is inclusive
      ["2026-07-15", "31-60"],    // 45 days
      ["2026-06-20", "61-90"],    // 70 days
      ["2026-05-10", "91-120"],   // 111 days
      ["2026-03-15", "120+"],     // 167 days
    ];
    for (const [due, expected] of cases) {
      expect(`${due} -> ${agingBucket("issued", due, NOW)}`).toBe(`${due} -> ${expected}`);
    }
  });

  it("bucket boundaries are inclusive at the upper edge", () => {
    const minus = (days: number) =>
      new Date(NOW.getTime() - days * 86_400_000).toISOString().slice(0, 10);
    expect(agingBucket("issued", minus(30), NOW)).toBe("1-30");
    expect(agingBucket("issued", minus(31), NOW)).toBe("31-60");
    expect(agingBucket("issued", minus(60), NOW)).toBe("31-60");
    expect(agingBucket("issued", minus(61), NOW)).toBe("61-90");
    expect(agingBucket("issued", minus(120), NOW)).toBe("91-120");
    expect(agingBucket("issued", minus(121), NOW)).toBe("120+");
  });
});

describe("daysPastDue", () => {
  it("is negative before the due date and zero on it", () => {
    expect(daysPastDue("2026-08-29", NOW)).toBe(0);
    expect(daysPastDue("2026-08-30", NOW)).toBe(-1);
    expect(daysPastDue("2026-08-28", NOW)).toBe(1);
  });

  it("does not throw on an unparseable date", () => {
    expect(daysPastDue("not-a-date", NOW)).toBe(0);
  });
});

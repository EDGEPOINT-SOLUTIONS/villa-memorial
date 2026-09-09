import { describe, expect, it } from "vitest";
import {
  legendTypeChips,
  legendTypeFilter,
  matchesPlotFilters,
  type LegendPlotRow,
} from "@/lib/lots-legend";

/** A couple of plots per legend type, mirroring parks.json's seeded plots. */
const ROWS: LegendPlotRow[] = [
  { plot: { status: "available", typeId: "lt-premium" }, park: { id: "villa" } },
  { plot: { status: "reserved", typeId: "lt-premium" }, park: { id: "villa" } },
  { plot: { status: "available", typeId: "lt-garden" }, park: { id: "villa" } },
  { plot: { status: "available", typeId: "lt-garden" }, park: { id: "loyola" } },
  { plot: { status: "sold", typeId: "lt-garden" }, park: { id: "golden-haven" } },
  { plot: { status: "available" }, park: { id: "villa" } }, // no typeId → STANDARD LOT
];

describe("the /lots legend-type filter", () => {
  it("accepts only seeded type ids as a ?type= value", () => {
    expect(legendTypeFilter("lt-garden")).toBe("lt-garden");
    expect(legendTypeFilter("lt-premium")).toBe("lt-premium");
    expect(legendTypeFilter("lt-road")).toBe("lt-road");
    expect(legendTypeFilter("")).toBeUndefined();
    expect(legendTypeFilter("made-up-type")).toBeUndefined();
  });

  it("filters plots by legend type, with type-less plots falling back to STANDARD LOT", () => {
    const garden = ROWS.filter((r) => matchesPlotFilters(r, { type: "lt-garden" }));
    expect(garden.map((r) => r.park.id)).toEqual(["villa", "loyola", "golden-haven"]);
    const standard = ROWS.filter((r) => matchesPlotFilters(r, { type: "lt-standard" }));
    expect(standard.map((r) => r.park.id)).toEqual(["villa"]);
  });

  it("combines the type filter with the existing park + status filters", () => {
    expect(
      ROWS.filter((r) => matchesPlotFilters(r, { park: "villa", type: "lt-garden" })).length,
    ).toBe(1);
    expect(
      ROWS.filter((r) =>
        matchesPlotFilters(r, { park: "golden-haven", status: "sold", type: "lt-garden" }),
      ).length,
    ).toBe(1);
    expect(
      ROWS.filter((r) => matchesPlotFilters(r, { status: "sold", type: "lt-premium" })).length,
    ).toBe(0);
  });

  it("shows one chip per present type with its live count inside the active scope", () => {
    const chips = legendTypeChips(ROWS, {});
    expect(chips.map((c) => [c.id, c.count])).toEqual([
      ["lt-premium", 2],
      ["lt-garden", 3],
      ["lt-standard", 1],
    ]);
    // A park filter rescopes the counts before a chip is clicked.
    const villaChips = legendTypeChips(ROWS, { park: "villa" });
    expect(villaChips.map((c) => [c.id, c.count])).toEqual([
      ["lt-premium", 2],
      ["lt-garden", 1],
      ["lt-standard", 1],
    ]);
    const soldChips = legendTypeChips(ROWS, { status: "sold" });
    expect(soldChips.map((c) => [c.id, c.count])).toEqual([["lt-garden", 1]]);
  });

  it("returns no chips when no plot in scope carries a type", () => {
    expect(legendTypeChips(ROWS, { park: "loyola", status: "sold" })).toEqual([]);
  });
});

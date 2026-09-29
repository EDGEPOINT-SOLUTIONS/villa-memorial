import { describe, expect, it } from "vitest";
import {
  ANY,
  NO_FILTER,
  filterPlots,
  isFiltering,
  plotSectionId,
  plotSectionLabel,
  sectionFacets,
  statusFacets,
} from "@/lib/park-3d/explore";
import type { PlotArea } from "@/lib/park-maps";

/**
 * The in-experience explorer (search / filters / section list).
 *
 * These are pure reads over the shared store's records: the panel hides and shows
 * plots that already exist, and can never invent or rename one. A section name
 * comes from the plot's own legend type (the masterplan's own section names), so
 * the explorer's section list matches the map key and the recorded lot pages.
 */

function plot(partial: Partial<PlotArea> & { code: string }): PlotArea {
  return {
    id: `p-${partial.code.toLowerCase()}`,
    lot_id: null,
    status: "available",
    outline: [
      [10, 10],
      [11, 10],
      [11, 11],
      [10, 11],
    ],
    ...partial,
  };
}

const inventory: PlotArea[] = [
  plot({ code: "P-001", typeId: "lt-premium", sectionBlock: "P · 1" }),
  plot({ code: "P-002", typeId: "lt-premium", sectionBlock: "P · 2", status: "reserved" }),
  plot({ code: "PR-001", typeId: "lt-primary", sectionBlock: "PR · 1" }),
  plot({ code: "GN-001", typeId: "lt-niches", sectionBlock: "GN · 1", status: "occupied" }),
  plot({ code: "A-001", typeId: "lt-primary", sectionBlock: "A · 1" }),
];

describe("sections come from the plots' own facts", () => {
  it("groups a recorded plot under its legend type's masterplan section", () => {
    expect(plotSectionLabel(plot({ code: "A-001", typeId: "lt-primary", sectionBlock: "A · 1" }))).toBe("PRIMARY LOTS");
    expect(plotSectionLabel(plot({ code: "B-001", typeId: "lt-premium", sectionBlock: "B · 1" }))).toBe("PREMIUM LOTS");
    expect(plotSectionLabel(plot({ code: "C-001", typeId: "lt-niches", sectionBlock: "C · 1" }))).toBe("GARDEN NICHES");
    expect(plotSectionLabel(plot({ code: "D-001", typeId: "lt-mausoleum", sectionBlock: "D · 1" }))).toBe("MAUSOLEUM");
  });

  it("falls back to the stored section text, then to Unassigned", () => {
    expect(plotSectionLabel(plot({ code: "X-9", sectionBlock: "X · 1" }))).toBe("X");
    expect(plotSectionLabel(plot({ code: "X-9" }))).toBe("Unassigned");
  });

  it("gives every section a stable, POI-compatible id", () => {
    expect(plotSectionId(plot({ code: "B-014", typeId: "lt-premium" }))).toBe("premium-lots");
    expect(plotSectionId(plot({ code: "C-004", typeId: "lt-niches" }))).toBe("garden-niches");
  });

  it("counts the facets the panel renders, most populated first", () => {
    const facets = sectionFacets(inventory);
    expect(facets.map((f) => f.id)).toEqual([
      "premium-lots",
      "primary-lots",
      "garden-niches",
    ]);
    expect(facets.find((f) => f.id === "premium-lots")?.count).toBe(2);
    expect(statusFacets(inventory).map((f) => `${f.id}:${f.count}`)).toEqual([
      "available:3",
      "reserved:1",
      "occupied:1",
    ]);
  });
});

describe("search and filters never touch the store", () => {
  it("matches on code, section, status and type", () => {
    expect(filterPlots(inventory, { ...NO_FILTER, text: "GN-001" }).map((a) => a.code)).toEqual([
      "GN-001",
    ]);
    expect(filterPlots(inventory, { ...NO_FILTER, text: "premium" }).map((a) => a.code)).toEqual([
      "P-001",
      "P-002",
    ]);
    expect(filterPlots(inventory, { ...NO_FILTER, text: "occupied" }).map((a) => a.code)).toEqual([
      "GN-001",
    ]);
    // Every whitespace-separated term must match — this narrows.
    expect(
      filterPlots(inventory, { ...NO_FILTER, text: "premium reserved" }).map((a) => a.code),
    ).toEqual(["P-002"]);
  });

  it("filters by status and by section together", () => {
    expect(filterPlots(inventory, { ...NO_FILTER, status: "available" }).length).toBe(3);
    expect(filterPlots(inventory, { ...NO_FILTER, section: "premium-lots" }).map((a) => a.code)).toEqual([
      "P-001",
      "P-002",
    ]);
    expect(
      filterPlots(inventory, { text: "", status: "available", section: "premium-lots" }).map(
        (a) => a.code,
      ),
    ).toEqual(["P-001"]);
    expect(
      filterPlots(inventory, { text: "", status: "sold", section: "premium-lots" }),
    ).toHaveLength(0);
  });

  it("reports whether anything is actually being hidden", () => {
    expect(isFiltering(NO_FILTER)).toBe(false);
    expect(isFiltering({ ...NO_FILTER, text: "   " })).toBe(false);
    expect(isFiltering({ ...NO_FILTER, status: ANY, section: "a" })).toBe(true);
  });

  it("returns the plots untouched — filtering is a view, not an edit", () => {
    const before = JSON.parse(JSON.stringify(inventory));
    filterPlots(inventory, { text: "whatever", status: "available", section: "premium-lots" });
    expect(inventory).toEqual(before);
  });
});

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
import { placeholderPlots } from "@/lib/park-3d/placeholder-lots";
import type { PlotArea } from "@/lib/park-maps";

/**
 * The in-experience explorer (search / filters / section list).
 *
 * These are pure reads over the shared store's records: the panel hides and shows
 * plots that already exist, and can never invent or rename one. The placeholder
 * inventory is the real generator (`placeholder-lots.ts`), so the section names
 * the panel shows are the masterplan's own.
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
  it("groups placeholder codes under the masterplan's section names", () => {
    expect(plotSectionLabel(plot({ code: "P-014" }))).toBe("PREMIUM LOTS");
    expect(plotSectionLabel(plot({ code: "PR-003" }))).toBe("PRIMARY LOTS");
    expect(plotSectionLabel(plot({ code: "G-002" }))).toBe("GARDEN LOTS");
    expect(plotSectionLabel(plot({ code: "GN-009" }))).toBe("GARDEN NICHES");
  });

  it("falls back to the stored section text, then to the legend type", () => {
    expect(plotSectionLabel(plot({ code: "A-001", sectionBlock: "A · 1" }))).toBe("A");
    expect(plotSectionLabel(plot({ code: "X-9", typeId: "lt-mausoleum" }))).toBe("MAUSOLEUM");
    expect(plotSectionLabel(plot({ code: "X-9" }))).toBe("Unassigned");
  });

  it("gives every section a stable, POI-compatible id", () => {
    expect(plotSectionId(plot({ code: "P-001" }))).toBe("premium-lots");
    expect(plotSectionId(plot({ code: "GN-004" }))).toBe("garden-niches");
  });

  it("counts the facets the panel renders, most populated first", () => {
    const facets = sectionFacets(inventory);
    expect(facets.map((f) => f.id)).toEqual([
      "premium-lots",
      "a",
      "garden-niches",
      "primary-lots",
    ]);
    expect(facets.find((f) => f.id === "premium-lots")?.count).toBe(2);
    expect(statusFacets(inventory).map((f) => `${f.id}:${f.count}`)).toEqual([
      "available:3",
      "reserved:1",
      "occupied:1",
    ]);
  });

  it("names the real placeholder inventory from the generator, not a fixture", () => {
    const generated = placeholderPlots([], "villa");
    const facets = sectionFacets(generated);
    expect(facets.map((f) => f.id).sort()).toEqual([
      "garden-lots",
      "garden-niches",
      "premium-lots",
      "primary-lots",
    ]);
    expect(plotSectionLabel(generated[0])).toBe("PREMIUM LOTS");
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

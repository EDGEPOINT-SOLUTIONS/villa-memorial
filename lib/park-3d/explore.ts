/**
 * park-3d/explore.ts — the search / filter / section-list model behind the 3D
 * park's in-experience explorer panel (spec §3a.10, captain 2026-09-16).
 *
 * Pure functions over the SAME records the shared store holds (`lib/park-maps`),
 * so "hide a plot" never writes anything and the two modes cannot disagree about
 * what a plot is. The panel renders these facets; `Plots3d` renders only the
 * plots that pass the filter, so filtering genuinely changes what is visible and
 * selectable in the world.
 *
 * Section naming is derived, never invented: a placeholder code (`P-001`,
 * `PR-001`, `G-001`, `GN-001`) belongs to the masterplan section
 * `placeholder-lots.ts` assigns it; everything else falls back to the plot's own
 * stored section text, then to its legend type name.
 */
import { placeholderSectionLabel } from "@/lib/park-3d/placeholder-lots";
import type { PlotArea } from "@/lib/park-maps";
import { parkType } from "@/lib/park-types";

/** Filter value meaning "no constraint". */
export const ANY = "all" as const;

export type PlotFilters = {
  /** Free text: code, section, status or type. */
  text: string;
  status: PlotArea["status"] | typeof ANY;
  /** A section id from `sectionFacets`, or ANY. */
  section: string | typeof ANY;
};

export const NO_FILTER: PlotFilters = { text: "", status: ANY, section: ANY };

/** The section a plot belongs to, as a display label. */
export function plotSectionLabel(area: PlotArea): string {
  const fromPlaceholder = placeholderSectionLabel(area.code);
  if (fromPlaceholder) return fromPlaceholder;
  const stored = area.sectionBlock?.split("·")[0]?.trim();
  if (stored) return stored;
  if (area.typeId) return parkType(area.typeId).name;
  return "Unassigned";
}

/** Stable id for a section label (also the POI id for the four main sections). */
export function plotSectionId(area: PlotArea): string {
  return plotSectionLabel(area)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Section id → the point of interest that frames it. Only the masterplan's four
 * lot sections have a navigation target; a section with no place on the plan
 * simply filters (we never invent a landmark to fly to).
 */
export const SECTION_POI: Record<string, string> = {
  "premium-lots": "premium-lots",
  "primary-lots": "primary-lots",
  "garden-lots": "garden-lots",
  "garden-niches": "garden-niches",
};

export type Facet = { id: string; label: string; count: number };

/** Sections present in the current inventory, most-populated first. */
export function sectionFacets(areas: readonly PlotArea[]): Facet[] {
  const bySection = new Map<string, Facet>();
  for (const area of areas) {
    const id = plotSectionId(area);
    const existing = bySection.get(id);
    if (existing) existing.count++;
    else bySection.set(id, { id, label: plotSectionLabel(area), count: 1 });
  }
  return [...bySection.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export type StatusFacet = { id: PlotArea["status"]; label: string; count: number };

/** Statuses present in the current inventory, in the park's own order. */
export function statusFacets(areas: readonly PlotArea[]): StatusFacet[] {
  const order: Array<PlotArea["status"]> = [
    "available",
    "reserved",
    "sold",
    "occupied",
    "maintenance",
  ];
  return order
    .map((status) => ({
      id: status,
      label: status,
      count: areas.filter((a) => a.status === status).length,
    }))
    .filter((facet) => facet.count > 0);
}

/** What a search term matches against: the plot's own facts, nothing invented. */
export function searchBlob(area: PlotArea): string {
  return [
    area.code,
    area.sectionBlock ?? "",
    plotSectionLabel(area),
    area.status,
    area.typeId ?? "",
    area.typeId ? parkType(area.typeId).name : "",
  ]
    .join(" ")
    .toLowerCase();
}

export function matchesText(area: PlotArea, text: string): boolean {
  const query = text.trim().toLowerCase();
  if (!query) return true;
  // Every whitespace-separated term must match — "premium avail" narrows.
  return query.split(/\s+/).every((term) => searchBlob(area).includes(term));
}

/** Apply the panel's filters to the shared inventory. Never mutates the store. */
export function filterPlots(areas: readonly PlotArea[], filters: PlotFilters): PlotArea[] {
  return areas.filter(
    (area) =>
      (filters.status === ANY || area.status === filters.status) &&
      (filters.section === ANY || plotSectionId(area) === filters.section) &&
      matchesText(area, filters.text),
  );
}

/** True when the panel is actually narrowing the inventory (used for the readout). */
export function isFiltering(filters: PlotFilters): boolean {
  return filters.text.trim() !== "" || filters.status !== ANY || filters.section !== ANY;
}

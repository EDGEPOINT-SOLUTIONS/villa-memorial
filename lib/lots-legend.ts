/**
 * /lots legend-type filter — pure helpers shared by the page and its tests.
 *
 * The public lot browse lets a visitor filter EVERY plot by its legend/plot type
 * (the same PARK_TYPES ids the park map legend and the plot cards read from
 * lib/park-types.ts). These functions keep that filtering logic server-safe and
 * unit-testable; the page only feeds them the rows it already assembled.
 */
import { PARK_TYPES, parkType } from "@/lib/park-types";

/** The parts of a /lots row the legend filter reasons about. */
export type LegendPlotRow = {
  plot: { status: string; typeId?: string };
  park: { id: string };
};

/** Filters already active on the page (park + status) that scope the chips. */
export type PlotScope = { park?: string; status?: string };

/** A seeded legend type with its live plot count inside a scope. */
export type LegendChip = { id: string; name: string; color: string; count: number };

/** Validates a ?type= value against the seeded legend types (falls back to none). */
export function legendTypeFilter(type?: string): string | undefined {
  return type && PARK_TYPES.some((t) => t.id === type) ? type : undefined;
}

/** True when a row survives the park + status filters (chip-count scope). */
export function inPlotScope(row: LegendPlotRow, scope: PlotScope): boolean {
  return (
    (!scope.park || row.park.id === scope.park) &&
    (!scope.status || row.plot.status === scope.status)
  );
}

/** True when a row matches park + status + legend-type filters together. */
export function matchesPlotFilters(
  row: LegendPlotRow,
  filters: PlotScope & { type?: string },
): boolean {
  return (
    inPlotScope(row, filters) && (!filters.type || parkType(row.plot.typeId).id === filters.type)
  );
}

/**
 * The legend chips a visitor sees: every seeded type present in the current
 * park + status scope, each with its live count — so a chip always shows what
 * clicking it will do before it is clicked.
 */
export function legendTypeChips(rows: LegendPlotRow[], scope: PlotScope): LegendChip[] {
  return PARK_TYPES.map((t) => ({
    ...t,
    count: rows.filter((r) => inPlotScope(r, scope) && parkType(r.plot.typeId).id === t.id)
      .length,
  })).filter((c) => c.count > 0);
}

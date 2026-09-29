/**
 * home-park-inventory.ts — the public home's plot inventory, SERVER-SAFE.
 *
 * The home's plot map (`components/public/home-plot-map.tsx`) is a view-only
 * dot map, not the canvas masterplan at `/map`. Its data is the SAME inventory
 * the shared park map draws: the recorded plots in
 * `lib/fixtures/property/parks.json` plus the Villa placeholder grid
 * (`lib/park-3d/placeholder-lots.ts`), with every live `Lot` status overlaid
 * through `lib/park-live-lots.ts` — exactly the composition
 * `components/public-park-map.tsx` → `lib/park-maps.ts` renders.
 *
 * WHY A SEPARATE MODULE. `lib/park-maps.ts` is a `"use client"` store that reads
 * `localStorage`, so a Server Component cannot call it. This module rebuilds the
 * same seed from the same files with pure functions, so the home's map can be
 * SERVER-RENDERED (no hydration gap, no client store read) while staying
 * byte-identical to the shared store's default inventory. When a real
 * geometry/persistence contract lands, this module reads it instead.
 *
 * HONEST DATA. The statuses are the store's own; the totals are computed, never
 * authored — "Available: 85" is `available` counted here, not a literal.
 */
import parksFile from "@/lib/fixtures/property/parks.json";
import { placeholderPlots } from "@/lib/park-3d/placeholder-lots";
import { PARK_TYPES } from "@/lib/park-types";
import { withLiveLotRecords } from "@/lib/park-live-lots";
import type { PlotArea } from "@/lib/park-maps";
import type { Lot } from "@/lib/api-client/property";

type RawPlot = {
  id: string;
  code: string;
  lot_id: string | null;
  status: PlotArea["status"];
  outline: number[][];
  owner?: string;
  sectionBlock?: string;
  typeId?: string;
};

type RawPark = { id: string; plots: RawPlot[] };

const VILLA = (parksFile as { parks: RawPark[] }).parks.find((park) => park.id === "villa");

/** The three states the reference legend names. */
export type HomePlotState = "available" | "reserved" | "sold";

export type HomePlot = {
  code: string;
  /** The store's own status word (shown in the detail line). */
  status: PlotArea["status"];
  state: HomePlotState;
  /** What tapping the dot says in the live region. */
  detail: string;
};

export type HomePlotGroup = {
  id: string;
  /** The reference's group label ("Premium lots"). */
  label: string;
  colour: string;
  plots: HomePlot[];
};

export type HomePlotInventory = {
  groups: HomePlotGroup[];
  totals: { available: number; reserved: number; total: number; sold: number };
};

function stateOf(status: PlotArea["status"]): HomePlotState {
  if (status === "available") return "available";
  if (status === "reserved") return "reserved";
  // occupied / maintenance are drawn as not-available; the store currently
  // seeds only the three states above, so this is the honest catch-all.
  return "sold";
}

/** "PREMIUM LOTS" → "Premium lots". */
function titleCase(name: string): string {
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function recordLabel(state: HomePlotState, status: PlotArea["status"]): string {
  if (state === "available") return "available — ask our staff to reserve it";
  if (state === "reserved") return "reserved";
  return status === "sold" ? "sold" : "not available";
}

/**
 * Build the home's plot inventory. Pure: the same `lots` in give the same
 * grouping out, and a missing park seed yields empty groups rather than a crash.
 */
export function homePlotInventory(lots: ReadonlyArray<Lot>): HomePlotInventory {
  const recorded: PlotArea[] = (VILLA?.plots ?? []).map((plot) => ({
    id: plot.id,
    code: plot.code,
    lot_id: plot.lot_id,
    status: plot.status,
    outline: plot.outline.map(([x, y]) => [x, y] as [number, number]),
    ...(plot.owner ? { owner: plot.owner } : {}),
    ...(plot.sectionBlock ? { sectionBlock: plot.sectionBlock } : {}),
    ...(plot.typeId ? { typeId: plot.typeId } : {}),
  }));

  const areas = withLiveLotRecords([...recorded, ...placeholderPlots(recorded, "villa")], {
    statusById: Object.fromEntries(lots.map((lot) => [lot.id, lot.status])),
    ownerById: Object.fromEntries(lots.map((lot) => [lot.id, lot.owner_name ?? ""])),
  });

  const totals = { available: 0, reserved: 0, sold: 0, total: areas.length };
  const groups: HomePlotGroup[] = [];

  for (const type of PARK_TYPES) {
    const plots = areas.filter((area) => area.typeId === type.id);
    if (plots.length === 0) continue;
    const list: HomePlot[] = plots.map((area, index) => {
      const state = stateOf(area.status);
      totals[state] += 1;
      const label = `${titleCase(type.name)} ${index + 1}`;
      return {
        code: area.code,
        status: area.status,
        state,
        detail: `${label} is ${recordLabel(state, area.status)}.`,
      };
    });
    groups.push({ id: type.id, label: titleCase(type.name), colour: type.color, plots: list });
  }

  return { groups, totals };
}

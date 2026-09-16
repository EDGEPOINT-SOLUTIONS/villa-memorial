/**
 * park-live-lots.ts — the bridge between the shared park-map store and the
 * published lot listing.
 *
 * The two park modes (`/map` Map mode and the 3D park) draw the SAME plot records
 * from `lib/park-maps.ts`. A plot that is linked to a published Lot
 * (`PlotArea.lot_id`) must show the LOT's live status and owner: the property
 * service owns availability, so a reservation made anywhere (staff map, 3D park,
 * the BFF's `/api/property/lots/:id/reserve`) shows up in both modes without the
 * plot record ever being rewritten.
 *
 * One function, both modes — `components/park-maps-view.tsx` and the 3D host
 * (`components/public-park-map.tsx`) call this, so the picture cannot differ.
 *
 * Deliberately strict about the status: the plot store can only draw five states
 * (available / reserved / sold / occupied / maintenance). A live lot status outside
 * that set (the contract also has `for_transfer`, `on_hold`, `maintenance_hold`)
 * is NOT copied in — the record keeps its own status and the details panel, which
 * reads the linked lot directly, still prints the lot's real status and label.
 */
import type { PlotArea } from "@/lib/park-maps";

export type LiveLotMaps = {
  statusById: Record<string, string>;
  ownerById: Record<string, string>;
};

const PLOT_STATUSES: ReadonlySet<PlotArea["status"]> = new Set([
  "available",
  "reserved",
  "sold",
  "occupied",
  "maintenance",
]);

function drawableStatus(status: string | undefined, fallback: PlotArea["status"]): PlotArea["status"] {
  return status && PLOT_STATUSES.has(status as PlotArea["status"])
    ? (status as PlotArea["status"])
    : fallback;
}

/** Overlay live lot status/owner onto the plots that are linked to a lot. */
export function withLiveLotRecords(
  areas: readonly PlotArea[],
  live: LiveLotMaps,
): PlotArea[] {
  return areas.map((area) => {
    const liveStatus = area.lot_id ? live.statusById[area.lot_id] : undefined;
    const liveOwner = area.lot_id ? live.ownerById[area.lot_id] : undefined;
    const status = liveStatus === undefined ? area.status : drawableStatus(liveStatus, area.status);
    const owner = liveOwner ? liveOwner : area.owner;
    if (status === area.status && owner === area.owner) return area;
    return { ...area, status, owner };
  });
}

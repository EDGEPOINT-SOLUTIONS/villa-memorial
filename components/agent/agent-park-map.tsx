"use client";

/**
 * Agent park map — the SHARED park map, with the agent's own actions beside it.
 *
 * The map itself is `components/park-maps-view.tsx` — the same component the
 * staff property screen and the public park page render — fed the SAME lot
 * listing the staff screen reads (`listLots()` with its live status/owner
 * overrides), so the agent and the office can never be looking at two different
 * pictures of the same park. Nothing about the map forks here; only what the
 * viewer can DO differs:
 *
 *  · the shared `PlotDetails` panel shows the selected plot/lot profile;
 *  · an available linked lot carries the agent's existing intent — "ask the
 *    office to hold" (disabled until the captain/client decision and the hold
 *    contract land) instead of the public customer request link;
 *  · mapping/editing tools arrive only for sessions holding `property:write`
 *    (staff preview), the same gate the staff property screen applies.
 *
 * Data rules (web/AGENTS.md): statuses, owners and prices come from the property
 * listing and the shared plot store only — no lot, figure or status is invented
 * here.
 */
import { useState } from "react";
import { ParkMapsView } from "@/components/park-maps-view";
import { PlotDetails } from "@/components/park-plot-details";
import { EmptyState } from "@/components/ui/empty-state";
import type { Lot } from "@/lib/api-client/property";
import { parksList, type PlotArea } from "@/lib/park-maps";

/** The agent portal's lots page is the Villa park's lot availability. */
const VILLA_PARK_ID = "villa";

export function AgentParkMap({
  lots,
  canEdit = false,
}: {
  /** The office's own lot listing — the same array the staff screen passes to the map. */
  lots: Lot[];
  /** `property:write` capability, resolved from the session by the page. */
  canEdit?: boolean;
}) {
  const [selected, setSelected] = useState<{ area: PlotArea; parkId: string } | null>(null);
  const [parkId, setParkId] = useState<string>(VILLA_PARK_ID);
  const parks = parksList();
  const parkName = parks.find((p) => p.id === parkId)?.name ?? parks[0]?.name ?? "Park";

  if (lots.length === 0) {
    return (
      <EmptyState
        title="No lots to show yet"
        hint="The office's lot records will appear on this map once they are published."
      />
    );
  }

  const selectedLot = selected?.area.lot_id
    ? lots.find((l) => l.id === selected.area.lot_id) ?? null
    : null;

  return (
    <div className="stack-4" style={{ minWidth: 0 }}>
      <ParkMapsView
        canEdit={canEdit}
        liveStatusById={Object.fromEntries(lots.map((l) => [l.id, l.status]))}
        liveOwnerById={Object.fromEntries(lots.map((l) => [l.id, l.owner_name ?? ""]))}
        initialParkId={VILLA_PARK_ID}
        selectedCode={selected?.area.code ?? null}
        onSelect={(area, pId) => setSelected({ area, parkId: pId })}
        onParkChange={(id) => setParkId(id)}
      />

      <aside className="card" aria-live="polite">
        <PlotDetails selected={selected} lots={lots} parkName={parkName} showReserveRequest={false}>
          {selectedLot && selectedLot.status === "available" ? (
            <>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                Whether an agent can hold a lot is still the captain / client question. Ask the
                office to hold <strong>{selectedLot.lot_number}</strong> and the office confirms —
                nothing is reserved from this page.
              </p>
              <button
                className="btn btn--secondary btn--sm btn--block"
                type="button"
                disabled
                title="Lot holds await the captain's decision and the property contract"
              >
                Ask the office to hold {selectedLot.lot_number}
              </button>
            </>
          ) : null}
        </PlotDetails>
      </aside>
    </div>
  );
}

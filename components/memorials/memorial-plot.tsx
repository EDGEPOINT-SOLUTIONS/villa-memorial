"use client";

/**
 * MemorialPlot — the finder band on a published memorial (captain, 2026-09-30):
 * the plot PINNED on the park masterplan, the lot's own facts, and ONE action
 * into the 3D park already framed on that plot.
 *
 * WHY A CLIENT COMPONENT. The map is the SAME store and the SAME view the public
 * `/map` renders (`ParkMapsView`, `canEdit={false}`), so a family's memorial
 * shows exactly the plot the office drew — no second geometry, no invented
 * position. `autoSelectCode` highlights the plot; the 3D action is a deep link
 * (`/map?park=villa&plot=<code>&view=3d`) that opens the 3D park on it.
 *
 * HONESTY. A memorial is not a storefront: this band prints the plot's identity,
 * type, status and plan-derived size, and never a price. The action is offered
 * only when the family published a plot code — otherwise the page falls back to
 * the resting-place text and the office line, never a dead button.
 *
 * PRIVACY. The map is the office's own plot geometry, already public on `/map`.
 * No mourner photograph or living relative ever appears here.
 */
import Link from "next/link";
import { useState } from "react";
import { ParkMapsView } from "@/components/park-maps-view";
import { lotStatusLabel } from "@/components/property-map";
import type { Lot } from "@/lib/api-client/property";
import { legendEntry, type PlotArea } from "@/lib/park-maps";
import { plotDimensionsMetres } from "@/lib/park-3d/plot-geometry";

export function MemorialPlot({ plotCode, lots = [] }: { plotCode: string; lots?: Lot[] }) {
  const [selected, setSelected] = useState<{ area: PlotArea; parkId: string } | null>(null);
  const area = selected?.area ?? null;
  const linkedLot = area?.lot_id ? lots.find((lot) => lot.id === area.lot_id) ?? null : null;
  const plotType = area ? legendEntry(area.typeId) : null;
  const dimensions = area ? plotDimensionsMetres(area) : null;
  const href = `/map?park=villa&plot=${encodeURIComponent(plotCode)}&view=3d`;

  return (
    <div className="mem-plot">
      <div className="mem-plot__map" role="group" aria-label={`The park masterplan with plot ${plotCode} highlighted`}>
        <ParkMapsView
          canEdit={false}
          initialParkId="villa"
          autoSelectCode={plotCode}
          onSelect={(plotArea, parkId) => setSelected({ area: plotArea, parkId })}
        />
      </div>

      <dl className="mem-plot__facts">
        <div>
          <dt>Plot</dt>
          <dd>{area?.code ?? plotCode}</dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd>{linkedLot ? linkedLot.section : area?.sectionBlock ?? "—"}</dd>
        </div>
        <div>
          <dt>Block</dt>
          <dd>{linkedLot ? linkedLot.block : area?.sectionBlock ?? "—"}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{plotType?.name ?? "Standard"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{linkedLot ? lotStatusLabel(linkedLot.status) : area?.status ?? "—"}</dd>
        </div>
        {dimensions ? (
          <div>
            <dt>Size</dt>
            <dd>
              ≈ {dimensions.width} × {dimensions.length} m — measured from the plan
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mem-plot__action">
        <Link className="btn btn--primary" href={href}>
          View this lot in the 3D map
        </Link>
        <p className="mem-plot__note">
          Opens the 3D park centred on {plotCode}; full screen is one tap.
        </p>
      </div>
    </div>
  );
}

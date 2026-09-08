"use client";

/**
 * Client-facing park map — multi-park (Villa Memorial · Loyola Gardens ·
 * Golden Haven). Uses the SAME shared store as staff, so plot edits made by
 * staff appear here (demo-local persistence). Read-only for customers: click a
 * plot for details; linked (Villa) plots show real lot info; demo-area plots
 * explain their status honestly.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ParkMapsView } from "@/components/park-maps-view";
import type { Lot } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { LOT_TONE, lotStatusLabel } from "@/components/property-map";
import type { PlotArea } from "@/lib/park-maps";
import { legendEntry } from "@/lib/park-maps";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual lot",
  family: "Family lot",
  estate: "Estate lot",
};

export function PublicParkMap({
  lots,
  initialPark,
  initialPlot,
}: {
  lots: Lot[];
  initialPark?: string;
  initialPlot?: string;
}) {
  const [selected, setSelected] = useState<{ area: PlotArea; parkId: string } | null>(null);
  const liveStatus: Record<string, string> = Object.fromEntries(lots.map((l) => [l.id, l.status]));
  const linkedLot = selected?.area.lot_id ? lots.find((l) => l.id === selected.area.lot_id) ?? null : null;
  const plotType = selected ? legendEntry(selected.area.typeId) : undefined;

  if (lots.length === 0) {
    return (
      <EmptyState
        title="No lots to show yet"
        hint="Property listings will appear here as they are published."
      />
    );
  }

  return (
    <div className="map-layout">
      <div className="stack-4" style={{ flex: "1 1 auto", minWidth: 0 }}>
        <ParkMapsView
          liveStatusById={liveStatus}
          liveOwnerById={Object.fromEntries(lots.map((l) => [l.id, l.owner_name ?? ""])) as Record<string, string>}
          initialParkId={initialPark}
          autoSelectCode={initialPlot}
          selectedCode={selected?.area.code ?? null}
          onSelect={(area, parkId) => setSelected({ area, parkId })}
        />
      </div>

      <aside className="card" aria-live="polite">
        {selected ? (
          <div className="stack">
            <div className="row row--space">
              <h3 className="mb-0">{selected.area.code}</h3>
              <Badge tone={linkedLot ? (LOT_TONE[linkedLot.status] ?? "neutral") : "neutral"}>
                {linkedLot ? lotStatusLabel(linkedLot.status) : selected.area.status}
              </Badge>
            </div>

            {linkedLot ? (
              <>
                <dl className="kv">
                  <div>
                    <dt>Park</dt>
                    <dd>{selected.area.code.startsWith("lot-") ? "Villa Memorial" : "—"}</dd>
                  </div>
                  <div>
                    <dt>Section</dt>
                    <dd>{linkedLot.section}</dd>
                  </div>
                  <div>
                    <dt>Block</dt>
                    <dd>{linkedLot.block}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{TYPE_LABEL[linkedLot.type] ?? linkedLot.type}</dd>
                  </div>
                  <div>
                    <dt>Map type</dt>
                    <dd>{plotType?.name ?? "Standard"}</dd>
                  </div>
                  <div>
                    <dt>Area</dt>
                    <dd>{linkedLot.area_sqm} sqm</dd>
                  </div>
                  <div>
                    <dt>Price</dt>
                    <dd>{formatMinorUnits(linkedLot.price_cents, linkedLot.currency)}</dd>
                  </div>
                </dl>
                {linkedLot.status === "available" ? (
                  <>
                    <p className="text-sm text-muted">
                      This lot is available. Buying online arrives with the lot-checkout
                      contract (dev) — meanwhile, request a reservation and the park office
                      will confirm it.
                    </p>
                    <a
                      className="btn btn--accent btn--sm btn--block"
                      href={"/contact?topic=lot-reservation&lot=" + encodeURIComponent(linkedLot.lot_number)}
                    >
                      Request to reserve {linkedLot.lot_number}
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    This lot is {lotStatusLabel(linkedLot.status).toLowerCase()}. Please contact
                    the memorial park office.
                  </p>
                )}
                {plotType?.image ? (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element -- attached legend photo */}
                    <img src={plotType.image} alt={plotType.name} className="plot-type-photo" />
                    <figcaption className="text-sm text-muted">{plotType.name}</figcaption>
                  </figure>
                ) : null}
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  This is a demo plot area in the{" "}
                  {selected.area.code.split("-")[0] === "LG"
                    ? "Loyola Gardens"
                    : selected.area.code.split("-")[0] === "GH"
                      ? "Golden Haven"
                      : "park"}{" "}
                  map, marked as a <strong>{plotType?.name ?? "Standard"}</strong> area and{" "}
                  currently <strong>{selected.area.status}</strong>. Online reservation and
                  ordering for plots arrive with the geometry &amp; M1 contracts (dev).
                </p>
                {plotType?.image ? (
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element -- attached legend photo */}
                    <img src={plotType.image} alt={plotType.name} className="plot-type-photo" />
                    <figcaption className="text-sm text-muted">{plotType.name}</figcaption>
                  </figure>
                ) : null}
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Select a park, then a plot, to see details and availability.
          </p>
        )}
      </aside>
    </div>
  );
}

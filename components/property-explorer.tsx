"use client";

/**
 * Staff property explorer — one shared map + list surface (Module D/F).
 *
 * The map is the SAME component the public surface uses (components/property-map.tsx):
 * same lots, same derived positions, same colours. What differs here is what staff can
 * DO from a selection: open the full profile (real detail page with reserve/agreement)
 * and reserve an available lot inline. The inline control is the SHARED
 * `components/lot-reserve-action.tsx` — the 3D park's plot panel renders the same
 * one, through the same BFF route (`POST /api/property/lots/:id/reserve`), so both
 * surfaces share one rule and one success/refusal state, and the service stays the
 * only authority on transitions.
 *
 * The list view remains a first-class sibling for accessibility and precise work
 * (design system: the map is never the only selection path).
 */
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LotReserveAction } from "@/components/lot-reserve-action";
import type { Lot } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import {
  LOT_TONE,
  STATUS_LABEL,
  useMapSelection,
  type LotTone,
} from "@/components/property-map";
import { ParkMapsView } from "@/components/park-maps-view";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  family: "Family",
  estate: "Estate",
};

function LotStatusBadge({ status }: { status: Lot["status"] }) {
  return (
    <Badge tone={LOT_TONE[status] ?? "neutral"}>{STATUS_LABEL[status]}</Badge>
  );
}

export function PropertyExplorer({
  lots,
  canReserve,
  initialQuery = "",
  initialStatus = "all",
}: {
  lots: Lot[];
  canReserve: boolean;
  initialQuery?: string;
  initialStatus?: "all" | Lot["status"];
}) {
  const [view, setView] = useState<"map" | "list">("map");
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<"all" | Lot["status"]>(initialStatus);
  const { selected, select } = useMapSelection(lots);

  const q = query.trim().toLowerCase();
  const filtered = lots.filter((l) => {
    if (status !== "all" && l.status !== status) return false;
    if (!q) return true;
    return [l.lot_number, l.section, l.block, l.owner_name ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="stack">
      <div className="row row--wrap">
        <form
          className="row"
          role="search"
          onSubmit={(e) => e.preventDefault()}
          style={{ flex: "1 1 auto" }}
        >
          <input
            className="input"
            type="search"
            placeholder="Search by lot number, section, block, owner…"
            aria-label="Search lots"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="select"
            aria-label="Filter by status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | Lot["status"])}
          >
            <option value="all">All statuses</option>
            {(Object.keys(LOT_TONE) as Lot["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </form>
        <div className="btn-group" role="group" aria-label="View">
          <Button
            variant={view === "map" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setView("map")}
            aria-pressed={view === "map"}
          >
            Map
          </Button>
          <Button
            variant={view === "list" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
          >
            List
          </Button>
        </div>
      </div>

      {view === "map" ? (
        <div className="map-layout">
          <div className="stack" style={{ flex: "1 1 auto", minWidth: 0 }}>
            <ParkMapsView
              canEdit={canReserve}
              liveStatusById={Object.fromEntries(lots.map((l) => [l.id, l.status])) as Record<string, string>}
              liveOwnerById={Object.fromEntries(lots.map((l) => [l.id, l.owner_name ?? ""])) as Record<string, string>}
              selectedCode={selected ? selected.lot_number : null}
              onSelect={(area) => {
                const linked = area.lot_id ? lots.find((l) => l.id === area.lot_id) ?? null : null;
                if (linked) {
                  select(linked);
                } else {
                  // demo/circle plot — map view owns its selection UI (delete, etc.)
                  select(null);
                }
              }}
            />
          </div>

          <aside className="card" aria-live="polite" style={{ minWidth: "16rem" }}>
            {selected ? (
              <div className="stack">
                <div className="row row--space">
                  <h3 className="mb-0">{selected.lot_number}</h3>
                  <LotStatusBadge status={selected.status} />
                </div>
                <dl className="kv">
                  <div>
                    <dt>Section</dt>
                    <dd>{selected.section}</dd>
                  </div>
                  <div>
                    <dt>Block</dt>
                    <dd>{selected.block}</dd>
                  </div>
                  <div>
                    <dt>Type</dt>
                    <dd>{TYPE_LABEL[selected.type] ?? selected.type}</dd>
                  </div>
                  <div>
                    <dt>Area</dt>
                    <dd>{selected.area_sqm} sqm</dd>
                  </div>
                  <div>
                    <dt>Price</dt>
                    <dd>{formatMinorUnits(selected.price_cents, selected.currency)}</dd>
                  </div>
                  <div>
                    <dt>Owner</dt>
                    <dd>{selected.owner_name ?? "Unassigned"}</dd>
                  </div>
                </dl>

                {selected.status === "available" && canReserve ? (
                  <LotReserveAction lot={selected} />
                ) : selected.status === "available" && !canReserve ? (
                  <p className="text-sm text-muted">
                    Available for reservation — requires <code>property:write</code>.
                  </p>
                ) : null}

                <Link
                  href={`/staff/property/${selected.id}`}
                  className="btn btn--secondary btn--sm"
                >
                  Full profile
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Select a lot on the map to see its details, reserve it, or open the full
                profile.
              </p>
            )}
          </aside>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No lots match your filter"
          hint="Try a different search or clear the filter."
        />
      ) : (
        <div className="table-wrapper" tabIndex={0}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Lot</th>
                <th scope="col">Section</th>
                <th scope="col">Block</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Area</th>
                <th scope="col">Price</th>
                <th scope="col">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lot) => (
                <tr key={lot.id}>
                  <td>
                    <Link href={`/staff/property/${lot.id}`}>
                      <strong>{lot.lot_number}</strong>
                    </Link>
                  </td>
                  <td>{lot.section}</td>
                  <td>{lot.block}</td>
                  <td className="text-sm">{TYPE_LABEL[lot.type] ?? lot.type}</td>
                  <td>
                    <LotStatusBadge status={lot.status} />
                  </td>
                  <td className="text-sm">{lot.area_sqm} sqm</td>
                  <td className="text-sm">
                    {formatMinorUnits(lot.price_cents, lot.currency)}
                  </td>
                  <td className="text-sm">{lot.owner_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// TONE_CLASS is used by the legend inside ParkMap; re-exported type for consumers.
export type { LotTone };

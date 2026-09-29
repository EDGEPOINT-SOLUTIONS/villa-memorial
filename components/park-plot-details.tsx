"use client";

/**
 * PlotDetails — the plot detail panel shared by BOTH park modes.
 *
 * The map view and the 3D park render this same panel for the same selection, so
 * a plot selected in either mode shows identical status, type, section, derived
 * dimensions and price.
 *
 * The panel itself writes nothing. Its "next action" for an available linked lot is
 * chosen by the viewer's capability, in this order:
 *  · `reserveSlot` given (an administrative host that resolved `property:write`) →
 *    the host renders the real reservation control (`components/lot-reserve-action.tsx`);
 *  · else `showReserveRequest` (default) → the request-to-reserve contact link,
 *    which claims and reserves nothing. The public `/map` is view-only for everyone
 *    (captain 2026-09-20) and renders this path — never a control the viewer is not
 *    entitled to use;
 *  · else nothing — a role with its own action (the agent portal) passes
 *    `showReserveRequest={false}` and supplies it through `children`.
 *
 * ⚠ Prices: a plot that is linked to a published Lot shows that lot's real price.
 * Every other recorded plot shows "Price on request" (the office quotes per plot)
 * — the same honest state the lot card prints. No price is ever invented here.
 *
 * The generated placeholder inventory was removed 2026-09-30: every plot this
 * panel can describe is now a recorded plot the lot pages also show.
 */
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { LOT_TONE, lotStatusLabel } from "@/components/property-map";
import { legendEntry, type PlotArea } from "@/lib/park-maps";
import type { Lot } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { plotDimensionsMetres } from "@/lib/park-3d/plot-geometry";

const TYPE_LABEL: Record<string, string> = {
  individual: "Individual lot",
  family: "Family lot",
  estate: "Estate lot",
};

export function PlotDetails({
  selected,
  lots,
  parkName,
  reserveSlot,
  showReserveRequest = true,
  children,
}: {
  selected: { area: PlotArea; parkId: string } | null;
  lots: Lot[];
  parkName: string;
  /**
   * The capability-appropriate reservation control (see the header). Omitted for
   * viewers who may not reserve — the request-to-reserve link is rendered instead.
   */
  reserveSlot?: ReactNode;
  /**
   * Whether an available linked lot offers the public "request to reserve" copy
   * and link. Default true — the public map and staff screens are unchanged.
   * A role whose own hold/reserve action differs (the agent portal) passes false
   * and supplies its action through `children`.
   */
  showReserveRequest?: boolean;
  /** Extra panels rendered under the details (e.g. the 3D plot tools). */
  children?: ReactNode;
}) {
  if (!selected) {
    return (
      <p className="text-sm text-muted">
        Select a park, then a plot, to see details and availability. The 3D view shares this
        selection — pick a plot there and it is chosen here too.
      </p>
    );
  }

  const linkedLot = selected.area.lot_id
    ? lots.find((l) => l.id === selected.area.lot_id) ?? null
    : null;
  const plotType = legendEntry(selected.area.typeId);
  const dimensions = plotDimensionsMetres(selected.area);
  const sectionLabel = selected.area.sectionBlock ?? "—";

  return (
    <div className="stack">
      <div className="row row--space">
        <h3 className="mb-0">{selected.area.code}</h3>
        <Badge tone={linkedLot ? LOT_TONE[linkedLot.status] ?? "neutral" : "neutral"}>
          {linkedLot ? lotStatusLabel(linkedLot.status) : selected.area.status}
        </Badge>
      </div>

      <dl className="kv">
        <div>
          <dt>Park</dt>
          <dd>{parkName}</dd>
        </div>
        <div>
          <dt>Section</dt>
          <dd>{linkedLot ? linkedLot.section : sectionLabel}</dd>
        </div>
        <div>
          <dt>Block</dt>
          <dd>{linkedLot ? linkedLot.block : selected.area.sectionBlock ?? "—"}</dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{linkedLot ? TYPE_LABEL[linkedLot.type] ?? linkedLot.type : plotType?.name ?? "Standard"}</dd>
        </div>
        <div>
          <dt>Map type</dt>
          <dd>{plotType?.name ?? "Standard"}</dd>
        </div>
        {dimensions ? (
          <div>
            <dt>Dimensions</dt>
            <dd>
              ≈ {dimensions.width} × {dimensions.length} m ({dimensions.areaSqm} sqm) — measured from
              the plan
            </dd>
          </div>
        ) : null}
        {linkedLot ? (
          <div>
            <dt>Area</dt>
            <dd>{linkedLot.area_sqm} sqm</dd>
          </div>
        ) : null}
        <div>
          <dt>Price</dt>
          <dd>
            {linkedLot
              ? formatMinorUnits(linkedLot.price_cents, linkedLot.currency)
              : "Price on request"}
          </dd>
        </div>
      </dl>

      {linkedLot ? (
        linkedLot.status === "available" ? (
          reserveSlot ? (
            <>
              <p className="text-sm text-muted">This lot is available.</p>
              {reserveSlot}
            </>
          ) : showReserveRequest ? (
            <>
              <p className="text-sm text-muted">
                This lot is available. Buying online arrives with the lot-checkout contract (dev) —
                meanwhile, request a reservation and the park office will confirm it.
              </p>
              <a
                className="btn btn--accent btn--sm btn--block"
                href={"/contact?topic=lot-reservation&lot=" + encodeURIComponent(linkedLot.lot_number)}
              >
                Request to reserve {linkedLot.lot_number}
              </a>
            </>
          ) : null
        ) : (
          <p className="text-sm text-muted">
            This lot is {lotStatusLabel(linkedLot.status).toLowerCase()}. Please contact the
            memorial park office.
          </p>
        )
      ) : (
        <p className="text-sm text-muted">
          This is a recorded park plot, marked as a{" "}
          <strong>{plotType?.name ?? "Standard"}</strong> area and currently{" "}
          <strong>{selected.area.status}</strong>. It is not linked to a published lot, so the
          office quotes per plot. Online ordering arrives with the geometry &amp; M1 contracts
          (dev).
        </p>
      )}

      {plotType?.image ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- attached legend photo */}
          <img src={plotType.image} alt={plotType.name} className="plot-type-photo" />
          <figcaption className="text-sm text-muted">{plotType.name}</figcaption>
        </figure>
      ) : null}

      {children}
    </div>
  );
}

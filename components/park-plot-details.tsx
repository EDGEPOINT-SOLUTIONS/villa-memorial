"use client";

/**
 * PlotDetails — the plot detail panel shared by BOTH park modes.
 *
 * The map view and the 3D park render this same panel for the same selection, so
 * a plot selected in either mode shows identical status, type, section, derived
 * dimensions and price. It is presentation only: it reads the shared store's
 * records and the published lot listing, and writes nothing.
 *
 * ⚠ Prices: a plot that is linked to a published Lot shows that lot's real price.
 * Every other plot — including the placeholder inventory (P-/PR-/G-/GN- codes)
 * — shows "Contact for pricing". No price is ever invented here.
 */
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { LOT_TONE, lotStatusLabel } from "@/components/property-map";
import { legendEntry, type PlotArea } from "@/lib/park-maps";
import { placeholderSectionLabel } from "@/lib/park-3d/placeholder-lots";
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
  children,
}: {
  selected: { area: PlotArea; parkId: string } | null;
  lots: Lot[];
  parkName: string;
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
  const sectionLabel =
    placeholderSectionLabel(selected.area.code) ?? selected.area.sectionBlock ?? "—";
  const isPlaceholder = placeholderSectionLabel(selected.area.code) !== undefined;

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
              : "Contact for pricing"}
          </dd>
        </div>
      </dl>

      {linkedLot ? (
        linkedLot.status === "available" ? (
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
        ) : (
          <p className="text-sm text-muted">
            This lot is {lotStatusLabel(linkedLot.status).toLowerCase()}. Please contact the
            memorial park office.
          </p>
        )
      ) : isPlaceholder ? (
        <p className="text-sm text-muted">
          <strong>{selected.area.code}</strong> is a <strong>placeholder lot</strong> from the
          masterplan blockout — a labelled stand-in until the park publishes its real lot list.
          Editing it in either mode updates this same record.
        </p>
      ) : (
        <p className="text-sm text-muted">
          This is a demo plot area on the park map, marked as a{" "}
          <strong>{plotType?.name ?? "Standard"}</strong> area and currently{" "}
          <strong>{selected.area.status}</strong>. Online reservation and ordering for plots arrive
          with the geometry &amp; M1 contracts (dev).
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

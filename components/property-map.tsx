"use client";

/**
 * Shared interactive park map (Module D/F pilot).
 *
 * ONE component renders the same picture for the client-facing map and the staff map:
 * the same lots from the same data, placed by the same deterministic layout function
 * (lib/property-layout.ts), colored by the same status palette. Role differences live
 * in the PARENT (staff adds reserve/full-profile actions; the public surface is
 * read-only) — the map itself never changes between them.
 *
 * v1 draws a schematic park (sections as labelled bands) rather than an aerial image:
 * the frozen Lot contract carries no geometry, and a stock photo would be both wrong
 * and an external dependency. Section bands + derived dots are honest about what the
 * data can actually say. When GIS geometry lands (dev-authored), the background layer
 * swaps out and the marker contract stays.
 */
import { useState } from "react";
import type { Lot } from "@/lib/api-client/property";
import { lotMapPosition, mapSections } from "@/lib/property-layout";
import { LOT_TONE, lotStatusLabel, STATUS_LABEL, type LotTone } from "@/lib/lot-labels";
export { LOT_TONE, lotStatusLabel, STATUS_LABEL, type LotTone };

/** Status → semantic tone (mirrors the badge mapping used on list/detail pages). */

export const TONE_CLASS: Record<LotTone, string> = {
  success: "dot--success",
  warning: "dot--warning",
  info: "dot--info",
  neutral: "dot--neutral",
  danger: "dot--danger",
};

export function lotTone(status: Lot["status"]) {
  return LOT_TONE[status] ?? "neutral";
}

export function MapLegend({ statuses }: { statuses: Lot["status"][] }) {
  const present = [...new Set(statuses)];
  return (
    <div className="park-map__legend" aria-label="Map legend">
      {present.map((s) => (
        <span key={s} className="park-map__legend-item">
          <span className={`park-map__dot park-map__${TONE_CLASS[lotTone(s)]}`} aria-hidden="true" />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

/**
 * The map surface itself. Purely presentational selection: parent owns what happens
 * when a lot is chosen (details panel, reserve, navigation).
 */
export function ParkMap({
  lots,
  selectedId,
  onSelect,
  interactive = true,
}: {
  lots: Lot[];
  selectedId: string | null;
  onSelect: (lot: Lot) => void;
  /** false = display-only map (e.g. inside a read-only summary). */
  interactive?: boolean;
}) {
  const sections = mapSections(lots);

  return (
    <div>
      <div className="park-map">
        {sections.map((section, i) => (
          <div
            key={section}
            className="park-map__band"
            style={{ left: `${8 + i * 30}%`, width: "24%" }}
            aria-hidden="true"
          >
            <span className="park-map__band-label">Section {section}</span>
          </div>
        ))}

        {lots.map((lot) => {
          const { x, y } = lotMapPosition(lot);
          const selected = lot.id === selectedId;
          const tone = lotTone(lot.status);
          return (
            <button
              key={lot.id}
              type="button"
              className={`park-map__marker${selected ? " park-map__marker--selected" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              disabled={!interactive}
              onClick={() => onSelect(lot)}
              aria-label={`${lot.lot_number} — section ${lot.section} block ${lot.block} — ${STATUS_LABEL[lot.status]}`}
              title={`${lot.lot_number} — ${STATUS_LABEL[lot.status]}`}
            >
              <span className="park-map__marker-label">{lot.lot_number}</span>
              <span
                className={`park-map__dot park-map__${TONE_CLASS[tone]}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted park-map__footnote">
        Positions are derived from section/block for display; the map is shared with staff
        exactly as shown here.
      </p>
    </div>
  );
}

/**
 * Convenience hook-free selection state so both surfaces keep one pattern:
 * selected lot id + select handler.
 */
export function useMapSelection(lots: Lot[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = lots.find((l) => l.id === selectedId) ?? null;
  const select = (lot: Lot | null) => setSelectedId(lot?.id ?? null);
  return { selectedId, selected, select };
}

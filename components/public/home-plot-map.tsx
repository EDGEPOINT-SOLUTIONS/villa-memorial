"use client";

import { useState } from "react";
import type { HomePlotInventory } from "@/lib/home-park-inventory";

/**
 * HomePlotMap — the public home's plot map block (the reference's dot map).
 *
 * VIEW-ONLY BY CONSTRUCTION (captain 2026-09-20; same rule as the shared
 * `PublicParkMap`): it offers no add/move/delete affordance and resolves no
 * session. Data is the server-built `HomePlotInventory` (the same plot store the
 * masterplan at /map renders — see `lib/home-park-inventory.ts`), passed in as a
 * prop, so this component owns only the tap interaction and the live region.
 *
 * The dot's colour is never the only meaning: every button carries an
 * `aria-label` with its group, number and state, the group count is printed,
 * and the tapped plot's state is read out in the `aria-live` line — the same
 * three channels the reference used.
 */
export function HomePlotMap({ inventory }: { inventory: HomePlotInventory }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  return (
    <div className="vf-map" id="map" data-vf-section="map">
      <p className="vf-legend">
        <span>
          <i className="vf-legend__available" aria-hidden="true" />
          Available: {inventory.totals.available}
        </span>
        <span>
          <i className="vf-legend__reserved" aria-hidden="true" />
          Reserved: {inventory.totals.reserved}
        </span>
        <span>
          <i className="vf-legend__sold" aria-hidden="true" />
          Sold: {inventory.totals.sold}
        </span>
      </p>

      {inventory.groups.map((group) => (
        <div className="vf-grp" key={group.id}>
          <h3 className="vf-grp__title">
            {group.label}: {group.plots.length}
          </h3>
          <div className="vf-dots">
            {group.plots.map((plot) => {
              const on = selected === plot.code;
              return (
                <button
                  key={plot.code}
                  type="button"
                  className={`vf-dot vf-dot--${plot.state}${on ? " vf-dot--on" : ""}`}
                  aria-label={`${plot.code} — ${plot.detail}`}
                  aria-pressed={on}
                  onClick={() => {
                    setSelected(plot.code);
                    setDetail(plot.detail);
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}

      <p className="vf-map__info" aria-live="polite">
        {detail ?? "Tap any plot to see its details."}
      </p>
    </div>
  );
}

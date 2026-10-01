"use client";

/**
 * HomePlotExplorer — the home's Villa Memorial Park band (band 3 of the
 * re-visioned home, 2026-10-02).
 *
 * The composition changed; the honesty did not. The masterplan is the band's
 * LEAD figure — it is the client's own drawing of the grounds, and it carries
 * EVERY RECORDED plot pinned at that plot's own outline centroid (the server
 * computed every pin; no coordinate is invented). The four lot families sit
 * beside it as four priced rows: name · area · monthly, straight from the
 * pricing store, with the selected family's full detail underneath.
 *
 * WHAT THE RE-VISION CUT: the 2×2 of square marketing tiles. They reprinted one
 * near-identical picture four times at a size that made the map the secondary
 * object, and the figures — the only reason a family reads this band — lived in
 * a panel below the fold of the band. The rows carry the figures; the map
 * carries the place.
 *
 * Press a type or a pin; the details update in a live region, and the pin's
 * colour is never the only channel: the state is in every aria-label and printed
 * in the detail line. Every figure arrives through `rows` (the pricing-store row
 * each tile binds to); this component never states an amount of its own.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHead } from "@/components/public/section-head";
import { php } from "@/lib/villa-pricing";
import type { Cta, HomeLotTile } from "@/lib/api-client/landing";
import type { HomeLotGroup, HomeLotRow } from "@/lib/home-model";

export function HomePlotExplorer({
  kicker,
  heading,
  action,
  quote,
  groups,
  rows,
  mapSrc,
  mapAlt,
}: {
  kicker: string;
  heading: string;
  action: Cta;
  quote: Cta;
  groups: HomeLotGroup[];
  rows: Readonly<Record<string, HomeLotRow | null>>;
  mapSrc: string;
  mapAlt: string;
}) {
  const firstTile = groups[0]?.tile.id ?? null;
  const [tileId, setTileId] = useState<string | null>(firstTile);
  const [plotCode, setPlotCode] = useState<string | null>(null);

  const group = groups.find((entry) => entry.tile.id === tileId) ?? groups[0] ?? null;
  const plot = plotCode ? group?.plots.find((p) => p.code === plotCode) ?? null : null;
  const row = group ? rows[group.tile.id] ?? null : null;

  const totals = useMemo(() => {
    const out = { available: 0, reserved: 0, sold: 0 };
    for (const entry of groups) {
      for (const pin of entry.plots) out[pin.state] += 1;
    }
    return out;
  }, [groups]);

  function selectTile(id: string) {
    setTileId(id);
    setPlotCode(null);
  }

  return (
    <section className="home-lots" aria-labelledby="home-lots-title">
      <SectionHead
        id="home-lots-title"
        kicker={kicker}
        title={heading}
        action={
          <Link className="btn btn--secondary" href={action.href}>
            {action.label}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />

      <div className="home-lots__grid">
        <div className="home-lots__plan">
          <div className="home-map">
            {/* The park's own masterplan — the same derivative /map paints. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mapSrc} width={1254} height={1254} alt={mapAlt} loading="lazy" decoding="async" />
            {groups.flatMap((entry) =>
              entry.plots.map((pin) => {
                const on = pin.code === plotCode;
                return (
                  <button
                    key={pin.code}
                    type="button"
                    className={`home-pin home-pin--${pin.state}${on ? " home-pin--on" : ""}`}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    aria-pressed={on}
                    aria-label={`Plot ${pin.code} — ${entry.tile.label} — ${pin.status}${
                      pin.owner ? ` — ${pin.owner}` : ""
                    }`}
                    title={`${pin.code} — ${entry.tile.label} — ${pin.status}`}
                    onClick={() => {
                      setTileId(entry.tile.id);
                      setPlotCode(pin.code);
                    }}
                  />
                );
              }),
            )}
          </div>
          <p className="home-map__legend">
            <span>
              <i className="home-legend__dot home-legend__dot--available" aria-hidden="true" /> Available: {totals.available}
            </span>
            <span>
              <i className="home-legend__dot home-legend__dot--reserved" aria-hidden="true" /> Reserved: {totals.reserved}
            </span>
            <span>
              <i className="home-legend__dot home-legend__dot--sold" aria-hidden="true" /> Sold: {totals.sold}
            </span>
          </p>
        </div>

        <div className="home-lots__list">
          <ul className="home-lot-list">
            {groups.map((entry) => {
              const on = entry.tile.id === group?.tile.id;
              const entryRow = rows[entry.tile.id] ?? null;
              // How many of this family's RECORDED plots are still available —
              // counted from the pins the map already draws, so the row can
              // never disagree with the map.
              const open = entry.plots.filter((pin) => pin.state === "available").length;
              return (
                <li key={entry.tile.id}>
                  <button
                    type="button"
                    className="home-lot-row"
                    aria-pressed={on}
                    onClick={() => selectTile(entry.tile.id)}
                  >
                    <span className="home-lot-row__name">{entry.tile.label}</span>
                    <span className="home-lot-row__area">{entryRow ? `${entryRow.area} sqm` : "—"}</span>
                    <span className="home-lot-row__open">
                      {open === 0
                        ? "None open"
                        : `${open} open`}
                    </span>
                    {entryRow ? (
                      <span className="home-lot-row__price">{php(entryRow.monthly)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="home-lot-detail" aria-live="polite">
            {group ? (
              <>
                <p className="home-lot-detail__title">
                  {plot ? `${plot.code} — ` : ""}
                  {group.tile.label}
                </p>
                <p className="home-lot-detail__sub">
                  {plot
                    ? `Section ${plot.section} · priced from the office’s own 2026 lot table.`
                    : `${group.plots.length} ${
                        group.plots.length === 1 ? "plot" : "plots"
                      } of this kind on the map right now · press one for the plot itself.`}
                </p>
                {/* The family's own availability split, counted from the same
                    pins the map paints — the answer a family actually wants
                    before they ask, without a second trip to the office. */}
                <p className="home-lot-detail__split">
                  {(["available", "reserved", "sold"] as const).map((state) => {
                    const count = group.plots.filter((pin) => pin.state === state).length;
                    if (count === 0) return null;
                    return (
                      <span key={state} className="home-lot-detail__chip">
                        <i className={`home-legend__dot home-legend__dot--${state}`} aria-hidden="true" />
                        {count} {state}
                      </span>
                    );
                  })}
                </p>
                {row ? (
                  <dl className="home-lot-detail__facts">
                    {plot ? (
                      <>
                        <div>
                          <dt>Plot</dt>
                          <dd>{plot.code}</dd>
                        </div>
                        <div>
                          <dt>Section</dt>
                          <dd>{plot.section}</dd>
                        </div>
                        <div>
                          <dt>Status</dt>
                          <dd>{plot.status}</dd>
                        </div>
                      </>
                    ) : null}
                    <div>
                      <dt>Type</dt>
                      <dd>{group.tile.label}</dd>
                    </div>
                    <div>
                      <dt>Area</dt>
                      <dd>{row.area} sqm</dd>
                    </div>
                    <div>
                      <dt>Monthly</dt>
                      <dd>{php(row.monthly)} / month</dd>
                    </div>
                    <div>
                      <dt>Total contract</dt>
                      <dd>{php(row.selling)}</dd>
                    </div>
                    <div>
                      <dt>Senior monthly</dt>
                      <dd>{php(row.seniorMonthly)}</dd>
                    </div>
                    <div>
                      <dt>Payment term</dt>
                      <dd>
                        {Math.floor(row.termMonths / 12)} years ({row.termMonths} months)
                      </dd>
                    </div>
                    {plot?.owner ? (
                      <div>
                        <dt>Holder</dt>
                        <dd>{plot.owner}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : (
                  <p className="home-lot-detail__sub">
                    This lot type is no longer in the office’s 2026 price table — ask the office for
                    the current figures.
                  </p>
                )}
                <div className="home-lot-detail__actions">
                  <Link className="btn btn--accent" href={quote.href}>
                    {quote.label}
                  </Link>
                  {plot ? (
                    <Link className="btn btn--secondary" href="/map">
                      View this lot on the 3D map
                    </Link>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export type { HomeLotRow, HomeLotGroup, HomeLotTile };

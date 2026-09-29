"use client";

/**
 * HomePlotExplorer — the home's Villa Memorial Park band (section 6 of the
 * approved home-rebuild plan).
 *
 * The four lot types in a 2×2 beside the park masterplan, with EVERY RECORDED
 * plot pinned at its own outline centroid (the server computed each pin from the
 * plot's recorded outline — no coordinate is invented), and the selected plot's
 * details underneath. Press a type or a pin; the details update in a live region,
 * and the pin's colour is never the only channel: the state is in every
 * aria-label and printed in the detail line.
 *
 * Every figure in the detail panel arrives through `rows` (the pricing store row
 * each tile binds to); this component never states an amount of its own. The
 * "map" is the park's own masterplan derivative, the same image the /map page
 * paints.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { php } from "@/lib/villa-pricing";
import type { Cta, HomeLotTile } from "@/lib/api-client/landing";
import type { HomeLotGroup, HomeLotRow } from "@/lib/home-model";

export type HomeLotFigure = { tileId: string; src: string | null; srcSet?: string };

export function HomePlotExplorer({
  heading,
  action,
  quote,
  groups,
  rows,
  mapSrc,
  mapAlt,
  figures,
}: {
  heading: string;
  action: Cta;
  quote: Cta;
  groups: HomeLotGroup[];
  rows: Readonly<Record<string, HomeLotRow | null>>;
  mapSrc: string;
  mapAlt: string;
  figures: Readonly<Record<string, HomeLotFigure>>;
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
      <div className="home-band-head">
        <h2 id="home-lots-title" className="home-band-head__title">
          {heading}
        </h2>
        <Link className="btn btn--secondary home-band-head__cta" href={action.href}>
          {action.label}
        </Link>
      </div>

      <div className="home-lots__grid">
        <div className="home-lot-types">
          {groups.map((entry) => {
            const on = entry.tile.id === group?.tile.id;
            const image = figures[entry.tile.id];
            return (
              <button
                key={entry.tile.id}
                type="button"
                className="home-lot-type"
                aria-pressed={on}
                onClick={() => selectTile(entry.tile.id)}
              >
                <span className="home-plate home-lot-type__plate">
                  {image?.src ? (
                    // The photograph is whole inside its square plate (contain),
                    // never cropped — the approved plan's rule.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.src}
                      srcSet={image.srcSet}
                      sizes={image.srcSet ? "(max-width: 52rem) 46vw, 18rem" : undefined}
                      width={720}
                      height={620}
                      alt={entry.tile.imageAlt}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="home-engraved" aria-hidden="true">
                      {entry.tile.label}
                    </span>
                  )}
                </span>
                <span className="home-lot-type__name">{entry.tile.label}</span>
              </button>
            );
          })}
        </div>

        <div className="home-lot-map">
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
      </div>

      <div className="home-lot-detail" aria-live="polite">
        {group ? (
          <>
            <p className="home-lot-detail__title">
              {plot ? `${plot.code} — ` : ""}
              {group.tile.label}
            </p>
            <p className="home-lot-detail__sub">
              {plot
                ? `Section ${plot.section} · priced from the office&rsquo;s own 2026 lot table.`
                : `${group.plots.length} ${
                    group.plots.length === 1 ? "plot" : "plots"
                  } of this kind on the map right now · press one for the plot itself.`}
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
                This lot type is no longer in the office&rsquo;s 2026 price table — ask the office for
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
    </section>
  );
}

export type { HomeLotRow, HomeLotGroup, HomeLotTile };

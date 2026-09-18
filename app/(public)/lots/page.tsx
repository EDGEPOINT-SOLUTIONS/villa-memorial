import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { listLots, type Lot, type LotStatus } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { SAMPLE_PARK_IMAGE, PARK_PLACE_BY_TYPE, PARK_PLACE_PHOTOS } from "@/lib/media";
import { LOT_TONE, lotStatusLabel } from "@/lib/lot-labels";
import { parkType } from "@/lib/park-types";
import {
  legendTypeChips,
  legendTypeFilter,
  matchesPlotFilters,
  type LegendPlotRow,
} from "@/lib/lots-legend";
import parksFile from "@/lib/fixtures/property/parks.json";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Memorial lots — Villa Memorial",
  description:
    "Browse the park's plots by park, status and legend type — see availability and the published lot prices, then reserve with the park office.",
  path: "/lots",
});

/**
 * Public lot browse (Module D public face) — villa item-card grammar on the DOC
 * palette. Unlike a raw Lot API feed, this page mirrors what staff SEE on the
 * admin park maps: EVERY plot in every park (Villa Memorial · Loyola Gardens ·
 * Golden Haven), tagged with its legend type. Plots linked to a sellable Lot
 * (frozen contract) carry real prices; map-only demo plots are honest about it.
 */
const PLOT_STATUSES = ["available", "reserved", "sold", "occupied"] as const;

type SeedPlot = {
  code: string;
  lot_id: string | null;
  status: string;
  owner?: string;
  typeId?: string;
  sectionBlock?: string;
};

type SeedPark = { id: string; name: string; branch: string; image: string; plots: SeedPlot[] };

const SEED_PARKS: SeedPark[] = (parksFile as { parks: SeedPark[] }).parks;

function codeOrder(a: string, b: string): number {
  const na = parseInt(a.split("-")[1] ?? "0", 10);
  const nb = parseInt(b.split("-")[1] ?? "0", 10);
  return na - nb || a.localeCompare(b);
}

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; park?: string; type?: string }>;
}) {
  const { status, park, type } = await searchParams;
  const parkFilter = park && SEED_PARKS.some((p) => p.id === park) ? park : undefined;
  const statusFilter = (PLOT_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as LotStatus)
    : undefined;
  // Legend/plot-type filter — seeded legend ids from lib/park-types.ts (same
  // source the park map legend and the plot cards read); the chip counts + row
  // matching live in lib/lots-legend.ts so they stay unit-tested.
  const typeFilter = legendTypeFilter(type);

  let lots: Lot[];
  try {
    lots = await listLots();
  } catch {
    return (
      <div className="stack-4">
        <h1>Memorial lots</h1>
        <ErrorState message="The lot listings are unavailable right now. Please try again shortly." />
        <p className="text-sm text-muted">
          <Link href="/map">Try the park map</Link> instead.
        </p>
      </div>
    );
  }

  const byLotId = new Map(lots.map((l) => [l.id, l]));

  const rows = SEED_PARKS.flatMap((park) =>
    park.plots.map((plot) => ({
      plot,
      park,
      lot: plot.lot_id ? byLotId.get(plot.lot_id) ?? null : null,
    })),
  ).sort((a, b) => {
    const pi = SEED_PARKS.findIndex((p) => p.id === a.park.id) - SEED_PARKS.findIndex((p) => p.id === b.park.id);
    return pi || codeOrder(a.plot.code, b.plot.code);
  });

  const filtered = rows.filter((r) =>
    matchesPlotFilters(r as LegendPlotRow, {
      park: parkFilter,
      status: statusFilter,
      type: typeFilter,
    }),
  );
  const totalPlots = rows.length;

  // Legend chips: the plot types actually present after the park + status
  // filters, each with its live count — so a visitor always sees what a type
  // chip will show before clicking it (lib/lots-legend.ts keeps this tested).
  const legendChips = legendTypeChips(
    rows as LegendPlotRow[],
    { park: parkFilter, status: statusFilter },
  );

  const q = (patch: { status?: string | null; park?: string | null; type?: string | null }) => {
    const sp = new URLSearchParams();
    const statusValue = patch.status === undefined ? statusFilter : patch.status;
    const parkValue = patch.park === undefined ? parkFilter : patch.park;
    const typeValue = patch.type === undefined ? typeFilter : patch.type;
    if (statusValue) sp.set("status", statusValue);
    if (parkValue) sp.set("park", parkValue);
    if (typeValue) sp.set("type", typeValue);
    const s = sp.toString();
    return s ? `/lots?${s}` : "/lots";
  };

  return (
    <>
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Memorial lots</p>
            <h1 className="hero-premium__title">Find a place of rest</h1>
            <p className="hero-premium__lead">
              Every plot on our park maps — each with its type, status and asking price
              where published. Walk any plot on the{" "}
              <Link href="/map">interactive park map</Link> or compare against the{" "}
              <Link href="/lots/price-list-2026">2026 price list</Link>.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              {rows.filter((r) => r.plot.status === "available").length} available ·{" "}
              {totalPlots} plots · {SEED_PARKS.length} parks
            </p>
            <nav className="seg-filter" aria-label="Filter by park">
              <Link href={q({ park: null })} className={`pill-toggle${!parkFilter ? " pill-toggle--active" : ""}`}>
                All parks
              </Link>
              {SEED_PARKS.map((p) => (
                <Link key={p.id} href={q({ park: p.id })} className={`pill-toggle${parkFilter === p.id ? " pill-toggle--active" : ""}`}>
                  {p.name}
                </Link>
              ))}
            </nav>
            <nav className="seg-filter" aria-label="Filter by status" style={{ marginTop: "var(--space-2)" }}>
              <Link href={q({ status: null })} className={`pill-toggle${!statusFilter ? " pill-toggle--active" : ""}`}>
                All statuses
              </Link>
              {PLOT_STATUSES.map((s) => (
                <Link key={s} href={q({ status: s })} className={`pill-toggle${statusFilter === s ? " pill-toggle--active" : ""}`}>
                  {lotStatusLabel(s)}
                </Link>
              ))}
            </nav>
            <nav className="seg-filter seg-filter--legend" aria-label="Filter by legend type" style={{ marginTop: "var(--space-2)" }}>
              <Link href={q({ type: null })} className={`pill-toggle${!typeFilter ? " pill-toggle--active" : ""}`}>
                All types
              </Link>
              {legendChips.map((t) => (
                <Link
                  key={t.id}
                  href={q({ type: t.id })}
                  className={`pill-toggle pill-toggle--type${typeFilter === t.id ? " pill-toggle--active" : ""}`}
                  title={`${t.name} — ${t.count} plot${t.count === 1 ? "" : "s"}`}
                >
                  <span className="type-dot" style={{ background: t.color }} aria-hidden="true" />
                  <span className="type-name">{t.name}</span>
                  <span className="type-count">{t.count}</span>
                </Link>
              ))}
            </nav>
          </div>
          <figure className="hero-premium__media">
            {/* The hero used the LEGEND TILE itself, whose baked-in "PRIMARY LOT"
                banner and corner logo printed a second title inside a page that
                already has one. It is now the tile's photograph alone
                (scripts/build-composition-images.mjs) at 1×/2× widths. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- client lot photograph */}
            <img
              src={PARK_PLACE_PHOTOS.prime.replace("-720", "-480")}
              srcSet={`${PARK_PLACE_PHOTOS.prime.replace("-720", "-480")} 480w, ${PARK_PLACE_PHOTOS.prime} 720w`}
              sizes="(max-width: 60rem) 90vw, 32rem"
              alt="Primary lots at Villa Memorial"
            />
            <figcaption>Primary lots — Villa Memorial, Isabela City</figcaption>
          </figure>
        </div>
      </section>

      {filtered.length !== rows.length ? (
        <p className="text-sm text-muted" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>
          Showing {filtered.length} of {rows.length} plots —{" "}
          <Link href="/lots">clear all filters</Link>.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No plots match those filters"
          hint="Clear a filter, or contact the memorial park office."
        />
      ) : (
        // Composition pass (captain 2026-09-18): this was 56 equal shadowed
        // cards, each reprinting its legend type's marketing tile — the same
        // four pictures across the whole page. It is now one band per park with
        // its real plot count and how many are available, the park's first plot
        // led by the photograph of its actual legend type, and every other plot
        // as a hairline row whose status, area and price are the point.
        <div className="catalogue-index">
          {SEED_PARKS.map((park) => {
            const parkRows = filtered.filter((r) => r.park.id === park.id);
            const [lead, ...rest] = parkRows;
            if (!lead) return null;
            const available = parkRows.filter((r) => r.plot.status === "available").length;
            return (
              <section key={park.id} className="cat-band" aria-label={park.name}>
                <header className="band-head">
                  <h2 className="band-head__title">{park.name}</h2>
                  <span className="band-head__count">
                    {parkRows.length} plot{parkRows.length === 1 ? "" : "s"} · {available} available
                    · {park.branch}
                  </span>
                </header>

                <LotLead row={lead} />

                {rest.length > 0 ? (
                  <ul className="ledger__list">
                    {rest.map((row) => (
                      <LotRow key={`${row.park.id}-${row.plot.code}`} row={row} />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/** The plot's own facts, shared by the lead and the rows. */
type PlotRow = {
  plot: SeedPlot;
  park: SeedPark;
  lot: Lot | null;
};

/** Where the plot lives on the park map (a linked lot opens its own page). */
function plotHref(row: PlotRow): string {
  return row.lot
    ? `/lots/${row.lot.id}`
    : `/map?park=${row.park.id}&plot=${encodeURIComponent(row.plot.code)}`;
}

/** The published asking price, or the honest "on request" state for a map plot. */
function plotPrice(row: PlotRow) {
  return row.lot ? (
    formatMinorUnits(row.lot.price_cents, row.lot.currency)
  ) : (
    <span className="text-sm text-muted">Price on request</span>
  );
}

/** The plot's status + listing kind, at a glance. */
function PlotStatus({ row }: { row: PlotRow }) {
  const status = row.plot.status as LotStatus;
  return (
    <>
      <Badge tone={LOT_TONE[status] ?? "neutral"}>
        {lotStatusLabel(status) ?? status}
      </Badge>
      <span className="badge">{row.lot ? "Linked listing" : "Map plot"}</span>
    </>
  );
}

/** The band's dominant plot: its legend type's photograph, then every fact. */
function LotLead({ row }: { row: PlotRow }) {
  const type = parkType(row.plot.typeId);
  // The composition derivative of the legend type's own tile (its photograph
  // past the tile's logo and title band) — never the tile itself, whose
  // baked-in "PRIMARY LOT" type would print inside a page that already names the
  // type. Types the client has no photograph for fall back to the generic park
  // photo rather than to a picture of a different kind of place.
  const photo = PARK_PLACE_BY_TYPE[type.id] ?? SAMPLE_PARK_IMAGE;
  const sizeable = photo.startsWith("/media/composition/");
  return (
    <article className="ledger__lead">
      <figure className="ledger__media">
        {/* eslint-disable-next-line @next/next/no-img-element -- client lot photograph */}
        <img
          src={sizeable ? photo.replace("-720", "-480") : photo}
          srcSet={sizeable ? `${photo.replace("-720", "-480")} 480w, ${photo} 720w` : undefined}
          sizes="(max-width: 60rem) 90vw, 26rem"
          alt={`${type.name} — Villa Memorial Park`}
          loading="lazy"
        />
      </figure>
      <div className="ledger__body">
        <p className="ledger__eyebrow">
          <span style={{ color: type.color }}>●</span> {type.name}
        </p>
        <h3 className="ledger__title">
          <Link href={plotHref(row)}>
            {row.plot.code} <span className="text-muted">· {row.park.name}</span>
          </Link>
        </h3>
        <p className="ledger__note">
          {row.lot
            ? `Section ${row.lot.section} · Block ${row.lot.block} · ${row.lot.area_sqm} sqm`
            : (row.plot.sectionBlock ?? "demo area")}
          {row.plot.owner ? ` · Owner: ${row.plot.owner}` : ""}
        </p>
        <p className="ledger__figure">
          {plotPrice(row)}
          {row.lot ? <span className="ledger__unit">published lot price</span> : null}
        </p>
        <div className="lot-line__tags">
          <PlotStatus row={row} />
        </div>
        <div className="ledger__actions">
          {row.lot ? (
            <Link href={`/lots/${row.lot.id}`} className="btn btn--primary btn--sm">
              View listing
            </Link>
          ) : null}
          <Link href={`/map?park=${row.park.id}&plot=${encodeURIComponent(row.plot.code)}`} className="btn btn--secondary btn--sm">
            View on the park map
          </Link>
        </div>
        {!row.lot ? (
          <p className="text-sm text-muted">
            Online purchase for map plots arrives with the geometry &amp; M1 contracts —
            request it at the park office.
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** A supporting plot: code, type, status, area and figure, on one hairline row. */
function LotRow({ row }: { row: PlotRow }) {
  const type = parkType(row.plot.typeId);
  const status = row.plot.status as LotStatus;
  return (
    <li className="ledger__entry">
      <div className="ledger__row">
        <h3 className="ledger__row-title">
          <Link href={plotHref(row)}>{row.plot.code}</Link>
        </h3>
        <span className="ledger__row-figure">{plotPrice(row)}</span>
        <p className="ledger__row-meta">
          <span style={{ color: type.color }}>●</span> {type.name} ·{" "}
          {lotStatusLabel(status) ?? status} ·{" "}
          {row.lot
            ? `Section ${row.lot.section} · Block ${row.lot.block} · ${row.lot.area_sqm} sqm`
            : (row.plot.sectionBlock ?? "demo area")}
          {row.plot.owner ? ` · Owner: ${row.plot.owner}` : ""}
        </p>
        <div className="ledger__row-actions">
          {row.lot ? (
            <Link href={`/lots/${row.lot.id}`} className="btn btn--secondary btn--sm">
              View listing
            </Link>
          ) : null}
          <Link
            href={`/map?park=${row.park.id}&plot=${encodeURIComponent(row.plot.code)}`}
            className="btn btn--secondary btn--sm"
          >
            View on the park map
          </Link>
        </div>
      </div>
    </li>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/states";
import { listLots, type Lot, type LotStatus } from "@/lib/api-client/property";
import { formatMinorUnits } from "@/lib/money";
import { SAMPLE_PARK_IMAGE, LOT_PRIMARY } from "@/lib/media";
import { LOT_TONE, lotStatusLabel } from "@/lib/lot-labels";
import { parkType } from "@/lib/park-types";
import {
  legendTypeChips,
  legendTypeFilter,
  matchesPlotFilters,
  type LegendPlotRow,
} from "@/lib/lots-legend";
import parksFile from "@/lib/fixtures/property/parks.json";

export const metadata = { title: "Memorial lots — In Memoriam" };

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
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded lot photo */}
            <img src={LOT_PRIMARY} alt="Primary lots at Villa Memorial" />
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
        <div className="catalog-grid">
          {filtered.map(({ plot, park, lot }) => {
            const type = parkType(plot.typeId);
            const photo = type.image ?? SAMPLE_PARK_IMAGE;
            const status = plot.status;
            const detailHref = lot ? `/lots/${lot.id}` : `/map?park=${park.id}&plot=${encodeURIComponent(plot.code)}`;
            return (
              <article key={park.id + "-" + plot.code} className="item-card">
                <div className="item-card__media">
                  {/* eslint-disable-next-line @next/next/no-img-element -- legend-attached lot photos */}
                  <img src={photo} alt={lot ? `${plot.code} · ${type.name}` : `${plot.code} · ${type.name} · ${park.name}`} loading="lazy" />
                </div>
                <div className="item-card__body">
                  <div className="row row--space">
                    <Badge tone={LOT_TONE[status as keyof typeof LOT_TONE] ?? "neutral"}>
                      {lotStatusLabel(status as LotStatus) ?? status}
                    </Badge>
                    <span className="badge">{lot ? "Linked listing" : "Map plot"}</span>
                  </div>
                  <h3 className="item-card__title">
                    <Link href={detailHref}>
                      {plot.code} <span className="text-muted">· {park.name}</span>
                    </Link>
                  </h3>
                  <p className="item-card__meta">
                    <span style={{ color: type.color }}>● {type.name}</span>
                    {lot
                      ? ` · Section ${lot.section} · Block ${lot.block} · ${lot.area_sqm} sqm`
                      : ` · ${plot.sectionBlock ?? "demo area"}`}
                  </p>
                  {plot.owner ? (
                    <p className="item-card__meta">Owner: {plot.owner}</p>
                  ) : null}
                  <div className="item-card__price">
                    {lot ? (
                      formatMinorUnits(lot.price_cents, lot.currency)
                    ) : (
                      <span className="text-sm text-muted">Price on request</span>
                    )}
                  </div>
                  <div className="item-card__actions">
                    {lot ? (
                      <Link href={`/lots/${lot.id}`} className="btn btn--secondary btn--sm btn--block">
                        View listing
                      </Link>
                    ) : (
                      <span className="text-sm text-muted">
                        Online purchase for map plots arrives with the geometry &amp; M1
                        contracts — request it at the park office.
                      </span>
                    )}
                    <Link
                      href={`/map?park=${park.id}&plot=${encodeURIComponent(plot.code)}`}
                      className="btn btn--primary btn--sm btn--block"
                    >
                      View on the park map
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

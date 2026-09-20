import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { listLots, type Lot } from "@/lib/api-client/property";
import { lotPhoto } from "@/lib/lot-imagery";
import { lotStatusLabel } from "@/lib/lot-labels";
import {
  parseLotFilters,
  parseLotsSort,
  sectionOf,
  type LotListingItem,
} from "@/lib/lot-listing";
import { PARK_TYPES, parkType } from "@/lib/park-types";
import parksFile from "@/lib/fixtures/property/parks.json";
import { pageMetadata } from "@/lib/seo";
import { LotListing } from "./lot-listing";

export const metadata: Metadata = pageMetadata({
  title: "Memorial lots — Villa Memorial",
  description:
    "Browse the park's plots by park, status and legend type — see availability and the published lot prices, then reserve with the park office.",
  path: "/lots",
});

/**
 * Public lot browse (Module D public face) — a product listing, captain
 * 2026-09-20: "still /lots have lots that doesn't have any images… the filter
 * is in the left side it should be sticky… inspired by amazon product pages,
 * but the theme color is our theme" — plus the two additions that made the
 * filter panel a client-side "Refine lots by" surface.
 *
 * THE SERVER HALF of that split loads and shapes the data once:
 *   · every plot becomes a `LotListingItem` with its photograph resolved
 *     through the ONE imagery rule (lib/lot-imagery.ts) and each card's one
 *     href already decided (the lot's page, or the plot on the park map);
 *   · the filter/sort state is parsed from the query string so the first paint
 *     is the filtered view a shareable URL describes.
 *
 * The client half (./lot-listing.tsx) filters, sorts and mirrors the state back
 * into the URL without a navigation. The frozen `Lot` contract carries no image
 * field — the imagery derivation and its open contract ask are documented in
 * lib/lot-imagery.ts.
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

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
    const pi =
      SEED_PARKS.findIndex((p) => p.id === a.park.id) -
      SEED_PARKS.findIndex((p) => p.id === b.park.id);
    return pi || codeOrder(a.plot.code, b.plot.code);
  });

  const items: LotListingItem[] = rows.map(({ plot, park, lot }) => {
    const type = parkType(plot.typeId);
    const section = lot?.section ?? sectionOf(plot.sectionBlock);
    const photo = lotPhoto({
      plotCode: plot.code,
      section: lot?.section,
      typeId: plot.typeId,
      parkImage: park.image,
    });
    const facts = lot
      ? `Section ${lot.section} · Block ${lot.block} · ${lot.area_sqm} sqm`
      : (plot.sectionBlock ?? "Map plot");
    return {
      key: `${park.id}-${plot.code}`,
      code: plot.code,
      href: lot
        ? `/lots/${lot.id}`
        : `/map?park=${park.id}&plot=${encodeURIComponent(plot.code)}`,
      status: plot.status,
      typeId: type.id,
      typeName: type.name,
      hasLot: lot !== null,
      priceCents: lot?.price_cents ?? null,
      currency: lot?.currency ?? "PHP",
      parkId: park.id,
      parkBranch: park.branch,
      section,
      areaSqm: lot?.area_sqm ?? null,
      facts: lot?.owner_name
        ? `${facts} · Owner: ${lot.owner_name}`
        : plot.owner
          ? `${facts} · Owner: ${plot.owner}`
          : facts,
      photo: {
        src: photo.src,
        srcSet: photo.srcSet,
        width: photo.width,
        height: photo.height,
        caption: photo.caption,
      },
    };
  });

  const parkOptions = SEED_PARKS.map((park) => ({ id: park.id, label: park.name }));
  const statusOptions = PLOT_STATUSES.map((status) => ({
    id: status,
    label: lotStatusLabel(status),
  }));
  const typeOptions = PARK_TYPES.filter((type) => items.some((i) => i.typeId === type.id)).map(
    (type) => ({ id: type.id, label: type.name, color: type.color }),
  );
  const sections = [...new Set(items.map((i) => i.section).filter((s): s is string => s !== null))];

  const initialFilters = parseLotFilters(params, {
    parks: parkOptions.map((p) => p.id),
    statuses: statusOptions.map((s) => s.id),
    types: typeOptions.map((t) => t.id),
    sections,
  });
  const initialSort = parseLotsSort(
    typeof params.sort === "string" ? params.sort : undefined,
  );

  const availableCount = items.filter((item) => item.status === "available").length;

  return (
    <>
      {/* A compact head, not a photographic hero: the listing's own cards carry
          every picture, and a 660px hero pushed the filters and results below
          the fold ("answer at a glance", captain 2026-09-18). */}
      <section className="page-hero lot-hero">
        <p className="eyebrow-label">Memorial lots</p>
        <h1 className="page-hero__title">Find a place of rest</h1>
        <p className="page-hero__lead">
          Every plot, pictured — with its type, status and price where published.
        </p>
        <p className="lot-hero__facts">
          {availableCount} available · {items.length} plots · {SEED_PARKS.length} parks
        </p>
        <div className="lot-hero__actions">
          <Link href="/map" className="btn btn--primary">
            Walk the park map
          </Link>
          <Link href="/lots/price-list-2026" className="btn btn--secondary">
            2026 price list
          </Link>
        </div>
      </section>

      <LotListing
        items={items}
        parks={parkOptions}
        statuses={statusOptions}
        types={typeOptions}
        sections={sections}
        initialFilters={initialFilters}
        initialSort={initialSort}
      />
    </>
  );
}

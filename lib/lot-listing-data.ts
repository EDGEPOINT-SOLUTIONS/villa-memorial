/**
 * Lot listing shaping — the server half of the public lot browse, in ONE place.
 *
 * The captain's 2026-09-21 direction makes the Lots listing a tab of the park
 * page (`/map?tab=lots`) while the `/lots/[id]` and `/lots/price-list-2026`
 * routes stay (review confirmation). Both surfaces must therefore shape the
 * SAME records identically: every plot becomes a `LotListingItem` with its
 * photograph resolved through the ONE imagery rule (lib/lot-imagery.ts), and
 * the filter options derive from those rows.
 *
 * The client half (app/(public)/lots/lot-listing.tsx) filters, sorts and mirrors
 * state into the URL without a navigation; it never re-shapes a record.
 */
import type { Lot } from "@/lib/api-client/property";
import { lotPhoto } from "@/lib/lot-imagery";
import { lotStatusLabel } from "@/lib/lot-labels";
import { LOT_FAMILY_BY_SECTION } from "@/lib/catalog-sources";
import { lotFamilyMonthlyPrice } from "@/lib/monthly-pricing";
import type { LotCategory } from "@/lib/pricing-model";
import { sectionOf, type LotListingItem } from "@/lib/lot-listing";
import { PARK_TYPES, parkType } from "@/lib/park-types";
import parksFile from "@/lib/fixtures/property/parks.json";

export const PLOT_STATUSES = ["available", "reserved", "sold", "occupied"] as const;

type SeedPlot = {
  code: string;
  lot_id: string | null;
  status: string;
  owner?: string;
  typeId?: string;
  sectionBlock?: string;
};

type SeedPark = { id: string; name: string; branch: string; image: string; plots: SeedPlot[] };

export const SEED_PARKS: SeedPark[] = (parksFile as { parks: SeedPark[] }).parks;

function codeOrder(a: string, b: string): number {
  const na = parseInt(a.split("-")[1] ?? "0", 10);
  const nb = parseInt(b.split("-")[1] ?? "0", 10);
  return na - nb || a.localeCompare(b);
}

export type LotListingData = {
  items: LotListingItem[];
  parks: Array<{ id: string; label: string }>;
  statuses: Array<{ id: string; label: string }>;
  types: Array<{ id: string; label: string; color: string }>;
  sections: string[];
};

/** Shapes every park plot + live lot record into the listing's rows and options.
 *
 * `lotCategories` is the CURRENT pricing store's lot families: every linked lot
 * derives its monthly-first price from its section's family through
 * lib/monthly-pricing.ts (the same sheet binding lib/catalog-sources.ts pins),
 * so the card, the lot detail page and the price list can never print different
 * numbers. An empty list leaves every `monthly` null — the cards then keep their
 * honest fallback rather than a guessed figure. */
export function buildLotListing(
  lots: Lot[],
  lotCategories: ReadonlyArray<LotCategory> = [],
): LotListingData {
  const byLotId = new Map(lots.map((lot) => [lot.id, lot]));

  const rows = SEED_PARKS.flatMap((park) =>
    park.plots.map((plot) => ({ plot, park, lot: plot.lot_id ? byLotId.get(plot.lot_id) ?? null : null })),
  ).sort((a, b) => {
    const pi = SEED_PARKS.findIndex((p) => p.id === a.park.id) - SEED_PARKS.findIndex((p) => p.id === b.park.id);
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
    const family = section ? LOT_FAMILY_BY_SECTION[section.toUpperCase()] : undefined;
    // Only a LINKED lot carries a published family price. A map-only plot has no
    // Lot record (the office quotes per plot), so `monthly` stays null and the
    // card keeps its honest "Price on request" state.
    const monthly = lot && family ? lotFamilyMonthlyPrice(lotCategories, family) : null;
    const contractPriceCents = lot?.price_cents ?? null;
    // The card leads with the monthly when the pricing store prices the section, so the
    // filter/sort figure must be that monthly (in centavos) — not the contract total.
    const leadPriceCents = monthly ? monthly.monthly * 100 : contractPriceCents;
    return {
      key: `${park.id}-${plot.code}`,
      code: plot.code,
      href: lot ? `/lots/${lot.id}` : `/map?park=${park.id}&plot=${encodeURIComponent(plot.code)}`,
      status: plot.status,
      typeId: type.id,
      typeName: type.name,
      hasLot: lot !== null,
      leadPriceCents,
      contractPriceCents,
      currency: lot?.currency ?? "PHP",
      parkId: park.id,
      parkBranch: park.branch,
      section,
      areaSqm: lot?.area_sqm ?? null,
      monthly,
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

  const parks = SEED_PARKS.map((park) => ({ id: park.id, label: park.name }));
  const statuses = PLOT_STATUSES.map((status) => ({ id: status, label: lotStatusLabel(status) }));
  const types = PARK_TYPES.filter((type) => items.some((item) => item.typeId === type.id)).map((type) => ({
    id: type.id,
    label: type.name,
    color: type.color,
  }));
  const sections = [...new Set(items.map((item) => item.section).filter((s): s is string => s !== null))];

  return { items, parks, statuses, types, sections };
}

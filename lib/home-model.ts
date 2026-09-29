/**
 * home-model.ts — the public home's DERIVED data, server-safe and pure.
 *
 * The approved home-rebuild plan (2026-09-29) renders seven sections whose
 * numbers are never authored in content: the arrangement builder's options, the
 * plan tiers, the service tiles, the lot types and the pinned park map all read
 * the stores that own them. This module is the ONE join, so the page component
 * stays markup and the editor can preview the same shapes the public page
 * renders.
 *
 * WHAT IT DOES
 *   · `homeBuilderModel` — the mini builder's radio/checkbox options, priced
 *     from the builder catalogue (the live catalogue joined to the 2026 sheet):
 *     casket models, the preparation-day ladder, the three-day chapel choices
 *     with the sheet's ₱1,000 miscellaneous fee added, and the five services.
 *   · `lotRowFor` — the pricing-store row a lot tile binds to (family + product),
 *     with its area, regular and senior figures and the sheet's six-year term.
 *   · `homeLotInventory` — every RECORDED plot in the park fixture, at its own
 *     outline centroid (the map coordinate space is 0–100), coloured by the live
 *     lot status. No coordinate is invented: the pin IS the plot's own outline.
 *   · `homeMapEmbed` — the Google embed URL: the official Embed API when a key
 *     is configured, otherwise the keyless classic embed the plan uses. The app
 *     holds no coordinates for the park, so both forms pin the client's recorded
 *     address, and the editor says so.
 *
 * NO AMOUNT IS EVER TYPED HERE. Every figure comes from `lib/villa-pricing.ts`,
 * the pricing store or the live catalogue, in integer minor units (centavos).
 */

import type { LotPriceRow } from "@/lib/pricing-model";
import { LOT_AMORTIZATION_MONTHS, type LotCategory } from "@/lib/pricing-model";
import type { Lot } from "@/lib/api-client/property";
import { CHAPEL_MISC_FEE, CHAPEL_RATES, php } from "@/lib/villa-pricing";
import type {
  HomeBuilderSection,
  HomeLotTile,
} from "@/lib/api-client/landing";
import type { BuilderCatalog } from "@/lib/service-builder";
import parksFile from "@/lib/fixtures/property/parks.json";

const cents = (pesos: number): number => Math.round(pesos * 100);

/* ------------------------------- the builder ------------------------------- */

export type HomeBuilderChoice = {
  id: string;
  label: string;
  /** A supporting line (the chapel's "₱4,500 + ₱1,000 fee"), or null. */
  detail: string | null;
  /** Integer minor units; 0 means "no figure" (the office advises / not needed). */
  amountCents: number;
  /** The plan's own starting selection. */
  initial: boolean;
};

export type HomeBuilderModel = {
  caskets: HomeBuilderChoice[];
  days: HomeBuilderChoice[];
  chapels: HomeBuilderChoice[];
  services: HomeBuilderChoice | null;
};

/** "3 days" → "Three days"; a day count outside 1–10 keeps its numeral. */
const DAY_WORDS: Readonly<Record<number, string>> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
};

function dayLabel(days: number): string {
  const word = DAY_WORDS[days];
  return word ? `${word} days` : `${days} days`;
}

/**
 * The mini builder's options from the approved section + the builder catalogue.
 * Missing live rows degrade honestly: a model the catalogue no longer carries is
 * skipped (its option disappears) rather than printed at a stale figure.
 */
export function homeBuilderModel(
  section: HomeBuilderSection,
  catalog: BuilderCatalog,
): HomeBuilderModel {
  const byModel = new Map(catalog.caskets.map((casket) => [casket.model, casket]));
  const caskets: HomeBuilderChoice[] = section.casketModels
    .map((model, index): HomeBuilderChoice | null => {
      const row = byModel.get(model);
      if (!row) return null;
      return {
        id: `casket-${row.model}`,
        label: row.model,
        detail: null,
        amountCents: row.priceCents,
        initial: index === 0,
      };
    })
    .filter((choice): choice is HomeBuilderChoice => choice !== null);
  // The plan's own escape hatch, always present.
  caskets.push({
    id: "casket-office",
    label: "I would rather the office advised me",
    detail: null,
    amountCents: 0,
    initial: false,
  });

  const byDays = new Map(catalog.embalming.map((row) => [row.days, row]));
  const days: HomeBuilderChoice[] = section.preparationDays
    .map((daysCount): HomeBuilderChoice | null => {
      const row = byDays.get(daysCount);
      if (!row) return null;
      return {
        id: `days-${daysCount}`,
        label: dayLabel(daysCount),
        detail: null,
        amountCents: row.priceCents,
        initial: daysCount === 5,
      };
    })
    .filter((choice): choice is HomeBuilderChoice => choice !== null);
  if (!days.some((choice) => choice.initial) && days.length > 0) {
    days[0].initial = true;
  }

  const chapels: HomeBuilderChoice[] = [
    { id: "chapel-none", label: "Not needed", detail: null, amountCents: 0, initial: true },
  ];
  if (section.includeChapel) {
    const threeDay = CHAPEL_RATES.find((row) => row.days === 3);
    if (threeDay) {
      chapels.push({
        id: "chapel-common",
        label: "Common chapel, three days",
        detail: `${php(threeDay.common.regular)} + ${php(CHAPEL_MISC_FEE)} fee`,
        amountCents: cents(threeDay.common.regular + CHAPEL_MISC_FEE),
        initial: false,
      });
      chapels.push({
        id: "chapel-private",
        label: "Private chapel, three days",
        detail: `${php(threeDay.private.regular)} + ${php(CHAPEL_MISC_FEE)} fee`,
        amountCents: cents(threeDay.private.regular + CHAPEL_MISC_FEE),
        initial: false,
      });
    }
  }

  const services: HomeBuilderChoice | null = section.includeServices
    ? {
        id: "five-services",
        label: catalog.services.map((service) => service.label).join(", "),
        detail: null,
        amountCents: catalog.servicesSheetTotalCents,
        initial: false,
      }
    : null;

  return { caskets, days, chapels, services };
}

/* ------------------------------ the lot tiles ------------------------------ */

/** The pricing-store row a lot tile binds to, with the sheet's own term. */
export type HomeLotRow = {
  /** The family caption ("Lot only") — what the row's own family is called. */
  familyCaption: string;
  product: string;
  area: number;
  selling: number;
  monthly: number;
  seniorMonthly: number;
  /** The sheet's recorded amortization term in months (72). */
  termMonths: number;
};

/**
 * A specific product row inside a pricing-store lot family, or null when the
 * family or row has gone (the tile then renders text without a figure — never a
 * stale one).
 */
export function lotRowFor(
  lotCategories: ReadonlyArray<LotCategory>,
  tile: Pick<HomeLotTile, "category" | "product">,
): HomeLotRow | null {
  const family = lotCategories.find((c) => c.title === tile.category);
  const row: LotPriceRow | undefined = family?.rows.find((r) => r.product === tile.product);
  if (!family || !row) return null;
  return {
    familyCaption: family.caption,
    product: row.product,
    area: row.area,
    selling: row.regular.selling,
    monthly: row.regular.monthly,
    seniorMonthly: row.senior.monthly,
    termMonths: LOT_AMORTIZATION_MONTHS,
  };
}

/* --------------------------- the pinned park map --------------------------- */

export type HomeLotState = "available" | "reserved" | "sold";

/** A recorded plot, pinned at its own outline centroid on the masterplan. */
export type HomePlotPin = {
  code: string;
  /** The park's own section label ("B · 1"). */
  section: string;
  status: string;
  state: HomeLotState;
  owner: string | null;
  /** Percent of the map image (the park coordinate space is 0–100). */
  x: number;
  y: number;
};

export type HomeLotGroup = {
  tile: HomeLotTile;
  plots: HomePlotPin[];
};

type RawPlot = {
  id: string;
  code: string;
  lot_id: string | null;
  status: string;
  outline: number[][];
  owner?: string;
  sectionBlock?: string;
  typeId?: string;
};

type RawPark = { id: string; plots: RawPlot[] };

const VILLA = (parksFile as { parks: RawPark[] }).parks.find((park) => park.id === "villa");

/** The recorded legend type → the lot product it prices as. */
const TYPE_PRODUCT: Readonly<Record<string, string>> = {
  "lt-premium": "Premium Lots",
  "lt-primary": "Prime Lots",
  "lt-niches": "Garden Niches",
  "lt-garden": "Garden Niches",
  "lt-mausoleum": "Mausoleum",
};

function stateOf(status: string): HomeLotState {
  if (status === "available") return "available";
  if (status === "reserved") return "reserved";
  // occupied / maintenance are drawn as not-available; the store seeds only the
  // three states the plan names, so this is the honest catch-all.
  return "sold";
}

/**
 * Every RECORDED plot in the park fixture, grouped under the lot tile it prices
 * as. The live lot record owns status and owner; the plot's own record is the
 * fallback. Pure: the same lots in give the same groups out.
 */
export function homeLotInventory(
  lots: ReadonlyArray<Lot>,
  tiles: ReadonlyArray<HomeLotTile>,
): HomeLotGroup[] {
  const liveById = new Map(lots.map((lot) => [lot.id, lot]));
  const groups: HomeLotGroup[] = tiles.map((tile) => ({ tile, plots: [] }));
  const groupByProduct = new Map(groups.map((group) => [group.tile.product, group]));

  for (const plot of VILLA?.plots ?? []) {
    const product = plot.typeId ? TYPE_PRODUCT[plot.typeId] : undefined;
    const group = product ? groupByProduct.get(product) : undefined;
    if (!group) continue;
    const live = plot.lot_id ? liveById.get(plot.lot_id) : undefined;
    const status = live?.status ?? plot.status;
    const owner = live?.owner_name ?? plot.owner ?? null;
    const points = plot.outline;
    if (points.length === 0) continue;
    const x = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const y = points.reduce((sum, point) => sum + point[1], 0) / points.length;
    group.plots.push({
      code: plot.code,
      section: plot.sectionBlock ?? plot.code,
      status,
      state: stateOf(status),
      owner,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
  }
  return groups;
}

/** The park's recorded plot count across every tile (the map's own scale note). */
export function recordedPlotCount(groups: ReadonlyArray<HomeLotGroup>): number {
  return groups.reduce((sum, group) => sum + group.plots.length, 0);
}

/* ------------------------------ the map embed ------------------------------ */

export type HomeMapEmbed = {
  /** "key" = the official Embed API; "classic" = the keyless embed the plan uses. */
  mode: "key" | "classic";
  src: string;
};

/**
 * The Google embed URL for the park.
 *
 * The app holds NO coordinates for the park: both forms pin the address the
 * office recorded in the landing document, and the editor says so. With no key
 * this is exactly the plan's keyless classic embed; with one it is Google's
 * official Embed API place query.
 */
export function homeMapEmbed(key: string | null, address: string): HomeMapEmbed {
  const query = encodeURIComponent(address.trim());
  if (key && key.trim().length > 0) {
    return {
      mode: "key",
      src: `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
        key.trim(),
      )}&q=${query}&zoom=15`,
    };
  }
  return {
    mode: "classic",
    src: `https://www.google.com/maps?q=${query}&z=15&output=embed`,
  };
}

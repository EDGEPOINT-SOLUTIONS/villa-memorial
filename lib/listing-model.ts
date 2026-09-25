/**
 * The generic half of a storefront listing's filter + sort model.
 *
 * Every listing (`/lots`, `/products`, and the surfaces that follow) needs the
 * same small decisions: read a comma-separated list out of the query string,
 * drop ids the catalogue does not know, parse a peso bound into integer
 * centavos, clamp a reversed range, and draw a few price bands from the real
 * published figures. They are here so the listings cannot drift apart and
 * cannot each invent their own edge-case handling.
 *
 * WHAT IS NOT HERE: any listing's own fields, groups or matching. Those stay in
 * the listing's own module (`lib/lot-listing.ts`, `lib/casket-listing.ts`),
 * because the domain owns what a "collection" or a "section" is. This module
 * only carries the shapes every listing agrees on.
 */
import { formatMinorUnits } from "@/lib/money";

/** A query value that may be one string or several, comma-joined → trimmed list. */
export function tokenList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Keep the values the catalogue knows, deduplicated, in the caller's order. */
export function uniqueKnown(values: string[], known: readonly string[]): string[] {
  return [...new Set(values)].filter((v) => known.includes(v));
}

/** Pesos (digits only) → integer centavos; anything unparseable is null (an
 *  open bound), never a guessed amount. */
export function parsePesoCents(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const cents = Number(digits) * 100;
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

/** A single query-string peso bound, or null when absent / repeated / unparseable. */
export function parsePesoBound(value: string | string[] | undefined): number | null {
  if (value === undefined || Array.isArray(value)) return null;
  return parsePesoCents(value);
}

/** A reversed range is a typo, not an empty result set — swap it. */
export function orderedPesoBounds(
  min: number | null,
  max: number | null,
): [number | null, number | null] {
  return min !== null && max !== null && min > max ? [max, min] : [min, max];
}

export type PriceBand = {
  id: string;
  label: string;
  minCents: number | null;
  maxCents: number | null;
};

/**
 * Up to three quick price bands whose boundaries are terciles of the DISTINCT
 * published figures themselves — never an invented amount. Fewer than two
 * distinct prices means no bands at all (there is nothing to divide).
 */
export function priceBandsFrom(prices: number[], currency: string): PriceBand[] {
  const sorted = [...new Set(prices)].sort((a, b) => a - b);
  if (sorted.length < 2) return [];
  const first = sorted[Math.floor(sorted.length / 3)];
  const second = sorted[Math.floor((2 * sorted.length) / 3)];
  if (first === undefined || second === undefined) return [];
  const fmt = (cents: number) => formatMinorUnits(cents, currency);
  const bands: PriceBand[] = [
    { id: "under", label: `Up to ${fmt(first)}`, minCents: null, maxCents: first },
  ];
  if (second > first) {
    bands.push({
      id: "between",
      label: `${fmt(first)} – ${fmt(second)}`,
      minCents: first,
      maxCents: second,
    });
  }
  bands.push({
    id: "over",
    label: `${fmt(second)} and up`,
    minCents: second,
    maxCents: null,
  });
  return bands;
}

/**
 * Typed read for the public digital-memorial surface (F-04).
 *
 * ⚠ PROVISIONAL — the digital-memorial service does not exist and no contract
 * under `docs/08-delivery/contracts/` names a memorial record. `memorialsLiveModeEnabled()`
 * is therefore ALWAYS false: there is no live branch to claim, and no flag may
 * pretend one exists. Fixture mode serves `lib/fixtures/memorials/memorials.json`
 * — the recorded state, in which NO memorial is published (see the file's
 * provenance: the demo family has chosen no visibility).
 *
 * PRIVACY IS A READER RULE, not a page rule: `memorialsFromFile` validates every
 * record field by field and DROPS any record whose visibility is anything other
 * than `published` (a private, family-only or undecided record never becomes a
 * `PublishedMemorial`, so no page can render it by accident). Malformed published
 * records throw a 500 rather than surfacing half-shaped state.
 *
 * The search never lists an empty query (`matchMemorials` in `lib/memorials.ts`),
 * so this module cannot be used as a directory even if a store grows.
 */
import memorialsFile from "@/lib/fixtures/memorials/memorials.json";
import { ApiError } from "@/lib/api-client/api-error";
import {
  isMemorialVisibility,
  type MemorialLifeDates,
  type MemorialPhoto,
  type MemorialRestingPlace,
  type PublishedMemorial,
} from "@/lib/memorials";

/**
 * No digital-memorial service or contract exists; fixture mode is the only mode.
 * (Commission precedent: a `not wired` function that lies about a future flag is
 * worse than saying plainly that there is no live branch.)
 */
export function memorialsLiveModeEnabled(): boolean {
  return false;
}

function malformed(what: string): never {
  throw new ApiError(`malformed memorials fixture: ${what}`, 500);
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) malformed(what);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean === "" ? null : clean;
}

function optionalYear(value: unknown, what: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) malformed(what);
  return value;
}

function toLifeDates(raw: unknown): MemorialLifeDates {
  const r = record(raw, "life_dates");
  const from = optionalYear(r.from, "life_dates.from");
  const to = optionalYear(r.to, "life_dates.to");
  if (from !== null && to !== null && from > to) malformed("life_dates order");
  return { from, to, display: requiredString(r.display, "life_dates.display") };
}

function toPhoto(raw: unknown): MemorialPhoto | null {
  if (raw === null || raw === undefined) return null;
  const r = record(raw, "photo");
  return {
    src: requiredString(r.src, "photo.src"),
    alt: requiredString(r.alt, "photo.alt"),
  };
}

function toRestingPlace(raw: unknown): MemorialRestingPlace | null {
  if (raw === null || raw === undefined) return null;
  const r = record(raw, "resting_place");
  return {
    park: requiredString(r.park, "resting_place.park"),
    section: requiredString(r.section, "resting_place.section"),
    lot: requiredString(r.lot, "resting_place.lot"),
  };
}

function toRemembrance(raw: unknown): string[] {
  if (!Array.isArray(raw)) malformed("remembrance");
  const lines = raw.map((line, index) => requiredString(line, `remembrance[${index}]`));
  if (lines.length === 0) malformed("remembrance is empty");
  return lines;
}

/**
 * One record → one PublishedMemorial, or null when the family has not published
 * it. Exported for tests: the rule that a non-published record can never become
 * a public shape is proven here, not in a view.
 */
export function memorialsFromFile(raw: unknown): PublishedMemorial[] {
  const file = record(raw, "file");
  const rows = file.memorials;
  if (!Array.isArray(rows)) malformed("memorials");
  const out: PublishedMemorial[] = [];
  for (const row of rows) {
    const r = record(row, "memorial");
    // Privacy floor: only a family-chosen published record may exist publicly.
    if (!isMemorialVisibility(r.visibility) || r.visibility !== "published") continue;
    out.push({
      id: requiredString(r.id, "id"),
      name: requiredString(r.name, "name"),
      life_dates: toLifeDates(r.life_dates),
      remembrance: toRemembrance(r.remembrance),
      photo: toPhoto(r.photo),
      resting_place: toRestingPlace(r.resting_place),
      published_on: optionalString(r.published_on),
    });
  }
  return out;
}

/** The published memorials the public surface may serve (fixture mode). */
export function publishedMemorials(): PublishedMemorial[] {
  return memorialsFromFile(memorialsFile);
}

/** The seam the screens call, so a future store/live read can replace it. */
export async function loadPublishedMemorials(): Promise<PublishedMemorial[]> {
  return publishedMemorials();
}

/**
 * One published memorial by its URL segment. Unknown ids and ids whose family
 * did not publish resolve to the SAME null — the page renders one uniform
 * answer, so nothing on the public side can confirm that a private memorial
 * exists. `decodeURIComponent` is guarded: a malformed escape is simply unknown.
 */
export function findPublishedMemorial(id: string): PublishedMemorial | null {
  let clean = id.trim();
  try {
    clean = decodeURIComponent(clean).trim();
  } catch {
    return null;
  }
  if (clean.length === 0) return null;
  return publishedMemorials().find((memorial) => memorial.id === clean) ?? null;
}

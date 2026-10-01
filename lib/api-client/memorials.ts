/**
 * Typed read for the public digital-memorial surface (F-04).
 *
 * ⚠ PROVISIONAL — the digital-memorial service does not exist and no contract
 * under `docs/08-delivery/contracts/` names a memorial record. `memorialsLiveModeEnabled()`
 * is therefore ALWAYS false: there is no live branch to claim, and no flag may
 * pretend one exists.
 *
 * THE FAMILY'S SWITCH IS THE READER'S GATE. This module composes three recorded
 * sources into the ONE public shape a page may render:
 *   · the family household (`lib/api-client/family.ts`) — the loved one's name,
 *     life dates and lot;
 *   · the consent store (`lib/api-client/memorial-store.ts`) — the one switch and
 *     the per-field choices, default OFF;
 *   · the private portrait store (`lib/family-image-store.ts`) — read only for a
 *     person whose family allowed the photograph.
 *
 * A person whose switch is off NEVER becomes a `PublishedMemorial`, so no page
 * can render one by accident. A field the family did not choose is dropped here:
 * the name is always carried when the switch is on, and the photograph, the birth
 * year, the death year and the lot each appear only when chosen. Hiding a year
 * also makes it unsearchable (`matchMemorials` reads the built record), so a
 * hidden date cannot leak through the search.
 *
 * The search never lists an empty query (`matchMemorials` in `lib/memorials.ts`),
 * so this module cannot be used as a directory even as the store grows.
 */
import { liveModeEnabled } from "@/lib/live-mode";
import { getFamilyHousehold, type FamilyPerson } from "@/lib/api-client/family";
import { readFamilyImage } from "@/lib/family-image-store";
import { readMemorialConsents } from "@/lib/api-client/memorial-store";
import {
  MEMORIAL_CONSENT_DEFAULT,
  memorialLifeDatesDisplay,
  parseLifeDatesYears,
  type MemorialConsent,
  type MemorialConsentRecord,
  type MemorialPhoto,
  type PublishedMemorial,
} from "@/lib/memorials";

/**
 * No digital-memorial service or contract exists; fixture mode is the only mode.
 * (Commission precedent: a `not wired` function that lies about a future flag is
 * worse than saying plainly that there is no live branch.)
 */
export function memorialsLiveModeEnabled(): boolean {
  // No digital-memorial service or contract exists: the switch is declared in
  // lib/live-mode.ts (state "none") and cannot enter live mode.
  return liveModeEnabled("memorials");
}

/** The public URL of a published portrait, versioned so a change refreshes it. */
export function memorialPhotoHref(personId: string, version: string | null): string {
  const base = `/api/memorials/${encodeURIComponent(personId)}/photo`;
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

/**
 * One loved one + their consent → one public memorial, or null when the switch
 * is off. Pure: the caller passes the records, so the rule "nothing is published
 * by default" is proven here, not in a view.
 */
export function buildPublishedMemorial(input: {
  id: string;
  name: string;
  /** The office record's own life-dates display, e.g. "1948 – 2026". */
  lifeDatesDisplay: string;
  consent: MemorialConsent;
  /** The resting place from the office record; the consent decides if it shows. */
  restingPlace: { park: string; section: string; lot: string; plot?: string | null } | null;
  /** The family's published photograph, already resolved; consent decides if it shows. */
  photo: MemorialPhoto | null;
  publishedOn: string | null;
}): PublishedMemorial | null {
  if (!input.consent.visible) return null;
  const years = parseLifeDatesYears(input.lifeDatesDisplay);
  const from = input.consent.show_birth ? years.from : null;
  const to = input.consent.show_death ? years.to : null;
  return {
    id: input.id,
    name: input.name,
    life_dates: { from, to, display: memorialLifeDatesDisplay(from, to) },
    remembrance: [],
    photo: input.consent.show_photo ? input.photo : null,
    resting_place: input.consent.show_lot ? input.restingPlace : null,
    published_on: input.publishedOn,
  };
}

/** The default record for a loved one the family has never saved a choice for. */
function defaultRecord(personId: string): MemorialConsentRecord {
  return { ...MEMORIAL_CONSENT_DEFAULT, person_id: personId, owner_user_id: null, updated_at: null };
}

/**
 * The family's published portrait for one person, or null. The private store is
 * read only when the family allowed the photograph AND a record names the owner;
 * any read failure is treated as "no photograph" rather than taking the whole
 * public surface down.
 */
async function publishedPhoto(
  person: FamilyPerson,
  consent: MemorialConsentRecord,
): Promise<MemorialPhoto | null> {
  if (!consent.show_photo || !consent.owner_user_id) return null;
  try {
    const stored = await readFamilyImage(consent.owner_user_id, "portrait", person.id);
    if (!stored) return null;
    return { src: memorialPhotoHref(person.id, stored.updated_at), alt: person.name };
  } catch {
    return null;
  }
}

/** The resting place as the office record carries it (the consent gates it). */
function restingPlaceOf(person: FamilyPerson) {
  if (!person.lot) return null;
  return {
    park: person.lot.park,
    section: person.lot.section,
    lot: person.lot.lot_number,
    plot: person.lot.plot_code ?? null,
  };
}

/**
 * The published memorials the public surface may serve. A household read plus the
 * consent store; only a switched-on person becomes a public shape.
 */
export async function loadPublishedMemorials(): Promise<PublishedMemorial[]> {
  const household = await getFamilyHousehold();
  const consents = await readMemorialConsents();
  const byPerson = new Map(consents.map((record) => [record.person_id, record]));
  const out: PublishedMemorial[] = [];
  for (const person of household.people) {
    const consent = byPerson.get(person.id) ?? defaultRecord(person.id);
    if (!consent.visible) continue;
    const photo = await publishedPhoto(person, consent);
    const memorial = buildPublishedMemorial({
      id: person.id,
      name: person.name,
      lifeDatesDisplay: person.life_dates,
      consent,
      restingPlace: restingPlaceOf(person),
      photo,
      publishedOn: consent.updated_at ? consent.updated_at.slice(0, 10) : null,
    });
    if (memorial) out.push(memorial);
  }
  return out;
}

/**
 * One published memorial by its URL segment. Unknown ids and ids whose family did
 * not switch the memorial on resolve to the SAME null — the page renders one
 * uniform answer, so nothing on the public side can confirm that a private
 * memorial exists. `decodeURIComponent` is guarded: a malformed escape is simply
 * unknown.
 */
export async function findPublishedMemorial(id: string): Promise<PublishedMemorial | null> {
  let clean = id.trim();
  try {
    clean = decodeURIComponent(clean).trim();
  } catch {
    return null;
  }
  if (clean.length === 0) return null;
  const all = await loadPublishedMemorials();
  return all.find((memorial) => memorial.id === clean) ?? null;
}


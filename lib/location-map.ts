/**
 * Public location & directions — the ONE home for how Villa Memorial maps to
 * the world (client's minutes of meeting, 2026-09-21, item 6: "Integrate a map
 * showing the location of Villa Memorial… Include address and navigation
 * assistance. Ensure the map location is accurate and approved by the client.").
 *
 * WHAT THIS IS
 * The two addresses the client's own 2026 Purchase Application Form letterhead
 * prints — the main office and the park — read from the landing content
 * document's `contact` region (`lib/api-client/landing.ts`; staff-editable at
 * `/staff/landing`, zone 01), plus the provider URLs that open an address in the
 * visitor's OWN maps app. It carries no rendering.
 *
 * WHY A STATIC CARD, NOT AN EMBED
 * An interactive embed is wanted, but the two key-free options both fail the
 * honesty bar here:
 *   · OpenStreetMap's key-free embed needs an approved lat/long; the client has
 *     never approved a pin, and inventing coordinates is exactly what the minutes
 *     ask us not to do;
 *   · Google Maps' key-free `output=embed` geocodes a free-text address on
 *     Google's servers and sets Google's cookies on a bereaved family's browser
 *     — a privacy call this build has no consent surface for.
 * So the spec's documented fallback is exact: a STATIC location card plus a
 * directions action built from the recorded address, honest about what is
 * interactive (`LOCATION_MAP_NOTE` prints on the page). The open client question
 * is recorded in `docs/07-client-villa/open-questions.md` (Track D): confirm the
 * exact pin/coordinates and whether an embedded map is desired once the office
 * approves one.
 *
 * The PARK is the primary destination ("the location of Villa Memorial"); the
 * office is the supporting place. Anything missing (an address the office
 * cleared in the editor) is simply omitted, never faked.
 */
import type { ContactInfo } from "@/lib/api-client/landing";

export type MapProvider = "google" | "apple";

export type LocationPlaceId = "park" | "office";

export type LocationPlace = {
  id: LocationPlaceId;
  label: string;
  address: string;
};

/**
 * The places the public may navigate to, park first. Both come straight from
 * the recorded landing contact region; a blank address is dropped rather than
 * rendered as an empty pin.
 */
export function locationPlaces(
  contact: Pick<ContactInfo, "officeAddress" | "parkAddress">,
): LocationPlace[] {
  const park = contact.parkAddress.trim();
  const office = contact.officeAddress.trim();
  const places: LocationPlace[] = [];
  if (park) places.push({ id: "park", label: "Villa Memorial Park", address: park });
  if (office) places.push({ id: "office", label: "Main office", address: office });
  return places;
}

/** A maps URL that opens turn-by-turn directions to `address`. */
export function directionsUrl(provider: MapProvider, address: string): string {
  const destination = encodeURIComponent(address.trim());
  return provider === "apple"
    ? `https://maps.apple.com/?daddr=${destination}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/** A maps URL that drops a pin on `address` without routing (a plain view). */
export function mapSearchUrl(provider: MapProvider, address: string): string {
  const query = encodeURIComponent(address.trim());
  return provider === "apple"
    ? `https://maps.apple.com/?q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * The honesty line the block prints: the card is not a live map, and the
 * directions action is what carries the visitor to their maps app. One sentence
 * because it is read at a glance.
 */
export const LOCATION_MAP_NOTE =
  "A static location card — the address above is the office's recorded one. Get directions opens it in Google Maps or Apple Maps.";

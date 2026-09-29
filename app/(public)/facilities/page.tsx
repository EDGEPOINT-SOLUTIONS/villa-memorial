import type { Metadata } from "next";
import Link from "next/link";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";
import { servicePageContentFromDocument } from "@/lib/service-content";
import { PARK_PLACE_PHOTOS, compositionThumbSet } from "@/lib/media";
import { CHAPEL_RATES } from "@/lib/villa-pricing";
import { POINTS_OF_INTEREST } from "@/lib/park-3d/masterplan";
import { pageMetadata } from "@/lib/seo";
import { PublicHero } from "@/components/kit";
import { FacilityRooms } from "@/components/villa/facility-rooms";
import { GroundsAtlas, type AtlasArea, type AtlasPhoto } from "@/components/villa/grounds-atlas";

export const metadata: Metadata = pageMetadata({
  title: "Chapels & grounds — Villa Funeraria",
  description:
    "The park's common and private chapels, the garden niches, mausoleum and grounds — and how to ask the office about dates and a quotation.",
  path: "/facilities",
});

// Reads the schedule record and the content store per request — a staff rename
// on /staff/schedule or a copy edit must be what the NEXT visitor sees, never a
// build-time snapshot (same rule as /services and /faq).
export const dynamic = "force-dynamic";

/**
 * Facilities — the rooms and the grounds (approved redesign plan, 2026-09-30).
 *
 * WHAT THIS PAGE IS FOR: a family choosing WHERE the wake is held. The page is
 * therefore a COMPARISON and a place, not a catalogue:
 *
 *   Band 1 · the gateway      — the home's opening grammar: one sentence, the
 *                               24/7 call, "See the rooms", and three facts.
 *   Band 2 · the rooms        — two photo-headed columns carrying the SAME facts
 *                               (capacity · stay · who shares it), so a family
 *                               can decide; one gold "Ask for dates" per room.
 *   Band 3 · the grounds      — an area spotlight: pick a place from the client's
 *                               own masterplan labels and see its photograph.
 *   (no page closing band)    — the shared shell's "Next step" closes the page;
 *                               the deleted band is the plan's D7.
 *
 * WHERE EVERY FACT COMES FROM (nothing is authored here):
 *  · the room NAMES and CAPACITY are the park's own schedule record
 *    (`getChapelSchedule()`) — the SAME record /services and the home publish, so
 *    the three pages cannot name the park differently;
 *  · the class labels are the frozen `CHAPEL_CLASS_LABEL` vocabulary;
 *  · the one line per class is the shared page-document copy (`chapelNotes`), read
 *    from the SAME services document /services renders;
 *  · the 3–9 day stay is DERIVED from the sheet's own rows (`CHAPEL_RATES`);
 *  · the area names are the client masterplan's own labels (`POINTS_OF_INTEREST`),
 *    and the photographs are the client's own place derivatives (`lib/media.ts`);
 *  · the 24/7 line is the staff-editable landing content, like every other call
 *    action on the public site;
 *  · no amount is ever typed here — the page stays Request-for-Quote (captain's
 *    minutes, 2026-09-21, item 5) and every figure has an owning store.
 *
 * HONEST STATE: the park's real chapel names and capacity are still a client
 * question (docs/07-client-villa/open-questions.md); the store carries a labelled
 * placeholder seed. This page publishes the record the rest of the product already
 * publishes and says so in ONE plain provenance line — it invents no name and no
 * figure. With no active chapel, the rooms band prints an honest line instead of
 * an empty grid; a failed schedule read is caught and shows the same line, never a
 * crash. The park map and the 3D walk-through are NOT duplicated here: the grounds
 * band links to them.
 */

/** The sheet's own stay span, DERIVED (first and last day counts it prices). */
const STAYED_DAYS_LABEL = `${CHAPEL_RATES[0].days}–${CHAPEL_RATES[CHAPEL_RATES.length - 1].days} days`;
/** The same span read as a count of days, for the gateway fact ("3–9 day stays"). */
const STAYED_DAYS_SHORT = `${CHAPEL_RATES[0].days}–${CHAPEL_RATES[CHAPEL_RATES.length - 1].days} day`;

type AreaAsset = AtlasPhoto & { caption: string };

/**
 * The client's own photograph of each family-facing masterplan area. Composition
 * derivatives (the photograph-only crops scripts/build-composition-images.mjs
 * publishes, with the marketing tile's logo lock-up and family name removed)
 * where they exist; the client's gallery photographs for the gate and the
 * pavilion, which have no composition derivative. Every source is 3:2-or-wider
 * and is shown WHOLE (`object-fit: contain` in the stage), never re-cropped.
 */
const AREA_ASSETS: Record<string, AreaAsset> = {
  "main-entrance": {
    src: "/media/gallery/park-gate-1024.webp",
    srcSet: "/media/gallery/park-gate-640.webp 640w, /media/gallery/park-gate-1024.webp 1024w",
    width: 1024,
    height: 577,
    alt: "The park's gated entrance and roadside sign, seen from the road",
    caption: "The gated approach, from the road.",
  },
  "premium-lots": {
    src: PARK_PLACE_PHOTOS.premium,
    srcSet: compositionThumbSet(PARK_PLACE_PHOTOS.premium),
    width: 720,
    height: 698,
    alt: "The premium lots in the client's own photograph",
    caption: "The park's frontage lots.",
  },
  "primary-lots": {
    src: PARK_PLACE_PHOTOS.prime,
    srcSet: compositionThumbSet(PARK_PLACE_PHOTOS.prime),
    width: 720,
    height: 619,
    alt: "The primary lots in the client's own photograph",
    caption: "The first garden plots.",
  },
  "garden-lots": {
    src: "/media/gallery/park-pavilion-940.webp",
    srcSet: "/media/gallery/park-pavilion-640.webp 640w, /media/gallery/park-pavilion-940.webp 940w",
    width: 940,
    height: 545,
    alt: "The park's pavilion and grounds in the client's own photograph",
    caption: "Open lawn and planting.",
  },
  "garden-niches": {
    src: PARK_PLACE_PHOTOS.niches,
    srcSet: compositionThumbSet(PARK_PLACE_PHOTOS.niches),
    width: 720,
    height: 619,
    alt: "The garden niches in the client's own photograph",
    caption: "A wall of individual niches.",
  },
  mausoleum: {
    src: PARK_PLACE_PHOTOS.mausoleum,
    srcSet: compositionThumbSet(PARK_PLACE_PHOTOS.mausoleum),
    width: 720,
    height: 619,
    alt: "The park's mausoleum in the client's own photograph",
    caption: "The park's above-ground tombs.",
  },
};

/**
 * The areas the park's own masterplan labels, in the plan's own order (the
 * "Future Development" parcel is land, not a family-facing area, so it is left to
 * the map). An area the client never photographed is simply absent — the atlas
 * names only places it can show.
 */
const PARK_AREAS: ReadonlyArray<AtlasArea> = POINTS_OF_INTEREST.flatMap((area) => {
  if (area.id === "future-development") return [];
  const asset = AREA_ASSETS[area.id];
  if (!asset) return [];
  return [
    {
      id: area.id,
      label: area.label,
      photo: { ...asset, sizes: "(max-width: 48rem) 92vw, 600px" },
      caption: asset.caption,
    },
  ];
});

export default async function FacilitiesPage() {
  const { contact } = await listLandingContent();
  const [servicesPage, schedule] = await Promise.all([
    // The chapel copy is shared with /services, so it is read from the SAME
    // document /services renders — a staff edit reaches both, and the two pages
    // cannot drift.
    getPageDocument("services").catch(() => null),
    getChapelSchedule().catch(() => null),
  ]);
  const chapelNotes = servicePageContentFromDocument(servicesPage).chapelNotes;
  const chapels = schedule?.chapels ?? [];

  return (
    <div className="fac-page container--catalogue">
      {/* Band 1 · the gateway — the home's opening grammar, no photograph (the
          client's park photograph is not on this page: the captain dropped it in
          review, and the grounds band shows the park as PLACES instead). */}
      <PublicHero
        variant="interior"
        eyebrow="Facilities"
        title="The chapels and the grounds"
        lead="Where the wake is held — ask the office for a date."
        primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
        secondary={{ label: "See the rooms", href: "#rooms" }}
      />

      {/* The park at a glance, under a hairline. Every fact is READ: the room
          count and the stay span come from the schedule record and the 2026
          sheet; the grounds line names the client's own place labels. */}
      <ul className="fac-facts" aria-label="The park at a glance">
        <li>
          <strong>Chapels by the day</strong>
          <span>
            {chapels.length
              ? `${chapels.length} room${chapels.length === 1 ? "" : "s"}, quoted for your dates`
              : "Quoted for your dates"}
          </span>
        </li>
        <li>
          <strong>{STAYED_DAYS_SHORT} stays</strong>
          <span>Every date checked before you book</span>
        </li>
        <li>
          <strong>The grounds</strong>
          <span>Niches, mausolea and open lawns</span>
        </li>
      </ul>

      <FacilityRooms
        chapels={chapels}
        chapelNotes={chapelNotes}
        contact={contact}
        stayedDaysLabel={STAYED_DAYS_LABEL}
      />

      <GroundsAtlas
        areas={PARK_AREAS}
        actions={
          <>
            <Link className="btn btn--secondary" href="/map">
              Open the park map &amp; 3D view
            </Link>
            <Link className="btn btn--secondary" href="/map?tab=lots">
              Browse lots &amp; 2026 prices
            </Link>
          </>
        }
      />
    </div>
  );
}

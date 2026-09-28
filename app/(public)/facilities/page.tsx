import type { Metadata } from "next";
import Link from "next/link";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  CHAPEL_SAMPLE_NOTE,
  HERO_IMAGE,
  PARK_PLACE_PHOTOS,
  VILLA_PARK_AERIAL,
  libraryThumb,
  libraryThumbSet,
} from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { POINTS_OF_INTEREST } from "@/lib/park-3d/masterplan";
import { CHAPEL_NOTES } from "@/lib/villa-pricing";
import { CHAPEL_SKUS } from "@/lib/catalogue-skus";
import { buildQuoteHref } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";
import { PublicHero, PublicImage, SectionHead } from "@/components/kit";
import { StoryHelpBand } from "@/components/villa/story-ui";

export const metadata: Metadata = pageMetadata({
  title: "Chapels & grounds — Villa Funeraria",
  description:
    "The park's common and private chapels, the garden niches, mausoleum and grounds — and how to ask the office about dates and a quotation.",
  path: "/facilities",
});

// Reads the content store per request — a staff edit to the 24/7 line must be
// what the NEXT visitor sees, never a build-time snapshot (same rule as /faq).
export const dynamic = "force-dynamic";

/**
 * Facilities (P25 of the screen inventory: "Facilities" had no page — the
 * chapels existed only as rates inside `/services`).
 *
 * WHAT THIS PAGE IS FOR: a family choosing where to hold a wake sees the rooms
 * — the client's own photograph, what each one suits, and the published
 * per-day rate — then the grounds, then one next step per room.
 *
 * WHERE EVERY FACT COMES FROM (nothing is authored here):
 *  · the per-day rates and the sheet's notes are READ from
 *    `lib/villa-pricing.ts` (sheet III: "PRICE LIST FOR 2026 III"), the same
 *    constants `/services` renders — so the two pages cannot drift, and no
 *    amount is ever typed into this view (`tests/unit/facilities-page.test.tsx`
 *    compares both pages' figures);
 *  · the area names are the client masterplan's own labels, read from
 *    `lib/park-3d/masterplan.ts` — never re-typed, so the grounds list and the
 *    park map cannot name the park differently;
 *  · the 24/7 line is the staff-editable landing content (zone 01), like every
 *    other call action on the public site;
 *  · the chapel photographs are the client's own 2026 photographs — the chapel
 *    hall for the common class and a decorated viewing room for the private one
 *    (lib/client-photos.ts). The client's material carries no room name or
 *    capacity, and the sheet's "(Illustration purposes only)" discipline stays on
 *    the cards: neither photograph claims to be the exact room a family gets.
 *
 * HONEST STATES (one short line each, never a placeholder that reads as fact):
 * the park's real chapel names and capacity are still a client question
 * (docs/07-client-villa/open-questions.md), so this page publishes what the
 * sheets publish — two classes, per-day rates — and says plainly that the real
 * list is unconfirmed. It publishes no chapel count, no room name and no
 * capacity figure. The park map and the 3D walk-through are NOT duplicated
 * here: the page links to them.
 *
 * Story-lane pass (2026-09-22, plan §5.8): the page moved onto the Phase 0
 * grammar (`PublicHero` · `SectionHead` · `PublicImage`) and the compact
 * `.story-*` room/ground shapes, so the two rooms, the areas and the two ground
 * photographs read at a glance instead of four phone screens.
 */

/**
 * The two room classes the park sells. `suitedTo` and `sharedWith` describe the
 * class (a common/shared chapel vs a private one) — no capacity and no room name
 * is invented for either. The 2026 rates are no longer displayed (captain's
 * minutes 2026-09-21, item 5): each room asks the office for dates and a quote,
 * and the rate lives with the office (lib/villa-pricing.ts).
 */
const ROOMS = [
  {
    key: "common",
    name: "Common chapel",
    photo: clientPhotoWide("chapel-hall-candle-pedestals"),
    alt: "The chapel hall in the client's own photograph — a draped side table, tall candle pedestals on a green carpet, the hall's platform behind",
    suitedTo: "A large visitation",
    sharedWith: "Other families",
  },
  {
    key: "private",
    name: "Private chapel",
    photo: clientPhotoWide("wake-setup-lamp-alcove"),
    alt: "A decorated private viewing room in the client's own photograph — purple and white drapes, hanging flowers and lit lamp stands",
    suitedTo: "An intimate gathering",
    sharedWith: "Your family only",
  },
] as const;

/**
 * The areas the park's own masterplan labels, in the plan's own words (the
 * "Future Development" parcel is land, not a family-facing area, so it is left
 * to the map).
 */
const PARK_AREAS: ReadonlyArray<string> = POINTS_OF_INTEREST.filter(
  (area) => area.id !== "future-development",
).map((area) => area.label);

/**
 * The client's own product imagery for the two areas a family asks about.
 * Composition pass (2026-09-18): these are the PHOTOGRAPH-ONLY derivatives of the
 * client's lot tiles (scripts/build-composition-images.mjs) rather than the tiles
 * themselves — a tile carries the group's logo lock-up and its family name set
 * large, so publishing it inside a captioned figure printed a second, baked-in
 * title.
 */
const GROUND_AREAS = [
  { src: PARK_PLACE_PHOTOS.niches, label: "Garden niches" },
  { src: PARK_PLACE_PHOTOS.mausoleum, label: "Mausoleum" },
] as const;

export default async function FacilitiesPage() {
  const { contact } = await listLandingContent();

  return (
    <div className="story-page container--catalogue">
      <PublicHero
        variant="interior"
        eyebrow="Facilities"
        title="The chapels and the grounds"
        lead="Where the wake is held — ask the office for a date."
        primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
        secondary={{ label: "See the rooms", href: "#rooms" }}
        image={{
          src: libraryThumb(HERO_IMAGE, 640),
          srcSet: libraryThumbSet(HERO_IMAGE),
          sizes: "(max-width: 48rem) 92vw, 30rem",
          alt: "The park's gated entrance and roadside sign, seen from the road",
          width: 960,
          height: 640,
        }}
      />

      <section className="story-band" id="rooms" aria-labelledby="rooms-title">
        <SectionHead
          id="rooms-title"
          kicker="The rooms"
          title="Common chapel, private chapel"
          lead="Booked by the day, three to nine days."
        />

        <div className="story-rooms">
          {ROOMS.map((room) => (
            <article className="story-room" key={room.key}>
              <div className="story-figure">
                <PublicImage
                  role="band-lead"
                  src={room.photo.src}
                  srcSet={room.photo.srcSet}
                  sizes="(max-width: 60rem) 92vw, 28rem"
                  alt={room.alt}
                  width={room.photo.width}
                  height={room.photo.height}
                />
                <p className="public-image__caption">{CHAPEL_SAMPLE_NOTE}</p>
              </div>
              <h3 className="story-room__name">{room.name}</h3>
              <p className="story-room__suits">
                {room.suitedTo} · shared with {room.sharedWith.toLowerCase()}
              </p>
              {/* One next step per room: ask the office for dates and a quote.
                  The 24/7 number is the staff-editable landing content — never
                  typed into this page. */}
              <div className="story-actions">
                <Link
                  className="btn btn--accent btn--sm"
                  href={buildQuoteHref({
                    item: `Chapel use — ${room.name}`,
                    sku: CHAPEL_SKUS[room.key],
                    note: "Chapel use when the service is not with Villa.",
                  })}
                >
                  <span className="visually-hidden">Ask about the {room.name}: </span>
                  Request a quote
                </Link>
                <a className="btn btn--secondary btn--sm" href={contact.phoneHref}>
                  <span className="visually-hidden">Ask about the {room.name}: </span>
                  Call {contact.phoneDisplay}
                </a>
              </div>
            </article>
          ))}
        </div>

        <ul className="story-areas" aria-label="Chapel conditions">
          <li className="story-area">{CHAPEL_NOTES.scope}</li>
        </ul>

        <p className="fac-placeholder">
          <strong>Room names and capacity are still unconfirmed</strong> — the client has not
          sent the park&rsquo;s real chapel list. Rates and dates are real.
        </p>
      </section>

      <section className="story-band" id="grounds" aria-labelledby="grounds-title">
        <SectionHead
          id="grounds-title"
          kicker="The park and the grounds"
          title="Gardens, niches and open lawns"
          lead="Every area the client&rsquo;s own masterplan labels."
        />

        <div className="story-grounds">
          <div className="story-figure">
            <PublicImage
              role="band-lead"
              src={libraryThumb(VILLA_PARK_AERIAL, 960)}
              srcSet={libraryThumbSet(VILLA_PARK_AERIAL)}
              sizes="(max-width: 60rem) 92vw, 45rem"
              alt="The park's pavilion and grounds, with the client's own banner text over the picture"
              width={960}
              height={640}
            />
            <p className="public-image__caption">The pavilion and the grounds — the client&rsquo;s own photo.</p>
          </div>
          <ul className="story-areas" aria-label="Areas on the masterplan">
            {PARK_AREAS.map((area) => (
              <li className="story-area" key={area}>
                {area}
              </li>
            ))}
          </ul>
        </div>

        <div className="story-ground-grid">
          {GROUND_AREAS.map((area) => (
            <div className="story-ground" key={area.label}>
              <PublicImage
                role="gallery-tile"
                src={area.src.replace("-720", "-480")}
                srcSet={`${area.src.replace("-720", "-480")} 480w, ${area.src} 720w`}
                /* Two columns on a phone and inside the catalogue envelope:
                   each figure is ~46vw. The hint must match that box. */
                sizes="(max-width: 46rem) 46vw, 24vw"
                alt={area.label}
                width={480}
                height={320}
              />
              <p className="story-ground__label">{area.label}</p>
            </div>
          ))}
        </div>

        {/* The map and the 3D park already exist — this page links to them
            instead of drawing a second one (a plot's own status and geometry
            stay on /map). */}
        <div className="story-actions">
          <Link className="btn btn--primary" href="/map">
            Open the park map &amp; 3D view
          </Link>
          <Link className="btn btn--secondary" href="/lots">
            Browse lots &amp; 2026 prices
          </Link>
        </div>
      </section>

      <StoryHelpBand
        contact={contact}
        title="Ask the office for availability"
        text="Any hour, any day — the park holds the dates."
        secondary={
          <Link className="btn btn--secondary" href="/services#chapel">
            Chapel dates &amp; quotes
          </Link>
        }
      />
    </div>
  );
}

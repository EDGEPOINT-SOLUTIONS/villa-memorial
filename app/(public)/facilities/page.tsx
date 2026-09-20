import type { Metadata } from "next";
import Link from "next/link";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  CHAPEL_HALL_PEDESTALS_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  HERO_IMAGE,
  PARK_PLACE_PHOTOS,
  VILLA_PARK_AERIAL,
  WAKESETUP_ALCOVE_IMAGE,
  libraryThumb,
  libraryThumbSet,
} from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { POINTS_OF_INTEREST } from "@/lib/park-3d/masterplan";
import { CHAPEL_NOTES, CHAPEL_RATES, php } from "@/lib/villa-pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Chapels & grounds — Villa Memorial",
  description:
    "The park's common and private chapels with their 2026 per-day rates, the garden niches, mausoleum and grounds — and how to ask the office about dates.",
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
 */

/**
 * The sheet's own per-day chapel rates (row 1 of the 3–9 day schedule carries
 * the per-day figure). Read, never typed — the same source `/services` uses.
 */
const CHAPEL_PER_DAY = {
  common: CHAPEL_RATES[0].common.ratePerDay,
  private: CHAPEL_RATES[0].private.ratePerDay,
} as const;

/**
 * The two room classes the 2026 sheet prices. `suitedTo` and `sharedWith`
 * describe the class the sheet sells (a common/shared chapel vs a private one)
 * — no capacity and no room name is invented for either.
 */
const ROOMS = [
  {
    key: "common",
    name: "Common chapel",
    image: CHAPEL_HALL_PEDESTALS_IMAGE,
    alt: "The chapel hall in the client's own photograph — a draped side table, tall candle pedestals on a green carpet, the hall's platform behind",
    suitedTo: "A large visitation",
    sharedWith: "Other families",
    perDay: CHAPEL_PER_DAY.common,
  },
  {
    key: "private",
    name: "Private chapel",
    image: WAKESETUP_ALCOVE_IMAGE,
    alt: "A decorated private viewing room in the client's own photograph — purple and white drapes, hanging flowers and lit lamp stands",
    suitedTo: "An intimate gathering",
    sharedWith: "Your family only",
    perDay: CHAPEL_PER_DAY.private,
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
 *
 * Composition pass (2026-09-18): these are the PHOTOGRAPH-ONLY derivatives of the
 * client's lot tiles (scripts/build-composition-images.mjs) rather than the tiles
 * themselves. A tile carries the group's logo lock-up and its family name set
 * large, so publishing it inside a figure that already has a caption printed a
 * second title in baked-in marketing type.
 */
const GROUND_AREAS = [
  { src: PARK_PLACE_PHOTOS.niches, label: "Garden niches" },
  { src: PARK_PLACE_PHOTOS.mausoleum, label: "Mausoleum" },
] as const;

export default async function FacilitiesPage() {
  const { contact } = await listLandingContent();

  return (
    <div className="fac-page">
      <section className="hero-premium" aria-labelledby="facilities-title">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Facilities</p>
            <h1 className="hero-premium__title" id="facilities-title">
              The chapels and the grounds
            </h1>
            {/* The page's one-line answer (reading budget, captain 2026-09-18).
                No chapel COUNT is claimed — the park's real list is an open
                client question, so the page sells the sheet's two classes. */}
            <p className="hero-premium__lead">Where the wake is held — and the 2026 rates.</p>
            <div className="hero-premium__actions">
              <a className="btn btn--primary" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
              <Link className="btn btn--secondary" href="#rooms">
                See the rooms
              </Link>
            </div>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded park photo */}
            <img
              src={libraryThumb(HERO_IMAGE, 640)}
              srcSet={libraryThumbSet(HERO_IMAGE)}
              sizes="(max-width: 60rem) 90vw, 30rem"
              alt="The park's gated entrance and roadside sign, seen from the road"
            />
            <figcaption>The park&rsquo;s front gate on the road in.</figcaption>
          </figure>
        </div>
      </section>

      <section className="fac-section" id="rooms" aria-labelledby="rooms-title">
        <p className="fac-section__kicker">The rooms</p>
        <h2 className="fac-section__title" id="rooms-title">
          Common chapel, private chapel
        </h2>
        <p className="fac-section__intro">Booked by the day, three to nine days.</p>

        <div className="fac-rooms">
          {ROOMS.map((room) => (
            <article className="fac-room" key={room.key}>
              <figure className="fac-room__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */}
                <img
                  src={room.image}
                  srcSet={clientPhotoWide(
                    room.key === "common" ? "chapel-hall-candle-pedestals" : "wake-setup-lamp-alcove",
                  ).srcSet}
                  sizes="(max-width: 60rem) 92vw, 40rem"
                  alt={room.alt}
                  loading="lazy"
                />
                {/* The client's own photograph of a room and of a set-up they
                    built — the office confirms which room a family is given. */}
                <figcaption>{CHAPEL_SAMPLE_NOTE}</figcaption>
              </figure>
              <div className="fac-room__body">
                <h3 className="fac-room__name">{room.name}</h3>
                <p className="fac-room__rate">
                  {php(room.perDay)} <span className="fac-room__unit">per day</span>
                </p>
                <dl className="fac-room__facts">
                  <div>
                    <dt>Suited to</dt>
                    <dd>{room.suitedTo}</dd>
                  </div>
                  <div>
                    <dt>Shared with</dt>
                    <dd>{room.sharedWith}</dd>
                  </div>
                  <div>
                    <dt>Stay</dt>
                    <dd>3&ndash;9 days</dd>
                  </div>
                </dl>
                {/* One next step per room: ask the office. The number is the
                    staff-editable 24/7 line — never typed into this page. */}
                <a className="btn btn--primary btn--block fac-room__action" href={contact.phoneHref}>
                  <span className="visually-hidden">Ask about the {room.name}: </span>
                  Call {contact.phoneDisplay} — ask about dates
                </a>
              </div>
            </article>
          ))}
        </div>

        <ul className="fac-facts">
          <li>{CHAPEL_NOTES.scope}</li>
          <li>{CHAPEL_NOTES.miscFee}</li>
          <li>{CHAPEL_NOTES.privateChapelOnly}</li>
        </ul>

        <p className="fac-placeholder">
          <strong>Room names and capacity are still unconfirmed</strong> — the client has not
          sent the park&rsquo;s real chapel list. Rates and dates are real.
        </p>
      </section>

      <section className="fac-section" id="grounds" aria-labelledby="grounds-title">
        <p className="fac-section__kicker">The park and the grounds</p>
        <h2 className="fac-section__title" id="grounds-title">
          Gardens, niches and open lawns
        </h2>
        <p className="fac-section__intro">Every area the client&rsquo;s own masterplan labels.</p>

        <div className="fac-grounds">
          <figure className="fac-grounds__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- client park photo */}
            <img
              src={libraryThumb(VILLA_PARK_AERIAL, 960)}
              srcSet={libraryThumbSet(VILLA_PARK_AERIAL)}
              sizes="(max-width: 60rem) 90vw, 45rem"
              alt="The park's pavilion and grounds, with the client's own banner text over the picture"
              loading="lazy"
            />
            <figcaption>The pavilion and the grounds — the client&rsquo;s own photo.</figcaption>
          </figure>
          <div className="fac-areas">
            <h3 className="fac-areas__heading">On the masterplan</h3>
            <ul className="fac-areas__list">
              {PARK_AREAS.map((area) => (
                <li className="fac-area" key={area}>
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="fac-grounds__grid">
          {GROUND_AREAS.map((area) => (
            <figure className="fac-ground" key={area.label}>
              <div className="fac-ground__media">
                {/* eslint-disable-next-line @next/next/no-img-element -- client lot photograph */}
                <img
                  src={area.src.replace("-720", "-480")}
                  srcSet={`${area.src.replace("-720", "-480")} 480w, ${area.src} 720w`}
                  /* Two columns inside the folio at desktop: each figure is ~48vw
                     (measured 628px at 1440). The old 22rem hint made the browser
                     fetch the 480 file for a 628px slot and upscale it. */
                  sizes="(max-width: 46rem) 92vw, 48vw"
                  alt={area.label}
                  loading="lazy"
                />
              </div>
              <figcaption className="fac-ground__body">
                <h3>{area.label}</h3>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* The map and the 3D park already exist — this page links to them
            instead of drawing a second one (a plot's own status and geometry
            stay on /map). */}
        <div className="row row--wrap">
          <Link className="btn btn--primary" href="/map">
            Open the park map &amp; 3D view
          </Link>
          <Link className="btn btn--secondary" href="/lots">
            Browse lots &amp; 2026 prices
          </Link>
        </div>
      </section>

      <section className="fac-help" aria-labelledby="ask-title">
        <div>
          <h2 id="ask-title">Ask the office for availability</h2>
          <p>Any hour, any day — the park holds the dates.</p>
        </div>
        <div className="fac-help__actions">
          <a className="btn btn--primary" href={contact.phoneHref}>
            Call {contact.phoneDisplay}
          </a>
          <Link className="btn btn--secondary" href="/services#chapel">
            Chapel dates &amp; booking
          </Link>
        </div>
      </section>
    </div>
  );
}

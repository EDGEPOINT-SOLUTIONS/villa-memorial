import type { Metadata } from "next";
import Link from "next/link";
import {
  GALLERY_MASTERPLAN,
  GALLERY_PHOTO_COUNT,
  GALLERY_SET_COUNT,
  GALLERY_TOUR_LINE,
} from "@/lib/gallery";
import { PublicHero, PublicImage } from "@/components/kit";
import { containerClass } from "@/lib/public-layout";
import { pageMetadata } from "@/lib/seo";
import { GalleryListing } from "./gallery-listing";

export const metadata: Metadata = pageMetadata({
  title: "Photo gallery & virtual tour — Villa Funeraria",
  description:
    "The park in the client's own photographs — the entrance, the grounds, the coffins, the carriage and the viewing set-ups — plus one entry to the park map and its 3D walk-through.",
  path: "/gallery",
});

/**
 * Public gallery & virtual-tour entry (screen-inventory "Gallery" / "Virtual
 * Tour", F-03) — rebuilt to the approved plan (captain, 2026-09-30).
 *
 * Band 1 is the home's gateway grammar, exactly as /services and /map wear it:
 * a plain centred opening with a visible h1, one short lead and two actions,
 * then the gallery's own facts under a hairline. The photographs lead from Band
 * 2, where they can be large and WHOLE — the client's own 4:3 catalogue crop in
 * a 4:3 frame, never re-cropped. `GalleryListing` owns the set index, the wall
 * and the one viewing interaction.
 *
 * The walk-through is the EXISTING `/map` linked once, and the page adds no
 * second closing band: the shared shell `NextSteps` carries the one call, so
 * the page never prints two.
 */
export default function GalleryPage() {
  return (
    <div className={`${containerClass("catalogue")} gal-page`}>
      <nav className="gal-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-current="page">Gallery &amp; virtual tour</li>
        </ol>
      </nav>

      {/* Band 1 · the opening — the home's gateway grammar. Plain, centred, no
          card and no photograph: the park photographs lead Band 2, large and
          whole, instead of competing with the headline at banner size. */}
      <PublicHero
        variant="interior"
        eyebrow="Villa Memorial Park · Gallery"
        title="See the park before you visit"
        lead="The park in the client's own photographs."
        primary={{ label: "View the photographs", href: "#wall" }}
        secondary={{ label: "Plan a visit", href: "/contact" }}
      />

      <ul className="gal-facts" aria-label="The gallery at a glance">
        <li>
          <strong>{GALLERY_PHOTO_COUNT} photographs</strong>
          <span>the park&rsquo;s own</span>
        </li>
        <li>
          <strong>{GALLERY_SET_COUNT} sets</strong>
          <span>the park · the coffins &amp; carriage · the chapel</span>
        </li>
        <li>
          <strong>No stock photos</strong>
          <span>every picture the park&rsquo;s own</span>
        </li>
      </ul>

      <GalleryListing />

      {/* Band · the walk-through — the one exit. The call lives once, in the
          shell's closing band. */}
      <section className="gal-walk" id="walk" aria-labelledby="walk-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">Virtual tour</p>
          <h2 id="walk-title" className="home-band-head__title">
            Walk the park
          </h2>
          <p className="home-band-head__lead">{GALLERY_TOUR_LINE}</p>
        </div>
        <div className="gal-walk__grid">
          <PublicImage
            role="map"
            className="gal-walk__plan"
            src={GALLERY_MASTERPLAN.src}
            srcSet={GALLERY_MASTERPLAN.srcSet}
            sizes={GALLERY_MASTERPLAN.sizes}
            alt={GALLERY_MASTERPLAN.alt}
            width={GALLERY_MASTERPLAN.width}
            height={GALLERY_MASTERPLAN.height}
            caption={
              <>
                <span className="gal-cap__desc">{GALLERY_MASTERPLAN.caption}</span>{" "}
                <span className="gal-figure__note">{GALLERY_MASTERPLAN.note}</span>
              </>
            }
          />
          <div className="gal-walk__actions">
            <Link className="btn btn--secondary" href="/map">
              Open the park map &amp; 3D walk-through
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

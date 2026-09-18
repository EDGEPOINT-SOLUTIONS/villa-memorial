import type { Metadata } from "next";
import Link from "next/link";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  GALLERY_GROUPS,
  GALLERY_HERO,
  GALLERY_MASTERPLAN,
  GALLERY_PROVENANCE_NOTE,
  GALLERY_TOUR_LINE,
  type GalleryPhoto,
} from "@/lib/gallery";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Photo gallery & virtual tour — Villa Memorial",
  description:
    "The park in the client's own photographs — the entrance, the grounds, the chapels and the viewing set-ups — plus one entry to the park map and its 3D walk-through.",
  path: "/gallery",
});

// Reads the content store per request: the 24/7 line the visit band prints is
// staff-editable, so a phone change must reach the very next visitor.
export const dynamic = "force-dynamic";

/**
 * Public gallery & virtual-tour entry (screen-inventory "Gallery" / "Virtual
 * Tour", F-03).
 *
 * The page shows the park with the client's own uploaded photography — the real
 * park photos, the uploaded viewing set-up and the client sheet's sample
 * photographs (kept labelled "illustration purposes only", exactly as /services
 * labels them). It never rebuilds the walk-through: the one CTA opens the
 * existing /map, where the plain map and the full-screen 3D park live, and the
 * line beside it says plainly which view is which.
 *
 * Every figure is a plain <img> with the generated WebP candidates, explicit
 * pixel dimensions and a reserved aspect ratio (styles/components.css, "gal-*"
 * block), so there is no layout shift and no multi-megabyte original is served.
 * The 24/7 number is read from the staff-editable contact content — never typed.
 */
function GalleryFigure({
  photo,
  variant,
}: {
  photo: GalleryPhoto;
  variant: "hero" | "feature" | "card" | "plan";
}) {
  const eager = variant === "hero";
  return (
    <figure className={`gal-figure gal-figure--${variant}`}>
      <div className="gal-figure__media">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated client-media derivatives */}
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          sizes={photo.sizes}
          width={photo.width}
          height={photo.height}
          alt={photo.alt}
          loading={eager ? "eager" : "lazy"}
          decoding={eager ? "sync" : "async"}
          fetchPriority={eager ? "high" : undefined}
        />
      </div>
      <figcaption>
        <span className="gal-figure__caption">{photo.caption}</span>
        {photo.note ? <span className="gal-figure__note">{photo.note}</span> : null}
      </figcaption>
    </figure>
  );
}

export default async function GalleryPage() {
  const { contact } = await listLandingContent();

  return (
    <div className="gal-page">
      <nav className="gal-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-current="page">Gallery &amp; virtual tour</li>
        </ol>
      </nav>

      <section className="gal-hero" aria-labelledby="gallery-title">
        <div className="gal-hero__grid">
          <div>
            <p className="gal-hero__eyebrow">Villa Memorial Park · Gallery &amp; virtual tour</p>
            <h1 className="gal-hero__title" id="gallery-title">
              See the park before you visit
            </h1>
            {/* The page's one-line answer (reading budget, captain 2026-09-18). */}
            <p className="gal-hero__lead">Photographs of the park, and a way to walk it.</p>
            <div className="gal-hero__actions">
              <a className="btn btn--primary" href="#walk">
                Walk the park
              </a>
              <Link className="btn btn--secondary" href="/contact">
                Plan a visit
              </Link>
            </div>
          </div>
          <GalleryFigure photo={GALLERY_HERO} variant="hero" />
        </div>
      </section>

      {GALLERY_GROUPS.map((group) => {
        const single = group.photos.length === 1;
        return (
          <section
            className="gal-group"
            id={group.id}
            key={group.id}
            aria-labelledby={`${group.id}-title`}
          >
            <div className="gal-group__head">
              <p className="gal-group__kicker">{group.kicker}</p>
              <h2 className="gal-group__title" id={`${group.id}-title`}>
                {group.heading}
              </h2>
              <p className="gal-group__intro">{group.intro}</p>
            </div>
            <div className={single ? "gal-feature" : "gal-cards"}>
              {group.photos.map((photo) => (
                <GalleryFigure
                  key={photo.src}
                  photo={photo}
                  variant={single ? "feature" : "card"}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="gal-provenance">{GALLERY_PROVENANCE_NOTE}</p>

      <section className="gal-walk" id="walk" aria-labelledby="walk-title">
        <div className="gal-walk__grid">
          <div>
            <p className="gal-walk__kicker">Virtual tour</p>
            <h2 className="gal-walk__title" id="walk-title">
              Walk the park
            </h2>
            <p className="gal-walk__line">{GALLERY_TOUR_LINE}</p>
            <div className="gal-walk__actions">
              <Link className="btn btn--primary" href="/map">
                Open the park map &amp; 3D walk-through
              </Link>
            </div>
          </div>
          <GalleryFigure photo={GALLERY_MASTERPLAN} variant="plan" />
        </div>
      </section>

      <section className="gal-visit" aria-labelledby="visit-title">
        <div>
          <h2 className="gal-visit__title" id="visit-title">
            Come and see the park
          </h2>
          <p className="gal-visit__text">Ask the office about a visit — any hour, every day.</p>
        </div>
        <div className="gal-visit__actions">
          <a className="btn btn--primary" href={contact.phoneHref}>
            Call {contact.phoneDisplay}
          </a>
          <Link className="btn btn--secondary" href="/contact">
            Ask about a visit
          </Link>
        </div>
      </section>
    </div>
  );
}

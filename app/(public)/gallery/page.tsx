import type { Metadata } from "next";
import Link from "next/link";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  GALLERY_GROUPS,
  GALLERY_HERO,
  GALLERY_MASTERPLAN,
  GALLERY_PROVENANCE_NOTE,
  GALLERY_TOUR_LINE,
} from "@/lib/gallery";
import { PublicHero, PublicImage, SectionHead } from "@/components/kit";
import { containerClass } from "@/lib/public-layout";
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
 * Tour", F-03) — rebuilt on the Phase 0 grammar (lane 2 of the public design
 * plan).
 *
 * The park in the client's own photographs, grouped into three bands whose heads
 * are the shared `SectionHead`; the photographs render through `PublicImage`
 * (role-sized, lazily loaded, every one reserving its box) inside the existing
 * two-up/three-up card grid. The sheet samples keep their "illustration purposes
 * only" label, the masterplan is captioned as a drawing, and the walk-through is
 * the EXISTING `/map` linked once. The 24/7 number is read from the
 * staff-editable contact content — never typed.
 */
export default async function GalleryPage() {
  const { contact } = await listLandingContent();

  return (
    <div className={`${containerClass("catalogue")} stack-5 catalogue-page gal-page`}>
      <nav className="gal-crumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li aria-current="page">Gallery &amp; virtual tour</li>
        </ol>
      </nav>

      <PublicHero
        variant="interior"
        eyebrow="Villa Memorial Park · Gallery & virtual tour"
        title="See the park before you visit"
        lead="Photographs of the park, and a way to walk it."
        primary={{ label: "Walk the park", href: "#walk" }}
        secondary={{ label: "Plan a visit", href: "/contact" }}
        image={{
          src: GALLERY_HERO.src,
          srcSet: GALLERY_HERO.srcSet,
          sizes: GALLERY_HERO.sizes,
          alt: GALLERY_HERO.alt,
          width: GALLERY_HERO.width,
          height: GALLERY_HERO.height,
          priority: true,
        }}
      />

      {GALLERY_GROUPS.map((group) => {
        const single = group.photos.length === 1;
        return (
          <section
            className="catalogue-band"
            id={group.id}
            key={group.id}
            aria-labelledby={`${group.id}-title`}
          >
            <SectionHead id={`${group.id}-title`} kicker={group.kicker} title={group.heading} lead={group.intro} />
            <div className={single ? "gal-feature" : "gal-cards"}>
              {group.photos.map((photo) => (
                <PublicImage
                  key={photo.src}
                  role={single ? "band-lead" : "gallery-tile"}
                  src={photo.src}
                  srcSet={photo.srcSet}
                  sizes={photo.sizes}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  caption={
                    <>
                      <span className="gal-cap__desc">{photo.caption}</span>
                      {photo.note ? (
                        <>
                          {" "}
                          <span className="gal-figure__note">{photo.note}</span>
                        </>
                      ) : null}
                    </>
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="gal-provenance">{GALLERY_PROVENANCE_NOTE}</p>

      {/* Walk + visit are ONE closing band (the shell's NextSteps already
          repeats the call): one map entry, one call, one request. */}
      <section className="gal-walk" id="walk" aria-labelledby="walk-title">
        <div className="gal-walk__grid">
          <div>
            <p className="gal-walk__kicker">Virtual tour</p>
            <h2 className="gal-walk__title" id="walk-title">
              Walk the park
            </h2>
            <p className="gal-walk__line">{GALLERY_TOUR_LINE}</p>
            <p className="gal-walk__line">Ask the office about a visit — any hour, every day.</p>
            <div className="gal-walk__actions">
              <Link className="btn btn--primary" href="/map">
                Open the park map &amp; 3D walk-through
              </Link>
              <a className="btn btn--secondary" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
            </div>
          </div>
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
        </div>
      </section>
    </div>
  );
}

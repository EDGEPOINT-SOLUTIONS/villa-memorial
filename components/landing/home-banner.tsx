import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { HomeTitleRotator } from "@/components/public/home-title-rotator";
import { PublicImage } from "@/components/public/public-image";
import { compositionThumbSet, libraryThumb, libraryThumbSet } from "@/lib/media";
import type { LandingContent } from "@/lib/api-client/landing";

/**
 * HomeBanner — the storefront home's middle-section banner (captain, 2026-10-02).
 *
 * `/` is the blog page's design now (the anchored storefront), and the captain
 * asked for a banner where that design used to open with the blog list:
 * *"in the new homepage make a banner in the middle section and remove the blogs
 * inside that middle sections"*.
 *
 * REVISED 2026-10-02 (captain's home-page revision): the client's own park
 * photograph is the band's DOMINANT picture, full width of the middle column
 * and larger than the old side-by-side frame; the park's name and the band's
 * two actions sit in an anchored strip at the picture's bottom edge; and the
 * three-item trust ribbon is gone, so the band is the picture, the rotating
 * title set and the action row. The face and the register stay the product's:
 * the rotating title is still the ONE `h1` and the gold call is still the
 * page-commitment accent.
 */

/** Intrinsic hints for the shipped hero derivative; an unknown asset gets 3:2. */
const PHOTO_HINTS: Readonly<Record<string, { width: number; height: number }>> = {
  "hero-1-960.webp": { width: 960, height: 541 },
};

function photo(src: string): { src: string; srcSet?: string; width: number; height: number } {
  const resolved = libraryThumb(src, 960);
  const srcSet = libraryThumbSet(src) ?? compositionThumbSet(src);
  const file = resolved.split("/").pop() ?? "";
  const hint = PHOTO_HINTS[file] ?? { width: 960, height: 640 };
  return { src: resolved, srcSet, width: hint.width, height: hint.height };
}

export function HomeBanner({ content }: { content: LandingContent }) {
  const { contact, home } = content;
  const gateway = home.gateway;
  const heroPhoto = home.photo.image ? photo(home.photo.image) : null;
  const parkName =
    contact.parkAddress.split(",")[0]?.trim() || contact.location || "Villa Memorial Park";

  return (
    <section className="mid-section home-banner" aria-labelledby="home-gateway-title">
      <div className="home-open home-open--feature">
        <div className="home-open__words">
          {gateway.place ? <p className="home-open__eyebrow">{gateway.place}</p> : null}
          <HomeTitleRotator
            sets={gateway.titleSets}
            intervalSeconds={gateway.titleIntervalSeconds}
          />
        </div>

        <div className="home-open__media">
          {heroPhoto ? (
            <PublicImage
              src={heroPhoto.src}
              srcSet={heroPhoto.srcSet}
              sizes={heroPhoto.srcSet ? "(max-width: 64rem) 94vw, 53rem" : undefined}
              alt={home.photo.alt}
              role="home-hero"
              width={heroPhoto.width}
              height={heroPhoto.height}
              priority
            />
          ) : (
            <div className="home-engraved home-engraved--band" role="img" aria-label={home.photo.alt}>
              {home.photo.alt}
            </div>
          )}

          {/* The anchored bottom row: the park's own name (the picture's title)
              and the band's two actions, attached to the picture's bottom edge. */}
          <div className="home-open__strip">
            <span className="home-open__caption">
              <span className="home-open__caption-kicker">{home.photo.kicker}</span>
              <span className="home-open__caption-name">{parkName}</span>
            </span>
            <span className="home-open__actions">
              <a className="btn btn--accent home-call" href={contact.phoneHref}>
                <Phone size={18} aria-hidden="true" />
                {contact.phoneDisplay}
              </a>
              <Link className="btn btn--secondary btn--gold-outline" href={gateway.secondary.href}>
                {gateway.secondary.label}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomeBanner;

import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
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
 * two actions sit in an anchored strip at the picture's bottom edge.
 *
 * REVISED 2026-10-03 (captain): the gateway block is removed from the home.
 * *"remove this Isabela City, Basilan / We're here for you / any hour, any day.
 * / We come to you / and stay until the burial is done. / The first park in
 * Basilan / family-run, in Isabela City."* — the place line and the rotating
 * title sets are OFF this page entirely, so the band is the client's photograph
 * (uncropped) and the two anchored actions, nothing else. The words stay in the
 * landing store and its editor (`content.home.gateway`), so the office can turn
 * them back on later; only this rendering changed.
 *
 * THE HEADING STAYS. Removing the rotating title took the page's only `h1` with
 * it, so the band now carries the page's honest title in a visually-hidden `h1`
 * (the site's own wordmark, exactly the "one h1 per route" contract F-16 pins —
 * the same sr-only pattern the titleless interior heroes use). It is the band's
 * `aria-labelledby` target and gives search and screen readers the heading the
 * page would otherwise be missing.
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
  // The page's honest title: the office's own wordmark (the store defaults it to
  // "Villa Funeraria"), never one of the retired marketing lines.
  const pageTitle = content.logo.wordmark || "Villa Funeraria";

  return (
    <section className="mid-section home-banner" aria-labelledby="home-title">
      {/* The page's ONE h1 — visually hidden, so it names the route for search
          and screen readers without adding a word back to the band. */}
      <h1 id="home-title" className="visually-hidden">
        {pageTitle}
      </h1>

      <div className="home-open home-open--feature">
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

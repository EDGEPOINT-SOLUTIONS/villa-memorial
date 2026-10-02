import type { CSSProperties, ReactNode } from "react";
import {
  heroBackgroundLayer,
  heroTextColourStyle,
  HERO_BACKGROUND_TRANSPARENT,
} from "@/lib/landing/hero-background";
import { PublicImage, type PublicImageSource } from "@/components/public/public-image";

/**
 * PublicHero — the ONE public hero (Phase 0 consistency contract; folds in the
 * `villa-hero-flexible` work of PR #110 as its base).
 *
 * WHY IT EXISTS (plan §2.7, defect D9): ten public pages used ten different hero
 * families — `.hero-home`, `.sv-hero`, `.hero-premium`, `.gal-hero`, `.page-hero`,
 * `.mem-hero`, `.ia-hero`, `.park-hero`, `.contact-facts`, `.lot-hero` — all doing
 * the same job. This primitive owns the job once:
 *
 *   home      the public home's one band: brand · eyebrow · h1 · lead · two
 *             actions · care line, over the gradient or the staff photo.
 *   interior  an interior page's opening: eyebrow · h1 · lead · actions, with an
 *             OPTIONAL 16:9 banner photograph (never a second home hero).
 *   call-first the urgent-screen treatment: the enormous call action leads and
 *             nothing else competes with it. Its only user,
 *             /immediate-assistance, was removed (office, inbox 040); the
 *             variant stays for the primitive's API and its tests.
 *
 * THE HERO-FLEXIBLE BASE (captain 2026-09-21), inherited verbatim:
 *  · IMAGE-ONLY — an image (and no eyebrow/headline/lead) renders the RAW
 *    photograph: no wash, no scrim, no gradient, no filter; a visually-hidden h1
 *    still names the page for assistive tech.
 *  · CLEAR 100 % — `backgroundTransparency` 100 is the untouched photograph; the
 *    one `.public-hero__wash`/`.hero-home__wash` layer exists only for 0–99.
 *  · AUTHOR TEXT COLOUR — `textColour` paints `--hero-text-colour` on the root.
 *    Every hero copy rule reads `var(--hero-text-colour, <token>)`, and the left
 *    rail's 24/7 call card reads the same variable, so the two stay in sync. The
 *    page shell ALSO sets the property (the rail lives outside the hero), which
 *    is why a view may pass it at both levels without conflict.
 *  · PHONE BAND — a hero is a band, not the page: the phone frame is capped at
 *    `HERO.phoneMaxVh` (42 vh / ≈340 px) by the shared grammar block, and the raw
 *    photo hero never opens on a portrait crop.
 *
 * WHAT IT DOES NOT DO
 * It does not hold copy, prices or honesty states — those stay in the page/
 * content document. It does not choose an image's derivative: pass the path (or
 * a `PublicImageSource` for the interior banner) the page resolved.
 */
export type PublicHeroAction = {
  label: string;
  href: string;
  /** Mark the action as the current view (renders `aria-current="page"`). */
  current?: boolean;
};

type HomeHeroProps = {
  variant: "home";
  /** The brand wordmark, used for the assistive h1 and the brand row. */
  brandName: string;
  /** The brand mark node (the home passes `<BrandMark/>`). */
  brand?: ReactNode;
  eyebrow?: string;
  headline?: string;
  subline?: string;
  image?: string | null;
  /** Intrinsic dimensions for the CLS hint (default the shipped hero). */
  imageWidth?: number;
  imageHeight?: number;
  background?: string | null;
  backgroundTransparency?: number;
  textColour?: string | null;
  primary?: PublicHeroAction;
  secondary?: PublicHeroAction;
  careline?: ReactNode;
};

type ContentHeroProps = {
  variant: "interior" | "call-first";
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  textColour?: string | null;
  primary?: PublicHeroAction;
  secondary?: PublicHeroAction;
  /** An optional 16:9 banner photograph. `priority` marks it the LCP image. */
  image?: PublicImageSource & { alt: string; width: number; height: number; priority?: boolean };
  /** Anything the page wants under the lead (facts, a form, a call button). */
  children?: ReactNode;
};

export type PublicHeroProps = HomeHeroProps | ContentHeroProps;

export function PublicHero(props: PublicHeroProps) {
  return props.variant === "home" ? <HomeHero {...props} /> : <ContentHero {...props} />;
}

/* --------------------------------- home ---------------------------------- */

function HomeHero({
  brandName,
  brand,
  eyebrow = "",
  headline = "",
  subline = "",
  image = null,
  imageWidth = 1626,
  imageHeight = 916,
  background = null,
  backgroundTransparency = HERO_BACKGROUND_TRANSPARENT,
  textColour = null,
  primary,
  secondary,
  careline,
}: HomeHeroProps) {
  // Staff-chosen background colour: ONE layer over the photo and under every
  // copy block. Absent (null) for no colour or 100 % transparency — the
  // photograph is clear.
  const wash = heroBackgroundLayer({ background, backgroundTransparency });
  // Image-only: a photograph and no authored copy. It renders the raw photo —
  // no brand, no buttons, no scrim, no gradient, no colour layer.
  const imageOnly = Boolean(image) && !eyebrow.trim() && !headline.trim() && !subline.trim();
  const textStyle = heroTextColourStyle({ textColour }) ?? undefined;

  return (
    <section
      className={`hero-home${image ? " hero-home--photo" : ""}${imageOnly ? " hero-home--image-only" : ""}`}
      data-public-hero="home"
      style={textStyle as CSSProperties | undefined}
      aria-label={imageOnly ? brandName : undefined}
      aria-labelledby={imageOnly ? undefined : "hero-home-title"}
    >
      {image ? (
        <figure className="hero-home__photo" aria-hidden="true">
          {/* The client's own hero photograph; the frame is the band (CSS caps
              it at HERO.homeMaxRem / HERO.phoneMaxVh). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            width={imageWidth}
            height={imageHeight}
            loading="eager"
            decoding="async"
          />
        </figure>
      ) : null}
      {wash && !imageOnly ? (
        <div className="hero-home__wash" aria-hidden="true" style={wash} />
      ) : null}
      {imageOnly ? (
        // A pure photo hero still names the page for assistive tech.
        <h1 className="visually-hidden">{brandName}</h1>
      ) : (
        // The copy sits on its own deliberate panel (captain, 2026-09-25: the
        // page opening must be a sharp, designed header band, never a bare
        // title on white). The panel keeps the eyebrow · headline · short lead ·
        // key action readable over any hero photograph and the staff-chosen
        // text colour still paints through --hero-text-colour.
        <div className="hero-home__copy">
          <div className="hero-home__brand">
            {brand}
            <span className="hero-home__wordmark">{brandName}</span>
          </div>
          {eyebrow.trim() ? <p className="hero-home__eyebrow">{eyebrow}</p> : null}
          <h1 id="hero-home-title" className="hero-home__title">
            {headline}
          </h1>
          {subline.trim() ? <p className="hero-home__lead">{subline}</p> : null}
          {primary || secondary ? (
            <div className="hero-home__actions">
              {primary ? (
                <a
                  className="btn btn--primary btn--lg"
                  href={primary.href}
                  aria-current={primary.current ? "page" : undefined}
                >
                  {primary.label}
                </a>
              ) : null}
              {secondary ? (
                <a
                  className="btn btn--secondary btn--lg"
                  href={secondary.href}
                  aria-current={secondary.current ? "page" : undefined}
                >
                  {secondary.label}
                </a>
              ) : null}
            </div>
          ) : null}
          {careline ? <p className="hero-home__careline">{careline}</p> : null}
        </div>
      )}
    </section>
  );
}

/* ------------------------------- interior -------------------------------- */

function ContentHero({
  variant,
  id = "page-hero-title",
  eyebrow,
  title,
  lead,
  textColour = null,
  primary,
  secondary,
  image,
  children,
}: ContentHeroProps) {
  const textStyle = heroTextColourStyle({ textColour }) ?? undefined;
  // The captain removed the VISIBLE page-title band from every public page
  // (2026-10-02). The interior opening keeps its copy in the document — the
  // heading, eyebrow and lead are still rendered (the lead carries facts a
  // reader and a search engine should still find), but the band's text is
  // hidden from the eye (`.public-hero--titleless`, declared in
  // styles/components.css with the sr-only pattern) and only the page's own
  // actions, its children and its banner photograph stay visible. The h1 is
  // still exactly one per page. When a page has none of those, the band wrapper
  // is dropped entirely so no empty panel is left behind.
  const titleless = variant === "interior";
  const hasBody = Boolean(primary || secondary || children || image);
  const copy = (
    <>
      {eyebrow ? <p className="public-hero__eyebrow">{eyebrow}</p> : null}
      <h1 id={id} className="public-hero__title">
        {title}
      </h1>
      {lead ? <p className="public-hero__lead">{lead}</p> : null}
    </>
  );

  if (titleless && !hasBody) {
    return (
      <div className="public-hero--interior public-hero--titleless" data-public-hero={variant}>
        {copy}
      </div>
    );
  }

  return (
    <section
      className={`public-hero public-hero--${variant}${titleless ? " public-hero--titleless" : ""}`}
      data-public-hero={variant}
      style={textStyle as CSSProperties | undefined}
      aria-labelledby={id}
    >
      <div className="public-hero__inner">
        <div className="public-hero__copy">
          {copy}
          {primary || secondary ? (
            <div className="public-hero__actions">
              {primary ? (
                <a
                  className="btn btn--primary btn--lg"
                  href={primary.href}
                  aria-current={primary.current ? "page" : undefined}
                >
                  {primary.label}
                </a>
              ) : null}
              {secondary ? (
                <a
                  className="btn btn--secondary btn--lg"
                  href={secondary.href}
                  aria-current={secondary.current ? "page" : undefined}
                >
                  {secondary.label}
                </a>
              ) : null}
            </div>
          ) : null}
          {children}
        </div>
        {image ? (
          <PublicImage
            role="interior-hero"
            className="public-hero__media"
            src={image.src}
            srcSet={image.srcSet}
            sizes={image.sizes}
            alt={image.alt}
            width={image.width}
            height={image.height}
            priority={image.priority}
          />
        ) : null}
      </div>
    </section>
  );
}

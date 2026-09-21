import type { ReactNode } from "react";
import type { PublicImageRole } from "@/lib/public-layout";

/**
 * PublicImage — the ONE public image frame (Phase 0 consistency contract).
 *
 * WHY IT EXISTS (plan §2.4, defects D5/D6/D7): the measured public pages shipped
 * raw `<img>` tags with no intrinsic size (27 of the home's 28 images), `sizes`
 * hints that did not match the column (a 4.5 rem hint for a 299 px render), and
 * a portrait source cropped into a landscape slot. Those are not typos — they
 * are the absence of an owner. This frame owns them.
 *
 * WHAT IT ENFORCES
 *  · role → a frame class with the contract's `aspect-ratio` and max-height
 *    (`IMAGE_CEILINGS`, lib/public-layout.ts): a card is 4:3, a band lead 3:2,
 *    a PDP main 4:3, the map 1:1, a hero 16:9. A portrait ratio can never enter
 *    a grid.
 *  · `width` + `height` are REQUIRED props, so every picture ships the CLS hint
 *    the house rule demands (the img-level `aspect-ratio` resets `height:auto`
 *    in CSS, so the hint cannot defeat the ratio — the AGENTS trap).
 *  · lazy by default, `decoding="async"`; `priority` marks the one LCP image.
 *  · `sizes` is a REQUIRED prop whenever `srcSet` is present — the type makes an
 *    understated hint uncompilable (D5).
 *
 * WHAT IT DOES NOT DO
 * It does not choose the source. A caller that has a library path resolves it
 * with `libraryThumb()` / `libraryThumbSet()` (`lib/media.ts`) so the published
 * derivative is used, never a multi-MB original, and the frame is then handed
 * the 1× source + srcset. A caller with a device upload or a staff URL passes
 * that path through unchanged. The frame never upscales: CSS caps the box, and
 * a source narrower than its slot simply does not fill it.
 */
export type { PublicImageRole };

type FrameProps = {
  /** What the picture is. "" is legal only for a decorative image. */
  alt: string;
  /** The role's ceiling + ratio class (defaults to `card`). */
  role?: PublicImageRole;
  /** Intrinsic width in px — REQUIRED (CLS). */
  width: number;
  /** Intrinsic height in px — REQUIRED (CLS). */
  height: number;
  /** Eager-load the LCP image. Everything else is lazy. */
  priority?: boolean;
  className?: string;
  /** What the picture really is (a sample note, a section, a caption). */
  caption?: ReactNode;
};

/**
 * The source shape. With `srcSet` a `sizes` hint is REQUIRED — an image that
 * declares candidate widths but no hint is exactly the D5 defect. The type
 * keeps it optional so a caller can also pass a plain `src`; the mandatory
 * pairing is enforced by tests/unit/public-image-rules.test.tsx, which fails
 * any rendered `<img>` whose `srcSet` has no `sizes`.
 */
export type PublicImageSource = { src: string; srcSet?: string; sizes?: string };

export type PublicImageProps = PublicImageSource & FrameProps;

export function PublicImage({
  src,
  srcSet,
  sizes,
  alt,
  role = "card",
  width,
  height,
  priority = false,
  className,
  caption,
}: PublicImageProps) {
  return (
    <figure
      className={`public-image public-image--${role}${className ? ` ${className}` : ""}`}
      data-public-image={role}
    >
      {/* The client's own photograph: the shared loader is a no-op for a data
          URL or an external path, and every committed derivative already lives
          under /media (Next's optimizer would only re-encode a sibling). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        width={width}
        height={height}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        // The LCP image is fetched at high priority; everything else stays lazy
        // (the gallery hero rides this flag, lane 2).
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
      />
      {caption ? <figcaption className="public-image__caption">{caption}</figcaption> : null}
    </figure>
  );
}

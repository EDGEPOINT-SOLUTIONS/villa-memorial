"use client";

/**
 * Product-detail gallery — the sticky main viewer, its thumbnail rail and the
 * zoom dialog (report §6, P3).
 *
 * The office's authored `entry.gallery` (an ordered, uncapped list). The lead
 * photograph loads eagerly; the main viewer swaps locally with no navigation, and
 * every other image (the rail and any non-lead main photo) is `loading="lazy"`.
 * A sample photograph keeps its honesty chip and the client's short illustration
 * label ("Illustration purposes only."), exactly as the rule-derived sample
 * figure does — the long substitution sentence stays on /products.
 *
 * ZOOM. The main viewer's magnifier button opens a `useModalFocus` dialog: focus
 * moves in, Tab is trapped, Escape closes, the page behind cannot scroll and focus
 * returns to the button. The enlarged picture sits at natural size inside a pan
 * frame, so a tall photograph stays reachable without a new dependency.
 *
 * When there is no authored gallery the page keeps the rule-derived
 * `CasketSampleFigure` instead, so a model without its own photographs still shows
 * the client's own sample with its label — never an empty hole.
 */
import { useState } from "react";
import type { ContentImage } from "@/lib/content-catalog";
import { COFFIN_SAMPLE_NOTE } from "@/lib/villa-pricing";
import { libraryThumb, libraryThumbSet } from "@/lib/media";
import { useModalFocus } from "@/components/ui/use-modal-focus";

export function PdpGallery({ images, label }: { images: ContentImage[]; label: string }) {
  const [selected, setSelected] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const { panelRef } = useModalFocus<HTMLDivElement>(zoomed, () => setZoomed(false));
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const active = images[index];
  if (!active) return null;
  const hasSample = images.some((image) => image.sample);

  return (
    <figure className="pdp-gallery">
      <div className="pdp-gallery__main">
        {/* A library photograph is served from its sized WebP derivatives so a
            640px slot never asks for (or upscales) a print-sized original; an
            asset the thumbnail pass does not know (a device upload, a URL)
            passes through unchanged (lib/media.ts is the one rule). */}
        {/* eslint-disable-next-line @next/next/no-img-element -- staff/library photograph */}
        <img
          src={libraryThumb(active.src, 960)}
          srcSet={libraryThumbSet(active.src)}
          sizes="(max-width: 64rem) 92vw, 40rem"
          alt={active.alt}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
        />
        {active.sample ? <span className="casket-sample__chip">Sample photograph</span> : null}
        <button
          type="button"
          className="pdp-gallery__zoom"
          onClick={() => setZoomed(true)}
          aria-label={`Zoom photograph ${index + 1} of ${images.length} — ${label}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <circle
              cx="7"
              cy="7"
              r="5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="11"
              y1="11"
              x2="15"
              y2="15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line x1="7" y1="5" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {active.caption ? (
        <figcaption className="pdp-gallery__caption">
          <strong>{label}.</strong> {active.caption}
        </figcaption>
      ) : null}

      {images.length > 1 ? (
        <ul className="pdp-gallery__rail" aria-label={`${label} photographs`}>
          {images.map((image, thumbnailIndex) => (
            <li key={image.id}>
              <button
                type="button"
                className={`pdp-gallery__thumb${thumbnailIndex === index ? " pdp-gallery__thumb--active" : ""}`}
                aria-label={`Show photograph ${thumbnailIndex + 1} of ${images.length}`}
                aria-current={thumbnailIndex === index ? "true" : undefined}
                onClick={() => setSelected(thumbnailIndex)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- staff/library photograph */}
                <img src={image.src} alt="" loading="lazy" decoding="async" />
                {image.sample ? <span className="casket-sample__mini">Sample</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hasSample ? <p className="pdp-gallery__note">{COFFIN_SAMPLE_NOTE}</p> : null}

      {zoomed ? (
        <div
          className="pdp-zoom"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} photograph, enlarged`}
          ref={panelRef}
          tabIndex={-1}
        >
          <div className="pdp-zoom__bar">
            <p className="pdp-zoom__count">
              Photograph {index + 1} of {images.length}
            </p>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => setZoomed(false)}>
              Close
            </button>
          </div>
          <div className="pdp-zoom__frame">
            {/* eslint-disable-next-line @next/next/no-img-element -- staff/library photograph */}
            <img src={active.src} alt={active.alt} />
          </div>
          {active.caption ? <p className="pdp-zoom__caption">{active.caption}</p> : null}
        </div>
      ) : null}
    </figure>
  );
}

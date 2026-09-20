"use client";

/**
 * Product-detail gallery — the main viewer with its thumbnail rail (report §6).
 *
 * The office's authored `entry.gallery` (an ordered, uncapped list). The lead
 * photograph loads eagerly; the main viewer swaps locally with no navigation, and
 * every other image (the rail and any non-lead main photo) is `loading="lazy"`.
 * A sample photograph keeps its honesty chip and the sheet's substitution note,
 * exactly as the rule-derived sample figure does.
 *
 * When there is no authored gallery the page keeps the rule-derived
 * `CasketSampleFigure` instead, so a model without its own photographs still shows
 * the client's own sample with its label — never an empty hole.
 */
import { useState } from "react";
import type { ContentImage } from "@/lib/content-catalog";
import { COFFIN_TIER_NOTE } from "@/lib/villa-pricing";

export function PdpGallery({ images, label }: { images: ContentImage[]; label: string }) {
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const active = images[index];
  if (!active) return null;
  const hasSample = images.some((image) => image.sample);

  return (
    <figure className="pdp-gallery">
      <div className="pdp-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element -- staff/library photograph */}
        <img
          src={active.src}
          alt={active.alt}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
        />
        {active.sample ? <span className="casket-sample__chip">Sample photograph</span> : null}
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

      {hasSample ? <p className="pdp-gallery__note">{COFFIN_TIER_NOTE}</p> : null}
    </figure>
  );
}

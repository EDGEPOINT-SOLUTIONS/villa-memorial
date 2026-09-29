"use client";

import { useCallback, useEffect, useRef } from "react";
import { GALLERY_SAMPLE_NOTE, type GalleryPhoto } from "@/lib/gallery";
import { useModalFocus } from "@/components/ui/use-modal-focus";

/**
 * PhotoViewer — the gallery's one viewing interaction (captain, 2026-09-30:
 * "creative and interactive… a viewing interaction that stays fast and
 * dignified").
 *
 * WHY IT EXISTS. A photography-led page must let a visitor open a photograph;
 * before this the wall plates were static images. This is the SAME grammar the
 * PDP's zoom dialog already uses (`components/villa/pdp-gallery.tsx` and
 * `components/ui/use-modal-focus.ts`): focus moves in, Tab is trapped, Escape
 * closes, the page behind cannot scroll, and focus returns to the plate that
 * opened it — extended with the two things a sixteen-plate wall needs:
 *
 *  · BROWSING — Previous / Next, the ← and → keys, and a horizontal swipe on a
 *    touch screen step through every photograph in wall order;
 *  · SPEED — only the current frame is in the DOM, and the two neighbours'
 *    published 3:2 derivatives are warmed as soon as the viewer opens, so the
 *    next picture is already in the cache.
 *
 * DIGNITY. No zoom, no pan, no rotation and no chrome over the photograph: a
 * neutral ink backdrop, the whole published frame at `contain` (never upscaled,
 * never re-cropped), the caption and — for a sheet sample — its full honesty
 * sentence. A failed image keeps the caption and the alt, never a broken icon.
 *
 * It is deliberately `use client`; the wall and the plates around it stay Server
 * Components, and only a serialisable photograph list crosses the boundary.
 */
export function PhotoViewer({
  photos,
  index,
  groupLabels,
  onClose,
  onNavigate,
}: {
  /** Every photograph, in wall order. */
  photos: readonly GalleryPhoto[];
  /** The open photograph's index, or null when the viewer is closed. */
  index: number | null;
  /** Per-photo set heading, for the viewer's top bar. */
  groupLabels: readonly string[];
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const open = index !== null && index >= 0 && index < photos.length;
  const { panelRef } = useModalFocus<HTMLDivElement>(open, onClose);
  const pointerStart = useRef<number | null>(null);
  const frameRef = useRef<HTMLImageElement | null>(null);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = (index + delta + photos.length) % photos.length;
      onNavigate(next);
    },
    [index, photos.length, onNavigate],
  );

  // Arrow keys browse; useModalFocus already owns Escape and the Tab trap.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, step]);

  // Warm the neighbours from the published 3:2 derivative, so the next plate is
  // already decoded when the visitor gets to it.
  useEffect(() => {
    if (index === null) return;
    for (const delta of [1, -1]) {
      const neighbour = photos[(index + delta + photos.length) % photos.length];
      if (!neighbour) continue;
      const image = new Image();
      image.src = neighbour.viewerSrc;
    }
  }, [index, photos]);

  if (!open) return null;
  const photo = photos[index];
  const group = groupLabels[index] ?? "";

  return (
    <div
      className="gal-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Photograph ${index + 1} of ${photos.length} — ${group}`}
      ref={panelRef}
      tabIndex={-1}
      onClick={(event) => {
        // A click on the backdrop (not the frame or the controls) closes.
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerDown={(event) => {
        pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (start === null) return;
        const delta = event.clientX - start;
        if (Math.abs(delta) < 40) return;
        step(delta < 0 ? 1 : -1);
      }}
    >
      <div className="gal-viewer__bar">
        <button
          type="button"
          className="gal-viewer__close"
          onClick={onClose}
          aria-label="Close the photograph"
        >
          Close
        </button>
        <p className="gal-viewer__count" aria-live="polite">
          {group ? `${group} · ` : ""}
          {index + 1} of {photos.length}
        </p>
      </div>

      <button
        type="button"
        className="gal-viewer__step gal-viewer__step--prev"
        onClick={() => step(-1)}
        aria-label="Previous photograph"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <figure className="gal-viewer__figure">
        {/* The published 3:2 feature crop, whole: contain, never upscaled. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={frameRef}
          className="gal-viewer__img"
          src={photo.viewerSrc}
          width={photo.viewerWidth}
          height={photo.viewerHeight}
          alt={photo.alt}
          decoding="async"
          onError={() => {
            if (frameRef.current) frameRef.current.hidden = true;
          }}
        />
        <figcaption className="gal-viewer__caption">
          {photo.sample ? <span className="gal-viewer__chip">Sample</span> : null}
          {photo.caption}
          {photo.sample ? <span className="gal-viewer__note"> {GALLERY_SAMPLE_NOTE}</span> : null}
        </figcaption>
      </figure>

      <button
        type="button"
        className="gal-viewer__step gal-viewer__step--next"
        onClick={() => step(1)}
        aria-label="Next photograph"
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  );
}

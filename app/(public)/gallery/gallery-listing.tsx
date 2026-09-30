"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GALLERY_GROUPS,
  GALLERY_PHOTO_COUNT,
  type GalleryPhoto,
} from "@/lib/gallery";
import { PhotoViewer } from "@/components/public/photo-viewer";

/**
 * The gallery wall — the set index, the three bands of right-sized plates, and
 * the one viewer that opens a photograph (captain's approved /gallery plan,
 * 2026-09-30).
 *
 * WHY IT LOOKS LIKE THIS
 *  · The wall replaced the storefront `ListingShell` + `RefinePanel` rail. A
 *    gallery is browsed, not filtered: the sets are an in-page index, nothing is
 *    hidden by it, and a phone no longer needs a control mislabelled "Filters".
 *  · Every plate is a button. The picture is the client's own 4:3 catalogue crop
 *    drawn in a 4:3 frame — the WHOLE published frame, never re-cropped — and
 *    tapping it opens the viewer at that photograph.
 *  · The one full sample sentence prints once per band; each sample plate keeps
 *    the short `Sample` chip, so the label can never leave the sample.
 *
 * It is `use client` only for the viewer and the set-index scroll-spy. The wall
 * still renders (and lists every plate) with JavaScript off; only the enlarge
 * step needs it.
 */
export function GalleryListing() {
  // The flat photograph list, in wall order, with each plate's set heading.
  const { photos, groupLabels, groups } = useMemo(() => {
    const flat = GALLERY_GROUPS.flatMap((group) =>
      group.photos.map((photo) => ({ photo, group: group.heading })),
    );
    // Each group's starting offset in the flat list, so a plate opens at its own
    // photograph without the wall passing an index per tile.
    let offset = 0;
    const withOffsets = GALLERY_GROUPS.map((group) => {
      const start = offset;
      offset += group.photos.length;
      return { group, start };
    });
    return {
      photos: flat.map((entry) => entry.photo),
      groupLabels: flat.map((entry) => entry.group),
      groups: withOffsets,
    };
  }, []);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentSet, setCurrentSet] = useState<string>(GALLERY_GROUPS[0]?.id ?? "park");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Scroll-spy: the set index marks the section in view. It is navigation, never
  // a filter — every band stays in the document.
  useEffect(() => {
    const nodes = Object.values(sectionRefs.current).filter(Boolean) as HTMLElement[];
    if (nodes.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setCurrentSet(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const close = useCallback(() => setOpenIndex(null), []);

  return (
    <>
      <nav className="gal-nav" aria-label="Gallery sets">
        <ul>
          {GALLERY_GROUPS.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                aria-current={currentSet === group.id ? "true" : undefined}
              >
                {group.kicker}
              </a>
            </li>
          ))}
        </ul>
        <p className="gal-nav__count">{GALLERY_PHOTO_COUNT} photographs</p>
      </nav>

      <div className="gal-wall" id="wall">
        {groups.map(({ group, start }) => (
          <section
            key={group.id}
            id={group.id}
            className="gal-set"
            aria-labelledby={`${group.id}-title`}
            ref={(node) => {
              sectionRefs.current[group.id] = node;
            }}
          >
            <div className="home-band-head">
              <p className="home-band-head__kicker">{group.kicker}</p>
              <h2 id={`${group.id}-title`} className="home-band-head__title">
                {group.heading}
              </h2>
              <p className="home-band-head__lead">{group.intro}</p>
            </div>

            {/* One grid for every set: the same plate at the same size
                (captain, 2026-09-30). */}
            <ul className={`gal-plates${group.photos.length === 1 ? " gal-plates--one" : ""}`}>
              {group.photos.map((photo, i) => (
                <li key={photo.id}>
                  <GalleryPlate
                    photo={photo}
                    position={start + i + 1}
                    total={photos.length}
                    onOpen={() => setOpenIndex(start + i)}
                  />
                </li>
              ))}
            </ul>

          </section>
        ))}
      </div>

      <PhotoViewer
        photos={photos}
        index={openIndex}
        groupLabels={groupLabels}
        onClose={close}
        onNavigate={setOpenIndex}
      />
    </>
  );
}

/**
 * One plate. The picture is the client's published 4:3 crop drawn whole in a 4:3
 * frame; the button that opens the viewer covers it and carries the accessible
 * name. The caption sits under the frame so a phone can reduce it without
 * touching the picture.
 */
function GalleryPlate({
  photo,
  position,
  total,
  onOpen,
}: {
  photo: GalleryPhoto;
  position: number;
  total: number;
  onOpen: () => void;
}) {
  return (
    <figure className="public-image public-image--gallery-plate gal-plate" data-public-image="gallery-plate">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={photo.sizes}
        width={photo.width}
        height={photo.height}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
      />
      <button
        type="button"
        className="gal-plate__open"
        onClick={onOpen}
        aria-label={`Open photograph ${position} of ${total} — ${photo.caption}`}
      >
        <span className="visually-hidden">Open</span>
      </button>
    </figure>
  );
}

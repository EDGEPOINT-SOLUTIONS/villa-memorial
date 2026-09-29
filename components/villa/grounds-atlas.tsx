"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * GroundsAtlas — the area spotlight the /facilities redesign owns.
 *
 * WHAT IT IS FOR: a family choosing where a wake is held has seen the two rooms;
 * this band answers "what is the rest of the park, and which part am I looking
 * at?" The grounds list used to be six masterplan labels rendered as pills beside
 * a single photograph — a chip cloud with no place for the visitor. Here the
 * visitor PICKS an area and the selected place's photograph fills the stage.
 *
 * WHERE THE WORDS AND PICTURES COME FROM (nothing invented): the area names are
 * the client masterplan's own labels (`POINTS_OF_INTEREST`, read by the page and
 * passed in); each photograph is the client's own place derivative, resolved by
 * the page through `lib/media.ts`. This island holds only the selection.
 *
 * INTERACTION (the part a family actually uses):
 *  · pointer — click an area; the stage swaps and the caption names the place.
 *  · keyboard — it is a real `role="tablist"`: Arrow Up/Down/Left/Right move,
 *    Home/End jump, and roving `tabIndex` keeps ONE tab stop in the list (the
 *    standard tablist contract, so Tab moves out of the band, not through six
 *    buttons).
 *  · phone — the index becomes a horizontal snap rail above the stage (CSS);
 *    the interaction is identical.
 *
 * It draws NO plot geometry and NO status: the park's map and 3D walk-through
 * stay one link away on /map, so this surface never becomes a second map.
 *
 * The component is server-rendered with the first area selected, so the band is
 * complete without JS; hydration only adds the selection behaviour.
 */
export type AtlasPhoto = {
  src: string;
  srcSet?: string;
  sizes?: string;
  width: number;
  height: number;
  alt: string;
};

export type AtlasArea = {
  id: string;
  label: string;
  photo: AtlasPhoto;
  /** One honest line about the place — the client's own label, never a claim. */
  caption: string;
};

export function GroundsAtlas({
  areas,
  actions,
  ariaLabel = "The park and the grounds",
}: {
  areas: ReadonlyArray<AtlasArea>;
  /** The band's actions (map / lots), rendered inside the band. */
  actions?: ReactNode;
  ariaLabel?: string;
}) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  if (areas.length === 0) {
    return (
      <section className="story-band fac-band" aria-label={ariaLabel}>
        <p className="fac-atlas__empty">
          The client&rsquo;s masterplan labels no family-facing areas yet — call the office and
          we&rsquo;ll walk you through the park.
        </p>
        {actions ? <div className="fac-actions">{actions}</div> : null}
      </section>
    );
  }

  const current = areas[Math.min(active, areas.length - 1)];

  const move = (next: number) => {
    const wrapped = (next + areas.length) % areas.length;
    setActive(wrapped);
    tabRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        event.preventDefault();
        move(active + 1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        event.preventDefault();
        move(active - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(areas.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <section className="story-band fac-band" aria-label={ariaLabel}>
      <div className="fac-atlas">
        <div
          className="fac-atlas__list"
          role="tablist"
          aria-label="Areas on the client's masterplan"
          aria-orientation="vertical"
        >
          {areas.map((area, index) => (
            <button
              key={area.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              id={`fac-area-tab-${area.id}`}
              className="fac-atlas__item"
              role="tab"
              aria-selected={index === active}
              aria-controls="fac-area-panel"
              tabIndex={index === active ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={onKeyDown}
            >
              {area.label}
            </button>
          ))}
        </div>
        <div
          className="fac-atlas__stage"
          id="fac-area-panel"
          role="tabpanel"
          aria-labelledby={`fac-area-tab-${current.id}`}
          tabIndex={0}
        >
          {/* The client's own photograph of the place, whole: the frame is 3:2
              and the source is 3:2, so nothing is cropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- the client's own photograph */}
          <img
            src={current.photo.src}
            srcSet={current.photo.srcSet}
            sizes={current.photo.srcSet ? current.photo.sizes : undefined}
            width={current.photo.width}
            height={current.photo.height}
            alt={current.photo.alt}
            loading="lazy"
            decoding="async"
          />
          <p className="fac-atlas__cap">{current.caption}</p>
        </div>
      </div>
      {actions ? <div className="fac-actions">{actions}</div> : null}
    </section>
  );
}

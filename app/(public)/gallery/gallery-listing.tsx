"use client";

import { useState } from "react";
import {
  ListingShell,
  PublicImage,
  RefinePanel,
  SectionHead,
  type RefineGroup,
} from "@/components/kit";
import { GALLERY_GROUPS } from "@/lib/gallery";

/**
 * The gallery's photo sets as a listing (captain 2026-09-25): a sticky left rail
 * that stays in view while scrolling, collapsing to a filter sheet on a phone,
 * and the same even picture-first grid in the results column.
 *
 * The sets are three (Park & grounds · Care & facilities · Chapels & viewing);
 * checking one narrows the wall in place — no navigation, and the sheet closes
 * on the sheet's own commit. Unfiltered, every set renders in the client's order.
 */
export function GalleryListing() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (_groupKey: string, id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const shown =
    selected.length === 0
      ? GALLERY_GROUPS
      : GALLERY_GROUPS.filter((group) => selected.includes(group.id));
  const photoCount = shown.reduce((total, group) => total + group.photos.length, 0);

  const groups: RefineGroup[] = [
    {
      key: "sets",
      title: "Photo sets",
      options: GALLERY_GROUPS.map((group) => ({ id: group.id, label: group.heading })),
      counts: Object.fromEntries(GALLERY_GROUPS.map((group) => [group.id, group.photos.length])),
      selected,
    },
  ];

  return (
    <ListingShell
      railLabel="Gallery sets"
      railActiveCount={selected.length}
      sheetAction={{
        label: `Show ${photoCount} photo${photoCount === 1 ? "" : "s"}`,
        onClick: () => {},
      }}
      rail={
        <RefinePanel
          title="Browse the gallery"
          groups={groups}
          onToggle={toggle}
          onClear={() => setSelected([])}
          activeCount={selected.length}
        />
      }
    >
      {shown.map((group) => {
        const single = group.photos.length === 1;
        return (
          <section
            className="catalogue-band"
            id={group.id}
            key={group.id}
            aria-labelledby={`${group.id}-title`}
          >
            <SectionHead
              id={`${group.id}-title`}
              kicker={group.kicker}
              title={group.heading}
              lead={group.intro}
            />
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
    </ListingShell>
  );
}

/**
 * ONE rule home for the picture a public lot surface publishes (/lots and its
 * detail page, /lots/[id]).
 *
 * WHY A DERIVATION, NOT A FIXTURE FIELD. The frozen `Lot` contract
 * (lib/api-client/property.ts) has no image field and no media contract ties a
 * photograph to a plot, so the picture is derived from what the record really
 * carries — and this is an OPEN CONTRACT ASK: when property-gis freezes a lot
 * media field, the lot record should carry its own photograph and the section
 * mapping below becomes its fallback.
 *
 * THE ORDER (first match wins):
 *   1. a linked lot's SECTION (A–D at Villa Memorial) → the client's own park
 *      photograph of that ground (lib/media.ts VILLA_SECTION_PHOTOS);
 *   2. a park plot's LEGEND TYPE → the same type's photograph
 *      (PARK_PLACE_BY_TYPE), which is the picture the legend itself publishes;
 *   3. nothing the client photographed → the park's own plan(image), captioned
 *      for what it is. A map is never passed off as a photograph, and a
 *      photograph of one kind of place is never printed for another.
 *
 * THE HONESTY RULE. Every picture is captioned for what it shows: a section /
 * type photograph is of that kind of ground, NOT of the individual plot — the
 * exact plot is marked on the park map (the same map the page deep-links to).
 * A caller must render `caption` beside the picture; never claim the photo is
 * the plot.
 *
 * WEIGHT. Every returned src is a committed WebP DERIVATIVE (composition or
 * gallery shipment), never a multi-megabyte marketing tile — see
 * scripts/build-composition-images.mjs and tests/unit/composition-pass.test.tsx.
 */
import { PARK_PLACE_BY_TYPE, SAMPLE_PARK_IMAGE, VILLA_SECTION_PHOTOS } from "@/lib/media";

export type LotPhoto = {
  /** The 1× file (720px where a derivative exists). */
  src: string;
  /** 480w/720w derivative set, when the file ships one. */
  srcSet?: string;
  /** The reserved 4:3 box (a presentational hint; the CSS owns the ratio). */
  width?: number;
  height?: number;
  /** What the picture actually is — rendered beside it, never dropped. */
  caption: string;
  /** True when the fallback plan/map was used rather than a photograph. */
  isMap: boolean;
};

const COMPOSITION_PREFIX = "/media/composition/";

function withDerivatives(src: string): Pick<LotPhoto, "src" | "srcSet" | "width" | "height"> {
  if (!src.startsWith(COMPOSITION_PREFIX) || !src.endsWith("-720.webp")) {
    return { src };
  }
  return {
    src: src.replace("-720.webp", "-480.webp"),
    srcSet: `${src.replace("-720.webp", "-480.webp")} 480w, ${src} 720w`,
    width: 720,
    height: 540,
  };
}

/** The caption that keeps the picture about the KIND of place. The card's own
 *  eyebrow names the type, so the caption only has to say what the picture is
 *  NOT: the individual plot. */
function kindCaption(plotCode: string): string {
  return `A photograph of this kind of place — plot ${plotCode} is marked on the park map.`;
}

export function lotPhoto(input: {
  /** The plot code the card title uses — always named in the caption. */
  plotCode: string;
  /** The linked lot's section, when the row has a linked Lot record. */
  section?: string;
  /** The park plot's legend type id, when the row has one. */
  typeId?: string;
  /** The park's own image (parks.json), the last-resort fallback. */
  parkImage?: string;
}): LotPhoto {
  const { plotCode, section, typeId, parkImage } = input;

  // 1 + 2: a photograph the client actually took of this kind of ground. The
  // section map and the legend-type map point at the same client photographs
  // here (A=prime, B=premium, C=niches, D=mausoleum), so a linked lot and its
  // plot can never show two different pictures.
  const photo =
    (section ? VILLA_SECTION_PHOTOS[section] : undefined) ??
    (typeId ? PARK_PLACE_BY_TYPE[typeId] : undefined);

  if (photo) {
    return {
      ...withDerivatives(photo),
      isMap: false,
      caption: kindCaption(plotCode),
    };
  }

  // 3: no photograph of this ground — the park's own image, captioned as what
  // it is (Villa's is the masterplan; the other parks' is their park photo).
  const fallback = parkImage ?? SAMPLE_PARK_IMAGE;
  const isMap = /map/i.test(decodeURIComponent(fallback));
  return {
    ...withDerivatives(fallback),
    isMap,
    caption: isMap
      ? `The park masterplan — plot ${plotCode} is marked on it. No photograph of this ground yet.`
      : "The park grounds — no photograph of this ground yet.",
  };
}

/**
 * Public gallery (/gallery) — the park in the client's OWN photography, with
 * one clean entry to the walk-through (the existing /map 3D + map).
 *
 * The gallery's whole job is to show the place, so the honesty rules are the
 * content rules:
 *  · every image here is client material already in public/media (the two real
 *    park photographs, the client's 2026 photograph set, the client masterplan)
 *    — nothing is borrowed and no stock photo is published as if it were the
 *    park;
 *  · a sheet sample keeps the exact "illustration purposes only" label the
 *    services page uses (`CHAPEL_SAMPLE_NOTE`) — "sample", never a claim about
 *    a named room or a fixed set-up. The FULL sentence prints once per band and
 *    once in the viewer; each sample plate carries the short `Sample` chip so
 *    the label can never be separated from the sample;
 *  · the masterplan is captioned as a drawing, not a photograph.
 *
 * WHOLE, RIGHT-SIZED PLATES (captain, 2026-09-30). A photograph is never
 * re-cropped by the layout. The wall plate uses the client's own 4:3 catalogue
 * crop (`clientPhotoCard`) inside a 4:3 frame, and the viewer uses the same
 * photograph's 3:2 feature crop (`clientPhotoWide`) inside a contain frame — so
 * the picture the browser draws is the picture the build published, whole.
 * The park photographs are the client's 16:9 originals, drawn in a 16:9 frame.
 *
 * `lib/client-photos.ts` is the description record (what each photograph
 * actually shows and its honesty class); this module only chooses which of them
 * the gallery publishes, in what order, and at which published size.
 */
import { CHAPEL_SAMPLE_NOTE } from "@/lib/media";
import { clientPhoto, clientPhotoCard, clientPhotoWide, type ClientPhotoId } from "@/lib/client-photos";

export type GalleryPhoto = {
  /** Stable key and the photograph's record id. */
  id: string;
  /** The 4:3 catalogue crop the wall draws — always whole in a 4:3 frame. */
  src: string;
  /** Responsive candidates, when the photograph has more than one width. */
  srcSet: string;
  /** The layout width the browser should plan for. */
  sizes: string;
  /** Published pixel size — reserves the plate before the file arrives. */
  width: number;
  height: number;
  /** The 3:2 feature crop the viewer draws, whole inside its contain frame. */
  viewerSrc: string;
  viewerWidth: number;
  viewerHeight: number;
  /** Describes the photo truthfully; samples say they are samples. */
  alt: string;
  /** A few words under the photo (the reading budget's caption rule). */
  caption: string;
  /** True when the sheet marks the photograph a sample (the short chip shows). */
  sample: boolean;
  /**
   * The frame the wall draws it in. `plate` is the client's 4:3 catalogue crop
   * in a 4:3 frame; `wide` is a 16:9 photograph (the park's) in a 16:9 frame.
   * Either way the frame matches the published picture, so nothing is cropped.
   */
  frame: "plate" | "wide";
};

export type GalleryGroup = {
  id: string;
  kicker: string;
  heading: string;
  /** One short line; the page's prose budget is measured over these. */
  intro: string;
  photos: readonly GalleryPhoto[];
};

/**
 * The wall plate's rendered box: three across the catalogue envelope's wall and
 * two across a phone, so the browser plans for ~300 px / ~47vw. An underestimated
 * hint makes it stretch the next-smaller derivative; an overstated one fetches a
 * heavier file than the plate shows.
 */
const PLATE_SIZES = "(max-width: 48rem) 47vw, 300px";

/** Build a wall plate from one client photograph record. */
function clientPlate(id: ClientPhotoId, caption: string): GalleryPhoto {
  const record = clientPhoto(id);
  const card = clientPhotoCard(id);
  const wide = clientPhotoWide(id);
  return {
    id,
    src: card.src,
    srcSet: card.srcSet,
    sizes: PLATE_SIZES,
    width: card.width,
    height: card.height,
    viewerSrc: wide.src,
    viewerWidth: wide.width,
    viewerHeight: wide.height,
    alt: record.alt,
    caption,
    sample: record.honesty === "illustration-only",
    frame: "plate",
  };
}

/** Build a srcset from the generated park file names. */
function parkSet(name: string, widths: readonly number[]): string {
  return widths.map((width) => `/media/gallery/${name}-${width}.webp ${width}w`).join(", ");
}

function parkPlate(
  id: "park-gate" | "park-pavilion",
  size: { src: string; width: number; height: number },
  widths: readonly number[],
  viewer: { src: string; width: number; height: number },
  caption: string,
  alt: string,
): GalleryPhoto {
  return {
    id,
    src: size.src,
    srcSet: parkSet(id, widths),
    sizes: "(max-width: 48rem) 100vw, 27rem",
    width: size.width,
    height: size.height,
    viewerSrc: viewer.src,
    viewerWidth: viewer.width,
    viewerHeight: viewer.height,
    alt,
    caption,
    sample: false,
    frame: "wide",
  };
}

/**
 * The client's own gate photograph — the site's established hero/OG image. Its
 * caption names the sign the photo actually shows. It leads the park band, whole
 * (the published derivative is the 16:9 original, no re-crop).
 */
export const GALLERY_GATE = parkPlate(
  "park-gate",
  { src: "/media/gallery/park-gate-1024.webp", width: 1626, height: 916 },
  [640, 1024, 1626],
  { src: "/media/gallery/park-gate-1626.webp", width: 1626, height: 916 },
  "The entrance gate — Sanctuario de Mercedes y Gloria.",
  "The park's entrance gate, with the stone sign reading Sanctuario de Mercedes y Gloria and the drive behind it",
);

/** The one real wide photograph of the grounds, kept apart from the promo tile. */
export const GALLERY_GROUNDS = parkPlate(
  "park-pavilion",
  { src: "/media/gallery/park-pavilion-940.webp", width: 940, height: 545 },
  [640, 940],
  { src: "/media/gallery/park-pavilion-940.webp", width: 940, height: 545 },
  "The pavilion and the grounds, with the hills beyond.",
  "The park's open pavilion and lawn, with visitors on the tiled floor and green hills behind",
);

/**
 * The gate photograph under its older name. `GALLERY_HERO` was this module's
 * page-hero export before the wall moved it into the park set; the contact page
 * (landed 2026-09-30) still draws it as its visit figure, so the name stays a
 * compatibility alias for `GALLERY_GATE`'s source fields. New surfaces use
 * `GALLERY_GATE`.
 */
export const GALLERY_HERO = {
  src: GALLERY_GATE.src,
  srcSet: GALLERY_GATE.srcSet,
  sizes: GALLERY_GATE.sizes,
  width: GALLERY_GATE.width,
  height: GALLERY_GATE.height,
  alt: GALLERY_GATE.alt,
  caption: GALLERY_GATE.caption,
} as const;

/**
 * The three sets, in the order the page renders them.
 *
 *  · The park — the client's one whole park photograph, the pavilion and the
 *    grounds. (The entrance-gate photograph is NOT on the gallery: the captain
 *    removed it, inbox 010, 2026-09-30; it stays the contact page's visit
 *    figure through `GALLERY_HERO` below.)
 *  · The coffins and the carriage — the six published coffin photographs and the
 *    two angles of the office's karwahe.
 *  · The chapel and the viewing — the hall and the set-ups.
 *
 * Every one of the fourteen published client photographs is here; the 419 px
 * sheet carriage duplicate the page used to print is retired (the client's own
 * 960 px carriage photographs are in its place). No model is named: the open
 * client question — which photograph is which named model — stays unanswered
 * on the page.
 */
export const GALLERY_GROUPS: readonly GalleryGroup[] = [
  {
    id: "park",
    kicker: "The park",
    heading: "The grounds and the setting",
    intro: "The park's own photograph of the pavilion and the grounds.",
    photos: [GALLERY_GROUNDS],
  },
  {
    id: "care",
    kicker: "The coffins & the carriage",
    heading: "What the family is choosing between",
    intro: "Coffins and the karwahe — every sample is labelled.",
    photos: [
      clientPlate("casket-white-gold-glass-lid", "A white and gold casket with the full-glass lid raised."),
      clientPlate("casket-white-gold-closed", "The white casket with its full-glass lid closed."),
      clientPlate("casket-white-gold-wreath-lid", "A white casket with a gold-lined lid and a laurel wreath interior."),
      clientPlate("casket-wood-white-gold-bible-lid", "The wood-and-gold casket, its interior embroidered with an open bible."),
      clientPlate("casket-white-open-lid", "A plain white casket with its lid raised, in the chapel hall."),
      clientPlate("casket-white-closed", "A plain white casket with silver ornaments in the office's own care."),
      clientPlate("hearse-carriage-gold-side", "The karwahe, banked with white flowers."),
      clientPlate("hearse-carriage-gold-rear", "The karwahe from behind, on the way out."),
    ],
  },
  {
    id: "chapels",
    kicker: "Chapel & viewing",
    heading: "Chapels, viewing and the march",
    intro: "The hall and the set-ups the office builds with the family.",
    photos: [
      clientPlate("chapel-hall-candle-pedestals", "The chapel hall and its candle pedestals."),
      clientPlate("chapel-hall-flags", "The chapel hall from the platform, the candle pedestals lit."),
      clientPlate("wake-setup-lamp-alcove", "A prepared viewing alcove, draped and lit."),
      clientPlate("wake-setup-casket-draped", "A casket in a draped viewing room, being dressed."),
      clientPlate("wake-setup-flower-bank", "A finished wake set-up, the casket banked in white flowers."),
      clientPlate("wake-setup-dressing", "The set-up being built, before the family arrives."),
    ],
  },
];

/** Every photograph the page can draw, in wall order — the viewer's list. */
export const GALLERY_PHOTOS: readonly GalleryPhoto[] = GALLERY_GROUPS.flatMap(
  (group) => group.photos,
);

/** The honest count the opening's trust row prints. */
export const GALLERY_PHOTO_COUNT = GALLERY_PHOTOS.length;
export const GALLERY_SET_COUNT = GALLERY_GROUPS.length;

/** The one full sample sentence, printed once per band and once per sample viewer. */
export const GALLERY_SAMPLE_NOTE = CHAPEL_SAMPLE_NOTE;

/** The one honest summary of where every photograph on the page came from. */
export const GALLERY_PROVENANCE_NOTE =
  "Every photograph here is the park's own; sample set-ups are labelled.";

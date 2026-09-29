import {
  clientPhoto,
  clientPhotoCard,
  clientPhotoWide,
  type ClientPhotoId,
} from "@/lib/client-photos";

/**
 * Generic garden/park photo used as a fallback where no dedicated asset
 * exists. (memorial-park.jpg was retired from the media folder — this now
 * points at an asset that is actually shipped.)
 */
export const SAMPLE_PARK_IMAGE = "/media/hero-1.jpg";

/** Transport service photo (uploaded). */
export const TRANSPORT_IMAGE = "/media/transport.jpg";

/** Villa's real park aerial (uploaded) — used as the Villa Memorial map image. */
export const VILLA_PARK_AERIAL = "/media/the%20very%20first%20memorial%20park%20in%20basilan.jpg";
/** Landing hero photo (uploaded). */
export const HERO_IMAGE = "/media/hero-1.jpg";
/**
 * Plans/packages marketing image (uploaded) — the client's plan poster.
 *
 * F-17 (2026-09-18): the poster's own advisor strip printed a prototype
 * placeholder number ("0917 123 4567", the same fake line the advisor cards
 * used to type) beneath the real 24/7 line the site publishes. The strip's
 * left band was masked to plain navy — the poster art and the gold tagline
 * panel are untouched; scripts/build-composition-images.mjs re-derives the
 * committed thumbs from this file. If the poster is ever replaced with new
 * client art, check its baked-in contact details against the landing contact
 * document before publishing it.
 */
export const PLAN_PACKAGES_IMAGE = "/media/plan-packages.png";

/* ---------------------------------------------------------------------------
 * Composition-pass derivatives (captain 2026-09-18: "looks so generic… built by
 * AI" — the composition half of that review).
 *
 * The client's own lot tiles (public/media/lot-*.png) are MARKETING TILES: a
 * 1254×1254 PNG carrying the group's logo lock-up in one corner and the family
 * name set large across the bottom, over a photograph of the actual place. A
 * tile is right as a legend swatch and wrong as a band image — repeating it
 * tiles baked-in marketing type across a composition.
 *
 * scripts/build-composition-images.mjs therefore extracts each tile's
 * PHOTOGRAPH only (its own documented rectangle, past the logo and above the
 * title band) into public/media/composition/*.webp, the same move
 * scripts/build-gallery-images.mjs makes for the client's promo composite. The
 * originals stay committed and untouched; nothing here is re-coloured, and no
 * crop invents a place that is not in the client's own tile.
 * ------------------------------------------------------------------------- */

/** The park's own places, photograph-only, at 1×/2× card widths. */
export const PARK_PLACE_PHOTOS = {
  prime: "/media/composition/prime-lot-720.webp",
  premium: "/media/composition/premium-lot-720.webp",
  niches: "/media/composition/garden-niches-720.webp",
  mausoleum: "/media/composition/mausoleum-720.webp",
  grounds: "/media/gallery/park-pavilion-940.webp",
  gate: "/media/gallery/park-gate-1024.webp",
} as const;

/**
 * The same photographs keyed by the park's seeded LEGEND type id
 * (lib/park-types.ts), so a surface that knows a plot's legend type can show the
 * place without reaching for the marketing tile. Types the client never
 * photographed the place for (main road, walking path, landscape, standard) are
 * absent on purpose — the caller falls back to the generic park photo, which is
 * honest, rather than to a picture of a different kind of place.
 */
export const PARK_PLACE_BY_TYPE: Readonly<Record<string, string>> = {
  "lt-primary": PARK_PLACE_PHOTOS.prime,
  "lt-premium": PARK_PLACE_PHOTOS.premium,
  "lt-garden": PARK_PLACE_PHOTOS.niches,
  "lt-niches": PARK_PLACE_PHOTOS.niches,
  "lt-mausoleum": PARK_PLACE_PHOTOS.mausoleum,
};
/** Lot category photos (uploaded) — canonical map: park Legend type id → the
 * photo attached to that plot type. Public lot surfaces read THIS map so the
 * photo shown on the landing/lots pages is always the one attached in the park
 * map (edit it here once and both stay in sync). */
export const LOT_TYPE_PHOTOS = {
  "lt-primary": "/media/lot-primary.png",
  "lt-premium": "/media/lot-premium.png",
  "lt-niches": "/media/lot-garden-niches.png",
  "lt-mausoleum": "/media/lot-mausoleum.png",
} as const;

/** Back-compat aliases (landing tiles / price list strip). */
export const LOT_MAUSOLEUM = LOT_TYPE_PHOTOS["lt-mausoleum"];
export const LOT_GARDEN_NICHES = LOT_TYPE_PHOTOS["lt-niches"];
export const LOT_PREMIUM = LOT_TYPE_PHOTOS["lt-premium"];
export const LOT_PRIMARY = LOT_TYPE_PHOTOS["lt-primary"];

/** PROVISIONAL demo mapping (Villa park sections → legend plot types) until the
 * dev's Lot/geometry contract ties real sections to products.
 *
 * The VALUES are the photograph-only composition derivatives, never the
 * marketing tiles: a lot detail page is a band image, and the tile's baked-in
 * “PRIMARY LOT”/logo lock-up would print inside a page that already names the
 * section (the composition pass made the same call on /lots — craft pass,
 * 2026-09-18; section D kept falling back to the generic park photo before). */
export const VILLA_SECTION_PHOTOS: Record<string, string> = {
  A: PARK_PLACE_BY_TYPE["lt-primary"],
  B: PARK_PLACE_BY_TYPE["lt-premium"],
  C: PARK_PLACE_BY_TYPE["lt-niches"],
  D: PARK_PLACE_BY_TYPE["lt-mausoleum"],
};

/** Client logo marks (uploaded): the park crest and the plan's two companies.
 * The crest is also the staff-editable header/footer brand mark (landing
 * content logo.markImage). */
export const LOGO_SANCTUARIO = "/media/logo-sanctuario.png";
export const LOGO_VILLA_GROUP = "/media/logo-villa-group.png";
export const LOGO_VILLA_AGENCY = "/media/logo-villa-agency.png";

/** Viewing/wake set-up photo (uploaded) — the home rails' lead image. */
export const VIEWING_CARE_IMAGE = "/media/viewing-care.jpg";

/** Client's own 2026 sheets (rasterised from the client library) — the package
 * page's "The package at a glance" evidence strip (docs/prototypes/villa-home-ui/
 * package.html). Captions live beside each figure on the page. */
export const DOC_COMPLETE_PACKAGE = "/media/doc-complete-package.jpg";
export const DOC_TYPES_OF_COFFIN = "/media/doc-types-of-coffin.jpg";
export const DOC_PRICE_LIST_2026_II = "/media/doc-price-list-2026-II.jpg";
export const DOC_PRICE_LIST_2026_III = "/media/doc-price-list-2026-III.jpg";

/** Coffin tier photos (uploaded). */
export const COFFIN_BRONZE = "/media/bronze-casket.jpg";
export const COFFIN_SILVER = "/media/silver-casket.jpg";
export const COFFIN_GOLD = "/media/gold-casket.jpg";

/* ---------------------------------------------------------------------------
 * Client sample photographs, cropped from the client's own "TYPES OF COFFIN"
 * sheet by scripts/crop-client-sheet-tiles.mjs (run that script with the client
 * sheet path to regenerate them into public/media/).
 *
 * The sheet prints "(Illustration purposes only)" under its sample photographs,
 * so every image below is published as an illustrative SAMPLE SET-UP or SAMPLE
 * COFFIN — never captioned as the actual chapel, a fixed layout, or the exact
 * model a family receives. Views must keep saying so (CHAPEL_SAMPLE_NOTE /
 * SERVICE_SAMPLE_NOTE / COFFIN_TIER_NOTE).
 * ------------------------------------------------------------------------- */

/** The sheet's "OUR SAMPLE SERVICES" photographs. */
export const CHAPEL_COMMON_IMAGE = "/media/chapel-common.jpg";
export const CHAPEL_PRIVATE_IMAGE = "/media/chapel-private.jpg";
export const SERVICE_CARRIAGE_IMAGE = "/media/service-carriage.jpg";

/**
 * The sheet's own label for its sample imagery — chapels, wake set-ups.
 * Compressed to the reading budget (captain 2026-09-18): the provenance
 * (cropped from the client's sheet) lives in the repo docs; the customer page
 * keeps only the promise the label exists to make.
 */
export const CHAPEL_SAMPLE_NOTE = "Illustration purposes only — sample set-up.";

/** The same label for the sample service photographs (carriage, set-ups). */
export const SERVICE_SAMPLE_NOTE =
  "Illustration purposes only — sample service; the carriage and set-up vary.";

/**
 * The five sample coffins on the sheet, in the sheet's order. `label` is the
 * sheet's own tier line, qualified as a sample — used for alt text and captions.
 */
export const COFFIN_SAMPLE_PHOTOS: ReadonlyArray<{
  tier: string;
  src: string;
  label: string;
}> = [
  { tier: "Bronze 1", src: "/media/coffin-bronze-1.jpg", label: "Bronze 1 sample — half-glass lid" },
  { tier: "Bronze 2", src: "/media/coffin-bronze-2.jpg", label: "Bronze 2 sample — full glass lid" },
  { tier: "Silver 1", src: "/media/coffin-silver-1.jpg", label: "Silver 1 sample — half-glass lid, larger and more elegant than Bronze" },
  { tier: "Silver 2", src: "/media/coffin-silver-2.jpg", label: "Silver 2 sample — full glass lid, larger and more elegant than Bronze" },
  { tier: "Gold", src: "/media/coffin-gold.jpg", label: "Gold sample — special metal, cover convertible to full-glass or half-glass" },
];

/** A catalogue model's own facts, as an image picker needs them. */
type CasketSampleKey = { collection: string; model: string };

/* ---------------------------------------------------------------------------
 * The client's own 2026 photographs — the casket catalogue's imagery.
 *
 * The client supplied 14 usable photographs (six of caskets, two of the
 * karwahe, two of the chapel hall, four of wake set-ups). Their record and the
 * honesty rule live in lib/client-photos.ts; this is the MODEL → PHOTOGRAPH
 * decision, written out as an explicit 24-row table so a reviewer can check it
 * rather than trust it.
 *
 * WHY A TABLE AND NOT A NAME MATCH. The client's folder calls the coffins
 * Tribute, Serenity, Everlasting, Divine Rest and Heaven's Gate. The 2026 price
 * sheets sell White Rose, Angelica, Magnolia, Noble, Royal, Monarch, Majesty,
 * Emperor, Imperial and Lumina. Nobody has reconciled the two lists (open client
 * question, opened 2026-09-19 with this import), so NO photograph may be
 * published as "the White Rose Full". Two rules fix every row instead:
 *
 *   · the COVER the model's own name states leads the choice — a "Half" model
 *     is shown lid-down or on its half stay, a "Full" / "Full Split" / "Flexi"
 *     model with the raised cover the sheet's convertible line describes;
 *   · within one cover class the COLLECTION's own price band picks the finish —
 *     the entry Lumina is the plain white coffin, the Dynasty band the
 *     wood-and-gold shell — and the table is laid out so no two neighbouring
 *     cards, and no two models of one family, print the same picture.
 *
 * The honest limit, stated where it belongs: six photographs cannot be
 * twenty-four coffins. Every card therefore carries the sample chip and the
 * sheet's substitution note, `tests/unit/catalogue-imagery.test.ts` walks this
 * table and reports how often each photograph is used, and the PR names the
 * models that still have no photograph of their own.
 *
 * Every surface publishing these repeats the record's own label and the sheet's
 * substitution note (COFFIN_TIER_NOTE), so a family always reads what the
 * picture is: a sample from the client's photographs, not this exact model.
 * ------------------------------------------------------------------------- */
export const CASKET_MODEL_PHOTOS: Readonly<Record<string, ClientPhotoId>> = {
  // The entry collection is the plain white coffin, lid down.
  Lumina: "casket-white-closed",
  // White Rose — the client's white-and-gold coffin, half then full cover.
  "White Rose Half": "casket-white-gold-closed",
  "White Rose Full": "casket-white-gold-glass-lid",
  // Angelica — plain white half, then the wreath-interior full lid.
  "Angelica Half": "casket-white-closed",
  "Angelica Full": "casket-white-gold-wreath-lid",
  // Magnolia — white-and-gold half, then the open-lid chapel photograph.
  "Magnolia Half": "casket-white-gold-closed",
  "Magnolia Full": "casket-white-open-lid",
  // Noble — plain white half; the fulls step up to the wood-and-gold shell.
  "Noble Half": "casket-white-closed",
  "Noble Full": "casket-wood-white-gold-bible-lid",
  "Noble Full Split": "casket-white-gold-glass-lid",
  // Royal — the Crown band's middle: gold half, wreath full, open split.
  "Royal Half": "casket-white-gold-closed",
  "Royal Full": "casket-white-gold-wreath-lid",
  "Royal Full Split": "casket-white-open-lid",
  // Monarch — the top of the Crown band.
  "Monarch Half": "casket-white-closed",
  "Monarch Full": "casket-wood-white-gold-bible-lid",
  // Majesty — the Dynasty band opens on the full-glass white-and-gold lids.
  "Majesty Full": "casket-white-gold-glass-lid",
  "Majesty Full Split": "casket-white-gold-wreath-lid",
  "Majesty Flexi": "casket-wood-white-gold-bible-lid",
  // Emperor — the open lid, then the convertible pair.
  "Emperor Full": "casket-white-open-lid",
  "Emperor Full Split": "casket-white-gold-glass-lid",
  "Emperor Flexi": "casket-white-gold-wreath-lid",
  // Imperial — the richest finish closes the catalogue.
  "Imperial Full": "casket-wood-white-gold-bible-lid",
  "Imperial Full Split": "casket-white-open-lid",
  "Imperial Flexi": "casket-white-gold-glass-lid",
};

/**
 * The one photograph a catalogue model shows, by the table above. The result is
 * deterministic, which is what the pages and tests rely on; a model the table
 * does not name falls back to the white-and-gold coffin rather than to nothing.
 */
export function casketModelPhotoId(model: CasketSampleKey): ClientPhotoId {
  return CASKET_MODEL_PHOTOS[model.model] ?? "casket-white-gold-closed";
}

/**
 * The illustrative photograph a catalogue model shows, its description and the
 * labels a view must publish: `label` (what the picture is), `alt` (what a
 * screen reader gets) and `note` (the sheet's illustration-only line).
 */
export type CasketPhotoChoice = {
  id: ClientPhotoId;
  src: string;
  srcSet: string;
  label: string;
  what: string;
  alt: string;
  note: string;
  /** The 3:2 feature crop — detail leads, hero figures. */
  wide: { src: string; srcSet: string; width: number; height: number };
  /** The 4:3 catalogue crop — shop cards, rows, rails. */
  card: { src: string; srcSet: string; width: number; height: number };
};

export function casketSamplePhoto(model: CasketSampleKey): CasketPhotoChoice {
  const id = casketModelPhotoId(model);
  const photo = clientPhoto(id);
  const card = clientPhotoCard(id);
  const wide = clientPhotoWide(id);
  return {
    id,
    src: card.src,
    srcSet: card.srcSet,
    card,
    wide,
    label: photo.label,
    what: photo.what,
    alt: photo.alt,
    note: "Illustration purposes only — a sample from the client's own photographs, not this model.",
  };
}

/* ---------------------------------------------------------------------------
 * The same client photographs, where the subject IS the thing named: the
 * karwahe, the chapel hall, the wake set-ups. These are `client-photo` entries
 * (lib/client-photos.ts), so their caption says whose photograph it is and the
 * set-up ones still say the office builds the real one with the family.
 * ------------------------------------------------------------------------- */

/** The office's own funeral carriage (karwahe), two angles. */
export const HEARSE_CARRIAGE_SIDE_IMAGE = clientPhotoWide("hearse-carriage-gold-side").src;
export const HEARSE_CARRIAGE_REAR_IMAGE = clientPhotoWide("hearse-carriage-gold-rear").src;

/** The chapel hall the client photographed, and its second angle. */
export const CHAPEL_HALL_PEDESTALS_IMAGE = clientPhotoWide("chapel-hall-candle-pedestals").src;
export const CHAPEL_HALL_FLAGS_IMAGE = clientPhotoWide("chapel-hall-flags").src;

/** The client's own wake set-ups, in the order a service page walks them. */
export const WAKESETUP_DRESSING_IMAGE = clientPhotoWide("wake-setup-dressing").src;
export const WAKESETUP_CASKET_IMAGE = clientPhotoWide("wake-setup-casket-draped").src;
export const WAKESETUP_ALCOVE_IMAGE = clientPhotoWide("wake-setup-lamp-alcove").src;
export const WAKESETUP_FLOWERS_IMAGE = clientPhotoWide("wake-setup-flower-bank").src;

/** Landing page media library — the REAL uploaded assets a staff editor may attach
 * to rails, plan cards, hero/about photos and blog posts. Labelled so pickers can
 * show a human name next to each thumbnail. Same store feeds every editor picker.
 */
export const MEDIA_LIBRARY: ReadonlyArray<{ src: string; label: string }> = [
  { src: HERO_IMAGE, label: "Park grounds — golden hour" },
  { src: VILLA_PARK_AERIAL, label: "Villa Memorial Park — aerial" },
  { src: "/media/at_need_services.jpg", label: "At-need care" },
  { src: PLAN_PACKAGES_IMAGE, label: "Plans & packages" },
  { src: TRANSPORT_IMAGE, label: "Transport fleet" },
  { src: COFFIN_BRONZE, label: "Bronze casket" },
  { src: COFFIN_SILVER, label: "Silver casket" },
  { src: COFFIN_GOLD, label: "Gold casket" },
  { src: CHAPEL_COMMON_IMAGE, label: "Sample wake set-up — common chapel" },
  { src: CHAPEL_PRIVATE_IMAGE, label: "Sample decorated viewing room — private chapel" },
  { src: SERVICE_CARRIAGE_IMAGE, label: "Sample funeral carriage" },
  ...COFFIN_SAMPLE_PHOTOS.map((p) => ({ src: p.src, label: p.label })),
  { src: LOT_TYPE_PHOTOS["lt-primary"], label: "Prime lot" },
  { src: LOT_TYPE_PHOTOS["lt-premium"], label: "Premium lot" },
  { src: LOT_TYPE_PHOTOS["lt-niches"], label: "Garden niches" },
  { src: LOT_TYPE_PHOTOS["lt-mausoleum"], label: "Mausoleum" },
];

export function mediaLabel(src: string): string {
  return MEDIA_LIBRARY.find((m) => m.src === src)?.label ?? "Uploaded media";
}

/**
 * The home "Memorial plans & garden lots" band's photograph per card.
 *
 * A card stores a live lot family + product row (or a plan tier); neither is a
 * picture. Rather than leave a glyph where the client has a real photograph of
 * the place, each card falls back to this ONE map — keyed by the bound lot
 * product, never by the card's title — so the picture is derived exactly as the
 * figure is (lib/landing/plan-lots.ts). A staff-set photo on the card still wins
 * (lib/api-client/landing.ts `PlanLotCard.image`).
 *
 * The values are the PHOTOGRAPH-ONLY composition derivatives, never the lot
 * marketing tiles (a tile's baked-in logo/type is not a page picture).
 */
export const PLAN_LOT_CARD_PHOTOS: Readonly<Record<string, string>> = {
  "Premium Lots": PARK_PLACE_PHOTOS.premium,
  "Prime Lots": PARK_PLACE_PHOTOS.prime,
  "Garden Niches": PARK_PLACE_PHOTOS.niches,
  Mausoleum: PARK_PLACE_PHOTOS.mausoleum,
};

/** The plan card's own photograph — the client's wake/viewing set-up, not artwork. */
export const PLAN_CARD_PHOTO = "/media/gallery/wake-viewing-840.webp";

/**
 * The fallback photograph for a plans-and-lots card, or null when the bound
 * product has no photographed place (the card then renders text-only — it never
 * borrows a wrong picture).
 */
export function planLotCardPhoto(kind: string, product: string): string | null {
  if (kind === "plan") return PLAN_CARD_PHOTO;
  return PLAN_LOT_CARD_PHOTOS[product] ?? null;
}

/* ---------------------------------------------------------------------------
 * Library thumbnails — the sized WebP for a staff-picked media-library image.
 *
 * The library holds print-sized uploads (the lot tiles are 2.2–2.6 MB PNGs, the
 * plan artwork 1.9 MB) while the surfaces that pick from it render 3.2–24rem:
 * the home's rails, its About figure and the staff editor's picker. Asking a
 * phone for 12 MB to paint 300 px of image was the landing page's remaining
 * weight defect, so scripts/build-composition-images.mjs publishes 320/640/960 px
 * WebP for every library entry and these two helpers turn a library path into it.
 * 960 serves the one figure that renders wider than a thumb — the park aerial on
 * /facilities (45rem), which was upscaling a 640 (imagery pass, 2026-09-19).
 *
 * `libraryThumb` is total: an asset the script does not know (a staff URL, a
 * device upload's data URL, a newly added file) comes back unchanged, so a view
 * can always call it.
 * ------------------------------------------------------------------------- */

/** The published thumbnail widths (1× mobile rail / 2× and the wide figures). */
export const LIBRARY_THUMB_WIDTHS = [320, 640, 960] as const;

/* --- the client masterplan's published web derivative ---------------------- */

/** The client's own masterplan — the spatial source of truth. Never swapped. */
export const PARK_MAP_SOURCE = "/media/Park%20map.png";

/**
 * The SAME 1254 × 1254 pixels as the masterplan, re-encoded as WebP:
 * 2,331 KB → 209 KB (91% off), with not one pixel moved.
 *
 * WHY SAME-SIZE MATTERS, AND WHY THIS IS A DISPLAY CONCERN.
 * `lib/park-3d/masterplan.ts` records the plan as 1254 × 1254 and every plot
 * coordinate is authored in that pixel space (`MASTERPLAN_PX`, `pxToWorld`,
 * `pxPathToWorld`). Resizing the image would silently move every plot, so the
 * derivative keeps the exact dimensions and changes only the encoding.
 *
 * The park RECORD's `image` field still points at the client's PNG: that field is
 * part of the 3D coordinate contract (`tests/unit/park-3d-coords.test.ts` pins
 * it) and AGENTS.md says the masterplan is not to be swapped. So the swap happens
 * HERE, at display time, for the surfaces that actually paint it in a browser —
 * the public 2D map and the staff editor. `scripts/build-park-map-derivative.mjs`
 * rebuilds the file and asserts the dimensions still match.
 */
export const PARK_MAP_DERIVATIVE = "/media/park-map-1254.webp";

/** The masterplan URL a screen should paint: its web derivative, or `src`
 *  unchanged for anything else (a staff-uploaded map, a device image). */
export function parkMapImage(src: string): string {
  return src === PARK_MAP_SOURCE ? PARK_MAP_DERIVATIVE : src;
}

/**
 * `/media/Some%20File.png` → `some-file`. The source is percent-decoded first
 * (the library stores the uploaded aerial with its spaces encoded), then MUST
 * stay identical to `mediaSlug()` in scripts/build-composition-images.mjs —
 * tests/unit/composition-pass.test.tsx fails on a library entry whose
 * derivative this rule cannot find.
 */
export function mediaSlug(src: string): string {
  const decoded = safeDecode(src);
  const file = decoded.split("/").pop() ?? decoded;
  return file
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** decodeURIComponent that never throws — a stray `%` must not break a view. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Every library path the thumbnail pass publishes (the script's own list). */
const LIBRARY_THUMB_SOURCES: ReadonlyArray<string> = [
  LOT_TYPE_PHOTOS["lt-primary"],
  LOT_TYPE_PHOTOS["lt-premium"],
  LOT_TYPE_PHOTOS["lt-niches"],
  LOT_TYPE_PHOTOS["lt-mausoleum"],
  PLAN_PACKAGES_IMAGE,
  VIEWING_CARE_IMAGE,
  COFFIN_GOLD,
  COFFIN_BRONZE,
  COFFIN_SILVER,
  TRANSPORT_IMAGE,
  "/media/at_need_services.jpg",
  HERO_IMAGE,
  VILLA_PARK_AERIAL,
];

/** The thumbnail WebP for a library image at `width`, or the source unchanged. */
export function libraryThumb(src: string, width: 320 | 640 | 960 = 320): string {
  if (!hasLibraryThumb(src)) return src;
  return `/media/composition/thumbs/${mediaSlug(src)}-${width}.webp`;
}

/** The 1×/2× srcset for a library image (undefined when there is no derivative). */
export function libraryThumbSet(src: string): string | undefined {
  if (!hasLibraryThumb(src)) return undefined;
  return LIBRARY_THUMB_WIDTHS.map((w) => `${libraryThumb(src, w)} ${w}w`).join(", ");
}

/**
 * The 480/720 srcset for a published composition derivative (the park place
 * photographs `PARK_PLACE_PHOTOS` names), or undefined for anything else. The
 * composition pass publishes both widths for every derivative; a caller that
 * already holds the -720 path gets the pair without rebuilding the rule.
 */
export function compositionThumbSet(src: string): string | undefined {
  if (!src.startsWith("/media/composition/") || !src.endsWith("-720.webp")) return undefined;
  return `${src.replace("-720.webp", "-480.webp")} 480w, ${src} 720w`;
}

/** Matched on the DECODED path, because the library stores the aerial encoded. */
function hasLibraryThumb(src: string): boolean {
  const decoded = safeDecode(src);
  return LIBRARY_THUMB_SOURCES.some((s) => safeDecode(s) === decoded);
}

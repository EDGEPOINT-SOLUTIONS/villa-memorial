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
 * dev's Lot/geometry contract ties real sections to products. */
export const VILLA_SECTION_PHOTOS: Record<string, string> = {
  A: LOT_TYPE_PHOTOS["lt-primary"],
  B: LOT_TYPE_PHOTOS["lt-premium"],
  C: LOT_TYPE_PHOTOS["lt-niches"],
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

/**
 * PROVISIONAL collection → sample-photograph binding for the casket detail
 * views. The client's sheet photographs five sample coffins (Bronze 1/2,
 * Silver 1/2, Gold) but never maps them to the 24 named models of the 2026
 * casket catalogue, so this binding is an editorial illustration — it is NOT a
 * published claim that a model ships as photographed. Views must caption the
 * result as an illustrative sample and repeat the sheet's substitution note
 * (COFFIN_TIER_NOTE); tests/unit/villa-services-premium.test.tsx pins that.
 * Open client question: which sample photograph belongs to Lumina / the White
 * Rose / Crown / Dynasty collections.
 *
 * Rule (documented, so an editor can see why): the entry collection shows the
 * Bronze sample; a White Rose model shows the Silver sample whose lid matches
 * the cover its name states ("Half" → Silver 1, "Full" → Silver 2); the Crown
 * and Dynasty collections show the Gold sample, whose cover the sheet itself
 * describes as convertible.
 */
const CASKET_COLLECTION_SAMPLES: Record<string, string> = {
  Lumina: "/media/coffin-bronze-1.jpg",
  "The White Rose Collection": "/media/coffin-silver-1.jpg",
  "The Crown Collection": "/media/coffin-gold.jpg",
  "The Dynasty Collection": "/media/coffin-gold.jpg",
};

/** The illustrative sample photograph for a catalogue model (see the note above). */
export function casketSamplePhoto(model: CasketSampleKey): { src: string; label: string } {
  const src =
    model.collection === "The White Rose Collection" && model.model.endsWith("Full")
      ? "/media/coffin-silver-2.jpg"
      : (CASKET_COLLECTION_SAMPLES[model.collection] ?? "/media/coffin-bronze-1.jpg");
  const photo = COFFIN_SAMPLE_PHOTOS.find((p) => p.src === src);
  return { src, label: photo?.label ?? "Client sample coffin" };
}

/** At-need service photos (uploaded). */
export const DEATH_AT_HOME_IMAGE = "/media/death_at_home.jpg";
export const DEATH_AT_HOSPITAL_IMAGE = "/media/death_at_hospital.jpg";

/**
 * Landing page media library — the REAL uploaded assets a staff editor may attach
 * to rails, plan cards, hero/about photos and blog posts. Labelled so pickers can
 * show a human name next to each thumbnail. Same store feeds every editor picker.
 */
export const MEDIA_LIBRARY: ReadonlyArray<{ src: string; label: string }> = [
  { src: HERO_IMAGE, label: "Park grounds — golden hour" },
  { src: VILLA_PARK_AERIAL, label: "Villa Memorial — aerial" },
  { src: "/media/at_need_services.jpg", label: "At-need care" },
  { src: DEATH_AT_HOME_IMAGE, label: "Death at home" },
  { src: DEATH_AT_HOSPITAL_IMAGE, label: "Death at hospital" },
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
 * The "Services we offer" band's photograph per card (the home's zone-05 cards).
 *
 * The card stores a lot family plus an icon key, both staff-edited; neither is a
 * picture. Rather than leave four identical glyph tiles on the busiest band of
 * the site, each card shows the client's OWN photograph of the thing it sells —
 * derived from the card's icon key through this one map, never typed into a view
 * or into the content document (exactly how the card's "from ₱X" line is derived
 * from its lot family through lib/pricing-model.ts).
 *
 * `alt` is empty on purpose: the photograph repeats the card's own title, so the
 * link's accessible name stays the words a customer reads.
 */
export const SERVICE_CARD_PHOTOS: Readonly<Record<string, string>> = {
  lot: PARK_PLACE_PHOTOS.prime,
  interment: "/media/at_need_services.jpg",
  plan: "/media/gallery/wake-viewing-840.webp",
  mausoleum: PARK_PLACE_PHOTOS.mausoleum,
};

/** The card's photograph, or null when the staff chose a key with no photo yet. */
export function serviceCardPhoto(icon: string): string | null {
  return SERVICE_CARD_PHOTOS[icon] ?? null;
}

/* ---------------------------------------------------------------------------
 * Library thumbnails — the sized WebP for a staff-picked media-library image.
 *
 * The library holds print-sized uploads (the lot tiles are 2.2–2.6 MB PNGs, the
 * plan artwork 1.9 MB) while the surfaces that pick from it render 3.2–24rem:
 * the home's rails, its About figure and the staff editor's picker. Asking a
 * phone for 12 MB to paint 300 px of image was the landing page's remaining
 * weight defect, so scripts/build-composition-images.mjs publishes a 320/640 px
 * WebP for every library entry and these two helpers turn a library path into it.
 *
 * `libraryThumb` is total: an asset the script does not know (a staff URL, a
 * device upload's data URL, a newly added file) comes back unchanged, so a view
 * can always call it.
 * ------------------------------------------------------------------------- */

/** The published thumbnail widths (1× mobile rail / 2× and the About figure). */
export const LIBRARY_THUMB_WIDTHS = [320, 640] as const;

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
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
  COFFIN_GOLD,
  COFFIN_BRONZE,
  COFFIN_SILVER,
  TRANSPORT_IMAGE,
  "/media/at_need_services.jpg",
  HERO_IMAGE,
  VILLA_PARK_AERIAL,
];

/** The thumbnail WebP for a library image at `width`, or the source unchanged. */
export function libraryThumb(src: string, width: 320 | 640 = 320): string {
  if (!hasLibraryThumb(src)) return src;
  return `/media/composition/thumbs/${mediaSlug(src)}-${width}.webp`;
}

/** The 1×/2× srcset for a library image (undefined when there is no derivative). */
export function libraryThumbSet(src: string): string | undefined {
  if (!hasLibraryThumb(src)) return undefined;
  return LIBRARY_THUMB_WIDTHS.map((w) => `${libraryThumb(src, w)} ${w}w`).join(", ");
}

/** Matched on the DECODED path, because the library stores the aerial encoded. */
function hasLibraryThumb(src: string): boolean {
  const decoded = safeDecode(src);
  return LIBRARY_THUMB_SOURCES.some((s) => safeDecode(s) === decoded);
}

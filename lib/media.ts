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
/** Plans/packages marketing image (uploaded). */
export const PLAN_PACKAGES_IMAGE = "/media/plan-packages.png";
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

/** The sheet's own label for its sample imagery — chapels, wake set-ups. */
export const CHAPEL_SAMPLE_NOTE =
  "Illustration purposes only — a sample wake set-up from the client's own photographs, not a fixed view of any one room.";

/** The same label for the sample service photographs (carriage, set-ups). */
export const SERVICE_SAMPLE_NOTE =
  "Illustration purposes only — a sample service from the client's own photographs; the carriage and set-up vary with each service.";

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

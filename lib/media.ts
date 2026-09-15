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

/** Coffin tier photos (uploaded). */
export const COFFIN_BRONZE = "/media/bronze-casket.jpg";
export const COFFIN_SILVER = "/media/silver-casket.jpg";
export const COFFIN_GOLD = "/media/gold-casket.jpg";

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
  { src: LOT_TYPE_PHOTOS["lt-primary"], label: "Prime lot" },
  { src: LOT_TYPE_PHOTOS["lt-premium"], label: "Premium lot" },
  { src: LOT_TYPE_PHOTOS["lt-niches"], label: "Garden niches" },
  { src: LOT_TYPE_PHOTOS["lt-mausoleum"], label: "Mausoleum" },
];

export function mediaLabel(src: string): string {
  return MEDIA_LIBRARY.find((m) => m.src === src)?.label ?? "Uploaded media";
}

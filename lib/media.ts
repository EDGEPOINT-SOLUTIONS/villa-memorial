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

/** Coffin tier photos (uploaded). */
export const COFFIN_BRONZE = "/media/bronze-casket.jpg";
export const COFFIN_SILVER = "/media/silver-casket.jpg";
export const COFFIN_GOLD = "/media/gold-casket.jpg";

/** At-need service photos (uploaded). */
export const DEATH_AT_HOME_IMAGE = "/media/death_at_home.jpg";
export const DEATH_AT_HOSPITAL_IMAGE = "/media/death_at_hospital.jpg";

import {
  clientPhoto,
  clientPhotoCard,
  type ClientPhotoId,
} from "@/lib/client-photos";
import { COFFIN_SKUS, planTierForPackageSku } from "@/lib/catalogue-skus";
import { casketSamplePhoto, PLAN_PACKAGES_IMAGE, libraryThumb, libraryThumbSet } from "@/lib/media";
import { COFFIN_TIER_PHOTO_IDS, PLAN_TIERS } from "@/lib/villa-pricing";

/**
 * One rule home for "what photograph does this catalogue item show".
 *
 * WHY IT EXISTS. /plans, /packages and /products each carry catalogue items and
 * each used to answer this differently — or not at all: the whole 42-item
 * catalogue rendered THREE images, every plan card reprinted the same poster, and
 * the client's own 2026 photographs appeared only on /products. The captain's
 * 2026-09-19 brief: every product and service with its own real photograph, at
 * one art direction. This module is the ONE map, so a card on /plans and the same
 * item's card on /packages cannot drift apart.
 *
 * THE HONESTY RULES, in the order they apply:
 *  1. a photograph that IS the thing named is published plainly (the client's
 *     karwahe, their chapel hall, the park) — no chip, no sample note;
 *  2. a photograph that stands in for something else is marked `sample` and
 *     carries a caption saying what it actually shows (the casket samples, the
 *     office's staff at work). The client's photographs are not reconciled with the 2026
 *     sheet model names — lib/client-photos.ts carries that open question and
 *     `casketShopPhoto` reuses lib/media.ts's own 24-row table;
 *  3. an item the client's material does not cover at all gets NO photograph
 *     rather than a wrong one — `catalogueItemPhoto` returns null and the card
 *     renders text only. `UNPHOTOGRAPHED_ITEM_NOTE` is the sentence the page puts
 *     beside the group when it happens.
 *
 * Files: every src below resolves to a committed file under `public/media`
 * (client derivatives, the composition derivatives, the client's plan poster, or
 * the office's own uploads) — tests/unit/catalogue-imagery.test.ts walks the map
 * and fails on a missing file, a model photo that disagrees with lib/media.ts, or
 * a sample published without its note.
 */
export type CatalogueItemPhoto = {
  /** The photograph's stable id: a client-photo id, or a media constant's slug. */
  id: string;
  src: string;
  srcSet?: string;
  /** The intrinsic size of `src`, when the file declares one. */
  width?: number;
  height?: number;
  alt: string;
  /** True when the photograph stands in for something it does not show. */
  sample?: boolean;
  /** What the photograph actually is. Set exactly when `sample` is. */
  caption?: string;
};

/** The plan's own published poster — the client's art, not a sample. */
function planPoster(width: 640 | 960 = 960): CatalogueItemPhoto {
  return {
    id: "plan-packages",
    src: libraryThumb(PLAN_PACKAGES_IMAGE, width),
    srcSet: libraryThumbSet(PLAN_PACKAGES_IMAGE),
    alt: "The client's 2026 Villa Memorial Plan poster",
  };
}

/** A client photograph published as the thing itself. */
function clientPhotoOf(id: ClientPhotoId, alt?: string): CatalogueItemPhoto {
  const card = clientPhotoCard(id);
  const record = clientPhoto(id);
  return {
    id,
    src: card.src,
    srcSet: card.srcSet,
    width: card.width,
    height: card.height,
    alt: alt ?? record.alt,
  };
}

/**
 * A client photograph that stands in for something it does not show.
 *
 * The caption is deliberately SHORT here, unlike the catalogue's. /plans is a
 * reading-budget page (tests/unit/reading-budget.test.tsx): every `<li>` on it
 * must stay within thirty words, and one card carries the chip, the caption, the
 * name, the SKU, the price and three actions. The full substitution note and the
 * record's own description of the photograph stay on the item's detail page,
 * where there is room to read them; the card says what the picture is and stops.
 */
function sampleOf(id: ClientPhotoId, caption: string): CatalogueItemPhoto {
  return {
    ...clientPhotoOf(id),
    sample: true,
    caption: `${caption} Sample only.`,
  };
}

/** A casket model's photograph — the same choice /products and /packages make. */
function casketShopPhoto(model: string): CatalogueItemPhoto {
  const sample = casketSamplePhoto({ collection: "", model });
  return {
    id: sample.id,
    src: sample.card.src,
    srcSet: sample.card.srcSet,
    width: sample.card.width,
    height: sample.card.height,
    alt: `Illustrative sample coffin — ${sample.alt}`,
    sample: true,
    // The short form of the sheet's note: /plans budgets every list item to thirty
    // words (see sampleOf above). /products and the detail page print the sheet's
    // full substitution sentence.
    caption: `${sample.label}. Illustration only.`,
  };
}

/** A package's photograph: the casket tier its own catalogue mapping names. */
function packagePhoto(sku: string): CatalogueItemPhoto {
  const tier = planTierForPackageSku(sku);
  const tierName = tier ? PLAN_TIERS.find((entry) => entry.id === tier)?.name : undefined;
  const photoId = tierName ? COFFIN_TIER_PHOTO_IDS[tierName] : undefined;
  if (!photoId) return planPoster();
  const record = clientPhoto(photoId);
  return sampleOf(photoId, `${record.label} — this plan&rsquo;s entry casket.`);
}

/**
 * The service lines' photographs. Every one is the client's own material where
 * the client photographed the thing, and an explicitly captioned stand-in where
 * they did not (the office has no photograph of the preparation itself — the
 * honest picture of their work is the set-up their staff build).
 */
const SERVICE_PHOTOS: Readonly<Record<string, CatalogueItemPhoto>> = {
  "SRV-RETRIEVAL": {
    id: "at-need-services",
    src: libraryThumb("/media/at_need_services.jpg", 960),
    alt: "A funeral attendant holding a single rose beside a casket",
    sample: true,
    caption: "The office&rsquo;s at-need call. Illustration only.",
  },
  "SRV-DELIVERY": {
    id: "transport",
    src: libraryThumb("/media/transport.jpg", 960),
    alt: "A hearse carrying a floral arrangement",
    sample: true,
    caption: "A hearse in service. Illustration only.",
  },
  "SRV-VIEWING": sampleOf("wake-setup-lamp-alcove", "The office&rsquo;s own viewing set-up."),
  "SRV-INTERMENT": {
    id: "memorial-park",
    src: libraryThumb("/media/the very first memorial park in basilan.jpg", 960),
    alt: "The entrance and grounds of Villa Memorial Park",
  },
  "SRV-ORD-COFFIN": sampleOf("casket-white-closed", "A plain coffin the office provides."),
  "CHP-COMMON-DAY": clientPhotoOf(
    "chapel-hall-candle-pedestals",
    "The client's own chapel hall — candle pedestals on the green carpet runner, the drapped white table beside them",
  ),
  "CHP-PRIVATE-DAY": clientPhotoOf(
    "chapel-hall-flags",
    "The client's own chapel hall from the platform — the lit candle pedestals and the hall's panelled front",
  ),
};

/**
 * The one photograph a catalogue item shows, or null when the client's material
 * does not cover it. Adding a photograph for an item means adding a rule here and
 * a file under `public/media` — never typing a URL into a view.
 */
export function catalogueItemPhoto(sku: string): CatalogueItemPhoto | null {
  const casket = COFFIN_SKUS.find((entry) => entry.sku === sku);
  if (casket) return casketShopPhoto(casket.model);
  if (sku.startsWith("PKG-")) return packagePhoto(sku);
  if (SERVICE_PHOTOS[sku]) return SERVICE_PHOTOS[sku];
  // The embalming ladder (SRV-EMBALM-3D … SRV-EMBALM-9D plus the extra day) is
  // one service priced per day; the client has no photograph of the preparation
  // itself, so all of them share the office's own picture of their staff at work
  // and say so.
  if (sku.startsWith("SRV-EMBALM")) {
    return sampleOf("wake-setup-dressing", "The office&rsquo;s staff at work.");
  }
  return null;
}

/** The sentence a page prints beside a group when an item has no photograph. */
export const UNPHOTOGRAPHED_ITEM_NOTE =
  "Items marked “Ask the office” have no photograph in the client's 2026 set — the office will describe or show the item before you commit.";

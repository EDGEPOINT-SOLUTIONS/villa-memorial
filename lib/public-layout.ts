/**
 * The public-site layout contract — the ONE place the public grammar's numbers
 * live (Phase 0 of the captain's public design plan, `data/villa-public-design-plan`,
 * approved 2026-09-21: "ok implement now").
 *
 * WHY THIS FILE EXISTS
 * The measured audit found the public site's grammar was largely right but its
 * structural volume per screen was unbounded: 31 routes averaged 6.2 phone
 * screens, `/products` ran 23.5, the catalogue packed 1 card per phone row, the
 * phone home hero filled 71 % of the first screen, and the page-commitment CTA
 * alternated gold/sky page-to-page. The cause was never a raw pixel — it was
 * that **nothing owned the numbers**. This module owns them, the primitives in
 * `components/public/*` consume them, and `tests/unit/public-layout.test.ts`
 * parses `styles/tokens.css` / `styles/components.css` and fails when a value
 * here and a declaration there drift apart.
 *
 * WHAT IS HERE
 *  · the THREE CONTENT ENVELOPES (folio / catalogue / reading + the prose measure);
 *  · the max-height CEILINGS for every public image role, plus the phone-hero cap;
 *  · the THREE CTA RUNGS (sky page-commitment · gold per-item · secondary support);
 *  · the GRID rules (4-across desktop, the phone counts, the "Show all N" threshold);
 *  · the section rhythm and the per-page height ceilings the four lanes roll out;
 *  · the reading budget the existing guard enforces.
 *
 * WHAT IS NOT HERE
 * No page content, no price, no honesty state and no palette. A blueprint in the
 * plan is a target, not a business rule: the lanes change pages to it, this file
 * only says what the target number is.
 *
 * CONSUMPTION RULE
 * A component reads a constant here (or the token it mirrors) — never a literal
 * that duplicates it. A CSS declaration the constants describe carries the token
 * so the test can tie the two together. If a lane genuinely needs a number this
 * contract does not carry, add it HERE in the same PR, with the test.
 */

/* ---------------------------------------------------------------------------
 * 1 · Content envelopes
 * ------------------------------------------------------------------------- */

export type ContentEnvelopeName = "folio" | "catalogue" | "reading";

export type ContentEnvelope = {
  /** The CSS custom property in styles/tokens.css carrying the width. */
  token: string;
  /** The width in rem (the token's value). */
  rem: number;
  /** The same width in CSS px, for measurement notes and image maths. */
  px: number;
  /** The layout class a view puts on its content wrapper. */
  className: string;
  /** What may use this envelope — the plan's blueprint wording. */
  use: string;
};

/**
 * The three envelopes. The folio is the home's anchored trio and the shared
 * nav/footer alignment (kept from before the pass); catalogue and reading are
 * the two NARROWER envelopes the storefront adopts: the leaders measured
 * 1,188–1,360 px for browsable content, so 1,200 px, and ~66 ch for reading.
 * A page never widens its envelope with a local max-width.
 */
export const CONTENT_ENVELOPES: Readonly<Record<ContentEnvelopeName, ContentEnvelope>> = {
  folio: {
    token: "--layout-folio-w",
    rem: 99,
    px: 1584,
    className: "container",
    use: "the home's anchored trio and the shared nav/footer alignment only",
  },
  catalogue: {
    token: "--layout-catalogue-w",
    rem: 75,
    px: 1200,
    className: "container--catalogue",
    use: "browsable grids and catalogue tables (/products, /lots, /gallery, plan tiers, /price-list)",
  },
  reading: {
    token: "--layout-reading-w",
    rem: 60,
    px: 960,
    className: "container--reading",
    use: "prose, forms, the PDP content column, support and memorial pages",
  },
} as const;

/** The measured line length a reading column targets (Lazada/Amazon prose). */
export const PROSE_MEASURE = { token: "--measure-prose", value: "66ch" } as const;

/** The class(es) a view puts on a content wrapper for an envelope. A non-folio
 *  envelope keeps the shared `.container` base and overrides only its max-width. */
export function containerClass(envelope: ContentEnvelopeName): string {
  return envelope === "folio"
    ? CONTENT_ENVELOPES.folio.className
    : `container ${CONTENT_ENVELOPES[envelope].className}`;
}

/* ---------------------------------------------------------------------------
 * 2 · Hero & image ceilings
 * ------------------------------------------------------------------------- */

/**
 * The hero band rules. The phone cap is the fix for D1 (the phone home hero
 * filled 71 % of the first screen): a hero is a band, not the page. `maxVh`
 * applies to the image frame / pure-image hero; `homeMaxRem` and
 * `interiorMaxRem` cap the media box on desktop.
 */
export const HERO = {
  /** ≤ 42 vh on a phone (≈340 px of an 844 px first screen). */
  phoneMaxVh: 42,
  /** The home hero's photo box on desktop, never taller than this. */
  homeMaxRem: 26,
  /** An interior hero is a narrower banner, not a second home hero. */
  interiorMaxRem: 18,
  /** The home hero's landscape ratio; a portrait source never lands here (IMG-6). */
  homeRatio: "16 / 9",
  /** The phone home hero uses a slightly squarer crop so a landscape photo survives. */
  homePhoneRatio: "3 / 2",
} as const;

/** The public image roles a `PublicImage` may take (each has a ceiling below). */
export type PublicImageRole =
  | "home-hero"
  | "interior-hero"
  | "band-lead"
  | "card"
  | "pdp-main"
  | "gallery-tile"
  | "map";

export type ImageCeiling = {
  /** The CSS `aspect-ratio` value the role's frame declares. */
  ratio: string;
  /** Desktop ceiling in rem, or null when the column width already bounds it. */
  maxRem: number | null;
  /** Phone ceiling in rem when it differs from the desktop one. */
  phoneMaxRem?: number;
  /** Phone ceiling in vh, when the rule is viewport-relative (the hero). */
  phoneMaxVh?: number;
  /** What the picture is, in one clause. */
  use: string;
};

/**
 * The max rendered height of every public image role (plan §4.4). `PublicImage`
 * adds the role's class; the shared grammar block declares the ratio + ceiling
 * and the guard reads both. None of these ever upscales: a source smaller than
 * the slot renders at the source's width (the honesty rule), never stretched.
 */
export const IMAGE_CEILINGS: Readonly<Record<PublicImageRole, ImageCeiling>> = {
  "home-hero": {
    ratio: HERO.homeRatio,
    maxRem: HERO.homeMaxRem,
    phoneMaxVh: HERO.phoneMaxVh,
    use: "the home's single landscape photograph — never a portrait crop",
  },
  "interior-hero": {
    ratio: "16 / 9",
    maxRem: HERO.interiorMaxRem,
    use: "an interior page's photo, or no photo (a 16:9 banner at most)",
  },
  "band-lead": {
    ratio: "3 / 2",
    maxRem: 22,
    phoneMaxRem: 14,
    use: "the dominant figure in a ledger band",
  },
  card: {
    ratio: "4 / 3",
    maxRem: 16,
    use: "a product/lot card figure — the column width leads",
  },
  "pdp-main": {
    ratio: "4 / 3",
    maxRem: 26,
    phoneMaxRem: 14,
    use: "the PDP gallery's main viewer",
  },
  "gallery-tile": {
    ratio: "3 / 2",
    maxRem: 16,
    use: "a gallery tile",
  },
  map: {
    ratio: "1 / 1",
    maxRem: 32,
    use: "the square park masterplan",
  },
} as const;

/** A card's total height ceiling at 1440 (plan §3 R5: ≈340 px). */
export const CARD_MAX_HEIGHT_REM = 21.25;
/** A grid card image's ratio (never a portrait ratio in a grid). */
export const CARD_RATIO = IMAGE_CEILINGS.card.ratio;

/* ---------------------------------------------------------------------------
 * 3 · The CTA rungs
 * ------------------------------------------------------------------------- */

export type CtaRung = "commit" | "item" | "support";

export type CtaRungRule = {
  /** The button class that rung uses. */
  className: string;
  /** The brand colour it paints (a label for the docs, not a value). */
  colour: "sky" | "gold" | "outline";
  /** What the rung means. */
  role: string;
  /** How often it may appear. */
  limit: string;
};

/**
 * The 3-rung CTA grammar (settles D8 — the gold/sky drift).
 *
 *   1. commit  — sky, the PAGE's commitment: Pay · Send · Book · Search · Sign in.
 *                At most ONE per band and at most one above the fold.
 *   2. item    — gold, per-ITEM commerce: Add to cart · Request this lot ·
 *                Ask about this plan · Check dates. One per row (that is per
 *                item, not per band).
 *   3. support — outline, everything else: back, nav, filters' Clear.
 *
 * A band never shows a commit and an item at equal weight. `/lots` keeps its
 * captain-approved pattern (card = gold, panel commit = sky) — now generalized.
 */
export const CTA_RUNGS: Readonly<Record<CtaRung, CtaRungRule>> = {
  commit: {
    className: "btn--primary",
    colour: "sky",
    role: "the page's commitment: Pay, Send, Book, Search, Sign in",
    limit: "≤ 1 per band, ≤ 1 above the fold",
  },
  item: {
    className: "btn--accent",
    colour: "gold",
    role: "per-item commerce: Add to cart, Request this lot, Ask about this plan",
    limit: "one per row (per item, not per band)",
  },
  support: {
    className: "btn--secondary",
    colour: "outline",
    role: "supporting: back, navigation, filters' Clear",
    limit: "unbounded, but never a filled equal to a commit in the same band",
  },
} as const;

/** The button class for a rung — the one accessor a view uses. */
export function ctaClass(rung: CtaRung): string {
  return CTA_RUNGS[rung].className;
}

/* ---------------------------------------------------------------------------
 * 4 · Grid rules and the "Show all N" disclosure
 * ------------------------------------------------------------------------- */

/**
 * The catalogue grid (plan §3 R4, §4.5, §5.3). Four cards across at 1440 inside
 * the 1,200 px catalogue envelope; one per phone row for lots (compact product
 * tiles may use two). Gaps are the shared 24 px column / 32 px row.
 *
 * DISCLOSURE: a grid renders at most `defaultVisible` cards and then a "Show all
 * N" control. Below `disclosureAfter` there is nothing to disclose (the whole
 * list already fits), so a short catalogue never grows a pointless toggle.
 */
export const GRID = {
  /** The lot/product card grid floor (a full-width figure under the card). */
  cardFloorRem: 21,
  /**
   * The dense catalogue grid floor. It is chosen so FOUR columns fit inside the
   * 1,200 px catalogue envelope's 1,152 px content box (4 × 16.5 rem + 3 × 24 px
   * gaps = 1,128 px). A larger floor (18 rem) would silently give three-across —
   * the measured defect, not the fix.
   */
  catalogueFloorRem: 16.5,
  /** Columns at 1440 inside the catalogue envelope. */
  columnsDesktop: 4,
  /** Columns on a phone for a lot/product card. */
  columnsPhone: 1,
  /** Compact product tiles may pair two-up on a phone. */
  columnsPhoneCompact: 2,
  columnGapRem: 1.5,
  rowGapRem: 2,
  /** Render at most this many rows, then disclose the rest (a list). */
  defaultVisible: 12,
  /**
   * A card GRID of product tiles shows fewer than a list: the plan's §3 R8
   * reads "a browsable rail shows 6–8 tiles, a list shows ≤ 12 rows". A tile
   * carries a photograph and several figures, so eight keeps a page hands-and-
   * eyes short where twelve would scroll it a screen past its ceiling
   * (`/products`, lane 2). */
  gridVisible: 8,
  /**
   * A 1-up card grid (a lot plot: a full-width photograph and its facts) is
   * taller per tile than a 2-up product tile, so it opens on the low end of the
   * plan's 6–8-tile window (`/lots`, lane 2) — six plots, then "Show all N".
   */
  lotVisible: 6,
  /** Do not draw a "Show all" control until the list exceeds this. */
  disclosureAfter: 12,
} as const;

/** How many rows render before the "Show all N" control. */
export function visibleCount(total: number): number {
  return Math.min(Math.max(0, total), GRID.defaultVisible);
}

/** How many product tiles render before the "Show all N" control. */
export function gridVisibleCount(total: number): number {
  return Math.min(Math.max(0, total), GRID.gridVisible);
}

/** How many 1-up lot tiles render before the "Show all N" control. */
export function lotVisibleCount(total: number): number {
  return Math.min(Math.max(0, total), GRID.lotVisible);
}

/** How many rows the disclosure holds back. */
export function hiddenCount(total: number): number {
  return Math.max(0, total - GRID.defaultVisible);
}

/** Whether a list needs a "Show all N" control at all. */
export function isDisclosureNeeded(total: number): boolean {
  return total > GRID.disclosureAfter;
}

/** The one "Show all N" label every surface prints. */
export function showAllLabel(total: number): string {
  return `Show all ${total}`;
}

/* ---------------------------------------------------------------------------
 * 5 · Section rhythm and page-height ceilings
 * ------------------------------------------------------------------------- */

/**
 * The vertical rhythm. A content section is ~600 px and the gap between
 * top-level sections is 32–56 px; a non-grid section taller than
 * `maxContentHeightRem` is split or disclosed rather than shipped as one wall.
 */
export const SECTION_RHYTHM = {
  /** The gap between top-level sections (the `clamp` is the token value). */
  gap: "clamp(2rem, 4vw, 3.5rem)",
  /** A non-grid section taller than this is split or disclosed. */
  maxContentHeightRem: 40,
} as const;

/** Public page families the lanes sweep, for the height ceilings below. */
export type PublicPageFamily =
  | "home"
  | "service"
  | "guide"
  | "catalogue"
  | "pdp"
  | "plans"
  | "priceList"
  | "purchase"
  | "support"
  | "grounds"
  | "memorials"
  | "identity";

/**
 * The scroll budget per family, in phone / desktop screens, from plan §5. These
 * are the targets the lanes defend; a page that lands over its ceiling is a bug
 * the lane fixes, not a proposal to raise the ceiling. The audit's current
 * worsts are in the comment so the distance is visible at a glance.
 */
export const PAGE_HEIGHT_CEILINGS: Readonly<
  Record<PublicPageFamily, { phone: number; desktop: number }>
> = {
  home: { phone: 5, desktop: 4.5 }, // today 8.9 / 5.6
  service: { phone: 5, desktop: 4.5 }, // today 12.5 / 5.9
  guide: { phone: 3, desktop: 2.5 }, // today 3.4 / 3.9
  catalogue: { phone: 6, desktop: 5 }, // today 23.5 (products) / 9.1
  pdp: { phone: 6, desktop: 5 }, // today 4.4 / 2.5 — already inside
  plans: { phone: 4, desktop: 3 }, // today 7.2 / 2.5
  priceList: { phone: 6, desktop: 5 }, // today 14.4 / 7.5
  purchase: { phone: 3.5, desktop: 3 }, // today 2.8–4.0
  support: { phone: 3.5, desktop: 3 }, // today 4.6 / 3.6 / 3.8
  grounds: { phone: 5, desktop: 4 }, // today 4.3 / 7.3 / 7.7
  memorials: { phone: 4, desktop: 3.5 }, // today 6.2 / 6.9 / 3.8
  identity: { phone: 1.5, desktop: 1.5 }, // today 1.0–1.2 — already inside
} as const;

/* ---------------------------------------------------------------------------
 * 6 · The reading budget (the existing guard's numbers)
 * ------------------------------------------------------------------------- */

/**
 * The captain's standing copy budget (2026-09-18), mirrored from
 * `tests/unit/reading-budget.test.tsx::BUDGET` so the contract and the guard
 * carry the same numbers. The home's copy is staff-editable content, so it is
 * measured in the PR record, never gated.
 */
export const READING_BUDGET = {
  paragraphWords: 300,
  longestParagraph: 30,
  longestListItem: 30,
  openingSentence: 12,
} as const;

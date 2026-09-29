/**
 * Landing Page content seam — the public home at / AND the public FAQ page at
 * /faq render ONLY from this document, and the staff content editor at
 * /staff/landing persists into the same store. Lives under api-client because it
 * follows the module pattern exactly: typed tolerant reader over a recorded
 * fixture seed + a save path with the service owning validation.
 *
 * ⚠ CONTRACT STATUS (stated loudly, per AGENTS.md): there is NO frozen content
 * contract and NO upstream CMS service yet — this is an app-authored front-end
 * seam approved in the Lavish villa-landing-plan (three-column anchored
 * catalogue home). The fixture records that model, not a service response; it
 * becomes a recorded contract fixture once a content contract freezes. In the
 * meantime this module IS the authority, and both the BFF save route and the
 * public page read it through the same functions.
 *
 * Persistence is the app's standard fixture store: the seed JSON is recorded
 * content and each save APPENDS to a durable journal (2026-09-27 —
 * `lib/api-client/journal.ts`), so an edit survives a restart and reaches every
 * instance. It used to live on `globalThis` alone, which lost every edit on restart.
 * No money math happens here — displayed prices are content strings sourced from
 * `lib/villa-pricing.ts`.
 */
import { ApiError } from "@/lib/api-client/api-error";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { isValidCssColor, readHeroTextColour, readHeroTransparency } from "@/lib/landing/hero-background";
import { PLAN_TIER_IDS, type LotCategory, type PlanTier } from "@/lib/pricing-model";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  EMBALMING_RATES,
} from "@/lib/villa-pricing";
import contentFile from "@/lib/fixtures/landing/content.json";

export type RailItemKind = "product" | "service" | "plan" | "link";
export type MediaKind = "photo" | "video";

export type RailItem = {
  id: string;
  kind: RailItemKind;
  title: string;
  caption: string | null;
  price: string | null;
  image: string | null;
  href: string;
  /**
   * The rail's ONE oversized lead image (captain's home-page review): the
   * featured item renders as a full-width photo card above the compact rows.
   * At most one per rail — the reader keeps the first and clears the rest.
   */
  featured: boolean;
};

export type RailConfig = {
  heading: string;
  items: RailItem[];
};

export type Cta = { label: string; href: string };
export type LogoConfig = { wordmark: string; markImage: string | null };

export type ContactInfo = {
  phoneLabel: string;
  phoneDisplay: string;
  phoneHref: string;
  location: string;
  /**
   * The client's second published line, from their own letterhead
   * ("Tel No. 09176178489 / 09171839262", 2026 Purchase Application Form).
   * An empty display or href means the office removed the row in the editor —
   * the public contact surface then omits it rather than showing a dead link.
   */
  secondPhoneDisplay: string;
  secondPhoneHref: string;
  /** The client's own letterhead addresses (same paper). Empty = not shown. */
  officeAddress: string;
  parkAddress: string;
};

export type HeroSection = {
  eyebrow: string;
  headline: string;
  subline: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  /**
   * Background photo for the hero (captain's home-page review): when set, the
   * hero renders the photo behind the copy. null keeps the shipped gradient.
   * With no eyebrow/headline/subline the page renders the RAW photograph — no
   * scrim, gradient, colour layer or filter (captain's 2026-09-21 direction).
   */
  image: string | null;
  /**
   * Staff-chosen hero background colour ("colour changer" on the Landing Page
   * editor, captain's brief 2026-09-17). null = no layer at all, so a document
   * that never touched the field shows the clear photograph / shipped gradient.
   * When set, the colour paints as ONE layer ABOVE the background photo and
   * BELOW every hero copy block; the layer's alpha comes from
   * `backgroundTransparency`.
   */
  background: string | null;
  /**
   * Transparency of the background colour layer, 0–100. 0 = the colour is
   * solid; 100 = fully see-through (the layer is absent, the photograph
   * untouched). Legacy documents without this field read as 100.
   */
  backgroundTransparency: number;
  /**
   * Author-settable hero copy colour (any CSS colour isValidCssColor accepts).
   * null = the shipped token ink. Rendered as the `--hero-text-colour` custom
   * property the hero copy rules read, so a legacy document is untouched.
   */
  textColour: string | null;
};

export type AboutSection = {
  heading: string;
  story: string;
  mission: string;
  vision: string;
  image: string | null;
};

/**
 * One "Memorial plans & garden lots" card (captain 2026-09-21, replacing the
 * retired "What we do / Services we offer" band).
 *
 * NO AMOUNT IS AUTHORED HERE. `kind` is the card's own type word (the captain's
 * vocabulary): "lot" → Garden lot, "structure" → Structure, "plan" → Life plan.
 * A lot/structure card binds to a LIVE lot family + product row in the editable
 * pricing store (`category`/`product`), and the view prints that row's regular
 * selling price, its area and the family's own caption ("2.5 sqm · lot only ·
 * regular"). A plan card binds to a live plan tier and prints its monthly rate
 * ("from ₱600 / month", the regular table). The figures are read at render
 * through `lib/landing/plan-lots.ts` — never typed.
 *
 * `image` is the card's own client photograph (library asset, staff URL or
 * device upload); null falls back to the rule in lib/media.ts
 * (`planLotCardPhoto`).
 */
export type PlanLotKind = "lot" | "structure" | "plan";

export type PlanLotCard = {
  id: string;
  kind: PlanLotKind;
  title: string;
  image: string | null;
  /** lot/structure: a live lot-family title from the editable pricing store. */
  category: string;
  /** lot/structure: a product row inside that family. */
  product: string;
  /** plan: the plan tier whose live monthly rate the card prints. */
  tier: string;
  /** plan: the card's one supporting line (lot lines derive from the row). */
  text: string;
  href: string;
};

export type PlansLotsSection = {
  kicker: string;
  heading: string;
  intro: string;
  items: PlanLotCard[];
  /** The closing price note (staff copy — no amount is authored in it). */
  note: string | null;
};

/**
 * "Plan ahead" — the Villa Memorial Plan board (home.html · VILLA MEMORIAL
 * PLAN): the promo figure beside the tier × term table, the term switch, the
 * footnote and the partner logo row.
 *
 * The board itself is NOT content: every tier, term and amount is read live
 * from lib/villa-pricing.ts (PLAN_TIERS × PLAN_TERMS through planRate), so the
 * figures can never drift from the client's payment-mode tables. The footnote
 * is staff copy and may carry two tokens the view fills from the same module —
 * `{seniorMonthly}` (the senior Bronze-1 monthly rate) and `{packagePage}`
 * (the anchor to the package page). Amounts are never authored in content.
 */
export type PlansSection = {
  kicker: string;
  heading: string;
  intro: string;
  note: string | null;
};

export type MediaItem = {
  kind: MediaKind;
  src: string;
  alt: string | null;
  poster: string | null;
};

export type BlogPost = {
  id: string;
  author: string;
  date: string;
  caption: string;
  media: MediaItem[];
  /** Optional route/link staff configures for this post on the "/" editor —
   * when set, clicking the post's photo/caption opens it; null keeps the post
   * a pure newsfeed item (photos are not clickable). */
  link: string | null;
};

export type BlogSection = { heading: string; intro: string; posts: BlogPost[] };

export type MapSection = { heading: string; intro: string };

/**
 * One question/answer pair on the public FAQ page (/faq). Staff-editable like
 * every other region of this document — the page renders exactly what is saved
 * here, so a typo no longer needs a developer (audit §7.1 G7).
 */
export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

/**
 * The FAQ page at /faq — the Help hero copy, the question cards and the
 * next-step links under them. The page that renders this lives at
 * app/(public)/faq/page.tsx and keeps its shipped layout; only the words come
 * from here.
 */
export type FaqSection = {
  eyebrow: string;
  heading: string;
  lead: string;
  items: FaqItem[];
  /** The "Next steps" link row closing the page. */
  links: Cta[];
};

/* ===========================================================================
 * THE HOME'S SEVEN SECTIONS — the approved home-rebuild plan (2026-09-29)
 *
 * The plan of record is the captain's `villa-home-restructure` artifact: seven
 * sections in order — the gateway, the hero photograph, the park with the
 * arrangement builder and the two chapels, the five plan tiers, the five
 * service tiles, the four lot types with the park map, and the contact band.
 * This model is the editable half of it: each section's own words, actions,
 * pictures and live bindings, edited per section at /staff/landing/home.
 *
 * LIVE BINDINGS (validated against the stores at save, read at render):
 *   · builder casket models ← the 24 sheet models joined to the live catalogue
 *   · builder preparation days ← the sheet's 3–9 day embalming ladder
 *   · builder chapel / five services ← the sheet's chapel rates and a-la-carte fees
 *   · plan tiers ← the pricing store (five tiers, live monthly + senior)
 *   · service tiles ← the five a-la-carte services
 *   · lot tiles ← the pricing store's lot families
 * ========================================================================= */

export type HomeFact = {
  id: string;
  /** The fact's own label ("Answered any hour"). */
  label: string;
  /** Its one supporting line. Empty hides the line. */
  note: string;
};

/** Section 1 · the gateway — centred words and the call. */
export type HomeGatewaySection = {
  /** The place line above the headline; defaults to the contact location. */
  place: string;
  headline: string;
  /** The second line of the headline, painted in the sky ink. */
  promise: string;
  lead: string;
  /** The ONE call action is BOUND to the 24/7 line (content.contact); only the
   *  supporting action is authored here. */
  secondary: Cta;
  facts: HomeFact[];
};

/** Section 2 · the hero photograph, alone and whole. The band's title is read
 *  from the office's own park address (the place name, not a typed string). */
export type HomePhotoSection = {
  /** The uppercase kicker above the title. */
  kicker: string;
  image: string | null;
  alt: string;
};

/** Section 3 · the arrangement builder's live bindings and its own words. */
export type HomeBuilderSection = {
  title: string;
  note: string;
  /** Sheet model names (a subset of CASKET_MODELS), in the order shown. */
  casketModels: string[];
  /** The preparation-day ladder rows shown (a subset of 3–9). */
  preparationDays: number[];
  /** Show the three-day common/private chapel choices. */
  includeChapel: boolean;
  /** Show the five a-la-carte services line. */
  includeServices: boolean;
  /** The closing quote action; the call action is bound to the 24/7 line. */
  secondary: Cta;
};

/** One chapel card under the park photograph. */
export type HomeChapel = {
  id: string;
  /** The scheduling resource this card reads (a ChapelRecord id) when bound. */
  resourceId: string | null;
  name: string;
  /** The class line ("Common chapel" / "Private chapel"). */
  kind: string;
  what: string;
  image: string | null;
  /** The sample-set-up honesty caption the plan prints under every chapel. */
  caption: string;
};

/** Section 3 · the first memorial park photograph + builder + chapels. */
export type HomeParkSection = {
  image: string | null;
  imageAlt: string;
  chapelsHeading: string;
  builder: HomeBuilderSection;
  chapels: HomeChapel[];
  chapelsAction: Cta;
};

/** Section 4 · Villa Memorial Plan — heading + one action; the five tiers read
 *  the pricing store and the TYPES OF COFFIN sheet's own tier lines. */
export type HomePlansSection = {
  kicker: string;
  heading: string;
  action: Cta;
};

/** One service tile on the Funeraria Memorial Services band. */
export type HomeServiceTile = {
  id: string;
  /** The live a-la-carte service label this tile binds to. */
  service: string;
  /** The name the tile prints ("Coffins" for the ORD-coffin service). */
  label: string;
  image: string | null;
  imageAlt: string;
  quote: Cta;
};

/** Section 5 · Funeraria Memorial Services. NO amount ever renders here —
 *  the client's minute 5 is explicit; every line is a request. */
export type HomeServicesSection = {
  kicker: string;
  heading: string;
  action: Cta;
  /** The one centred action for all five services. */
  allQuote: Cta;
  items: HomeServiceTile[];
};

/** One lot-type tile on the Villa Memorial Park band. */
export type HomeLotTile = {
  id: string;
  /** The live lot family title this tile prices from (the pricing store). */
  category: string;
  /** The product row inside that family whose figures the tile prints. */
  product: string;
  /** The name the tile prints (the park's own name for the ground). */
  label: string;
  image: string | null;
  imageAlt: string;
};

/** Section 6 · Villa Memorial Park — the 2×2 lot types, the pinned park map and
 *  the detail line under it. */
export type HomeLotsSection = {
  kicker: string;
  heading: string;
  action: Cta;
  /** The detail panel's request action. */
  quote: Cta;
  items: HomeLotTile[];
};

/** Section 7 · Contact — the enquiry form and the embedded park map. */
export type HomeContactSection = {
  kicker: string;
  heading: string;
  lead: string;
  mapTitle: string;
  /** The address line under the map (the office/park line). */
  mapNote: string;
  /** The label of the directions action; its destination is the client's own
   *  recorded park address (lib/location-map.ts), never authored here. */
  directionsLabel: string;
};

export type HomeSections = {
  gateway: HomeGatewaySection;
  photo: HomePhotoSection;
  park: HomeParkSection;
  plans: HomePlansSection;
  services: HomeServicesSection;
  lots: HomeLotsSection;
  contact: HomeContactSection;
};

/** The seven section ids, in render order — the editor's own navigator. */
export const HOME_SECTION_IDS = [
  "gateway",
  "photo",
  "park",
  "plans",
  "services",
  "lots",
  "contact",
] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type LandingContent = {
  version: 1;
  updated_at: string | null;
  logo: LogoConfig;
  contact: ContactInfo;
  hero: HeroSection;
  rails: { left: RailConfig; right: RailConfig };
  about: AboutSection;
  plansLots: PlansLotsSection;
  plans: PlansSection;
  blog: BlogSection;
  map: MapSection;
  faq: FaqSection;
  /**
   * The public home's seven sections (the approved home-rebuild plan,
   * 2026-09-29). The home at `/` renders THESE sections and nothing else; the
   * fields above keep feeding the other surfaces they still own (/blog,
   * the FAQ page, the chrome and the contact facts).
   *
   * WHAT IS NEVER AUTHORED HERE: an amount. Every figure the home prints is read
   * at render from the pricing store or the 2026 sheets (plan rates, lot prices,
   * casket SRPs, embalming, chapel rates) — a save can bind a section to a live
   * source but can never drill a number into content.
   */
  home: HomeSections;
};

type ContentStore = { content: LandingContent };
const SEED = (contentFile as unknown as ContentStore).content;

const RAIL_KINDS: RailItemKind[] = ["product", "service", "plan", "link"];
const MEDIA_KINDS: MediaKind[] = ["photo", "video"];
const PLAN_LOT_KINDS: PlanLotKind[] = ["lot", "structure", "plan"];

/**
 * The publish gate for staff-typed text — ONE home in lib/text-gate.ts so the
 * landing document and the content catalogue refuse the same characters.
 * Re-exported here to keep this module's historical API stable (tests and the
 * landing editor import `unrenderableGlyphs` from this file).
 */
import { unrenderableGlyphs } from "@/lib/text-gate";

export { unrenderableGlyphs };

/**
 * Every string a member of staff types into the content editor, in the order the
 * validator reports them. Purely presentational paths (media srcs, hrefs, ids)
 * are not text and are checked by their own rules.
 */
function authoredText(content: LandingContent): string[] {
  const out: string[] = [];
  const push = (v: string | null) => {
    if (v) out.push(v);
  };
  push(content.hero.eyebrow);
  push(content.hero.headline);
  push(content.hero.subline);
  push(content.hero.primaryCta.label);
  push(content.hero.secondaryCta.label);
  push(content.logo.wordmark);
  push(content.contact.phoneLabel);
  push(content.contact.location);
  push(content.contact.officeAddress);
  push(content.contact.parkAddress);
  for (const side of ["left", "right"] as const) {
    const rail = content.rails[side];
    push(rail.heading);
    for (const item of rail.items) {
      push(item.title);
      push(item.caption);
      push(item.price);
    }
  }
  push(content.about.heading);
  push(content.about.story);
  push(content.about.mission);
  push(content.about.vision);
  push(content.plansLots.kicker);
  push(content.plansLots.heading);
  push(content.plansLots.intro);
  push(content.plansLots.note);
  for (const card of content.plansLots.items) {
    push(card.title);
    push(card.text);
  }
  push(content.plans.kicker);
  push(content.plans.heading);
  push(content.plans.intro);
  push(content.plans.note);
  push(content.map.heading);
  push(content.map.intro);
  push(content.blog.heading);
  push(content.blog.intro);
  for (const post of content.blog.posts) {
    push(post.caption);
    for (const m of post.media) push(m.alt);
  }
  push(content.faq.eyebrow);
  push(content.faq.heading);
  push(content.faq.lead);
  for (const item of content.faq.items) {
    push(item.question);
    push(item.answer);
  }
  for (const link of content.faq.links) push(link.label);
  // The seven home sections — every string a member of staff can type there.
  const home = content.home;
  push(home.gateway.place);
  push(home.gateway.headline);
  push(home.gateway.promise);
  push(home.gateway.lead);
  push(home.gateway.secondary.label);
  for (const f of home.gateway.facts) {
    push(f.label);
    push(f.note);
  }
  push(home.photo.kicker);
  push(home.photo.alt);
  push(home.park.imageAlt);
  push(home.park.chapelsHeading);
  push(home.park.builder.title);
  push(home.park.builder.note);
  push(home.park.builder.secondary.label);
  for (const c of home.park.chapels) {
    push(c.name);
    push(c.kind);
    push(c.what);
    push(c.caption);
  }
  push(home.park.chapelsAction.label);
  push(home.plans.kicker);
  push(home.plans.heading);
  push(home.plans.action.label);
  push(home.services.kicker);
  push(home.services.heading);
  push(home.services.action.label);
  push(home.services.allQuote.label);
  for (const t of home.services.items) {
    push(t.label);
    push(t.imageAlt);
    push(t.quote.label);
  }
  push(home.lots.kicker);
  push(home.lots.heading);
  push(home.lots.action.label);
  push(home.lots.quote.label);
  for (const t of home.lots.items) {
    push(t.label);
    push(t.imageAlt);
  }
  push(home.contact.kicker);
  push(home.contact.heading);
  push(home.contact.lead);
  push(home.contact.mapTitle);
  push(home.contact.mapNote);
  push(home.contact.directionsLabel);
  return out;
}

/* ------------------------- tolerant field readers ------------------------- */

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function nullableStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function readCta(raw: unknown, fallback: Cta): Cta {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const label = str(r.label);
  const href = str(r.href);
  return {
    label: label || fallback.label,
    href: href || fallback.href,
  };
}

function readRailItem(raw: unknown): RailItem | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const kind = str(r.kind);
  if (!RAIL_KINDS.includes(kind as RailItemKind)) return null;
  return {
    id: str(r.id) || `rail-${Math.random().toString(36).slice(2, 8)}`,
    kind: kind as RailItemKind,
    title: str(r.title),
    caption: nullableStr(r.caption),
    price: nullableStr(r.price),
    image: nullableStr(r.image),
    href: str(r.href, "/"),
    featured: r.featured === true,
  };
}

function readRailConfig(raw: unknown): RailConfig {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  // Tolerant reader: drop malformed entries only — rails are UNLIMITED (staff
  // pins any number; the rail scrolls internally). Never truncate here.
  const items = arr(r.items).map(readRailItem).filter((x): x is RailItem => x !== null);
  // The model carries at most ONE lead image per rail; when recorded content
  // (or a hand-edited store) names several, the first one wins and the rest
  // degrade to compact rows rather than rendering two oversized cards.
  let leadTaken = false;
  for (const item of items) {
    if (item.featured && leadTaken) item.featured = false;
    if (item.featured) leadTaken = true;
  }
  return {
    heading: str(r.heading, "Quick links"),
    items,
  };
}

function readPlanLotCard(raw: unknown): PlanLotCard | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!str(r.title)) return null;
  const kind = str(r.kind);
  return {
    id: str(r.id) || `plc-${Math.random().toString(36).slice(2, 8)}`,
    // An unknown/legacy kind degrades to a garden lot rather than dropping the
    // card (the view then reads its live lot family as every lot card does).
    kind: (PLAN_LOT_KINDS.includes(kind as PlanLotKind) ? kind : "lot") as PlanLotKind,
    title: str(r.title),
    image: nullableStr(r.image),
    category: str(r.category),
    product: str(r.product),
    tier: str(r.tier),
    text: str(r.text),
    href: str(r.href, "/lots"),
  };
}

function readMediaItem(raw: unknown): MediaItem | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const kind = str(r.kind);
  if (!MEDIA_KINDS.includes(kind as MediaKind) || !str(r.src)) return null;
  return {
    kind: kind as MediaKind,
    src: str(r.src),
    alt: nullableStr(r.alt),
    poster: nullableStr(r.poster),
  };
}

function readBlogPost(raw: unknown): BlogPost | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!str(r.caption) && arr(r.media).length === 0) return null;
  return {
    id: str(r.id) || `post-${Math.random().toString(36).slice(2, 8)}`,
    author: str(r.author, "Villa Memorial Park"),
    date: str(r.date),
    caption: str(r.caption),
    media: arr(r.media).map(readMediaItem).filter((x): x is MediaItem => x !== null),
    // Optional post link: tolerant reader keeps a usable trimmed value only.
    link: (() => {
      const raw = str(r.link).trim();
      return raw.length > 0 ? raw : null;
    })(),
  };
}

function readFaqItem(raw: unknown): FaqItem | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const question = str(r.question);
  const answer = str(r.answer);
  // Drop only rows with no words at all; a whitespace-only field is kept so the
  // validator can name it instead of the row vanishing on save (same rule as
  // the service cards).
  if (!question && !answer) return null;
  return {
    id: str(r.id) || `faq-${Math.random().toString(36).slice(2, 8)}`,
    question,
    answer,
  };
}

function readFaqLink(raw: unknown): Cta | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const label = str(r.label);
  const href = str(r.href);
  if (!label && !href) return null;
  return { label, href };
}

function readFaqSection(raw: unknown): FaqSection {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    eyebrow: str(r.eyebrow, "Help"),
    heading: str(r.heading, "Frequently asked questions"),
    lead: str(r.lead),
    items: arr(r.items).map(readFaqItem).filter((x): x is FaqItem => x !== null),
    links: arr(r.links).map(readFaqLink).filter((x): x is Cta => x !== null),
  };
}

/* --------------------------- the home's seven sections --------------------------- */

function asRecord(raw: unknown): Record<string, unknown> {
  return (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
}

function readHomeFact(raw: unknown, index: number): HomeFact | null {
  const r = asRecord(raw);
  const label = str(r.label);
  const note = str(r.note);
  if (!label && !note) return null;
  return { id: str(r.id) || `fact-${index + 1}`, label, note };
}

/** The seeded section, used field by field when a saved document predates the
 *  home model (or a hand-edited store omits one) — a legacy document keeps the
 *  approved plan rather than rendering a broken band. */
function readHomeSections(raw: unknown, fallback: HomeSections): HomeSections {
  const r = asRecord(raw);
  const gatewayRaw = asRecord(r.gateway);
  const photoRaw = asRecord(r.photo);
  const parkRaw = asRecord(r.park);
  const builderRaw = asRecord(parkRaw.builder);
  const plansRaw = asRecord(r.plans);
  const servicesRaw = asRecord(r.services);
  const lotsRaw = asRecord(r.lots);
  const contactRaw = asRecord(r.contact);

  /** A string field: a missing value falls back; a cleared one ("") stays cleared. */
  const text = (obj: Record<string, unknown>, key: string, fallbackValue: string): string => {
    const value = obj[key];
    return typeof value === "string" ? value : fallbackValue;
  };
  const list = <T>(rawList: unknown, read: (item: unknown, index: number) => T | null, fallbackList: T[]): T[] => {
    if (!Array.isArray(rawList)) return fallbackList;
    return rawList.map(read).filter((x): x is T => x !== null);
  };
  const cta = (objValue: unknown, fallbackValue: Cta): Cta => readCta(objValue, fallbackValue);

  const gateway: HomeGatewaySection = {
    place: text(gatewayRaw, "place", fallback.gateway.place),
    headline: text(gatewayRaw, "headline", fallback.gateway.headline),
    promise: text(gatewayRaw, "promise", fallback.gateway.promise),
    lead: text(gatewayRaw, "lead", fallback.gateway.lead),
    secondary: cta(gatewayRaw.secondary, fallback.gateway.secondary),
    facts: list(gatewayRaw.facts, readHomeFact, fallback.gateway.facts),
  };

  const photo: HomePhotoSection = {
    kicker: text(photoRaw, "kicker", fallback.photo.kicker),
    image: nullableStr(photoRaw.image),
    alt: text(photoRaw, "alt", fallback.photo.alt),
  };

  const builder: HomeBuilderSection = {
    title: text(builderRaw, "title", fallback.park.builder.title),
    note: text(builderRaw, "note", fallback.park.builder.note),
    casketModels: Array.isArray(builderRaw.casketModels)
      ? builderRaw.casketModels.map((m) => str(m)).filter((m) => m.length > 0)
      : fallback.park.builder.casketModels,
    preparationDays: Array.isArray(builderRaw.preparationDays)
      ? builderRaw.preparationDays
          .map((d) => (typeof d === "number" ? d : Number.parseInt(str(d), 10)))
          .filter((d) => Number.isFinite(d))
      : fallback.park.builder.preparationDays,
    includeChapel:
      typeof builderRaw.includeChapel === "boolean"
        ? builderRaw.includeChapel
        : fallback.park.builder.includeChapel,
    includeServices:
      typeof builderRaw.includeServices === "boolean"
        ? builderRaw.includeServices
        : fallback.park.builder.includeServices,
    secondary: cta(builderRaw.secondary, fallback.park.builder.secondary),
  };

  const readChapel = (rawChapel: unknown, index: number): HomeChapel | null => {
    const c = asRecord(rawChapel);
    const name = str(c.name);
    if (!name) return null;
    return {
      id: str(c.id) || `chapel-${index + 1}`,
      resourceId: nullableStr(c.resourceId),
      name,
      kind: str(c.kind),
      what: str(c.what),
      image: nullableStr(c.image),
      caption: str(c.caption),
    };
  };

  const park: HomeParkSection = {
    image: nullableStr(parkRaw.image),
    imageAlt: text(parkRaw, "imageAlt", fallback.park.imageAlt),
    chapelsHeading: text(parkRaw, "chapelsHeading", fallback.park.chapelsHeading),
    builder,
    chapels: list(parkRaw.chapels, readChapel, fallback.park.chapels),
    chapelsAction: cta(parkRaw.chapelsAction, fallback.park.chapelsAction),
  };

  const plans: HomePlansSection = {
    kicker: text(plansRaw, "kicker", fallback.plans.kicker),
    heading: text(plansRaw, "heading", fallback.plans.heading),
    action: cta(plansRaw.action, fallback.plans.action),
  };

  const readServiceTile = (rawTile: unknown, index: number): HomeServiceTile | null => {
    const t = asRecord(rawTile);
    const service = str(t.service);
    if (!service) return null;
    return {
      id: str(t.id) || `svc-${index + 1}`,
      service,
      label: str(t.label) || service,
      image: nullableStr(t.image),
      imageAlt: str(t.imageAlt),
      quote: cta(t.quote, { label: "Add to Quote", href: "/quote" }),
    };
  };

  const services: HomeServicesSection = {
    kicker: text(servicesRaw, "kicker", fallback.services.kicker),
    heading: text(servicesRaw, "heading", fallback.services.heading),
    action: cta(servicesRaw.action, fallback.services.action),
    allQuote: cta(servicesRaw.allQuote, fallback.services.allQuote),
    items: list(servicesRaw.items, readServiceTile, fallback.services.items),
  };

  const readLotTile = (rawTile: unknown, index: number): HomeLotTile | null => {
    const t = asRecord(rawTile);
    const category = str(t.category);
    if (!category) return null;
    return {
      id: str(t.id) || `lot-${index + 1}`,
      category,
      product: str(t.product),
      label: str(t.label) || str(t.product) || category,
      image: nullableStr(t.image),
      imageAlt: str(t.imageAlt),
    };
  };

  const lots: HomeLotsSection = {
    kicker: text(lotsRaw, "kicker", fallback.lots.kicker),
    heading: text(lotsRaw, "heading", fallback.lots.heading),
    action: cta(lotsRaw.action, fallback.lots.action),
    quote: cta(lotsRaw.quote, fallback.lots.quote),
    items: list(lotsRaw.items, readLotTile, fallback.lots.items),
  };

  const contact: HomeContactSection = {
    kicker: text(contactRaw, "kicker", fallback.contact.kicker),
    heading: text(contactRaw, "heading", fallback.contact.heading),
    lead: text(contactRaw, "lead", fallback.contact.lead),
    mapTitle: text(contactRaw, "mapTitle", fallback.contact.mapTitle),
    mapNote: text(contactRaw, "mapNote", fallback.contact.mapNote),
    directionsLabel: text(contactRaw, "directionsLabel", fallback.contact.directionsLabel),
  };

  return { gateway, photo, park, plans, services, lots, contact };
}

/** Full tolerant read of a content document (used by the page + editor + BFF). */
export function readLandingContent(raw: unknown): LandingContent {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const logoRaw = r.logo ?? {};
  const contactRaw = r.contact ?? {};
  const heroRaw = r.hero ?? {};
  const railsRaw = r.rails ?? {};
  const aboutRaw = r.about ?? {};
  const plansLotsRaw = r.plansLots ?? {};
  const plansRaw = r.plans ?? {};
  const blogRaw = r.blog ?? {};
  const mapRaw = r.map ?? {};

  const readStr = (obj: Record<string, unknown>, key: string): string => str(obj[key]);
  const readNullable = (obj: Record<string, unknown>, key: string): string | null =>
    nullableStr(obj[key]);
  // Contact facts: a MISSING field falls back to the client's own letterhead
  // facts; a field the staff deliberately cleared ("") stays cleared, so the
  // editor can remove a row. Same rule for both halves of the second line.
  const readContactStr = (key: string, fallback: string): string => {
    const value = (contactRaw as Record<string, unknown>)[key];
    return typeof value === "string" ? value : fallback;
  };

  return {
    version: 1,
    updated_at: nullableStr(r.updated_at),
    logo: {
      wordmark: readStr(logoRaw as Record<string, unknown>, "wordmark") || "Villa Funeraria",
      markImage: readNullable(logoRaw as Record<string, unknown>, "markImage"),
    },
    contact: {
      phoneLabel: readStr(contactRaw as Record<string, unknown>, "phoneLabel") || "24/7 Assistance Line",
      // The client's own line (2026 purchase application form), mirroring the seeded
      // content document — the fallback is only reached by a document missing the field.
      phoneDisplay: readStr(contactRaw as Record<string, unknown>, "phoneDisplay") || "0917 617 8489",
      phoneHref: readStr(contactRaw as Record<string, unknown>, "phoneHref") || "tel:+639176178489",
      location: readStr(contactRaw as Record<string, unknown>, "location"),
      // The client's own letterhead facts (2026 Purchase Application Form):
      // "Tel No. 09176178489 / 09171839262" and the office/park addresses.
      secondPhoneDisplay: readContactStr("secondPhoneDisplay", "0917 183 9262"),
      secondPhoneHref: readContactStr("secondPhoneHref", "tel:+639171839262"),
      officeAddress: readContactStr(
        "officeAddress",
        "Capilla de San Jose Bldg., Sunrise, Isabela City, Basilan",
      ),
      parkAddress: readContactStr(
        "parkAddress",
        "Sanctuario de Mercedes y Gloria, Purok 3, Begang, Isabela City, Basilan",
      ),
    },
    hero: {
      eyebrow: readStr(heroRaw as Record<string, unknown>, "eyebrow"),
      headline: readStr(heroRaw as Record<string, unknown>, "headline"),
      subline: readStr(heroRaw as Record<string, unknown>, "subline"),
      primaryCta: readCta((heroRaw as Record<string, unknown>).primaryCta, {
        label: "I need help now",
        href: "/services",
      }),
      secondaryCta: readCta((heroRaw as Record<string, unknown>).secondaryCta, {
        label: "Plan ahead",
        href: "/plans",
      }),
      image: readNullable(heroRaw as Record<string, unknown>, "image"),
      // Colour is kept as written (trimmed) so the validator can name a bad
      // value; the view never trusts it. Missing fields on legacy documents
      // default to “no layer” + fully transparent.
      background: (() => {
        const raw = str((heroRaw as Record<string, unknown>).background).trim();
        return raw.length > 0 ? raw : null;
      })(),
      backgroundTransparency: readHeroTransparency(
        (heroRaw as Record<string, unknown>).backgroundTransparency,
      ),
      textColour: readHeroTextColour((heroRaw as Record<string, unknown>).textColour),
    },
    rails: {
      left: readRailConfig((railsRaw as Record<string, unknown>).left),
      right: readRailConfig((railsRaw as Record<string, unknown>).right),
    },
    about: {
      heading: readStr(aboutRaw as Record<string, unknown>, "heading") || "About Villa Memorial Park",
      story: readStr(aboutRaw as Record<string, unknown>, "story"),
      mission: readStr(aboutRaw as Record<string, unknown>, "mission"),
      vision: readStr(aboutRaw as Record<string, unknown>, "vision"),
      image: readNullable(aboutRaw as Record<string, unknown>, "image"),
    },
    plansLots: {
      kicker: readStr(plansLotsRaw as Record<string, unknown>, "kicker") || "Plans & lots",
      heading:
        readStr(plansLotsRaw as Record<string, unknown>, "heading") ||
        "Memorial plans & garden lots",
      intro: readStr(plansLotsRaw as Record<string, unknown>, "intro"),
      items: arr((plansLotsRaw as Record<string, unknown>).items)
        .map(readPlanLotCard)
        .filter((x): x is PlanLotCard => x !== null),
      note: nullableStr((plansLotsRaw as Record<string, unknown>).note),
    },
    plans: {
      kicker: readStr(plansRaw as Record<string, unknown>, "kicker") || "Plan ahead",
      heading: readStr(plansRaw as Record<string, unknown>, "heading") || "Villa Memorial Plan",
      intro: readStr(plansRaw as Record<string, unknown>, "intro"),
      note: readNullable(plansRaw as Record<string, unknown>, "note"),
    },
    blog: {
      heading: readStr(blogRaw as Record<string, unknown>, "heading") || "Blog",
      intro: readStr(blogRaw as Record<string, unknown>, "intro"),
      posts: arr((blogRaw as Record<string, unknown>).posts)
        .map(readBlogPost)
        .filter((x): x is BlogPost => x !== null),
    },
    map: {
      heading: readStr(mapRaw as Record<string, unknown>, "heading") || "Browse the grounds, live",
      intro: readStr(mapRaw as Record<string, unknown>, "intro"),
    },
    faq: readFaqSection(r.faq ?? {}),
    // A saved document that predates the home model (or a hand-edited store)
    // keeps the approved plan field by field, never a broken band.
    home: readHomeSections(r.home, SEED.home),
  };
}

/* ------------------------------ save validation ------------------------------ */

/**
 * The save authority. Rules mirror what the UI enforces so the demo never
 * teaches a state the model rejects:
 *  - rail items carry a known kind and a title + href (rail length is unlimited);
 *    at most one item per rail may be the oversized lead image (the tolerant
 *    reader keeps the first, so the editor must clear the others when toggling);
 *  - service cards carry a title, copy, a link and a REAL 2026 lot family — the
 *    card's price line is derived from that family, never typed;
 *  - empty rails / empty service-card lists / empty blog posts lists are legal
 *    (the page renders graceful empty states);
 *  - a blog post MAY have an empty media list (caption-only post);
 *  - a blog post MAY carry an optional link — the route its photo/caption opens
 *    (empty means the post is not clickable);
 *  - media entries must be photo|video with a usable src;
 *  - the FAQ page's heading can't be empty, every question/answer pair needs
 *    both halves, and every next-step link needs a label and a destination
 *    (the reader drops rows with no words at all, so an emptied editor row
 *    leaves the document instead of publishing a blank card);
 *  - the hero's optional background colour AND text colour must be valid CSS
 *    colour literals (lib/landing/hero-background.ts owns the check) and its
 *    transparency a number from 0 to 100;
 *  - the hero copy (eyebrow / headline / subline) is optional — an image-only
 *    hero is legal (the page renders the raw photograph).
 * Displayed prices are free content strings — no money validation (prices are
 * never computed here).
 */
export function validateLandingContent(
  content: LandingContent,
  lotCategories: ReadonlyArray<LotCategory>,
): { ok: true } | { ok: false; error: string } {
  // The hero copy is optional: an image-only hero (a photo and no eyebrow /
  // headline / subline) is a legal document — the page renders the raw photo.
  if (!content.hero.primaryCta.label.trim() || !content.hero.primaryCta.href.trim()) {
    return { ok: false, error: "The primary call-to-action needs a label and a destination." };
  }
  if (!content.hero.secondaryCta.label.trim() || !content.hero.secondaryCta.href.trim()) {
    return { ok: false, error: "The secondary call-to-action needs a label and a destination." };
  }
  if (content.hero.background !== null && !isValidCssColor(content.hero.background)) {
    return {
      ok: false,
      error: `The hero background colour must be a valid CSS colour like #3f97d1 — “${content.hero.background}” isn't one.`,
    };
  }
  if (
    typeof content.hero.backgroundTransparency !== "number" ||
    !Number.isFinite(content.hero.backgroundTransparency) ||
    content.hero.backgroundTransparency < 0 ||
    content.hero.backgroundTransparency > 100
  ) {
    return { ok: false, error: "The hero background transparency must be a number from 0 to 100." };
  }
  if (content.hero.textColour !== null && !isValidCssColor(content.hero.textColour)) {
    return {
      ok: false,
      error: `The hero text colour must be a valid CSS colour like #ffffff — “${content.hero.textColour}” isn't one.`,
    };
  }
  if (!content.logo.wordmark.trim()) return { ok: false, error: "The wordmark can't be empty." };
  if (!content.contact.phoneDisplay.trim() || !content.contact.phoneHref.trim()) {
    return { ok: false, error: "The 24/7 line needs a number to display and a call link." };
  }
  // The second published line is optional — but it is a call target, so it goes
  // in as a pair or not at all (a number without a tel: link is a dead action).
  const secondDisplaySet = content.contact.secondPhoneDisplay.trim().length > 0;
  const secondHrefSet = content.contact.secondPhoneHref.trim().length > 0;
  if (secondDisplaySet !== secondHrefSet) {
    return {
      ok: false,
      error: "The second phone line needs both a number to show and a call link — or leave both empty.",
    };
  }
  for (const side of ["left", "right"] as const) {
    const rail = content.rails[side];
    if (!rail.heading.trim()) return { ok: false, error: `The ${side} rail heading can't be empty.` };
    for (const item of rail.items) {
      if (!RAIL_KINDS.includes(item.kind)) {
        return { ok: false, error: `"${item.title || "One item"}" has an unknown rail kind.` };
      }
      if (!item.title.trim() || !item.href.trim()) {
        return { ok: false, error: `A ${side}-rail item is missing its title or link.` };
      }
    }
  }
  if (content.plans.note !== null && content.plans.note.trim().length === 0) {
    return { ok: false, error: "The plan footnote can't be blank — leave it out entirely instead." };
  }
  // Every plans-and-lots card must name a LIVE price source: a lot family +
  // product row, or one of the five 2026 plan tiers. The card's figure is read
  // from that source at render — an amount is never authored here.
  for (const card of content.plansLots.items) {
    if (!card.title.trim() || !card.href.trim()) {
      return { ok: false, error: `“${card.title || "A plans-and-lots card"}” needs a name and a link.` };
    }
    if (card.kind === "plan") {
      if (!PLAN_TIER_IDS.includes(card.tier as PlanTier)) {
        return {
          ok: false,
          error: `“${card.title}” must price from one of the five 2026 plan tiers.`,
        };
      }
      continue;
    }
    const family = lotCategories.find((c) => c.title === card.category);
    if (!family) {
      return {
        ok: false,
        error: `“${card.title}” must price from one of the 2026 lot families in the pricing store.`,
      };
    }
    if (!family.rows.some((r) => r.product === card.product)) {
      return {
        ok: false,
        error: `“${card.title}” must name a product in the 2026 lot family “${family.caption}”.`,
      };
    }
  }
  for (const post of content.blog.posts) {
    for (const m of post.media) {
      if (!MEDIA_KINDS.includes(m.kind) || !m.src.trim()) {
        return { ok: false, error: "Every attached photo/video needs a working media source." };
      }
    }
  }
  if (!content.faq.heading.trim()) {
    return { ok: false, error: "The FAQ heading can't be empty." };
  }
  for (const item of content.faq.items) {
    if (!item.question.trim() || !item.answer.trim()) {
      return { ok: false, error: "Every FAQ entry needs both a question and an answer." };
    }
  }
  for (const link of content.faq.links) {
    if (!link.label.trim() || !link.href.trim()) {
      return { ok: false, error: "Every FAQ next-step link needs a label and a destination." };
    }
  }
  // ---- the seven home sections (the approved home-rebuild plan) -------------
  // The call actions are BOUND to the 24/7 line in content.contact, so only a
  // supporting action is authored. An action must pair a label with a
  // destination; a picture must carry alt text, and every live binding is
  // checked against the store that owns it, exactly like the plans-and-lots
  // cards above — a save can never orphan a figure.
  const home = content.home;
  if (!home.gateway.headline.trim()) {
    return { ok: false, error: "The gateway headline can't be empty." };
  }
  if (!home.gateway.secondary.label.trim() || !home.gateway.secondary.href.trim()) {
    return { ok: false, error: "The gateway's supporting action needs a label and a destination." };
  }
  for (const fact of home.gateway.facts) {
    if (!fact.label.trim()) {
      return { ok: false, error: "Every trust fact needs its own label." };
    }
  }
  if (home.photo.image !== null && !home.photo.alt.trim()) {
    return { ok: false, error: "The hero photograph needs alt text describing what it shows." };
  }
  if (home.park.image !== null && !home.park.imageAlt.trim()) {
    return { ok: false, error: "The park photograph needs alt text describing what it shows." };
  }
  if (!home.park.builder.title.trim()) {
    return { ok: false, error: "The arrangement builder needs a title." };
  }
  if (home.park.builder.casketModels.length === 0) {
    return { ok: false, error: "The arrangement builder needs at least one casket to choose from." };
  }
  const sheetModels = new Set(CASKET_MODELS.map((model) => model.model));
  for (const model of home.park.builder.casketModels) {
    if (!sheetModels.has(model)) {
      return {
        ok: false,
        error: `“${model}” is not one of the 2026 casket models the catalogue sells — pick a model from the live list.`,
      };
    }
  }
  if (home.park.builder.preparationDays.length === 0) {
    return { ok: false, error: "The arrangement builder needs at least one preparation-day choice." };
  }
  const sheetDays = new Set(EMBALMING_RATES.map((row) => row.days));
  for (const days of home.park.builder.preparationDays) {
    if (!sheetDays.has(days)) {
      return {
        ok: false,
        error: `The 2026 embalming sheet prices 3–9 days — “${days}” is not one of its rows.`,
      };
    }
  }
  if (!home.park.builder.secondary.label.trim() || !home.park.builder.secondary.href.trim()) {
    return { ok: false, error: "The builder's closing action needs a label and a destination." };
  }
  for (const chapel of home.park.chapels) {
    if (!chapel.name.trim() || !chapel.kind.trim() || !chapel.what.trim()) {
      return { ok: false, error: "Every chapel card needs its name, class and one line about it." };
    }
    if (chapel.image !== null && !chapel.caption.trim()) {
      return {
        ok: false,
        error: `“${chapel.name}” publishes a photograph, so it needs its illustration-purposes caption.`,
      };
    }
  }
  if (!home.park.chapelsAction.label.trim() || !home.park.chapelsAction.href.trim()) {
    return { ok: false, error: "The chapels' action needs a label and a destination." };
  }
  if (!home.photo.kicker.trim()) {
    return { ok: false, error: "The hero photograph band needs its kicker." };
  }
  if (!home.plans.kicker.trim() || !home.plans.heading.trim()) {
    return { ok: false, error: "The plan band's kicker and heading can't be empty." };
  }
  if (!home.plans.action.label.trim() || !home.plans.action.href.trim()) {
    return { ok: false, error: "The plan band's action needs a label and a destination." };
  }
  if (!home.services.kicker.trim() || !home.services.heading.trim()) {
    return { ok: false, error: "The services band's kicker and heading can't be empty." };
  }
  if (!home.services.action.label.trim() || !home.services.action.href.trim()) {
    return { ok: false, error: "The services band's action needs a label and a destination." };
  }
  if (!home.services.allQuote.label.trim() || !home.services.allQuote.href.trim()) {
    return { ok: false, error: "The all-five quote action needs a label and a destination." };
  }
  const serviceLabels = new Set(ALACARTE_SERVICE_FEES.map((fee) => fee.service));
  for (const tile of home.services.items) {
    if (!serviceLabels.has(tile.service)) {
      return {
        ok: false,
        error: `“${tile.label || tile.service}” must bind to one of the five 2026 a-la-carte services.`,
      };
    }
    if (!tile.label.trim()) {
      return { ok: false, error: "Every service tile needs the name it prints." };
    }
    if (tile.image !== null && !tile.imageAlt.trim()) {
      return { ok: false, error: `“${tile.label}” publishes a photograph, so it needs alt text.` };
    }
    if (!tile.quote.label.trim() || !tile.quote.href.trim()) {
      return { ok: false, error: `“${tile.label}” needs a request action with a label and a destination.` };
    }
  }
  if (!home.lots.kicker.trim() || !home.lots.heading.trim()) {
    return { ok: false, error: "The park band's kicker and heading can't be empty." };
  }
  if (!home.lots.action.label.trim() || !home.lots.action.href.trim()) {
    return { ok: false, error: "The park band's action needs a label and a destination." };
  }
  if (!home.lots.quote.label.trim() || !home.lots.quote.href.trim()) {
    return { ok: false, error: "The lot detail's request action needs a label and a destination." };
  }
  for (const tile of home.lots.items) {
    const family = lotCategories.find((c) => c.title === tile.category);
    if (!family) {
      return {
        ok: false,
        error: `“${tile.label || tile.category}” must price from one of the 2026 lot families in the pricing store.`,
      };
    }
    if (!family.rows.some((row) => row.product === tile.product)) {
      return {
        ok: false,
        error: `“${tile.label}” must name a product in the 2026 lot family “${family.caption}”.`,
      };
    }
    if (!tile.label.trim()) {
      return { ok: false, error: "Every lot tile needs the name it prints." };
    }
    if (tile.image !== null && !tile.imageAlt.trim()) {
      return { ok: false, error: `“${tile.label}” publishes a photograph, so it needs alt text.` };
    }
  }
  if (!home.contact.kicker.trim() || !home.contact.heading.trim() || !home.contact.lead.trim()) {
    return { ok: false, error: "The contact band needs its kicker, heading and one lead line." };
  }
  if (!home.contact.mapTitle.trim()) {
    return { ok: false, error: "The embedded map needs its title." };
  }
  if (!home.contact.directionsLabel.trim()) {
    return { ok: false, error: "The directions action needs its label." };
  }
  // The product owns one face and it carries no emoji, so one published here
  // would render as an empty box on the page (see unrenderableGlyphs).
  for (const text of authoredText(content)) {
    const bad = unrenderableGlyphs(text);
    if (bad.length > 0) {
      return {
        ok: false,
        error: `“${bad.join("")}” can't be published: this product's typeface (Inter) carries no emoji, so the page would show an empty box instead. Please write the thought in words.`,
      };
    }
  }
  return { ok: true };
}

/* -------------------------------- store ---------------------------------- */

/**
 * The landing content document — the Home page, the FAQ, the blog, the header/footer and
 * the office contact block — as a DURABLE journal.
 *
 * 2026-09-27. This store used to keep the edited document on `globalThis` with no file
 * behind it, described in its own comment as a "demo mutation". The consequence was not
 * cosmetic: a staff edit saved, the page re-rendered with the change (same process), and
 * the edit was **gone on the next server restart** — and in a multi-instance or serverless
 * deployment it reached only the instance that handled the save. Every commerce and ops
 * store in this app is durable; the two content stores, which are exactly the ones behind
 * "how every page can be edited", were not.
 *
 * The mechanics are now the shared `lib/api-client/journal.ts`. The SEED is still
 * `lib/fixtures/landing/content.json`; each save appends ONE event, and every read folds
 * the journal from disk. Path: `LANDING_STORE_PATH` when set (tests redirect it),
 * otherwise `.data/landing-content.json` under the app's cwd.
 */
type LandingEvent = { kind: "landing_saved"; at: string; content: LandingContent };

export function landingStorePath(): string {
  return journalPath("LANDING_STORE_PATH", "landing-content.json");
}

const withLandingLock = createJournalLock();

function toLandingEvent(raw: unknown): LandingEvent {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed landing store: event", 500);
  }
  const event = raw as Record<string, unknown>;
  if (event.kind !== "landing_saved") {
    throw new ApiError(`malformed landing store: event kind ${String(event.kind)}`, 500);
  }
  if (typeof event.at !== "string") {
    throw new ApiError("malformed landing store: event timestamp", 500);
  }
  // The saved document goes through the SAME tolerant reader the seed does, so a
  // hand-edited journal cannot inject a shape the page would then render.
  return { kind: "landing_saved", at: event.at, content: readLandingContent(event.content) };
}

/**
 * Reads the current landing document: the LAST saved revision, or the recorded seed when
 * nothing has been saved yet.
 */
export async function listLandingContent(): Promise<LandingContent> {
  const events = (await readJournalEvents(landingStorePath(), "landing")).map(toLandingEvent);
  const latest = events.at(-1);
  return latest ? structuredClone(latest.content) : readLandingContent(SEED);
}

/**
 * Persists a full edited document (BFF save route is the only caller). Validates
 * before storing — rails are UNLIMITED (a 12-item rail saves fine; the rail
 * scrolls internally), malformed entries are rejected. Returns the saved
 * document so the editor can confirm exactly what the page will render.
 *
 * 2026-09-27: the write appends to the journal under the store's lock, so it survives a
 * restart and every instance reads it — the promise this comment always made.
 */
export async function saveLandingContent(raw: unknown): Promise<LandingContent> {
  const content = readLandingContent(raw);
  // The card's lot family must exist in the CURRENT pricing store, not a
  // build-time list: renaming a family in /staff/pricing must not silently
  // orphan a home-page price line.
  const pricing = await loadPricingDocument();
  const verdict = validateLandingContent(content, pricing.lotCategories);
  if (!verdict.ok) {
    throw new ApiError(verdict.error, 422);
  }
  const saved: LandingContent = {
    ...content,
    version: 1,
    updated_at: new Date().toISOString(),
  };
  return withLandingLock(async () => {
    const store = landingStorePath();
    const events = await readJournalEvents(store, "landing");
    const at = saved.updated_at ?? new Date().toISOString();
    await writeJournalEvents(store, "landing", [
      ...events,
      { kind: "landing_saved", at, content: saved } satisfies LandingEvent,
    ]);
    return structuredClone(saved);
  });
}

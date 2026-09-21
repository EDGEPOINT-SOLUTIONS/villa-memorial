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
 * content; demo mutations live on globalThis so the BFF route and the screen
 * that re-renders after it agree (same pattern as commerce's fixture orders /
 * property's fixture lots / scheduling bookings). No money math happens here —
 * displayed prices are content strings sourced from lib/villa-pricing.ts.
 */
import { ApiError } from "@/lib/api-client/api-error";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { isValidCssColor, readHeroTextColour, readHeroTransparency } from "@/lib/landing/hero-background";
import type { LotCategory } from "@/lib/pricing-model";
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
 * One "Services we offer" card (home.html · SERVICES WE OFFER — the client's
 * four-families sheet, one card each).
 *
 * NO AMOUNT IS AUTHORED HERE: `category` names a LIVE lot family from the
 * editable pricing store (`lib/api-client/pricing.ts`), and the view derives the
 * prototype's meta line ("from ₱75,000 · ₱1,125 / month, 6 yrs") through
 * lotCategoryFromPriceOf() — no amount is typed. `icon` names one of the four prototype glyphs
 * (components/landing/service-icons.tsx); an unknown key degrades to the
 * generic glyph rather than breaking the card.
 */
export type ServiceCard = {
  id: string;
  icon: string;
  title: string;
  text: string;
  href: string;
  /** A live lot-family title from the editable pricing store. */
  category: string;
};

export type ServicesSection = {
  kicker: string;
  heading: string;
  intro: string;
  items: ServiceCard[];
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

export type LandingContent = {
  version: 1;
  updated_at: string | null;
  logo: LogoConfig;
  contact: ContactInfo;
  hero: HeroSection;
  rails: { left: RailConfig; right: RailConfig };
  about: AboutSection;
  services: ServicesSection;
  plans: PlansSection;
  blog: BlogSection;
  map: MapSection;
  faq: FaqSection;
};

type ContentStore = { content: LandingContent };
const SEED = (contentFile as unknown as ContentStore).content;

const RAIL_KINDS: RailItemKind[] = ["product", "service", "plan", "link"];
const MEDIA_KINDS: MediaKind[] = ["photo", "video"];

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
  push(content.services.kicker);
  push(content.services.heading);
  push(content.services.intro);
  for (const card of content.services.items) {
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

function readServiceCard(raw: unknown): ServiceCard | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!str(r.title)) return null;
  return {
    id: str(r.id) || `svc-${Math.random().toString(36).slice(2, 8)}`,
    icon: str(r.icon),
    title: str(r.title),
    text: str(r.text),
    href: str(r.href, "/services"),
    category: str(r.category),
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

/** Full tolerant read of a content document (used by the page + editor + BFF). */
export function readLandingContent(raw: unknown): LandingContent {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const logoRaw = r.logo ?? {};
  const contactRaw = r.contact ?? {};
  const heroRaw = r.hero ?? {};
  const railsRaw = r.rails ?? {};
  const aboutRaw = r.about ?? {};
  const servicesRaw = r.services ?? {};
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
      wordmark: readStr(logoRaw as Record<string, unknown>, "wordmark") || "Villa Memorial Park",
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
    services: {
      kicker: readStr(servicesRaw as Record<string, unknown>, "kicker") || "What we do",
      heading: readStr(servicesRaw as Record<string, unknown>, "heading") || "Services we offer",
      intro: readStr(servicesRaw as Record<string, unknown>, "intro"),
      items: arr((servicesRaw as Record<string, unknown>).items)
        .map(readServiceCard)
        .filter((x): x is ServiceCard => x !== null),
    },
    plans: {
      kicker: readStr(plansRaw as Record<string, unknown>, "kicker") || "Plan ahead",
      heading: readStr(plansRaw as Record<string, unknown>, "heading") || "Villa Memorial Plan",
      intro: readStr(plansRaw as Record<string, unknown>, "intro"),
      note: readNullable(plansRaw as Record<string, unknown>, "note"),
    },
    blog: {
      heading: readStr(blogRaw as Record<string, unknown>, "heading") || "News from the park",
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
  for (const card of content.services.items) {
    if (!card.title.trim() || !card.text.trim() || !card.href.trim()) {
      return { ok: false, error: `“${card.title || "A service card"}” needs a title, a line of copy and a link.` };
    }
    if (!lotCategories.some((c) => c.title === card.category)) {
      return {
        ok: false,
        error: `“${card.title}” must price from one of the 2026 lot families in the pricing store.`,
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

// Next.js compiles route handlers into separate bundles — demo mutations live
// on globalThis so the BFF save route and the re-rendered screens agree within
// one server process (same reasoning as commerce/property/scheduling stores).
type FixtureGlobal = typeof globalThis & { __imLandingContent?: LandingContent };
const fixtureGlobal = globalThis as FixtureGlobal;

/** Reads the current landing document (seed + any saved demo mutation). */
export async function listLandingContent(): Promise<LandingContent> {
  return fixtureGlobal.__imLandingContent ?? readLandingContent(SEED);
}

/**
 * Persists a full edited document (BFF save route is the only caller). Validates
 * before storing — rails are UNLIMITED (a 12-item rail saves fine; the rail
 * scrolls internally), malformed entries are rejected. Returns the saved
 * document so the editor can confirm exactly what the page will render.
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
  fixtureGlobal.__imLandingContent = saved;
  return saved;
}

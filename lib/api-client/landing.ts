/**
 * Landing Page content seam — the public home (localhost:4000 /) renders ONLY
 * from this document, and the staff "Landing Page" editor persists into the
 * same store. Lives under api-client because it follows the module pattern
 * exactly: typed tolerant reader over a recorded fixture seed + a save path
 * with the service owning validation.
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
};

export type HeroSection = {
  eyebrow: string;
  headline: string;
  subline: string;
  primaryCta: Cta;
  secondaryCta: Cta;
};

export type AboutSection = {
  heading: string;
  story: string;
  mission: string;
  vision: string;
  image: string | null;
};

export type ServiceLink = { label: string; href: string };
export type ServiceDetail = {
  id: string;
  title: string;
  tagline: string | null;
  image: string | null;
  body: string[];
  bullets: string[];
  link: ServiceLink;
};

export type ServicesSection = { heading: string; intro: string; items: ServiceDetail[] };

export type PlanCard = {
  id: string;
  badge: string | null;
  name: string;
  price: string;
  note: string | null;
  image: string | null;
  href: string;
};

export type PlansSection = { heading: string; intro: string; note: string | null; items: PlanCard[] };

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
};

type ContentStore = { content: LandingContent };
const SEED = (contentFile as unknown as ContentStore).content;

const RAIL_KINDS: RailItemKind[] = ["product", "service", "plan", "link"];
const MEDIA_KINDS: MediaKind[] = ["photo", "video"];

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
  };
}

function readRailConfig(raw: unknown): RailConfig {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    heading: str(r.heading, "Quick links"),
    // Tolerant reader: drop malformed entries only — rails are UNLIMITED (staff
    // pins any number; the rail scrolls internally). Never truncate here.
    items: arr(r.items).map(readRailItem).filter((x): x is RailItem => x !== null),
  };
}

function readServiceDetail(raw: unknown): ServiceDetail | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!str(r.title)) return null;
  const linkRaw = r.link;
  const link = (typeof linkRaw === "object" && linkRaw !== null ? linkRaw : {}) as Record<string, unknown>;
  return {
    id: str(r.id) || `svc-${Math.random().toString(36).slice(2, 8)}`,
    title: str(r.title),
    tagline: nullableStr(r.tagline),
    image: nullableStr(r.image),
    body: arr(r.body).map((b) => str(b)).filter(Boolean),
    bullets: arr(r.bullets).map((b) => str(b)).filter(Boolean),
    link: { label: str(link.label, "Learn more"), href: str(link.href, "/services") },
  };
}

function readPlanCard(raw: unknown): PlanCard | null {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!str(r.name) || !str(r.price)) return null;
  return {
    id: str(r.id) || `plan-${Math.random().toString(36).slice(2, 8)}`,
    badge: nullableStr(r.badge),
    name: str(r.name),
    price: str(r.price),
    note: nullableStr(r.note),
    image: nullableStr(r.image),
    href: str(r.href, "/plans"),
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

  return {
    version: 1,
    updated_at: nullableStr(r.updated_at),
    logo: {
      wordmark: readStr(logoRaw as Record<string, unknown>, "wordmark") || "Villa Memorial Park",
      markImage: readNullable(logoRaw as Record<string, unknown>, "markImage"),
    },
    contact: {
      phoneLabel: readStr(contactRaw as Record<string, unknown>, "phoneLabel") || "24/7 Assistance Line",
      phoneDisplay: readStr(contactRaw as Record<string, unknown>, "phoneDisplay") || "0917 000 1234",
      phoneHref: readStr(contactRaw as Record<string, unknown>, "phoneHref") || "tel:+639170001234",
      location: readStr(contactRaw as Record<string, unknown>, "location"),
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
      heading: readStr(servicesRaw as Record<string, unknown>, "heading") || "Services in full detail",
      intro: readStr(servicesRaw as Record<string, unknown>, "intro"),
      items: arr((servicesRaw as Record<string, unknown>).items)
        .map(readServiceDetail)
        .filter((x): x is ServiceDetail => x !== null),
    },
    plans: {
      heading: readStr(plansRaw as Record<string, unknown>, "heading") || "Memorial plans & garden lots",
      intro: readStr(plansRaw as Record<string, unknown>, "intro"),
      note: readNullable(plansRaw as Record<string, unknown>, "note"),
      items: arr((plansRaw as Record<string, unknown>).items)
        .map(readPlanCard)
        .filter((x): x is PlanCard => x !== null),
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
  };
}

/* ------------------------------ save validation ------------------------------ */

/**
 * The save authority. Rules mirror what the UI enforces so the demo never
 * teaches a state the model rejects:
 *  - rail items carry a known kind and a title + href (rail length is unlimited);
 *  - empty rails / empty plans / empty blog posts lists are legal (the page
 *    renders graceful empty states);
 *  - a blog post MAY have an empty media list (caption-only post);
 *  - a blog post MAY carry an optional link — the route its photo/caption opens
 *    (empty means the post is not clickable);
 *  - media entries must be photo|video with a usable src.
 * Displayed prices are free content strings — no money validation (prices are
 * never computed here).
 */
export function validateLandingContent(content: LandingContent): { ok: true } | { ok: false; error: string } {
  if (!content.hero.headline.trim()) return { ok: false, error: "The hero headline can't be empty." };
  if (!content.hero.primaryCta.label.trim() || !content.hero.primaryCta.href.trim()) {
    return { ok: false, error: "The primary call-to-action needs a label and a destination." };
  }
  if (!content.hero.secondaryCta.label.trim() || !content.hero.secondaryCta.href.trim()) {
    return { ok: false, error: "The secondary call-to-action needs a label and a destination." };
  }
  if (!content.logo.wordmark.trim()) return { ok: false, error: "The wordmark can't be empty." };
  if (!content.contact.phoneDisplay.trim() || !content.contact.phoneHref.trim()) {
    return { ok: false, error: "The 24/7 line needs a number to display and a call link." };
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
  for (const post of content.blog.posts) {
    for (const m of post.media) {
      if (!MEDIA_KINDS.includes(m.kind) || !m.src.trim()) {
        return { ok: false, error: "Every attached photo/video needs a working media source." };
      }
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
  const verdict = validateLandingContent(content);
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

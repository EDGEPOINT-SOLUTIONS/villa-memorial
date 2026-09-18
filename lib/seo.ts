/**
 * Public-site SEO surface — the single home for the canonical origin, the
 * per-route Metadata (canonical URL + OpenGraph/Twitter), the sitemap route
 * table and the LocalBusiness structured data.
 *
 * WHY HERE: the audit (`docs/08-delivery/prd-alignment-audit.md` §7.1 G4) found
 * the public site had no sitemap, no robots, no canonical/OpenGraph tags and no
 * structured data — a real funeral-services business in Isabela City cannot be
 * found on Google without them. Every public page now builds its Metadata
 * through `pageMetadata()` and its JSON-LD through `localBusinessJsonLd()`, so
 * one file answers "what does the site tell search engines".
 *
 * HOST: the repo does not freeze a production hostname and `next.config.mjs` is
 * intentionally minimal. The documented deployment host is
 * `https://in-memoriam.edgepoint-ai.com`
 * (`docs/08-delivery/notes/known-limitations-cp1.md` §Revision Aug 29,
 * `docs/08-delivery/notes/demo-script-cp1.md`), so that is the fallback; a real
 * deployment sets `SITE_URL` (server-side, never NEXT_PUBLIC_* — see
 * `.env.example`). Every canonical/OG URL below is emitted ABSOLUTE so it stays
 * correct even if `metadataBase` were built without the env var.
 *
 * CONTACT DETAILS: structured data reuses exactly what the public pages
 * themselves publish — the LandingPage content document's wordmark, 24/7 line
 * and location line (staff-editable in the landing editor). Nothing is invented
 * here; a number or address change in that document flows into the structured
 * data on the next request.
 */
import type { Metadata } from "next";
import type { LandingContent } from "@/lib/api-client/landing";
import { HERO_IMAGE } from "@/lib/media";

/** The documented deployment host; override with SITE_URL on a real deployment. */
export const DEFAULT_SITE_URL = "https://in-memoriam.edgepoint-ai.com";

/** The park's own logo mark stands in for a favicon (app/layout.tsx). */

export const SITE_NAME = "Villa Memorial Park";

/** The one description the home, the sitemap fallbacks and the LocalBusiness
 * record share — the same line the public home publishes. */
export const SITE_DESCRIPTION =
  "Honoring every life with dignity and light — funeral services, memorial plans and garden lots from the first memorial park in Basilan. Anchored catalogue: every service, plan and price one click away.";

/** The public site's share image (the client's own park photo, 1626×916). */
export const DEFAULT_OG_IMAGE = HERO_IMAGE;
export const DEFAULT_OG_IMAGE_WIDTH = 1626;
export const DEFAULT_OG_IMAGE_HEIGHT = 916;

/** The canonical origin, read per call so a runtime SITE_URL is honoured.
 * A malformed SITE_URL falls back to the documented host instead of crashing
 * every page that builds a canonical URL. */
export function siteUrl(): string {
  const raw = process.env.SITE_URL?.trim();
  const candidate = (raw && raw.length > 0 ? raw : DEFAULT_SITE_URL).replace(/\/+$/, "");
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/** Absolute URL for a site path (pass "/" for the origin itself). */
export function absoluteUrl(path: string, base: string = siteUrl()): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}${clean === "/" ? "" : clean}`;
}

export type PageMetadataInput = {
  /** Full page title, in the repo's existing "… — Villa Memorial" convention. */
  title: string;
  description: string;
  /** Site path, e.g. "/lots". Drives the canonical URL and og:url. */
  path: string;
  /** Share image; defaults to the park photo. */
  image?: string | null;
  /** Alt text for the share image; defaults to the business name. */
  imageAlt?: string;
  type?: "website" | "article";
};

/**
 * Per-route Metadata: canonical URL + OpenGraph (title, description, absolute
 * image) + the Twitter summary card. Titles stay exactly as each route already
 * spells them; this adds what search engines and share sheets need.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  imageAlt = SITE_NAME,
  type = "website",
}: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(path);
  const shareImage = absoluteUrl(image ?? DEFAULT_OG_IMAGE);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: "en_PH",
      images: [
        {
          url: shareImage,
          width: DEFAULT_OG_IMAGE_WIDTH,
          height: DEFAULT_OG_IMAGE_HEIGHT,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImage],
    },
  };
}

/**
 * The public routes the sitemap publishes, with their crawl hints. Only the
 * site's real public pages belong here: transactional/account routes (/cart,
 * /checkout, /orders, the sign-in doors, the staff/family/agent portals) are
 * deliberately absent and disallowed in app/robots.ts.
 *
 * `tests/unit/seo.test.ts` walks `app/(public)` and fails if a public page is
 * missing from this table (or a listed path has no page) — so adding a route
 * without its sitemap entry is a red test, not a silent SEO gap.
 */
export type PublicPage = {
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

export const PUBLIC_PAGES: ReadonlyArray<PublicPage> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/immediate-assistance", changeFrequency: "monthly", priority: 0.9 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/services/death-at-home", changeFrequency: "monthly", priority: 0.7 },
  { path: "/services/death-at-hospital", changeFrequency: "monthly", priority: 0.7 },
  { path: "/plans", changeFrequency: "weekly", priority: 0.9 },
  { path: "/plans/villa-memorial-plan", changeFrequency: "weekly", priority: 0.9 },
  { path: "/plans/senior-benefits", changeFrequency: "monthly", priority: 0.8 },
  { path: "/plans/compare", changeFrequency: "monthly", priority: 0.6 },
  { path: "/packages", changeFrequency: "monthly", priority: 0.7 },
  { path: "/products", changeFrequency: "monthly", priority: 0.8 },
  { path: "/lots", changeFrequency: "weekly", priority: 0.9 },
  { path: "/lots/price-list-2026", changeFrequency: "monthly", priority: 0.8 },
  { path: "/map", changeFrequency: "weekly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/transport", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { path: "/quote", changeFrequency: "monthly", priority: 0.5 },
  { path: "/appointments", changeFrequency: "monthly", priority: 0.5 },
];

/**
 * The location line the public pages publish is one free-text field
 * ("Isabela City, Basilan"). Structured data wants locality + region split, so
 * the line is read into a PostalAddress: the part before the first comma is the
 * locality, everything after it the region. A one-part line stays the locality.
 * The country is the Philippines — the only fact added here, and it is the
 * client's own profile (`docs/07-client-villa/client-profile.md`).
 */
export function postalAddress(location: string): Record<string, unknown> {
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    "@type": "PostalAddress",
    addressLocality: parts[0] ?? location.trim(),
    ...(parts.length > 1 ? { addressRegion: parts.slice(1).join(", ") } : {}),
    addressCountry: "PH",
  };
}

/** "tel:+639176178489" → "+639176178489" (schema.org wants the bare number). */
function telephone(href: string): string {
  return href.replace(/^tel:/i, "").trim();
}

/**
 * The site's structured data: ONE `FuneralHome` (a LocalBusiness subtype —
 * the right type for a funeral home) plus the `WebSite` that publishes it.
 * Rendered on the home and on every public interior page, so the business
 * record is present wherever a crawler lands.
 */
export function localBusinessJsonLd(content: LandingContent): Record<string, unknown> {
  const base = siteUrl();
  const businessId = `${base}/#business`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FuneralHome",
        "@id": businessId,
        name: content.logo.wordmark,
        url: base,
        description: SITE_DESCRIPTION,
        image: absoluteUrl(content.hero.image ?? DEFAULT_OG_IMAGE, base),
        telephone: telephone(content.contact.phoneHref),
        address: postalAddress(content.contact.location),
        // The 24/7 assistance line the public header prints on every page.
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: telephone(content.contact.phoneHref),
          availableLanguage: ["en", "tl"],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: content.logo.wordmark,
        inLanguage: "en-PH",
        publisher: { "@id": businessId },
      },
    ],
  };
}

/**
 * The JSON-LD payload as a string, ready for the browser block
 * (`components/seo/json-ld.tsx`). `<` is escaped so a content string can never
 * close the script tag (the only injection shape that matters here).
 */
export function structuredDataJson(content: LandingContent): string {
  return JSON.stringify(localBusinessJsonLd(content)).replace(/</g, "\\u003c");
}

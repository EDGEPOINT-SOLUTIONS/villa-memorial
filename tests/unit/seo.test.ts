import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JsonLd } from "@/components/seo/json-ld";
import { listLandingContent } from "@/lib/api-client/landing";
import {
  DEFAULT_SITE_URL,
  PUBLIC_PAGES,
  SITE_NAME,
  UNPUBLISHED_MEMORIAL_ROBOTS,
  absoluteUrl,
  localBusinessJsonLd,
  pageMetadata,
  postalAddress,
  siteUrl,
  structuredDataJson,
} from "@/lib/seo";

/**
 * The public SEO surface (audit §7.1 G4): sitemap + robots, per-route canonical
 * and OpenGraph metadata, and the LocalBusiness/WebSite structured data.
 *
 * The route-coverage test is the drift guard: it walks app/(public) and fails if
 * a public page is missing from the sitemap table (or a listed path has no
 * page), so a new route cannot ship invisible to search engines.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "app", "(public)");

/** Transactional/account routes are real pages but must never be indexed. */
const NON_INDEXABLE = new Set(["/cart", "/quote", "/checkout"]);

/** Routes that are only redirects: a redirect is not a public page, so the
 *  sitemap table must not carry it (captain, 2026-09-30 — the lots listing is
 *  retired onto the park page's Lots view). */
const REDIRECT_ONLY = new Set(["/lots"]);

/**
 * Public pages that deliberately live OUTSIDE `app/(public)`, and so are
 * invisible to the directory walk below. EMPTY since 2026-09-29: the blog got
 * its own page document and moved INTO the group (it renders on the shared
 * chrome now), so every static public page is found by the walk.
 */
const OUTSIDE_THE_GROUP: string[] = [];

function publicPageRoutes(dir = PUBLIC_DIR, prefix = ""): string[] {
  const routes: string[] = [];
  for (const name of readdirSync(dir)) {
    const entry = path.join(dir, name);
    if (statSync(entry).isDirectory()) {
      routes.push(...publicPageRoutes(entry, `${prefix}/${name}`));
      continue;
    }
    if (name !== "page.tsx") continue;
    // Dynamic detail routes (/lots/[id], /plans/[sku], /products/[sku]) are
    // published from the live stores by app/sitemap.ts, not the static table.
    if (prefix.includes("[")) continue;
    routes.push(prefix === "" ? "/" : prefix);
  }
  return routes;
}

describe("the sitemap table covers every public page", () => {
  it("lists every static public route and no transactional one", () => {
    // Since 2026-09-27 the home lives INSIDE `app/(public)` (it renders on the
    // shared public shell), so the walk finds "/" itself. `/blog` is the one
    // public page that has to stay outside the group — see OUTSIDE_THE_GROUP.
    const fromDisk = [...OUTSIDE_THE_GROUP, ...publicPageRoutes()].filter(
      (route) => !NON_INDEXABLE.has(route) && !REDIRECT_ONLY.has(route)
    );
    const fromTable = PUBLIC_PAGES.map((page) => page.path);
    expect([...fromTable].sort()).toEqual([...fromDisk].sort());
  });

  it("includes the home and the FAQ the content editor now drives", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/faq");
    expect(paths).not.toContain("/cart");
    expect(paths).not.toContain("/quote");
    expect(paths).not.toContain("/checkout");
  });

  it("publishes the memorial surface deliberately, and no detail route statically", () => {
    const paths = PUBLIC_PAGES.map((page) => page.path);
    // The search and the family's find path are public pages...
    expect(paths).toContain("/memorials");
    expect(paths).toContain("/memorials/find");
    // ...but a MEMORIAL DETAIL page is never a static entry: it enters the
    // sitemap only once its family has published it (app/sitemap.ts reads the
    // store; the reader drops every non-published record).
    expect(paths.filter((p) => p.startsWith("/memorials/"))).toEqual(["/memorials/find"]);
  });
});

describe("pageMetadata emits canonical, OpenGraph and Twitter tags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds absolute URLs from the documented host by default", () => {
    const meta = pageMetadata({
      title: "Memorial lots — Villa Funeraria",
      description: "Browse the park's plots.",
      path: "/lots",
    });
    expect(meta.alternates?.canonical).toBe(`${DEFAULT_SITE_URL}/lots`);
    expect(meta.openGraph?.url).toBe(`${DEFAULT_SITE_URL}/lots`);
    expect(meta.openGraph?.title).toBe("Memorial lots — Villa Funeraria");
    expect(meta.openGraph?.description).toBe("Browse the park's plots.");
    expect(meta.openGraph?.siteName).toBe(SITE_NAME);
    const images = meta.openGraph?.images as Array<{ url: string }>;
    expect(images[0].url.startsWith(DEFAULT_SITE_URL)).toBe(true);
    expect((meta.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("honours a deployment's SITE_URL and canonicalises the home to the origin", () => {
    vi.stubEnv("SITE_URL", "https://villa.example.ph/");
    expect(siteUrl()).toBe("https://villa.example.ph");
    expect(absoluteUrl("/")).toBe("https://villa.example.ph");
    const meta = pageMetadata({ title: "T", description: "D", path: "/" });
    expect(meta.alternates?.canonical).toBe("https://villa.example.ph");
  });

  it("falls back to the documented host for a malformed SITE_URL instead of throwing", () => {
    vi.stubEnv("SITE_URL", "not a url");
    expect(siteUrl()).toBe(DEFAULT_SITE_URL);
  });

  it("carries a per-route share image when one is given", () => {
    const meta = pageMetadata({
      title: "T",
      description: "D",
      path: "/products/CSK-LUMINA",
      image: "/media/coffin-bronze-1.jpg",
    });
    const images = meta.openGraph?.images as Array<{ url: string }>;
    expect(images[0].url).toBe(`${DEFAULT_SITE_URL}/media/coffin-bronze-1.jpg`);
  });
});

describe("the LocalBusiness structured data reuses the published contact facts", () => {
  it("names the business, its published 24/7 line and its location", async () => {
    const content = await listLandingContent();
    const data = localBusinessJsonLd(content) as {
      "@graph": Array<Record<string, unknown>>;
    };
    const business = data["@graph"][0];
    const website = data["@graph"][1];

    expect(business["@type"]).toBe("FuneralHome");
    expect(business.name).toBe(content.logo.wordmark);
    expect(business.url).toBe(DEFAULT_SITE_URL);
    expect(business.telephone).toBe(content.contact.phoneHref.replace(/^tel:/, ""));
    expect(business.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Isabela City",
      addressRegion: "Basilan",
      addressCountry: "PH",
    });
    expect(website["@type"]).toBe("WebSite");
    expect(website.publisher).toEqual({ "@id": `${DEFAULT_SITE_URL}/#business` });
  });

  it("keeps a one-part location line as the locality", () => {
    expect(postalAddress("Isabela City")).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Isabela City",
      addressCountry: "PH",
    });
  });

  it("serialises safely into the JSON-LD script block", async () => {
    const content = await listLandingContent();
    const json = structuredDataJson(content);
    expect(json).not.toContain("<");
    expect(JSON.parse(json)).toHaveProperty("@graph");

    const html = renderToStaticMarkup(createElement(JsonLd, { content }));
    expect(html).toContain('type="application/ld+json"');
    const payload = html.slice(html.indexOf(">") + 1, html.lastIndexOf("</script>"));
    expect((JSON.parse(payload) as { "@graph": unknown[] })["@graph"]).toHaveLength(2);
  });
});

describe("/sitemap.xml and /robots.txt", () => {
  it("publishes the static pages plus the real detail routes", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    for (const page of PUBLIC_PAGES) {
      expect(urls, `sitemap is missing ${page.path}`).toContain(absoluteUrl(page.path));
    }
    // The catalogue's casket detail routes (frozen SKU map) and the real lots
    // are linked for crawlers too. Plan packages are NOT listed per SKU: the
    // package view answers at /plans/packages (in PUBLIC_PAGES) and every
    // /plans/PKG-* URL 308-redirects there, so a detail URL here would advertise
    // a redirect as a canonical page (the 2026-09-30 sitemap fix).
    expect(urls.some((url) => url.includes("/products/CSK-"))).toBe(true);
    expect(urls.some((url) => url.includes("/lots/"))).toBe(true);
    expect(urls).toContain(absoluteUrl("/plans/packages"));
    expect(urls.some((url) => url.includes("/plans/PKG-"))).toBe(false);
  });

  it("never publishes a private or transactional route", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);
    for (const secret of ["/quote", "/checkout", "/staff", "/client", "/agent", "/orders/", "/api/"]) {
      expect(urls.filter((url) => url.includes(secret))).toEqual([]);
    }
  });

  it("carries the memorial surface, but no unpublished memorial detail", async () => {
    const { default: sitemap } = await import("@/app/sitemap");
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain(absoluteUrl("/memorials"));
    expect(urls).toContain(absoluteUrl("/memorials/find"));
    // The fixture store publishes no memorial (nothing may be fabricated), so
    // no /memorials/<id> URL may appear — the family's decision is the gate.
    const details = urls.filter((url) => /\/memorials\/[^/]+$/.test(url) && !url.endsWith("/memorials/find"));
    expect(details).toEqual([]);
  });

  it("keeps the query-keyed memorial search out of crawlers and lets the detail route self-declare", async () => {
    const { default: robots } = await import("@/app/robots");
    const policy = robots();
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    const disallow = (rule as { disallow?: string[] }).disallow ?? [];
    // A query-keyed result page must never become an indexed name directory...
    expect(disallow).toContain("/memorials?");
    // ...but /memorials itself and the detail shape stay crawlable: a published
    // memorial is meant to be found, and the unpublished one answers noindex
    // from its own head.
    expect(disallow).not.toContain("/memorials");
    expect(disallow).not.toContain("/memorials/");
    expect(UNPUBLISHED_MEMORIAL_ROBOTS).toEqual({ index: false, follow: true });
  });

  it("robots allows the storefront, closes the session surfaces and points at the sitemap", async () => {
    const { default: robots } = await import("@/app/robots");
    const policy = robots();
    const rule = Array.isArray(policy.rules) ? policy.rules[0] : policy.rules;
    expect(rule.userAgent).toBe("*");
    expect(policy.sitemap).toBe(absoluteUrl("/sitemap.xml"));
    expect(policy.host).toBe(siteUrl());
    const disallow = (rule as { disallow?: string[] }).disallow ?? [];
    for (const closed of [
      "/api/",
      "/staff/",
      "/client/",
      "/agent/",
      "/cart",
      "/quote",
      "/checkout",
      "/platform/",
    ]) {
      expect(disallow).toContain(closed);
    }
  });
});

describe("the JSON-LD block is rendered on the public surfaces", () => {
  it("the home is inside the (public) group, so the layout renders it for the home too", () => {
    // Before 2026-09-27 the home was `app/page.tsx` and had to render its own
    // JsonLd. It now lives in the group, so there is exactly ONE place that
    // renders the structured data — the shared layout asserted below — and the
    // home must NOT carry a second copy (two LocalBusiness blocks on one page is
    // a duplicate-entity signal to a crawler).
    expect(existsSync(path.join(ROOT, "app", "page.tsx"))).toBe(false);
    const home = readFileSync(path.join(ROOT, "app", "(public)", "page.tsx"), "utf8");
    expect(home).not.toContain("<JsonLd");
  });

  it("the shared public layout renders it on every interior page", () => {
    const layout = readFileSync(path.join(ROOT, "app", "(public)", "layout.tsx"), "utf8");
    expect(layout).toContain("<JsonLd content={content} />");
  });
});

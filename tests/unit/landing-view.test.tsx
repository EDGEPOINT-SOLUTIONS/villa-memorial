import { readFileSync } from "node:fs";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LandingFooter,
  LandingView,
  type LandingViewProps,
} from "@/components/landing/landing-view";
import { listLandingContent, type LandingContent } from "@/lib/api-client/landing";
import { PLAN_PACKAGES_IMAGE, libraryThumb } from "@/lib/media";
import { planLotCardFigures } from "@/lib/landing/plan-lots";
import {
  LOT_PRICE_CATEGORIES,
  PLAN_TERMS,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  VMP_PAYMENTS,
  php,
  planRate,
} from "@/lib/villa-pricing";

// LandingView's cards render through the kit ProductCard, which uses next/link;
// under the node test runner Link is a plain anchor.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/**
 * Public-interface render tests for the anchored catalogue home (executed through
 * LandingView — the exact component the root page renders, with the live-map node
 * stubbed to null so the view stays framework-free). They pin the layout contract:
 * the home renders as a three-column shell (left fixed rail + scrollable middle +
 * right fixed rail), rails are unlimited (every pinned item renders), and empty
 * plan lists / empty blog media lists / empty rails render graceful states instead
 * of crashing.
 */
const cloneDoc = (doc: LandingContent): LandingContent =>
  JSON.parse(JSON.stringify(doc)) as LandingContent;

/** The seed pricing slices the view now takes as props (tests render the seed). */
const SEED_PLANS = { regular: VMP_PAYMENTS, senior: SENIOR_PAYMENTS };
type ViewProps = Omit<LandingViewProps, "planPricing" | "lotCategories">;

/** Render helper: pricing props default to the recorded seed in these tests. */
function view(props: ViewProps) {
  return LandingView({ ...props, planPricing: SEED_PLANS, lotCategories: LOT_PRICE_CATEGORIES });
}

/** React escapes text nodes; the lead title "Viewing & wake set-up" renders as &amp;. */
const escaped = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const railItemCount = (html: string): number =>
  (html.match(/class="rail-item(?: rail-item--lead)?"/g) ?? []).length;

describe("the home renders the anchored catalogue shell", () => {
  it("renders left rail + middle + right rail from the recorded content", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );

    // Three-column anatomy: two fixed rails flanking the scrollable middle.
    expect(html).toContain("anchored-grid");
    expect(html).toContain("anchored-rail--left");
    expect(html).toContain("anchored-rail--right");
    expect(html).toContain("anchored-mid");

    // Both rails actually list their pinned items (photo thumbs included).
    const left = content.rails.left;
    const right = content.rails.right;
    for (const item of [...left.items, ...right.items]) {
      // Titles are HTML-escaped in the server markup (&amp; for &).
      expect(html).toContain(item.title.replace(/&/g, "&amp;"));
    }
    expect(railItemCount(html)).toBe(left.items.length + right.items.length);
    expect(html).toContain('class="rail-thumb"');

    // Hero with both approved doors.
    expect(html).toContain("Honoring every life with dignity and light.");
    expect(html).toContain("I need help now");
    expect(html).toContain("Plan ahead");
  });

  it("header nav leads with an explicit Home link so visitors always know the way back", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    const nav = html.slice(html.indexOf('<nav class="anchored-header__nav'), html.indexOf("</nav>"));
    expect(nav.indexOf('href="/">Home<')).toBeGreaterThanOrEqual(0);
    // Home is the first destination in the bar.
    expect(nav.indexOf("Home")).toBeLessThan(nav.indexOf("Funeraria Memorial Services"));
  });

  it("public chrome keeps the top-level pages and groups the rest under Explore more", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // Header bar (the ONE public nav — same component on every public page):
    // the captain's five top-level destinations (2026-09-21 direction).
    const nav = html.slice(html.indexOf('<nav class="anchored-header__nav'), html.indexOf("</nav>"));
    for (const [href, label] of [
      ["/", "Home"],
      ["/services", "Funeraria Memorial Services"],
      ["/plans", "Villa Memorial Plan"],
      ["/map", "Villa Memorial Park"],
      ["/contact", "Contact"],
    ] as const) {
      expect(nav).toContain(`href="${href}">${label}</a>`);
    }
    // Lots left the bar (it lives inside Villa Memorial Park) and the four
    // secondary pages moved into the grouped Explore more menu.
    const menu = nav.slice(nav.indexOf("anchored-header__explore-menu"));
    expect(menu).toContain("Builder");
    expect(menu).toContain("Facilities");
    expect(menu).toContain("Gallery");
    expect(menu).toContain("Memorials");
    expect(nav).not.toContain('href="/lots"');
    expect(nav.slice(0, nav.indexOf("anchored-header__explore"))).not.toContain('href="/builder"');
    // The footer keeps the same destinations, de-duplicated (captain,
    // 2026-09-21): the plan has ONE entry (Care & planning), and the park's
    // one clear entry is the contact block's map link, never a second
    // "Villa Memorial Park" beside the brand wordmark.
    expect(html).toContain('<a href="/services">Funeraria Memorial Services</a>');
    expect(html).toContain('<a href="/plans">Villa Memorial Plan</a>');
    expect(html).toContain('<a href="/map">Map &amp; directions →</a>');
    // The park's ONE footer entry is the contact block's map link — never a
    // second "Villa Memorial Park" beside the brand wordmark. (The header bar
    // legitimately carries the top-level name; scope this to the footer.)
    const footer = html.slice(html.indexOf('<footer class="anchored-footer"'));
    expect(footer).not.toContain('<a href="/map">Villa Memorial Park</a>');
  });

  it("the footer lists one entry per destination and uses the live page names", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(createElement(LandingFooter, { content }));
    // Pull the two link columns (the brand column and the contact block are
    // separate grammars) and assert no destination or label repeats.
    const columns = [...html.matchAll(/<ul class="anchored-footer__links">([\s\S]*?)<\/ul>/g)].map(
      (m) => m[1],
    );
    expect(columns).toHaveLength(2);
    const links = columns
      .flatMap((column) => [...column.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)])
      .map(([, href, label]) => ({ href, label: label.replace(/&amp;/g, "&") }));
    const hrefs = links.map((link) => link.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const labels = links.map((link) => link.label);
    expect(new Set(labels).size).toBe(labels.length);
    // Labels match the live pages, not the retired wording.
    expect(labels).toContain("Coffins & caskets");
    expect(labels).toContain("Memorial lots");
    expect(labels).not.toContain("Products & caskets");
    expect(labels).not.toContain("Browse the lots");
  });

  it("the left rail leads with the always-reachable help card (captain, 2026-09-25)", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // The retired 2026-09-21 rail-call class stays retired, but the captain's
    // 2026-09-25 storefront pass reintroduces the help card under a new name.
    expect(html).toContain("rail-assist");
    expect(html).toContain("Need help now?");
    expect(html).not.toContain("rail-call");
    expect(html).toContain("rail-heading");
    // The number is read from the content document, never typed.
    expect(html).toContain(content.contact.phoneDisplay);
    expect(html).toContain(`href="${content.contact.phoneHref}"`);
  });

  it("the right rail leads with the four quick actions (captain, 2026-09-25)", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    for (const [href, label] of [
      ["/price-list", "Price list"],
      ["/quote", "Request a quote"],
      ["/builder", "Plan finder"],
      ["/map", "Directions &amp; park map"],
    ] as const) {
      expect(html, label).toContain(`class="rail-action" href="${href}"`);
      expect(html, label).toContain(label);
    }
  });

  it("middle sections render products first, story after (Amazon order, captain 2026-09-25)", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    const heroPos = html.indexOf("hero-home__title");
    const plansLotsPos = html.indexOf("plan-lot-grid");
    const plansPos = html.indexOf("plan-board");
    const mapPos = html.indexOf("mid-section--map");
    const aboutPos = html.indexOf("about-grid");
    const blogPos = html.indexOf("blog-feed");
    expect(heroPos).toBeGreaterThanOrEqual(0);
    // The shelf leads: plans & lots → the plan board → the live park map.
    expect(plansLotsPos).toBeGreaterThan(heroPos);
    expect(plansPos).toBeGreaterThan(plansLotsPos);
    expect(mapPos).toBeGreaterThan(plansPos);
    // The About/mission band and the newsfeed close the column.
    expect(aboutPos).toBeGreaterThan(mapPos);
    expect(blogPos).toBeGreaterThan(aboutPos);
    // Seed blog captions render, and no like/share action row is rendered.
    expect(html).toContain("golden hour");
    expect(html).not.toContain("like");
    expect(html).not.toContain('aria-label="Like"');
  });

  it("renders the captain's “Memorial plans & garden lots” cards with live 2026 figures", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("Plans &amp; lots");
    expect(html).toContain("Memorial plans &amp; garden lots");
    expect(html).toContain("Choose what fits your family");
    // The retired band is gone.
    expect(html).not.toContain("What we do");
    expect(html).not.toContain("Services we offer");
    // Five cards, each the kit card, and the band carries ONE "see all" door.
    expect((html.match(/class="shop-card"/g) ?? []).length).toBe(5);
    expect(html).toContain('class="section-head__link" href="/lots"');
    // The card's one action wears the per-item gold rung.
    expect(html).toContain('class="btn btn--accent btn--sm" href="/lots"');
    // The three type words the captain named.
    expect(html).toContain("Garden lot");
    expect(html).toContain("Structure");
    expect(html).toContain("Life plan");
    // Every figure is DERIVED from the live pricing document through the one
    // helper — the captain's ₱114,000 / ₱128,000 / ₱567,000 / ₱1,073,000 and
    // the plan's entry monthly rate (regular table).
    for (const card of content.plansLots.items) {
      const figures = planLotCardFigures(card, LOT_PRICE_CATEGORIES, SEED_PLANS);
      expect(figures, card.title).not.toBeNull();
      expect(html).toContain(figures!.price);
    }
    for (const line of ["₱114,000", "₱128,000", "₱567,000", "₱1,073,000", "2.5 sqm · lot only · regular", "12 sqm · lot only · regular", "24 sqm · lot only · regular"]) {
      expect(html).toContain(line);
    }
    // The plan card prints the live entry monthly rate (Bronze 1, regular).
    expect(html).toContain(`from ${php(planRate("bronze1", "monthly"))}`);
    expect(html).toContain("/ month");
    expect(html).toContain("Complete memorial service, assignable &amp; transferable.");
    // The captain's closing note prints verbatim (React escapes the apostrophes).
    expect(html).toContain(
      "Prices shown are the regular &#x27;lot only&#x27; selling prices and the Villa Memorial Plan monthly rate from the 2026 price list.",
    );
    expect(html).toContain("Senior, installment and interment options are on each plan page.");
  });

  it("renders the Villa Memorial Plan board from the 2026 payment-mode tables", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // The prototype's heading, kicker and promo figure.
    expect(html).toContain("Plan ahead");
    expect(html).toContain("Villa Memorial Plan");
    // The promo figure is served from its sized derivative (the library
    // original is a 1.9 MB PNG; `libraryThumb` in lib/media.ts is the one rule).
    expect(html).toContain(libraryThumb(PLAN_PACKAGES_IMAGE, 640));
    expect(html).toContain('class="promo-figure"');

    // The term switch: the prototype's four modes, Monthly pressed on first paint.
    const sw = html.slice(html.indexOf('class="term-switch"'), html.indexOf("</table>"));
    for (const term of PLAN_TERMS) {
      expect(sw).toContain(`data-term="${term.id}"`);
      expect(sw).toContain(term.label);
    }
    expect(sw).toContain('aria-pressed="true" data-term="monthly"');
    expect((sw.match(/aria-pressed="false"/g) ?? []).length).toBe(3);
    expect(sw).toContain('role="group" aria-label="Plan term"');

    // All five tiers × four terms, every amount through planRate().
    for (const tier of PLAN_TIERS) {
      expect(html).toContain(tier.name);
      for (const term of PLAN_TERMS) {
        expect(html).toContain(php(planRate(tier.id, term.id)));
      }
    }
    // Bronze 1 carries the prototype's SKU badge.
    expect(html).toContain('class="badge badge--accent">PKG-BASIC</span>');
    // The pressed term's column is washed from the first paint: its header
    // cell plus one cell per tier (5 tiers).
    expect((html.match(/is-term-hl/g) ?? []).length).toBe(1 + PLAN_TIERS.length);

    // The footnote keeps the senior-rate token resolved from the sheet and the
    // package-page door; the underwriting credits close the board.
    expect(html).toContain(`from ${php(planRate("bronze1", "monthly", true))} / month`);
    expect(html).toContain('<a href="/plans/PKG-BASIC">package page</a>');
    expect(html).toContain("logo-villa-agency.png");
    expect(html).toContain("logo-villa-group.png");
    expect(html).toContain("Powered by Eternal Plans, Inc.");
  });
});

describe("the rails carry one oversized lead image each", () => {
  it("renders exactly one lead card per rail, with the featured item's photo and copy", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    const leads = html.match(/class="rail-item rail-item--lead"/g) ?? [];
    expect(leads).toHaveLength(2);
    for (const side of ["left", "right"] as const) {
      const featured = content.rails[side].items.filter((i) => i.featured);
      expect(featured).toHaveLength(1);
      const src = featured[0].image ?? "/media/";
      // The featured item's OWN picture reaches the markup — but as the sized
      // WebP derivative, not as the print-sized library original (composition
      // pass, 2026-09-18: a rail paints at ~3.2rem and the library holds 2.2–2.6
      // MB PNGs, so a rail of six thumbnails used to ask a phone for ~12 MB).
      expect(html, `derivative for ${src}`).toContain(libraryThumb(src));
      expect(html, `original for ${src}`).not.toContain(`src="${src}"`);
      expect(html).toContain(escaped(featured[0].title));
    }
    expect(html).toContain("rail-lead-flag");
  });

  it("keeps only the first featured item when a document marks several", async () => {
    const content = await listLandingContent();
    const several = cloneDoc(content);
    several.rails.left.items = several.rails.left.items.map((i) => ({ ...i, featured: true }));
    const { readLandingContent } = await import("@/lib/api-client/landing");
    const kept = readLandingContent(several);
    expect(kept.rails.left.items.filter((i) => i.featured)).toHaveLength(1);
    expect(kept.rails.left.items[0].featured).toBe(true);
  });
});

describe("the hero accepts a background photo", () => {
  it("renders the attached photo behind the copy when staff attach one", async () => {
    const content = await listLandingContent();
    const withPhoto = cloneDoc(content);
    withPhoto.hero.image = "/media/hero-1.jpg";
    const html = renderToStaticMarkup(
      view({ content: withPhoto, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("hero-home--photo");
    expect(html).toContain("/media/hero-1.jpg");
  });

  it("keeps the plain gradient hero when no photo is attached", async () => {
    const content = await listLandingContent();
    const bare = cloneDoc(content);
    bare.hero.image = null;
    const html = renderToStaticMarkup(
      view({ content: bare, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("hero-home--photo");
  });
});

describe("the hero renders the staff-chosen background colour layer", () => {
  it("renders no wash at all for a legacy document (no colour) — today's look", async () => {
    const content = await listLandingContent();
    const legacy = cloneDoc(content);
    legacy.hero.background = null;
    legacy.hero.backgroundTransparency = 100;
    const html = renderToStaticMarkup(
      view({ content: legacy, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("hero-home__wash");
  });

  it("renders ONE wash layer carrying the colour and its alpha", async () => {
    const content = await listLandingContent();
    const tinted = cloneDoc(content);
    tinted.hero.background = "#3f97d1";
    tinted.hero.backgroundTransparency = 45;
    const html = renderToStaticMarkup(
      view({ content: tinted, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain('class="hero-home__wash"');
    expect(html.split("hero-home__wash").length - 1).toBe(1);
    expect(html).toContain("background:#3f97d1");
    expect(html).toContain("opacity:0.55");
  });

  it("renders no wash at 100% transparency (the colour is disabled, not half-applied)", async () => {
    const content = await listLandingContent();
    const transparent = cloneDoc(content);
    transparent.hero.background = "#3f97d1";
    transparent.hero.backgroundTransparency = 100;
    const html = renderToStaticMarkup(
      view({ content: transparent, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("hero-home__wash");
  });

  it("never paints an invalid content value into the page", async () => {
    const content = await listLandingContent();
    const hostile = cloneDoc(content);
    hostile.hero.background = "url(https://evil.test/x.png)";
    hostile.hero.backgroundTransparency = 0;
    const html = renderToStaticMarkup(
      view({ content: hostile, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("hero-home__wash");
    expect(html).not.toContain("evil.test");
  });
});

describe("an image-only hero renders the raw photograph", () => {
  it("renders the photo with no copy, no wash and no overlay markup", async () => {
    const content = await listLandingContent();
    const imageOnly = cloneDoc(content);
    imageOnly.hero.image = "/media/hero-1.jpg";
    imageOnly.hero.eyebrow = "";
    imageOnly.hero.headline = "";
    imageOnly.hero.subline = "";
    const html = renderToStaticMarkup(
      view({ content: imageOnly, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("hero-home--image-only");
    expect(html).toContain("/media/hero-1.jpg");
    expect(html).not.toContain("hero-home__wash");
    expect(html).not.toContain("hero-home__actions");
    // Still one h1 for assistive tech, just not painted over the photo.
    expect(html).toContain("visually-hidden");
  });

  it("leaves the stylesheet free of a constant photo scrim", () => {
    const css = readFileSync(new URL("../../styles/components.css", import.meta.url), "utf8");
    expect(css).not.toContain(".hero-home--photo::after");
    expect(css).toContain(".hero-home--image-only");
  });
});

describe("the hero text colour is author-settable", () => {
  it("paints the hero copy through the --hero-text-colour custom property", async () => {
    const content = await listLandingContent();
    const inked = cloneDoc(content);
    inked.hero.textColour = "#ffffff";
    const html = renderToStaticMarkup(
      view({ content: inked, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("--hero-text-colour:#ffffff");
    expect(html).toContain("hero-home__title");
  });

  it("never paints an invalid content text colour", async () => {
    const content = await listLandingContent();
    const hostile = cloneDoc(content);
    hostile.hero.textColour = "url(https://evil.test/x.png)";
    const html = renderToStaticMarkup(
      view({ content: hostile, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("--hero-text-colour");
    expect(html).not.toContain("evil.test");
  });
});

describe("the rails fit without a vertical scrollbar", () => {
  it("caps the lead image so the default rail list fits its viewport height", () => {
    const css = readFileSync(new URL("../../styles/components.css", import.meta.url), "utf8");
    const block = /\.rail-item--lead \.rail-thumb \{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(block).toContain("height: clamp(");
    expect(block).not.toContain("height: 14rem");
  });

  it("keeps the retired 24/7 call card CSS out while the new help card ships", () => {
    const css = readFileSync(new URL("../../styles/components.css", import.meta.url), "utf8");
    expect(css).not.toContain(".rail-call");
    expect(css).not.toContain("rail-pulse");
    expect(css).toContain(".rail-assist");
    expect(css).toContain(".rail-action");
  });
});

describe("the home degrades gracefully on sparse content", () => {
  it("an empty plans-and-lots list renders an empty-state note, not a crash", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.plansLots.items = [];
    const html = renderToStaticMarkup(
      view({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain('class="shop-card"');
    expect(html).toContain("Plans and lots will appear here once staff publishes them.");
    // The plan board is derived content — it still renders with no cards.
    expect(html).toContain("plan-board");
  });

  it("an empty blog list and a caption-only post (empty media) render cleanly", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.blog.posts = [
      { ...content.blog.posts[0], id: "caption-only", caption: "A caption with no photos or videos attached.", media: [] },
    ];
    const html = renderToStaticMarkup(
      view({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("post-card");
    expect(html).not.toContain("post-media");
    expect(html).toContain("A caption with no photos or videos attached.");
  });

  it("empty rails render their headings with an honest empty note", async () => {
    const content = await listLandingContent();
    const empty = cloneDoc(content);
    empty.rails.left.items = [];
    empty.rails.right.items = [];
    const html = renderToStaticMarkup(
      view({ content: empty, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("Care &amp; services");
    expect(html).toContain("Nothing pinned here yet.");
  });

  it("a missing live map renders a graceful fallback line inside the map section", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("momentarily unavailable");
  });
});

describe("rails are unlimited through the public home read", () => {
  it("a 10-item rail document, read through the public store read then rendered, shows every item", async () => {
    const content = await listLandingContent();
    const oversized = cloneDoc(content);
    const base = oversized.rails.left.items[0];
    oversized.rails.left.items = Array.from({ length: 10 }, (_, i) => ({ ...base, id: `x${i}` }));

    const { readLandingContent } = await import("@/lib/api-client/landing");
    const kept = readLandingContent(oversized);
    expect(kept.rails.left.items.length).toBe(10);

    const html = renderToStaticMarkup(
      view({ content: kept, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(railItemCount(html)).toBe(10 + content.rails.right.items.length);
  });
});

describe("blog posts carry the route staff configured in the \"/\" editor", () => {
  it("a post WITH a link wraps its photos and caption in that anchor", async () => {
    const content = await listLandingContent();
    const linked = cloneDoc(content);
    linked.blog.posts = [
      {
        ...linked.blog.posts[0],
        id: "post-linked",
        link: "/price-list",
        caption: "Plan ahead — read the full Villa Memorial Plan.",
      },
    ];
    const html = renderToStaticMarkup(
      view({ content: linked, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // Every one of that post's 4 photos is now a door to the post's route.
    // Media anchors carry an aria-label after the href, so match the opening tag.
    const anchor = '<a class="post-media__link" href="/price-list"';
    expect(html.split(anchor).length - 1).toBe(4);
    expect(html.split('<a class="post-media__link"').length - 1).toBe(4);
    // The caption is a link too.
    expect(html).toContain('<a class="post-card__caption-link" href="/price-list">');
  });

  it("a post WITHOUT a link stays fully non-interactive — no photo or caption anchors", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.blog.posts = [
      { ...sparse.blog.posts[0], id: "post-unlinked", link: null, caption: "Just a story.", media: sparse.blog.posts[0].media },
    ];
    const html = renderToStaticMarkup(
      view({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("post-media__link");
    expect(html).not.toContain("post-card__caption-link");
    expect(html).toContain("Just a story.");
  });

  it("videos are never wrapped in the post link (playback must stay native)", async () => {
    const content = await listLandingContent();
    const linked = cloneDoc(content);
    const videoPost = linked.blog.posts.find((p) => p.media.some((m) => m.kind === "video"));
    expect(videoPost).toBeDefined();
    const html = renderToStaticMarkup(
      view({
        content: {
          ...linked,
          blog: { ...linked.blog, posts: [{ ...(videoPost as (typeof linked.blog.posts)[number]), link: "/services" }] },
        },
        mapNode: null,
        mapLive: false,
        sectionCount: 0,
      }),
    );
    expect(html).toContain("post-media__video");
    // The video element stays a bare <video> — no wrapping anchor around it.
    expect(html).not.toMatch(/<a class="post-media__link"[^>]*>\s*<video/);
  });
});

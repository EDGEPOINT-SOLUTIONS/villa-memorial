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
import { migratedLandingPosts, withMigratedPosts } from "../helpers/migrated-posts";
import { planLotCardFigures } from "@/lib/landing/plan-lots";
import {
  LOT_PRICE_CATEGORIES,
  PLAN_TERMS,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  VMP_PAYMENTS,
  php,
  php2,
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

    // NO HERO (captain, 2026-09-27). This page is the blog; it used to open with
    // the old home's hero — the brand lock-up, the "Honoring every life…"
    // headline and both doors. That argument belongs to `/`, which now has a home
    // page of its own, so the blog column opens on the catalogue instead.
    //
    // Asserted as an ABSENCE rather than deleted, because "nobody re-adds the
    // hero to the blog" is the actual decision, and a removed assertion cannot
    // guard it. The /blog route is the only consumer of LandingView, so this pins
    // the blog's shape.
    expect(html).not.toContain("Honoring every life with dignity and light.");
    expect(html).not.toContain("I need help now");
    expect(html).not.toContain("public-hero__headline");
    // …and the column still opens on real content, not on a gap.
    expect(html).toContain("anchored-mid__inner");
  });

  it("header nav leads with an explicit Home link so visitors always know the way back", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // The MAIN nav (the upper row's own nav comes first in the document, so
    // the closing tag must be searched after this start).
    const navStart = html.indexOf('<nav class="anchored-header__nav');
    const nav = html.slice(navStart, html.indexOf("</nav>", navStart));
    expect(nav.indexOf('href="/">Home<')).toBeGreaterThanOrEqual(0);
    // Home is the first destination in the bar.
    expect(nav.indexOf("Home")).toBeLessThan(nav.indexOf("Funeraria Memorial Services"));
  });

  it("public chrome splits the destinations across the two header rows", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // MAIN row (the ONE sticky bar every public page shows): the four
    // ground-floor pages — Blog and Contact moved up (office, inbox 035).
    const navStart = html.indexOf('<nav class="anchored-header__nav');
    const nav = html.slice(navStart, html.indexOf("</nav>", navStart));
    for (const [href, label] of [
      ["/", "Home"],
      ["/services", "Funeraria Memorial Services"],
      ["/plans", "Villa Memorial Plan"],
      ["/map", "Villa Memorial Park"],
    ] as const) {
      expect(nav).toContain(`href="${href}">${label}</a>`);
    }
    expect(nav).not.toContain('href="/contact"');
    expect(nav).not.toContain('href="/blog"');
    expect(nav).not.toContain('href="/lots"');
    // UPPER row (desktop only, inbox 035): Contact · Blog · Memorials · Login
    // and the grouped menu — Memorials is no longer inside that menu.
    const topStart = html.indexOf('class="anchored-header__topbar"');
    const topbar = html.slice(topStart, html.indexOf('class="anchored-header__bar"'));
    for (const [href, label] of [
      ["/contact", "Contact"],
      ["/blog", "Blog"],
      ["/memorials", "Memorials"],
    ] as const) {
      expect(topbar).toContain(`href="${href}">${label}</a>`);
    }
    expect(topbar).toContain('class="anchored-header__login" href="/login">Login</a>');
    const menu = topbar.slice(topbar.indexOf("anchored-header__explore-menu"));
    expect(menu).toContain("Builder");
    expect(menu).toContain("Facilities");
    expect(menu).toContain("Gallery");
    expect(menu).toContain("Price list");
    expect(menu).not.toContain(">Memorials</strong>");
    expect(nav).not.toContain('href="/builder"');
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
      ["/quote", "Start a quote"],
      ["/builder", "Plan finder"],
      ["/map", "Directions &amp; park map"],
    ] as const) {
      expect(html, label).toContain(`class="rail-action" href="${href}"`);
      expect(html, label).toContain(label);
    }
  });

  it("middle sections render products first, story after (Amazon order, captain 2026-09-25)", async () => {
    // The posts moved to the blog document; the view still renders a document
    // that carries them, so the real migrated posts are injected here.
    const content = await withMigratedPosts(await listLandingContent());
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // The hero that used to open this column is gone (captain, 2026-09-27), so
    // the shelf is now the FIRST thing in it — `plansLotsPos` is the floor the
    // rest of the order is measured from, rather than a position after a hero.
    const plansLotsPos = html.indexOf("plan-lot-grid");
    const plansPos = html.indexOf("plan-board");
    const mapPos = html.indexOf("mid-section--map");
    const aboutPos = html.indexOf("about-grid");
    const blogPos = html.indexOf("blog-feed");
    expect(plansLotsPos).toBeGreaterThanOrEqual(0);
    // The shelf leads: plans & lots → the plan board → the live park map.
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
    // helper — the monthly installments and, on the lot cards, the recorded total
    // contract prices (₱114,000 / ₱128,000 / ₱567,000 / ₱1,073,000).
    for (const card of content.plansLots.items) {
      const figures = planLotCardFigures(card, LOT_PRICE_CATEGORIES, SEED_PLANS);
      expect(figures, card.title).not.toBeNull();
      expect(html).toContain(figures!.price);
    }
    for (const line of ["₱114,000", "₱128,000", "₱567,000", "₱1,073,000", "2.5 sqm · lot only · regular", "12 sqm · lot only · regular", "24 sqm · lot only · regular"]) {
      expect(html).toContain(line);
    }
    // The monthly installment LEADS and the card names the term (minutes item 8,
    // 2026-09-21): a lot records its six-year term, a plan names the pending one.
    expect(html).toContain("class=\"monthly-price__amount\">₱1,920.00");
    expect(html).toContain("Payment term: 6 years (72 months)");
    expect(html).toContain("Total contract price ₱128,000");
    // The plan card prints the live entry monthly rate (Bronze 1, regular) and
    // the honest pending-term wording — the plan sheet records no month count.
    expect(html).toContain(php2(planRate("bronze1", "monthly")));
    expect(html).toContain("Payment term pending Villa Funeraria confirmation");
    expect(html).toContain("/ month");
    expect(html).toContain("Complete memorial service, assignable &amp; transferable.");
    // The captain's closing note prints verbatim (React escapes the apostrophes).
    expect(html).toContain(
      "Prices shown are the monthly installments from the 2026 price list.",
    );
    expect(html).toContain(
      "Senior rates, payment terms and interment options are on each plan and lot page.",
    );
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

describe("the landing hero is RETIRED from this view (captain, 2026-09-27)", () => {
  it("renders no hero of any kind — the column opens on the catalogue", async () => {
    // Four describe blocks used to live here, asserting the old landing hero's
    // staff-editable machinery: the background photo, the colour wash layer, the
    // image-only mode and the author-settable text colour (`hero-home__*`).
    //
    // They were deleted with the hero itself, and the reason is worth recording:
    // /blog is this component's only consumer, and the captain removed the hero
    // from it, so `HeroSection` no longer renders anywhere. A test for a
    // component nothing renders is not coverage, it is a liability — it would
    // have gone on passing the day someone deleted the feature.
    //
    // NOTHING SAFETY-RELEVANT WAS LOST. The two hostile-input cases those blocks
    // carried (a `url(...)` smuggled through `hero.background` and through
    // `hero.textColour`) are pure-module rules and are covered properly in
    // tests/unit/hero-background.test.ts, which is their real home — and
    // `heroBackgroundLayer` / `heroTextColourStyle` are still live on the park
    // page's wash and the package page's hero, so those tests still guard shipped
    // code.
    //
    // Asserted as an ABSENCE, because "nobody re-adds the hero to the blog" is
    // the decision, and a deleted assertion cannot guard it.
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain("hero-home__");
    expect(html).not.toContain("hero-home--");
    expect(html).not.toContain("Honoring every life with dignity and light.");
    expect(html).not.toContain("I need help now");
    expect(html).not.toContain("--hero-text-colour");
    // The blog still renders its own content.
    expect(html).toContain("plan-lot-grid");
  });
});

describe("the rails fit without a vertical scrollbar", () => {
  it("sizes the lead image so its long title clears the FEATURED badge", () => {
    const css = readFileSync(new URL("../../styles/components.css", import.meta.url), "utf8");
    const block = /\.rail-item--lead \.rail-thumb \{[^}]*\}/.exec(css)?.[0] ?? "";
    // The 9.5rem floor clears the FEATURED badge for a two-line title (inbox
    // 029); 7vw lets the band grow a little on very wide screens. The 10rem cap
    // keeps it well under the 14rem band the captain rejected for forcing a
    // rail scrollbar, and the measured rail still fits its viewport cap.
    expect(block).toContain("height: clamp(9.5rem, 7vw, 10rem)");
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
    const sample = (await migratedLandingPosts())[0];
    linked.blog.posts = [
      {
        ...sample,
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
    const sample = (await migratedLandingPosts())[0];
    sparse.blog.posts = [
      { ...sample, id: "post-unlinked", link: null, caption: "Just a story.", media: sample.media },
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
    // The migrated posts are all photographs, so the video contract is proven
    // with a synthetic video post (the model still carries films).
    const videoPost = {
      id: "post-video",
      author: "Villa Memorial Park",
      date: "2026-09-01",
      caption: "A walk through the grounds.",
      media: [{ kind: "video" as const, src: "/media/sample-film.mp4", alt: "A walk through the grounds", poster: null }],
      link: null,
    };
    const html = renderToStaticMarkup(
      view({
        content: {
          ...linked,
          blog: { ...linked.blog, posts: [{ ...videoPost, link: "/services" }] },
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

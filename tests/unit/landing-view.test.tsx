import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingView, type LandingViewProps } from "@/components/landing/landing-view";
import { listLandingContent, type LandingContent } from "@/lib/api-client/landing";
import {
  LOT_PRICE_CATEGORIES,
  PLAN_TERMS,
  PLAN_TIERS,
  SENIOR_PAYMENTS,
  VMP_PAYMENTS,
  lotCategoryFromPrice,
  php,
  planRate,
} from "@/lib/villa-pricing";

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

  it("public chrome carries the approved short labels and keeps the client's full names in the Plan ahead menu", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // Header bar (the ONE public nav — same component on every public page):
    // the short words the captain approved (D1).
    const nav = html.slice(html.indexOf('<nav class="anchored-header__nav'), html.indexOf("</nav>"));
    for (const [href, label] of [
      ["/", "Home"],
      ["/services", "Services"],
      ["/plans", "Plans"],
      ["/lots", "Lots"],
      ["/map", "Park"],
      ["/contact", "Contact"],
    ] as const) {
      expect(nav).toContain(`href="${href}">${label}</a>`);
    }
    // The client's full names stay verbatim inside the grouped Plan ahead menu.
    const menu = nav.slice(nav.indexOf("anchored-header__plan-menu"));
    expect(menu).toContain("Funeraria Memorial Services");
    expect(menu).toContain("Villa Memorial Plan");
    expect(menu).toContain("Villa Memorial Park");
    // ...and are no longer long chips in the bar itself.
    expect(nav).not.toContain(">Funeraria Memorial Services</a>");
    expect(nav).not.toContain(">Villa Memorial Plan</a>");
    expect(nav).not.toContain(">Villa Memorial Park</a>");
    // Footer "Explore" column links the same three destinations verbatim.
    expect(html).toContain('<a href="/services">Funeraria Memorial Services</a>');
    expect(html).toContain('<a href="/plans">Villa Memorial Plan</a>');
    expect(html).toContain('<a href="/map">Villa Memorial Park</a>');
  });

  it("the home's assistance card keeps the one-tap call and opens Immediate assistance (F-01)", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // The rail's 24/7 card: the number stays a one-tap `tel:` link...
    expect(html).toContain('class="rail-call"');
    expect(html).toContain(
      `class="rail-call__line" href="${content.contact.phoneHref}"`,
    );
    // ...and the card's quieter second intent opens the assistance screen.
    expect(html).toContain('class="rail-call__assist" href="/immediate-assistance"');
    expect(html).toContain("What to do right now");
  });

  it("middle sections render in order: about, service cards, plan board, live map, then blog feed", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    const heroPos = html.indexOf("hero-home__title");
    const aboutPos = html.indexOf("about-grid");
    const servicesPos = html.indexOf("svc-grid");
    const plansPos = html.indexOf("plan-board");
    const mapPos = html.indexOf("mid-section--map");
    const blogPos = html.indexOf("blog-feed");
    expect(heroPos).toBeGreaterThanOrEqual(0);
    expect(aboutPos).toBeGreaterThan(heroPos);
    expect(servicesPos).toBeGreaterThan(aboutPos);
    expect(plansPos).toBeGreaterThan(servicesPos);
    // The captain-approved order puts the live park map BEFORE the newsfeed.
    expect(mapPos).toBeGreaterThan(plansPos);
    expect(blogPos).toBeGreaterThan(mapPos);
    // Seed blog captions render, and no like/share action row is rendered.
    expect(html).toContain("golden hour");
    expect(html).not.toContain("like");
    expect(html).not.toContain('aria-label="Like"');
  });

  it("renders the prototype's four “Services we offer” cards with their derived 2026 from-prices", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("What we do");
    expect(html).toContain("Services we offer");
    // Four cards, each a real door to a real page (the prototype's own routes).
    expect((html.match(/class="svc-card"/g) ?? []).length).toBe(4);
    for (const [href, title] of [
      ["/lots", "Lot only"],
      ["/plans", "Lot + interment"],
      ["/plans/villa-memorial-plan", "Lot + interment + VMP"],
      ["/lots/mausoleum", "Mausoleum + construction"],
    ] as const) {
      expect(html).toContain(`<a class="svc-card" href="${href}">`);
      expect(html).toContain(title);
    }
    // Every meta line is DERIVED from the 2026 sheet through the one helper —
    // "from ₱X · ₱Y / month, 6 yrs" (6-year amortization is the sheet's own).
    for (const card of content.services.items) {
      const from = lotCategoryFromPrice(card.category);
      expect(from).not.toBeNull();
      expect(html).toContain(`from ${php(from!.selling)}`);
      expect(html).toContain(`· ${php(from!.monthly)} / month, 6 yrs`);
    }
    // The prototype's published figures reach the markup verbatim.
    for (const line of ["from ₱75,000", "from ₱97,000", "from ₱126,000", "from ₱1,573,000"]) {
      expect(html).toContain(line);
    }
    // Each card carries one of the prototype's inline glyphs.
    expect((html.match(/svc-card__icon/g) ?? []).length).toBe(4);
    expect((html.match(/<svg /g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("renders the Villa Memorial Plan board from the 2026 payment-mode tables", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      view({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // The prototype's heading, kicker and promo figure.
    expect(html).toContain("Plan ahead");
    expect(html).toContain("Villa Memorial Plan");
    expect(html).toContain("plan-packages.png");
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
      expect(html).toContain(featured[0].image ?? "/media/");
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

describe("the home degrades gracefully on sparse content", () => {
  it("an empty service-card list renders an empty-state note, not a crash", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.services.items = [];
    const html = renderToStaticMarkup(
      view({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain('class="svc-card"');
    expect(html).toContain("Service cards will appear here once staff publishes them.");
    // The plan board is derived content — it still renders with no service cards.
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
        link: "/plans/villa-memorial-plan",
        caption: "Plan ahead — read the full Villa Memorial Plan.",
      },
    ];
    const html = renderToStaticMarkup(
      view({ content: linked, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    // Every one of that post's 4 photos is now a door to the post's route.
    // Media anchors carry an aria-label after the href, so match the opening tag.
    const anchor = '<a class="post-media__link" href="/plans/villa-memorial-plan"';
    expect(html.split(anchor).length - 1).toBe(4);
    expect(html.split('<a class="post-media__link"').length - 1).toBe(4);
    // The caption is a link too.
    expect(html).toContain('<a class="post-card__caption-link" href="/plans/villa-memorial-plan">');
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

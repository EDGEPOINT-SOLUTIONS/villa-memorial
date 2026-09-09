import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingView } from "@/components/landing/landing-view";
import { listLandingContent, type LandingContent } from "@/lib/api-client/landing";

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

const railItemCount = (html: string): number => (html.match(/class="rail-item"/g) ?? []).length;

describe("the home renders the anchored catalogue shell", () => {
  it("renders left rail + middle + right rail from the recorded content", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      LandingView({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
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
      LandingView({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    const nav = html.slice(html.indexOf('<nav class="anchored-header__nav'), html.indexOf("</nav>"));
    expect(nav.indexOf('href="/">Home<')).toBeGreaterThanOrEqual(0);
    // Home is the first destination in the bar.
    expect(nav.indexOf("Home")).toBeLessThan(nav.indexOf("Services"));
  });

  it("middle sections render in order: about, services, plans grid, live map, then blog feed", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      LandingView({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    const heroPos = html.indexOf("hero-home__title");
    const aboutPos = html.indexOf("about-grid");
    const servicesPos = html.indexOf("services-list");
    const plansPos = html.indexOf("plan-grid");
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

  it("plan cards carry photos, real names and the honest 2026 prices", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      LandingView({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("₱114,000");
    expect(html).toContain("₱1,073,000");
    expect(html).toContain("lot-premium.png");
    expect(html).toContain("from ₱500/month");
    expect((html.match(/class="plan-card"/g) ?? []).length).toBe(content.plans.items.length);
  });
});

describe("the home degrades gracefully on sparse content", () => {
  it("an empty plan list renders an empty-state note, not a crash", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.plans.items = [];
    const html = renderToStaticMarkup(
      LandingView({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).not.toContain('class="plan-card"');
    expect(html).toContain("Plan cards will appear here once staff publishes them.");
  });

  it("an empty blog list and a caption-only post (empty media) render cleanly", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.blog.posts = [
      { ...content.blog.posts[0], id: "caption-only", caption: "A caption with no photos or videos attached.", media: [] },
    ];
    const html = renderToStaticMarkup(
      LandingView({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
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
      LandingView({ content: empty, mapNode: null, mapLive: false, sectionCount: 0 }),
    );
    expect(html).toContain("Care &amp; services");
    expect(html).toContain("Nothing pinned here yet.");
  });

  it("a missing live map renders a graceful fallback line inside the map section", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      LandingView({ content, mapNode: null, mapLive: false, sectionCount: 0 }),
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
      LandingView({ content: kept, mapNode: null, mapLive: false, sectionCount: 0 }),
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
      LandingView({ content: linked, mapNode: null, mapLive: false, sectionCount: 0 }),
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
      LandingView({ content: sparse, mapNode: null, mapLive: false, sectionCount: 0 }),
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
      LandingView({
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

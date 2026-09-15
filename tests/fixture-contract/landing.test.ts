import { describe, expect, it } from "vitest";
import {
  listLandingContent,
  readLandingContent,
  saveLandingContent,
  validateLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import contentFile from "@/lib/fixtures/landing/content.json";
import { buildRailCatalogue, flattenCatalogue } from "@/lib/landing/catalogue";
import { LOT_PRICE_CATEGORIES, php } from "@/lib/villa-pricing";

/**
 * Landing content fixture-contract tests.
 *
 * The Landing Page document is a front-end CMS seam (approved Lavish
 * villa-landing-plan): there is NO upstream content contract yet, so these tests
 * pin the fixture to (a) the documented content model of lib/api-client/landing.ts
 * and (b) the REAL 2026 product/price content — plan/rail price strings must equal
 * lib/villa-pricing.ts figures, never invented ones (AGENTS.md: reuse the real
 * catalogue). They are replaced by recorded contract tests once a content
 * contract freezes.
 */

function cloneDoc(doc: LandingContent): LandingContent {
  return JSON.parse(JSON.stringify(doc)) as LandingContent;
}

describe("landing fixture follows the approved content model", () => {
  it("seed reads into a full document: brand, hero, rails, about, services, plans, blog, map", async () => {
    const content = await listLandingContent();
    expect(content.version).toBe(1);
    expect(content.logo.wordmark.length).toBeGreaterThan(0);
    expect(content.contact.phoneDisplay.length).toBeGreaterThan(0);
    expect(content.hero.headline).toContain("every life");
    expect(content.hero.primaryCta.label).toBe("I need help now");
    expect(content.hero.secondaryCta.label).toBe("Plan ahead");
    expect(content.about.mission.length).toBeGreaterThan(0);
    expect(content.about.vision.length).toBeGreaterThan(0);
    expect(content.about.image).toMatch(/^\/media\//);
    expect(content.services.items.length).toBeGreaterThan(0);
    expect(content.plans.items.length).toBeGreaterThan(0);
    expect(content.blog.posts.length).toBeGreaterThan(0);
    expect(content.map.heading.length).toBeGreaterThan(0);
    expect((contentFile as { content: LandingContent }).content.rails.left.heading).toContain(
      "Care",
    );
  });

  it("seed rails carry valid staff-picked items, each with a photo and a real page link", async () => {
    const content = await listLandingContent();
    for (const side of ["left", "right"] as const) {
      expect(content.rails[side].items.length).toBeGreaterThan(0);
      for (const item of content.rails[side].items) {
        expect(["product", "service", "plan", "link"]).toContain(item.kind);
        expect(item.image).not.toBeNull();
        expect(item.title.length).toBeGreaterThan(0);
        expect(item.href.startsWith("/")).toBe(true);
      }
    }
  });

  it("plan & rail prices equal the REAL 2026 figures from lib/villa-pricing.ts", async () => {
    const content = await listLandingContent();
    const priced = [
      ...content.plans.items,
      ...content.rails.left.items,
      ...content.rails.right.items,
    ].flatMap((item) => {
      const price = "price" in item && item.price ? item.price : null;
      return price ? [price] : [];
    });

    const lots = ["Premium Lots", "Prime Lots", "Garden Niches", "Mausoleum"];
    const expectedLots = lots.map((product) => {
      const row = LOT_PRICE_CATEGORIES[0].rows.find((r) => r.product === product);
      expect(row).toBeDefined();
      return php((row as { regular: { selling: number } }).regular.selling);
    });
    // The real lot-only prices appear verbatim on the seed plan cards / rails.
    for (const price of expectedLots) {
      expect(priced).toContain(price);
    }
    // The Villa Memorial Plan card shows the real monthly entry point (VMP Bronze 1).
    expect(content.plans.items.find((p) => p.name === "Villa Memorial Plan")?.price).toBe(
      `from ${php(600)}/month`,
    );
  });

  it("tolerant reader keeps every valid rail item (rails are unlimited) and drops unknown kinds", async () => {
    const content = await listLandingContent();
    const oversized = cloneDoc(content);
    const base = oversized.rails.left.items[0];
    const extra = Array.from({ length: 9 }, (_, i) => ({
      id: `extra-${i}`,
      kind: "service",
      title: `Extra care ${i}`,
      caption: null,
      price: null,
      image: "/media/death_at_home.jpg",
      href: "/services",
    }));
    const unknown = {
      id: "unknown-1",
      kind: "nonsense",
      title: "Unknown",
      caption: null,
      price: null,
      image: null,
      href: "/x",
    };
    oversized.rails.left.items = [
      base,
      ...(extra as unknown as LandingContent["rails"]["left"]["items"]),
      unknown as unknown as LandingContent["rails"]["left"]["items"][number],
    ];
    const read = readLandingContent(oversized);
    // Ten valid items survive the read untouched — no cap, no truncation.
    expect(read.rails.left.items.length).toBe(10);
    for (const item of read.rails.left.items) {
      expect(["product", "service", "plan", "link"]).toContain(item.kind);
    }
    expect(read.rails.left.items.some((item) => item.id.startsWith("extra-"))).toBe(true);
    expect(read.rails.left.items.some((item) => item.id.startsWith("unknown-"))).toBe(false);
  });

  it("empty plan list, empty blog list and caption-only posts read and validate cleanly", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.plans.items = [];
    sparse.blog.posts = [
      { ...content.blog.posts[0], id: "caption-only", media: [] },
      { ...content.blog.posts[0], id: "media-post", media: content.blog.posts[0].media },
    ];
    const read = readLandingContent(sparse);
    expect(read.plans.items).toEqual([]);
    expect(read.blog.posts.length).toBe(2);
    expect(read.blog.posts[0].media).toEqual([]);
    expect(validateLandingContent(read).ok).toBe(true);
  });
});

describe("the rail picker catalogue is built from the real catalogue", () => {
  it("every plan option carries a real 2026 price, and services/products point at real pages", () => {
    const entries = flattenCatalogue();
    expect(entries.length).toBeGreaterThan(0);
    const planPrices = entries.filter((e) => e.kind === "plan").map((e) => e.price);
    // Premium Lots / Prime Lots / Garden Niches / Mausoleum real lot-only prices.
    for (const price of ["₱114,000", "₱128,000", "₱567,000", "₱1,073,000"]) {
      expect(planPrices).toContain(price);
    }
    expect(planPrices).toContain(`from ${php(600)}/month`);
    for (const e of entries) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.href.startsWith("/")).toBe(true);
      expect(e.image).not.toBeNull();
    }
    // Casket options come from the real COFFINS tiers.
    expect(entries.some((e) => e.title === "Gold casket")).toBe(true);
  });

  it("catalogue groups are non-empty and each carries a label", () => {
    const groups = buildRailCatalogue();
    expect(groups.length).toBeGreaterThanOrEqual(4);
    for (const group of groups) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });
});

describe("the save path accepts unlimited rail items", () => {
  it("saves a document whose rail holds 10 items (no cap), and the public read returns all of them", async () => {
    const content = await listLandingContent();
    const oversized = cloneDoc(content);
    const base = oversized.rails.left.items[0];
    oversized.rails.left.items = Array.from({ length: 10 }, (_, i) => ({ ...base, id: `rail-${i}` }));
    const saved = await saveLandingContent(oversized);
    expect(saved.rails.left.items.length).toBe(10);
    const reread = await listLandingContent();
    expect(reread.rails.left.items.length).toBe(10);
  });

  it("rejects empty hero headline / empty rail item titles", async () => {
    const content = await listLandingContent();
    const badHero = cloneDoc(content);
    badHero.hero.headline = "   ";
    const verdict = validateLandingContent(badHero);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/headline/);

    const badItem = cloneDoc(content);
    badItem.rails.right.items = [{ ...badItem.rails.right.items[0], title: " " }];
    const verdict2 = validateLandingContent(readLandingContent(badItem));
    expect(verdict2.ok).toBe(false);
  });

  it("saves a valid edited document and the public read returns it", async () => {
    const content = await listLandingContent();
    const edited = cloneDoc(content);
    edited.hero.headline = "Every life honored with dignity.";
    edited.logo.wordmark = "Villa Memorial";
    const saved = await saveLandingContent(edited);
    expect(saved.hero.headline).toBe("Every life honored with dignity.");
    expect(saved.updated_at).not.toBeNull();
    const reread = await listLandingContent();
    expect(reread.hero.headline).toBe("Every life honored with dignity.");
    expect(reread.logo.wordmark).toBe("Villa Memorial");
  });
});

describe("blog posts carry the optional link the staff sets on the \"/\" editor", () => {
  it("seed posts ship sensible internal routes so photos open real pages", async () => {
    const content = await listLandingContent();
    const byId = Object.fromEntries(content.blog.posts.map((p) => [p.id, p.link]));
    expect(byId["post-golden-hour"]).toBe("/lots");
    expect(byId["post-new-niches"]).toBe("/lots/price-list-2026");
  });

  it("the tolerant reader keeps a usable link and treats blank as no link", async () => {
    const content = await listLandingContent();
    const doc = cloneDoc(content);
    doc.blog.posts = [
      { ...doc.blog.posts[0], id: "linked", link: "/map?plot=A-001" },
      { ...doc.blog.posts[0], id: "blank", link: "   " },
      { ...doc.blog.posts[0], id: "none", link: null },
    ];
    const read = readLandingContent(doc);
    expect(read.blog.posts.find((p) => p.id === "linked")?.link).toBe("/map?plot=A-001");
    expect(read.blog.posts.find((p) => p.id === "blank")?.link).toBeNull();
    expect(read.blog.posts.find((p) => p.id === "none")?.link).toBeNull();
    expect(validateLandingContent(read).ok).toBe(true);
  });
});

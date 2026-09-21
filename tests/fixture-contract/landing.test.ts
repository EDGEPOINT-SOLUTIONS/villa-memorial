import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import {
  listLandingContent,
  readLandingContent,
  saveLandingContent,
  unrenderableGlyphs,
  validateLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import contentFile from "@/lib/fixtures/landing/content.json";
import { buildRailCatalogue, flattenCatalogue } from "@/lib/landing/catalogue";
import { LOT_PRICE_CATEGORIES, php, planRate } from "@/lib/villa-pricing";

// The landing save path validates plans-and-lots card families against the
// pricing store; point it at a path that does not exist so the recorded seed is
// used and a developer's local .data store cannot leak into these fixtures.
process.env.PRICING_STORE_PATH = path.join(os.tmpdir(), "villa-landing-contract-no-store.json");

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
  it("seed reads into a full document: brand, hero, rails, about, plans & lots, plans, blog, map", async () => {
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
    expect(content.plansLots.items.length).toBeGreaterThan(0);
    expect(content.plansLots.kicker.length).toBeGreaterThan(0);
    expect(content.plans.heading.length).toBeGreaterThan(0);
    expect(content.blog.posts.length).toBeGreaterThan(0);
    expect(content.map.heading.length).toBeGreaterThan(0);
    expect((contentFile as { content: LandingContent }).content.rails.left.heading).toContain(
      "Care",
    );
  });

  it("seeds the client's own letterhead contact facts (2026 purchase application form)", async () => {
    const content = await listLandingContent();
    // "Tel No. 09176178489 / 09171839262" and the two addresses on the
    // client's paper — the public contact surface may never carry a typed-in
    // substitute for these.
    expect(content.contact.phoneDisplay).toBe("0917 617 8489");
    expect(content.contact.phoneHref).toBe("tel:+639176178489");
    expect(content.contact.secondPhoneDisplay).toBe("0917 183 9262");
    expect(content.contact.secondPhoneHref).toBe("tel:+639171839262");
    expect(content.contact.officeAddress).toContain("Capilla de San Jose");
    expect(content.contact.parkAddress).toContain("Sanctuario de Mercedes y Gloria");
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
    const priced = [...content.rails.left.items, ...content.rails.right.items].flatMap((item) => {
      const price = item.price ? item.price : null;
      return price ? [price] : [];
    });

    const lots = ["Premium Lots", "Prime Lots", "Garden Niches", "Mausoleum"];
    const expectedLots = lots.map((product) => {
      const row = LOT_PRICE_CATEGORIES[0].rows.find((r) => r.product === product);
      expect(row).toBeDefined();
      return php((row as { regular: { selling: number } }).regular.selling);
    });
    // The real lot-only prices appear verbatim on the seed rails.
    for (const price of expectedLots) {
      expect(priced).toContain(price);
    }
  });

  it("the plans & lots cards bind to REAL 2026 sources — no authored figure", async () => {
    const content = await listLandingContent();
    // The captain's five cards (2026-09-21): four lot-only figures + the plan.
    const byTitle = Object.fromEntries(content.plansLots.items.map((c) => [c.title, c]));
    expect(Object.keys(byTitle).sort()).toEqual(
      ["Garden Niches", "Mausoleum", "Premium Lot", "Prime Lot", "Villa Memorial Plan"].sort(),
    );
    // Every lot card binds family + product to a real row on the sheet, and its
    // type word is one of the captain's three.
    for (const card of content.plansLots.items) {
      expect(["lot", "structure", "plan"]).toContain(card.kind);
      if (card.kind === "plan") {
        expect(["bronze1", "bronze2", "silver1", "silver2", "gold"]).toContain(card.tier);
        continue;
      }
      const family = LOT_PRICE_CATEGORIES.find((c) => c.title === card.category);
      expect(family, card.title).toBeDefined();
      expect(family!.rows.some((r) => r.product === card.product), card.title).toBe(true);
    }
    // The figures the band prints are exactly the sheet's regular lot-only
    // selling prices + the plan's entry monthly (module below drives the view).
    expect(byTitle["Premium Lot"].product).toBe("Premium Lots");
    expect(byTitle["Premium Lot"].category).toBe("1. Lot Only");
    expect(byTitle["Villa Memorial Plan"].tier).toBe("bronze1");
    // An amount is never authored in the document's copy.
    expect(content.plansLots.note).not.toMatch(/₱\s?\d/);
  });

  it("the plan board's copy is staff content and carries no authored amount", async () => {
    const content = await listLandingContent();
    expect(content.plans.kicker).toBe("Plan ahead");
    expect(content.plans.heading).toBe("Villa Memorial Plan");
    expect(content.plans.intro).toContain("An affordable life plan for all");
    // The two tokens the view fills from lib/villa-pricing.ts: the senior-citizen
    // entry rate and the package-page anchor. No peso amount is ever authored in
    // the board's copy — the board's figures all come from the sheet.
    expect(content.plans.note).toContain("{seniorMonthly}");
    expect(content.plans.note).toContain("{packagePage}");
    expect(content.plans.note).not.toMatch(/₱/);
    expect(planRate("bronze1", "monthly", true)).toBe(550);
    expect(content.plans.note).toContain("Eternal Plans");
  });

  it("plans & lots cards keep their live binding and drop cards without a title", async () => {
    const content = await listLandingContent();
    const doc = cloneDoc(content);
    doc.plansLots.items = [
      { ...doc.plansLots.items[0], id: "keep", product: "Mausoleum" },
      { ...doc.plansLots.items[0], id: "dropped", title: "" },
    ];
    const read = readLandingContent(doc);
    expect(read.plansLots.items.map((c) => c.id)).toEqual(["keep"]);
    expect(read.plansLots.items[0].product).toBe("Mausoleum");
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

  it("an empty plans-and-lots list, empty blog list and caption-only posts read and validate cleanly", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.plansLots.items = [];
    sparse.blog.posts = [
      { ...content.blog.posts[0], id: "caption-only", media: [] },
      { ...content.blog.posts[0], id: "media-post", media: content.blog.posts[0].media },
    ];
    const read = readLandingContent(sparse);
    expect(read.plansLots.items).toEqual([]);
    expect(read.blog.posts.length).toBe(2);
    expect(read.blog.posts[0].media).toEqual([]);
    expect(validateLandingContent(read, LOT_PRICE_CATEGORIES).ok).toBe(true);
  });

  it("rejects a plans-and-lots card whose live price source is not on the 2026 sheet", async () => {
    const content = await listLandingContent();
    const bad = cloneDoc(content);
    bad.plansLots.items = [
      { ...bad.plansLots.items[0], category: "5. Invented Family", product: "Imaginary Lot" },
    ];
    const verdict = validateLandingContent(readLandingContent(bad), LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/2026 lot families/);

    // A real family with an unknown product is refused too.
    const badProduct = cloneDoc(content);
    badProduct.plansLots.items = [
      { ...badProduct.plansLots.items[0], category: "1. Lot Only", product: "Not A Row" },
    ];
    const verdict2 = validateLandingContent(
      readLandingContent(badProduct),
      LOT_PRICE_CATEGORIES,
    );
    expect(verdict2.ok).toBe(false);
    if (!verdict2.ok) expect(verdict2.error).toMatch(/product in the 2026 lot family/);

    // A plan card must name a real tier.
    const badTier = cloneDoc(content);
    badTier.plansLots.items = [
      { ...badTier.plansLots.items[4], tier: "platinum" },
    ];
    const verdict3 = validateLandingContent(readLandingContent(badTier), LOT_PRICE_CATEGORIES);
    expect(verdict3.ok).toBe(false);
    if (!verdict3.ok) expect(verdict3.error).toMatch(/2026 plan tiers/);
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

  it("accepts an image-only hero but rejects empty rail item titles", async () => {
    const content = await listLandingContent();
    // An image-only hero (a photo, no eyebrow/headline/subline) is legal — the
    // page renders the raw photograph (captain 2026-09-21).
    const imageOnly = cloneDoc(content);
    imageOnly.hero.eyebrow = "   ";
    imageOnly.hero.headline = "   ";
    imageOnly.hero.subline = "";
    const verdict = validateLandingContent(imageOnly, LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(true);

    const badItem = cloneDoc(content);
    badItem.rails.right.items = [{ ...badItem.rails.right.items[0], title: " " }];
    const verdict2 = validateLandingContent(readLandingContent(badItem), LOT_PRICE_CATEGORIES);
    expect(verdict2.ok).toBe(false);
  });

  it("accepts a hero text colour and refuses a value that is not a CSS colour", async () => {
    const content = await listLandingContent();
    const good = cloneDoc(content);
    good.hero.textColour = "#ffffff";
    expect(validateLandingContent(good, LOT_PRICE_CATEGORIES).ok).toBe(true);

    const bad = cloneDoc(content);
    bad.hero.textColour = "url(https://evil.test/x.png)";
    const verdict = validateLandingContent(bad, LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/text colour/i);
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

describe("the FAQ page is content, not JSX", () => {
  it("the seed carries the shipped questions, answers and next-step links", async () => {
    const content = await listLandingContent();
    expect(content.faq.eyebrow).toBe("Help");
    expect(content.faq.heading).toBe("Frequently asked questions");
    expect(content.faq.lead.length).toBeGreaterThan(0);
    expect(content.faq.items).toHaveLength(3);
    expect(content.faq.items[0].question).toBe("What happens when I call?");
    for (const item of content.faq.items) {
      expect(item.question.trim().length).toBeGreaterThan(0);
      expect(item.answer.trim().length).toBeGreaterThan(0);
      expect(item.id.length).toBeGreaterThan(0);
    }
    for (const link of content.faq.links) {
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.href.startsWith("/")).toBe(true);
    }
    // The whole document still validates with the FAQ region present.
    expect(validateLandingContent(content, LOT_PRICE_CATEGORIES).ok).toBe(true);
  });

  it("the reader drops a row with no words and keeps whitespace for the validator to name", async () => {
    const content = await listLandingContent();
    const doc = cloneDoc(content);
    doc.faq.items = [
      { id: "kept", question: "Kept?", answer: "Yes." },
      { id: "blank", question: "   ", answer: "" },
      { id: "dropped", question: "", answer: "" },
    ];
    const read = readLandingContent(doc);
    expect(read.faq.items.map((i) => i.id)).toEqual(["kept", "blank"]);
    const verdict = validateLandingContent(read, LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/question and an answer/i);
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
    expect(validateLandingContent(read, LOT_PRICE_CATEGORIES).ok).toBe(true);
  });
});

describe("the hero background colour + transparency (staff colour changer)", () => {
  it("the recorded seed ships the untouched look: no colour, 100% transparency", () => {
    const seed = readLandingContent((contentFile as { content: unknown }).content);
    expect(seed.hero.background).toBeNull();
    expect(seed.hero.backgroundTransparency).toBe(100);
    expect(validateLandingContent(seed, LOT_PRICE_CATEGORIES).ok).toBe(true);
  });

  it("reads a legacy document that lacks both fields as no colour + fully transparent", async () => {
    const content = await listLandingContent();
    const legacy = cloneDoc(content) as unknown as Record<string, unknown>;
    const hero = { ...(legacy.hero as Record<string, unknown>) };
    delete hero.background;
    delete hero.backgroundTransparency;
    legacy.hero = hero;
    const read = readLandingContent(legacy);
    expect(read.hero.background).toBeNull();
    expect(read.hero.backgroundTransparency).toBe(100);
    expect(validateLandingContent(read, LOT_PRICE_CATEGORIES).ok).toBe(true);
  });

  it("round-trips a colour + transparency through the real save path", async () => {
    const content = await listLandingContent();
    const edited = cloneDoc(content);
    edited.hero.background = "#3f97d1";
    edited.hero.backgroundTransparency = 35;
    const saved = await saveLandingContent(edited);
    expect(saved.hero.background).toBe("#3f97d1");
    expect(saved.hero.backgroundTransparency).toBe(35);
    const reread = await listLandingContent();
    expect(reread.hero.background).toBe("#3f97d1");
    expect(reread.hero.backgroundTransparency).toBe(35);
  });

  it("clamps an out-of-range transparency recorded in a broken document", async () => {
    const content = await listLandingContent();
    const weird = cloneDoc(content) as unknown as Record<string, unknown>;
    (weird.hero as Record<string, unknown>).backgroundTransparency = 250;
    expect(readLandingContent(weird).hero.backgroundTransparency).toBe(100);
    (weird.hero as Record<string, unknown>).backgroundTransparency = -5;
    expect(readLandingContent(weird).hero.backgroundTransparency).toBe(0);
    (weird.hero as Record<string, unknown>).backgroundTransparency = "40";
    expect(readLandingContent(weird).hero.backgroundTransparency).toBe(100);
  });

  it("accepts the 0 and 100 bounds and rejects out-of-range / non-numeric values", async () => {
    const content = await listLandingContent();
    for (const transparency of [0, 100]) {
      const doc = cloneDoc(content);
      doc.hero.backgroundTransparency = transparency;
      expect(validateLandingContent(doc, LOT_PRICE_CATEGORIES).ok).toBe(true);
    }
    for (const transparency of [-1, 101, Number.NaN]) {
      const doc = cloneDoc(content);
      doc.hero.backgroundTransparency = transparency;
      const verdict = validateLandingContent(doc, LOT_PRICE_CATEGORIES);
      expect(verdict.ok).toBe(false);
      if (!verdict.ok) expect(verdict.error).toMatch(/transparency.*0 to 100/);
    }
  });

  it("rejects an invalid hero colour with a message naming the problem", async () => {
    const content = await listLandingContent();
    const bad = cloneDoc(content);
    bad.hero.background = "url(https://evil.test/x.png)";
    const verdict = validateLandingContent(bad, LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/valid CSS colour/);
  });

  it("the save path refuses an invalid colour instead of persisting it", async () => {
    const content = await listLandingContent();
    const good = cloneDoc(content);
    good.hero.background = "#c4e6f8";
    good.hero.backgroundTransparency = 20;
    await saveLandingContent(good);
    const bad = cloneDoc(good);
    bad.hero.background = "purple-ish";
    await expect(saveLandingContent(bad)).rejects.toThrow(/valid CSS colour/);
    // The store still holds the last good document.
    const reread = await listLandingContent();
    expect(reread.hero.background).toBe("#c4e6f8");
    expect(reread.hero.backgroundTransparency).toBe(20);
  });
});

/**
 * The one face this product owns (Inter — styles/fonts.css, self-hosted) carries
 * no emoji, so an emoji in published copy renders as an empty "tofu" box on the
 * page. The seed shipped one (the herb, U+1F33F) in the newsfeed lead caption and
 * the landing page showed the box; these pin the fix and the publish gate that
 * keeps it from coming back.
 */
describe("landing copy stays inside the product typeface", () => {
  it("the seed document publishes no unrenderable glyph", async () => {
    const content = await listLandingContent();
    expect(unrenderableGlyphs(JSON.stringify(content))).toEqual([]);
  });

  it("names the astral emoji blocks and their modifiers, and nothing else", () => {
    expect(unrenderableGlyphs("🌿")).toEqual(["🌿"]);
    expect(unrenderableGlyphs("a 🕊 b")).toEqual(["🕊"]);
    expect(unrenderableGlyphs("flags 🇵🇭")).toEqual(["🇵", "🇭"]);
    expect(unrenderableGlyphs("marked ⚠️")).toEqual(["️"]);
    // Everything the product really publishes stays legal.
    expect(unrenderableGlyphs("₱75,000 · ₱1,125 / month, 6 yrs — → ↑ ↓ ← ↔ ▸ ▾ ◆ ○ ● ⚠ ✓ ✕")).toEqual(
      [],
    );
  });

  it("the save path refuses an emoji caption and keeps the last good document", async () => {
    const content = await listLandingContent();
    const good = cloneDoc(content);
    good.blog.posts[0].caption = "A quiet morning at the park.";
    await saveLandingContent(good);

    const bad = cloneDoc(good);
    bad.blog.posts[0].caption = "A quiet morning at the park. 🌿";
    const verdict = validateLandingContent(bad, LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/carr(y|ies) no emoji/);
    await expect(saveLandingContent(bad)).rejects.toThrow(/carr(y|ies) no emoji/);
    const reread = await listLandingContent();
    expect(reread.blog.posts[0].caption).toBe("A quiet morning at the park.");
  });

  it("refuses an emoji in every staff-authored text field, not only captions", async () => {
    const content = await listLandingContent();
    const cases: Array<[string, (doc: LandingContent) => void]> = [
      ["hero headline", (d) => void (d.hero.headline = "Hello 🌿")],
      ["hero subline", (d) => void (d.hero.subline = "Hello 🌿")],
      ["hero eyebrow", (d) => void (d.hero.eyebrow = "Hello 🌿")],
      ["a CTA label", (d) => void (d.hero.primaryCta.label = "Hello 🌿")],
      ["the wordmark", (d) => void (d.logo.wordmark = "Hello 🌿")],
      ["a rail heading", (d) => void (d.rails.left.heading = "Hello 🌿")],
      ["a rail item", (d) => void (d.rails.left.items[0].title = "Hello 🌿")],
      ["the about story", (d) => void (d.about.story = "Hello 🌿")],
      ["a home plans-and-lots card", (d) => void (d.plansLots.items[0].title = "Hello 🌿")],
      ["the plan footnote", (d) => void (d.plans.note = "Hello 🌿")],
      ["the map intro", (d) => void (d.map.intro = "Hello 🌿")],
      ["the newsfeed intro", (d) => void (d.blog.intro = "Hello 🌿")],
      ["an FAQ answer", (d) => void (d.faq.items[0].answer = "Hello 🌿")],
      ["an FAQ next step", (d) => void (d.faq.links[0].label = "Hello 🌿")],
      ["the office address", (d) => void (d.contact.officeAddress = "Hello 🌿")],
    ];
    for (const [what, mutate] of cases) {
      const doc = cloneDoc(content);
      mutate(doc);
      const verdict = validateLandingContent(doc, LOT_PRICE_CATEGORIES);
      expect(verdict.ok, `${what} should be refused`).toBe(false);
    }
  });
});

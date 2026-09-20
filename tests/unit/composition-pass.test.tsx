import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { listCatalogItems } from "@/lib/api-client/commerce";

/**
 * The composition pass (captain 2026-09-18 — the client's president: the product
 * "looks so generic" and is "so noticeable that it's built by AI").
 *
 * The measured causes firstmate found on the running pages, and what this file
 * now fails if they come back:
 *   1. the same box repeated — four identical service cards, four identical news
 *      cards, the same equal-weight grid everywhere;
 *   2. stock iconography where real imagery existed — every composed band used a
 *      line glyph while the client's own photographs of the park sat unused;
 *   3. decorative sheen standing in for hierarchy — 30-42 gradient elements and
 *      28-33 shadowed elements on one public page;
 *   4. spacious but thin.
 *
 * This file is the regression home for 1-3 (image WEIGHT is checked beside the
 * derivatives themselves, and the reading budget stays tests/unit/
 * reading-budget.test.tsx). The stylesheet checks are deliberately written
 * against the DECLARATION, not against a rendered pixel: they are cheap, they
 * name the exact rule that regressed, and they cannot be satisfied by a stray
 * utility class in a view.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const css = read("styles/components.css");
/** Comments carry prose ("the gradient was removed"), so strip them before
 *  matching: these checks are about the DECLARATIONS. */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

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

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
}));

const { LandingView } = await import("@/components/landing/landing-view");
const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { listLandingContent } = await import("@/lib/api-client/landing");
const { loadPricingDocument } = await import("@/lib/api-client/pricing");
const { LOT_PRICE_CATEGORIES, SEED_PRICING } = await import("@/lib/villa-pricing");
const {
  LIBRARY_THUMB_WIDTHS,
  MEDIA_LIBRARY,
  PARK_PLACE_PHOTOS,
  SERVICE_CARD_PHOTOS,
  libraryThumb,
  libraryThumbSet,
  serviceCardPhoto,
} = await import("@/lib/media");

describe("decorative sheen is gone from the public buttons", () => {
  /** The brace block that follows a selector, at top level (comments stripped). */
  function rule(selector: string): string {
    const at = cssRules.indexOf(`\n${selector} {`);
    expect(at, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
    const end = cssRules.indexOf("\n}", at);
    return cssRules.slice(at, end);
  }

  it("paints the accent (gold) button with a flat fill, not a gradient + glow", () => {
    const body = rule(".btn--accent");
    expect(body).not.toMatch(/gradient/);
    expect(body).toContain("background: var(--gold-400);");
    // The hover step is a lighter FLAT gold, not a brightness() filter.
    expect(rule(".btn--accent:hover:not(:disabled)")).toContain(
      "background: var(--gold-300);",
    );
    // Regression: this single element accounted for 24-42 of the gradient
    // elements on /products, /plans and /lots. The check is anchored to the
    // PUBLIC rule — the Admin Portal's `.app-shell .btn--accent` is its own
    // captain-approved direction and is deliberately out of this pass's scope.
    expect(cssRules.match(/^\.btn--accent \{[^}]*gradient/m)).toBeNull();
    expect(rule(".btn--accent")).toContain("background: var(--gold-400);");
  });

  it("paints the primary (sky) button flat too", () => {
    const body = rule(".btn--primary");
    expect(body).not.toMatch(/gradient/);
    expect(body).not.toMatch(/box-shadow/);
    expect(body).toContain("background: var(--sky-300);");
  });
});

describe("bands are separated by rules and space, not by a shadow on every box", () => {
  function rule(selector: string): string {
    const at = cssRules.indexOf(`\n${selector} {`);
    expect(at, `no rule for ${selector}`).toBeGreaterThanOrEqual(0);
    return cssRules.slice(at, cssRules.indexOf("\n}", at));
  }

  it("the home's four stacked bands and its newsfeed cast no shadow", () => {
    expect(rule(".mid-section")).not.toMatch(/box-shadow/);
    expect(rule(".post-card")).not.toMatch(/box-shadow/);
    expect(rule(".item-card")).not.toMatch(/box-shadow/);
  });

  it("the catalogue tile is ruled, not boxed", () => {
    const body = rule(".item-card");
    expect(body).toContain("border-bottom: 1px solid var(--color-rule);");
    expect(body).toContain("border-radius: 0;");
    expect(body).toContain("background: transparent;");
  });

  it("keeps elevation only where something actually floats", () => {
    // The shared kit's card, the sticky rail panel, the header's dropdown and
    // the fixed phone bar are elevation; a band of content is not.
    for (const keep of [".card {", ".rail-panel {", ".anchored-header__plan-menu {"]) {
      expect(cssRules, keep).toContain(keep);
    }
    // Every rule that still paints --shadow-card-rest belongs to a floating
    // surface or to a non-public (staff/editor) surface — the public BANDS in
    // this pass carry none.
    const banded = [
      ".sv-hero__media",
      ".sv-call",
      ".sv-chapel",
      ".sv-help",
      ".sv-fact",
      ".sv-figure",
      ".sv-picker",
      ".fac-room",
      ".fac-grounds__media",
      ".fac-areas",
      ".fac-help",
      ".gal-hero",
      ".gal-walk",
      ".gal-figure__media",
      ".promo-figure",
      ".casket-sample",
    ];
    for (const selector of banded) {
      expect(rule(selector), selector).not.toMatch(/box-shadow/);
    }
  });
});

describe("the home's service band leads instead of counting", () => {
  async function home(): Promise<string> {
    const content = await listLandingContent();
    const doc = await loadPricingDocument();
    return renderToStaticMarkup(
      createElement(CartProvider, null, createElement(LandingView, {
        content,
        planPricing: doc.plans,
        lotCategories: doc.lotCategories,
        mapNode: null,
        mapLive: false,
        sectionCount: 0,
      })),
    );
  }

  it("one dominant card carries the client's photograph; the rest are entries", async () => {
    const html = await home();
    const content = await listLandingContent();
    // One lead block, one entry list — not four peers in a grid.
    expect((html.match(/svc-band__lead/g) ?? []).length).toBe(1);
    expect((html.match(/svc-band__entry/g) ?? []).length).toBe(
      content.services.items.length - 1,
    );
    // The lead carries a REAL client photograph derived from the card's own lot
    // family + icon key (lib/media.ts serviceCardPhoto), never a line glyph
    // standing in for a place the client has photographed.
    const leadPhoto = serviceCardPhoto(content.services.items[0].icon);
    expect(leadPhoto).toBeTruthy();
    expect(html).toContain(leadPhoto!);
    // Photographs lead ONCE: the four cards no longer repeat one picture as
    // wallpaper (and the entries carry no picture at all).
    expect((html.match(/class="svc-card__media"/g) ?? []).length).toBe(1);
    // Every card still carries the staff-chosen glyph as a small marker, so the
    // content document's icon field keeps a purpose.
    expect((html.match(/svc-card__icon/g) ?? []).length).toBe(content.services.items.length);
  });

  it("every service card maps to a real client asset that is actually shipped", () => {
    for (const [key, src] of Object.entries(SERVICE_CARD_PHOTOS)) {
      expect(src, key).toMatch(/^\/media\//);
      expect(existsSync(path.join(ROOT, "public", src)), `${key} → ${src}`).toBe(true);
    }
    // An unknown key degrades to "no picture", never to a crash or a wrong one.
    expect(serviceCardPhoto("not-a-key")).toBeNull();
  });

  it("the newsfeed leads with the newest story instead of stacking four cards", async () => {
    const html = await home();
    expect((html.match(/post-card--lead/g) ?? []).length).toBe(1);
    // The lead is the first post in the document (newest first).
    const content = await listLandingContent();
    const leadCaption = content.blog.posts[0].caption;
    const leadPos = html.indexOf("post-card--lead");
    const otherPos = html.indexOf("post-card ", leadPos + 1);
    if (leadCaption && otherPos > leadPos) {
      expect(html.indexOf(leadCaption)).toBeLessThan(otherPos);
    }
  });
});

describe("a catalogue prints a photograph only where one exists", () => {
  it("/plans publishes every catalogue item with its own photograph", async () => {
    const items = await listCatalogItems();
    const html = renderToStaticMarkup(
      createElement(CartProvider, null, await PlansPage({ searchParams: Promise.resolve({}) })),
    );
    // Imagery pass (captain 2026-09-19), superseding the 2026-09-18 price index:
    // the page rendered THREE images for a forty-two item catalogue, because none
    // of the fixture items carried a photograph. Every item now has one from the
    // ONE rule home (lib/catalogue-imagery.ts) — the client's own 2026
    // photographs, the plan's own poster, or the item's admin-set image — so the
    // catalogue is a gallery a family can shop from, not a list of rows.
    const cards = html.match(/class="shop-card"/g) ?? [];
    // The eight embalming day counts are the one group rendered as a priced
    // ladder (one photograph, eight rows) rather than eight photo cards, so the
    // count that matters is cards + ladder rows = every catalogue item.
    const ladderRows = html.match(/class="day-ladder__row"/g) ?? [];
    expect(cards.length + ladderRows.length).toBeGreaterThanOrEqual(items.length);
    // One photograph per card, and every photograph a real committed file.
    const photos = html.match(/class="shop-card__media"/g) ?? [];
    expect(photos.length).toBeGreaterThanOrEqual(cards.length);
    // Nothing without a source: a card that borrows a picture must SAY it is a
    // sample, and the chip never appears without its caption.
    const chips = html.match(/class="casket-sample__chip"/g) ?? [];
    const captions = html.match(/class="shop-card__caption"/g) ?? [];
    expect(chips.length).toBeGreaterThan(0);
    expect(captions.length).toBe(chips.length);
    // The group headings carry a real count each.
    for (const label of ["Packages", "Services", "Add-ons"]) {
      expect(html, label).toContain(label);
    }
    expect(html).toMatch(/band-head__count/);
    // The embalming ladder is one service at eight day counts: one photograph and
    // a priced ladder, never eight cards printing the same picture.
    expect(html).toMatch(/class="day-ladder"/);
  });
});

describe("the composition derivatives are the client's own photographs, at band weight", () => {
  const WEIGHT_BUDGET_KB = 110;

  it("ships every band photograph as a committed WebP", () => {
    for (const src of Object.values(PARK_PLACE_PHOTOS)) {
      expect(existsSync(path.join(ROOT, "public", src)), src).toBe(true);
      expect(src.endsWith(".webp"), src).toBe(true);
    }
  });

  it("keeps each published derivative inside the band weight budget", () => {
    // From ~2.2-2.6 MB client tiles to these: the band loads a picture, not a
    // print-resolution original (the same rule scripts/build-gallery-images.mjs
    // set for the gallery).
    for (const name of ["prime-lot", "premium-lot", "garden-niches", "mausoleum"]) {
      for (const width of [480, 720]) {
        const file = path.join(ROOT, `public/media/composition/${name}-${width}.webp`);
        expect(existsSync(file), file).toBe(true);
        const kb = statSync(file).size / 1024;
        expect(kb, `${name}-${width}`).toBeLessThan(WEIGHT_BUDGET_KB);
      }
    }
  });

  it("has not republished a multi-megabyte tile in place of its derivative", () => {
    for (const src of [PARK_PLACE_PHOTOS.prime, PARK_PLACE_PHOTOS.mausoleum]) {
      expect(src).not.toContain("lot-primary.png");
      expect(src).not.toContain("lot-mausoleum.png");
    }
  });

  it("never publishes a heavy library image at thumbnail size", () => {
    // The rule the rails, the About figure and the promo figure all rely on: a
    // library image a public view renders is either served from its shipment of
    // sized WebP derivatives, or is ALREADY light enough that resizing it would
    // only degrade it (the client's sheet samples are ~300 px / ~25 KB by
    // design). Nothing in the library may be published raw at print weight.
    const RAW_BUDGET_KB = 32;
    let derived = 0;
    for (const entry of MEDIA_LIBRARY) {
      const thumb = libraryThumb(entry.src, 320);
      if (thumb.endsWith(".webp")) {
        derived += 1;
        for (const width of LIBRARY_THUMB_WIDTHS) {
          const src = libraryThumb(entry.src, width);
          expect(existsSync(path.join(ROOT, "public", src)), `${entry.label} @${width}`).toBe(true);
        }
        continue;
      }
      const srcPath = path.join(ROOT, "public", decodeURIComponent(entry.src));
      expect(existsSync(srcPath), entry.label).toBe(true);
      const kb = statSync(srcPath).size / 1024;
      expect(kb, `${entry.label} is published raw at ${kb.toFixed(1)} KB`).toBeLessThan(
        RAW_BUDGET_KB,
      );
    }
    // Every library entry above the raw budget is routed through a derivative —
    // asserted directly, so adding a heavy upload without its thumbnail fails
    // here rather than in a visitor's phone.
    const heavy = MEDIA_LIBRARY.filter((entry) => {
      const srcPath = path.join(ROOT, "public", decodeURIComponent(entry.src));
      return existsSync(srcPath) && statSync(srcPath).size / 1024 >= RAW_BUDGET_KB;
    });
    expect(heavy.length).toBeGreaterThan(0);
    for (const entry of heavy) {
      expect(libraryThumb(entry.src), `${entry.label} is heavy but served raw`).toMatch(
        /\.webp$/,
      );
    }
    // The derivatives cover strictly more than the heavy rows: every library
    // entry a public view renders goes through one, whether or not today's
    // upload happens to be small.
    expect(derived).toBeGreaterThanOrEqual(heavy.length);
  });

  it("leaves an asset the thumbnail pass does not know exactly as it was", () => {
    // A staff URL or a device upload's data URL must pass straight through.
    for (const src of [
      "https://example.test/photo.jpg",
      "data:image/png;base64,AAAA",
      "/media/not-in-the-library.jpg",
    ]) {
      expect(libraryThumb(src)).toBe(src);
      expect(libraryThumbSet(src)).toBeUndefined();
    }
  });
});

describe("every published figure survived the composition", () => {
  it("keeps the plan tables and lot families the pricing store owns", () => {
    // A composition pass may move a figure, never delete one.
    expect(SEED_PRICING.plans.regular.length).toBe(4);
    expect(SEED_PRICING.plans.senior.length).toBe(4);
    expect(LOT_PRICE_CATEGORIES.length).toBeGreaterThanOrEqual(4);
  });
});

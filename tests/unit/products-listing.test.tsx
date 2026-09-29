import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  CASKET_MODELS,
  COFFIN_COVER_UNSTATED,
  COFFIN_SAMPLE_NOTE,
  COFFIN_TIER_NOTE,
} from "@/lib/villa-pricing";
import { measureProse, textOf, wordsOf } from "@/tests/helpers/prose";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * The /products listing — the captain's 2026-09-25 Amazon-familiar restructure.
 *
 * The catalogue is now a product LISTING: a sticky refine rail (Collection ·
 * Cover · Price), a results count with a sort control, and an even picture-first
 * grid of the same 24 cards. This suite pins the shape that makes it one grammar
 * with /lots, and the word budget the 2026-09-21 pass set on every card, without
 * re-testing the figures (the price/photo/label contracts live in
 * villa-services-premium and price-surfacing).
 */

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
}));

const { default: ProductsPage } = await import("@/app/(public)/products/page");

/** Render the page with a query, as the server half would. */
async function renderProducts(params: Record<string, string> = {}): Promise<string> {
  return renderToStaticMarkup(
    withBaskets( await ProductsPage({ searchParams: Promise.resolve(params) })),
  );
}

/** Every `.shop-card` <li>, in document order. */
function cards(html: string): string[] {
  return [...html.matchAll(/<li class="shop-card">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
}

/** Visible words in one card, ignoring the (nested) eyebrow paragraph. */
function cardWords(card: string): number {
  return wordsOf(textOf(card.replace(/<p\b[\s\S]*?<\/p>/gi, " ")));
}

function occurrences(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe("/products is one Amazon-familiar model listing", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderProducts();
  });

  it("wraps the grid in the shared listing shell with a sticky refine rail", () => {
    expect(html).toContain('class="listing-layout"');
    expect(html).toContain('class="listing-rail" aria-label="Refine coffins"');
    expect(html).toContain('class="listing-sheet__toggle"');
    expect(html).toContain('class="refine-panel"');
    expect(html).toContain("Refine coffins by");
    // Collection, Cover and the price range are the facets a casket shopper uses.
    for (const group of ["Collection", "Cover", "Price"]) {
      expect(html, group).toContain(`refine-group__label">${group}<`);
    }
    expect(html).toContain("Min ₱");
    expect(html).toContain("Max ₱");
  });

  it("is ONE grid flow of every model, with the over-threshold rows disclosed", () => {
    const all = cards(html);
    expect(all.length).toBe(CASKET_MODELS.length);
    // The whole catalogue renders in the SAME card grid; the over-threshold
    // models sit in one "Show all N" disclosure, never in a grid per collection.
    expect(occurrences(html, 'class="shop-grid casket-grid"')).toBe(2);
    expect(occurrences(html, 'class="shop-grid"')).toBe(0);
    expect(html).toContain('class="public-disclosure');
  });

  it("gives every card exactly one primary action (the gold Add to cart)", () => {
    for (const card of cards(html)) {
      expect(occurrences(card, "btn--accent"), "one primary action per card").toBe(1);
      expect(card).toContain("Add to cart");
      // The secondary paths are quiet links, not a second and third button row.
      expect(card).toContain("catalogue-actions__link");
      expect(card).toContain("Request order");
      expect(card).toContain("View details");
    }
  });

  it("keeps honesty to ONE short line per card", () => {
    // The compact label travels with every sample photograph...
    expect(occurrences(html, COFFIN_SAMPLE_NOTE)).toBeGreaterThan(0);
    // ...and the full substitution sentence prints once, under the tier band.
    expect(occurrences(html, COFFIN_TIER_NOTE)).toBe(1);
    // The long per-model cover note lives on the detail view, never on a card.
    expect(html).not.toContain(COFFIN_COVER_UNSTATED);
  });

  it("holds the card to the compressed budget the pass set", () => {
    const counts = cards(html).map(cardWords);
    const average = counts.reduce((n, c) => n + c, 0) / counts.length;
    // Before the 2026-09-21 pass: ~58 words across two paragraphs. After: ~33
    // including the chip, caption, every figure and all three action labels.
    expect(average, `average card words: ${average.toFixed(1)}`).toBeLessThanOrEqual(36);
    expect(Math.max(...counts), "longest card words").toBeLessThanOrEqual(42);
    for (const card of cards(html)) {
      const caption = card.match(/<figcaption class="shop-card__caption">([\s\S]*?)<\/figcaption>/);
      expect(caption, "every sampled card carries a caption").toBeTruthy();
      expect(wordsOf(textOf(caption![1])), "caption words").toBeLessThanOrEqual(11);
    }
  });

  it("opens with one plain sentence and an action, then the catalogue", () => {
    const lead = html.match(/<p class="public-hero__lead">([\s\S]*?)<\/p>/);
    expect(lead).toBeTruthy();
    expect(wordsOf(textOf(lead![1])), "hero lead words").toBeLessThanOrEqual(12);
    const hero = html.slice(0, html.indexOf("</section>"));
    expect(hero).toContain('data-public-hero="interior"');
    expect(hero).toMatch(/class="[^"]*\bbtn\b[^"]*"/);
  });

  it("keeps the page's paragraph prose inside the storefront reading budget", () => {
    const stats = measureProse(html);
    expect(stats.paragraphWords, "paragraph prose").toBeLessThanOrEqual(300);
    expect(stats.longest.words, `longest: "${stats.longest.text}"`).toBeLessThanOrEqual(30);
  });
});

describe("/products filters and sorts in place from the URL", () => {
  it("reads the initial filter state out of the query string", async () => {
    const lumina = cards(await renderProducts({ collection: "Lumina" }));
    expect(lumina.length).toBe(1);
    // The chosen option renders as a checked checkbox.
    expect((await renderProducts({ collection: "Lumina" })).match(/type="checkbox" checked=""/g))
      .toHaveLength(1);
    // An unknown id is dropped rather than guessed (the full catalogue renders).
    expect(cards(await renderProducts({ collection: "Atlantis" })).length).toBe(
      CASKET_MODELS.length,
    );
  });

  it("sorts by price on request", async () => {
    const asc = cards(await renderProducts({ sort: "price-asc" }));
    const prices = asc.map(
      (c) => Number(c.match(/class="shop-card__price">₱([\d,]+)\./)?.[1]?.replace(/,/g, "") ?? 0),
    );
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
    const desc = cards(await renderProducts({ sort: "price-desc" }));
    const descPrices = desc.map(
      (c) => Number(c.match(/class="shop-card__price">₱([\d,]+)\./)?.[1]?.replace(/,/g, "") ?? 0),
    );
    for (let i = 1; i < descPrices.length; i++) {
      expect(descPrices[i]).toBeLessThanOrEqual(descPrices[i - 1]);
    }
  });

  it("answers a no-match query with the way back", async () => {
    const html = await renderProducts({ min: "9999999" });
    expect(cards(html)).toHaveLength(0);
    expect(html).toContain("No models match those filters");
    expect(html).toContain("Clear all filters");
  });
});

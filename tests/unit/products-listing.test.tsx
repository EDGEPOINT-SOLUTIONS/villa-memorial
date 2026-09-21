import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import {
  CASKET_MODELS,
  COFFIN_COVER_UNSTATED,
  COFFIN_SAMPLE_NOTE,
  COFFIN_TIER_NOTE,
} from "@/lib/villa-pricing";
import { measureProse, textOf, wordsOf } from "@/tests/helpers/prose";

/**
 * The 2026-09-21 /products UI/UX pass — the card's word budget and its one
 * primary action.
 *
 * The captain's brief: "/products reads at a glance like a well-run product
 * listing". The president's standing complaint ("too wordy — it should be
 * understandable at a glance") was measured on the page as ~58 words per card
 * across TWO paragraphs (a 25-word caption plus a per-model cover note), a
 * three-button action row and a per-card senior mini-table.
 *
 * This suite pins the SHAPE that fixed it, without re-testing the figures (the
 * price/photo/label contracts live in villa-services-premium and
 * price-surfacing):
 *   · one grid of 24 cards with a collection index, not a band per collection;
 *   · ONE primary action per card (a single `.btn--accent`), details via the
 *     photo/title and a quiet link;
 *   · one short honesty line per card, with the full substitution sentence and
 *     the long cover note printed ONCE / on the detail view, never per card;
 *   · a card word budget that a future edit cannot quietly blow past.
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

describe("/products reads as one compact card listing", () => {
  let html: string;

  beforeAll(async () => {
    html = renderToStaticMarkup(
      createElement(CartProvider, null, await ProductsPage()),
    );
  });

  it("is ONE grid flow of every model, not a band per collection", () => {
    const all = cards(html);
    expect(all.length).toBe(CASKET_MODELS.length);
    // The whole catalogue renders in the SAME card grid; the over-threshold
    // models sit in one "Show all N" disclosure (lane 2 density pass), never in
    // a grid per collection.
    expect(occurrences(html, 'class="shop-grid casket-grid"')).toBe(2);
    expect(occurrences(html, 'class="shop-grid"')).toBe(0);
    expect(html).toContain('class="public-disclosure');
  });

  it("summarises the four collections above the grid without adding a second control", () => {
    expect(occurrences(html, 'class="casket-index"')).toBe(1);
    for (const collection of ["Lumina", "The White Rose Collection", "The Crown Collection", "The Dynasty Collection"]) {
      expect(html, collection).toContain(collection);
    }
    // The index is a static legend: no links, no filter controls.
    const index = html.slice(html.indexOf('class="casket-index"'));
    const firstCard = index.indexOf('class="shop-card"');
    expect(index.slice(0, firstCard)).not.toContain("<a ");
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
    // Before the pass: ~58 words across two paragraphs. After: ~33 including
    // the chip, caption, every figure and all three action labels. The ceiling
    // leaves room for a longer model name without letting a paragraph return.
    expect(average, `average card words: ${average.toFixed(1)}`).toBeLessThanOrEqual(36);
    expect(Math.max(...counts), "longest card words").toBeLessThanOrEqual(42);
    // A caption is one line, never a paragraph.
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
    // The same paragraph rules /services and /plans are gated on (the card
    // <li>s are product cards, not prose, so only the paragraph half is
    // asserted here). Before the pass the hero alone was a 61-word paragraph.
    const stats = measureProse(html);
    expect(stats.paragraphWords, "paragraph prose").toBeLessThanOrEqual(300);
    expect(stats.longest.words, `longest: "${stats.longest.text}"`).toBeLessThanOrEqual(30);
  });
});

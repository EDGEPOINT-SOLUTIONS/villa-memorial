import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { quoteLineDescriptor, type QuoteLine } from "@/lib/quote-basket/quote-line";
import type { RequestPrefill } from "@/lib/public-forms/request-prefill";
import { QuoteBasketPage } from "@/components/public-forms/quote-basket-page";

/**
 * The `/quote` PAGE STATES (captain, 2026-09-30): empty, one line, mixed and very
 * long. Rendered from a controlled basket through react-dom/server, because the
 * page's real basket hydrates from localStorage in an effect that SSR never runs.
 *
 * These pin the honest structure: the split summary band (D4-A), the office-quote
 * label on a quote-only line (D3-A), a single send step (D2-A), and a long list
 * that stays a list rather than becoming a table.
 */
const state = vi.hoisted(() => ({ lines: [] as QuoteLine[] }));

vi.mock("@/lib/quote-basket/quote-basket-context", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/quote-basket/quote-basket-context")>();
  return {
    ...actual,
    useQuoteBasket: () => ({
      lines: state.lines,
      ready: true,
      sender: null,
      setSender() {},
      add() {},
      setQuantity() {},
      remove() {},
      clear() {},
    }),
  };
});

const page = (prefill: RequestPrefill | null = null) =>
  renderToStaticMarkup(createElement(QuoteBasketPage, { prefill }));

const serviceLine = (sku: string, name: string): QuoteLine => ({
  sku,
  name,
  kind: "service",
  descriptor: quoteLineDescriptor("service"),
  pricing: { mode: "on_request" },
  quantity: 1,
});

const lotLine = (): QuoteLine => ({
  sku: "LOT-MAUSOLEUM",
  name: "Mausoleum — memorial lot",
  kind: "lot",
  descriptor: quoteLineDescriptor("lot"),
  pricing: { mode: "published", unitPriceCents: 107300000, currency: "PHP" },
  quantity: 1,
  detail: "24 sqm · 1. Lot Only · lot only",
});

beforeEach(() => {
  state.lines = [];
});

describe("/quote — empty basket", () => {
  it("leads with the empty state, browse doors and one small request link", () => {
    const html = page();
    expect(html).toContain("Nothing here yet");
    expect(html).toContain("Funeral services");
    expect(html).toContain("Memorial plans");
    expect(html).toContain("Memorial lots");
    expect(html).toContain("Ask the office about it");
    // No send step while there is nothing to send.
    expect(html).not.toContain('id="qb-name"');
    expect(html).not.toContain("Send this quote request");
  });
});

describe("/quote — one quote-only line", () => {
  it("prints the office-quote label, a 1-item summary and no blended total", () => {
    state.lines = [serviceLine("SRV-RETRIEVAL", "Retrieval")];
    const html = page();
    expect(html).toContain("1 item");
    expect(html).toContain("0 with a published 2026 figure");
    expect(html).toContain("1 the office will quote by hand");
    expect(html).toContain("To be quoted by the office");
    expect(html).not.toMatch(/₱/);
    // The send step exists for a non-empty basket.
    expect(html).toContain('id="qb-name"');
  });
});

describe("/quote — mixed basket", () => {
  it("splits published figures from the hand-quoted lines and never blends", () => {
    state.lines = [lotLine(), serviceLine("SRV-RETRIEVAL", "Retrieval"), serviceLine("CHP-COMMON-DAY", "Chapel use")];
    const html = page();
    expect(html).toContain("3 items");
    expect(html).toContain("1 with a published 2026 figure");
    expect(html).toContain("2 the office will quote by hand");
    // The published figure is present, but only as the published part.
    expect(html).toContain("1,073,000.00");
    expect(html).toContain("To be quoted by the office");
    // No blended total anywhere.
    expect(html).not.toContain("Published figures so far");
    expect(html).not.toContain("1,075,500.00");
  });
});

describe("/quote — very long basket", () => {
  it("renders one card per line and keeps the send shortcut", () => {
    state.lines = Array.from({ length: 14 }, (_, i) =>
      serviceLine(`REQ-${i}`, `Requested service ${i + 1}`),
    );
    const html = page();
    expect(html).toContain("14 items");
    expect(html).toContain("Send this quote request");
    const cards = html.match(/class="quote-line"/g) ?? [];
    expect(cards).toHaveLength(14);
    // A list of cards, not a five-column table in a pan frame.
    expect(html).not.toContain("<table");
    expect(html).not.toContain("table-wrapper");
  });
});

describe("/quote — heading ladder", () => {
  it("has one h1 and no skipped heading levels with lines on the page", () => {
    state.lines = [lotLine(), serviceLine("SRV-RETRIEVAL", "Retrieval")];
    const html = page();
    const levels = [...html.matchAll(/<h([1-6])\b/g)].map((m) => Number(m[1]));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });
});

describe("/quote — prefill", () => {
  it("opens the light request dialog seeded with the ?item= value", () => {
    const html = page({ item: "Memorial keepsake" });
    expect(html).toContain("Ask about something not listed");
    expect(html).toContain("Memorial keepsake");
    expect(html).toContain('id="qa-item"');
  });
});

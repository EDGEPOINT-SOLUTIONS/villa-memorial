import { describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  listLandingContent,
  saveLandingContent,
  validateLandingContent,
  type LandingContent,
} from "@/lib/api-client/landing";
import { LOT_PRICE_CATEGORIES } from "@/lib/villa-pricing";

/**
 * The FAQ page is staff-editable content now (audit §7.1 G7): it renders the
 * `faq` region of the same LandingPage document the home uses, and saving that
 * document through the BFF path changes what /faq shows. These tests render the
 * REAL page component (next/link stubbed only) and pin:
 *  - the shipped page looks exactly as it did when it was hardcoded JSX;
 *  - an edited document reaches the page through the real save path;
 *  - an empty FAQ renders the design-system empty state, never a bare grid;
 *  - the validator refuses half-written entries.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

// The save path validates against the pricing store; point it at a path that
// does not exist so a developer's local .data store cannot leak into this suite.
process.env.PRICING_STORE_PATH = path.join(os.tmpdir(), "villa-faq-page-no-store.json");

const { default: FaqPage } = await import("@/app/(public)/faq/page");

const cloneDoc = (doc: LandingContent): LandingContent =>
  JSON.parse(JSON.stringify(doc)) as LandingContent;

async function renderFaq(): Promise<string> {
  return renderToStaticMarkup(await FaqPage());
}

describe("the FAQ page renders the shipped content document", () => {
  it("shows the Help hero, the three question cards and the next-step links", async () => {
    const content = await listLandingContent();
    const html = await renderFaq();

    expect(html).toContain("Help");
    expect(html).toContain(content.faq.heading);
    expect(html).toContain(content.faq.lead);
    // Every seeded question and answer reaches the markup verbatim.
    expect(content.faq.items).toHaveLength(3);
    for (const item of content.faq.items) {
      expect(html).toContain(item.question);
      expect(html).toContain(item.answer);
      expect(html).toContain('class="card"');
    }
    expect((html.match(/class="card"/g) ?? []).length).toBe(3);
    // The page-links row and the back link stay page chrome.
    expect(html).toContain('class="page-links"');
    for (const link of content.faq.links) {
      expect(html).toContain(`<a href="${link.href}">${link.label}</a>`);
    }
    expect(html).toContain("← Back to home");
  });

  it("an emptied FAQ renders the empty state instead of an empty grid", async () => {
    const content = await listLandingContent();
    const sparse = cloneDoc(content);
    sparse.faq.items = [];
    const saved = await saveLandingContent(sparse);
    expect(saved.faq.items).toEqual([]);

    const html = await renderFaq();
    expect(html).not.toContain('class="card"');
    expect(html).toContain("No questions published yet");

    // Restore the recorded seed for any later test in this file.
    await saveLandingContent(content);
  });
});

describe("a staff edit to the FAQ reaches the public page", () => {
  it("the saved question, answer and link are what /faq renders", async () => {
    const content = await listLandingContent();
    const edited = cloneDoc(content);
    edited.faq.heading = "Questions families ask";
    edited.faq.items = [
      {
        id: "faq-edited",
        question: "Do you answer at night?",
        answer: "Yes — a coordinator answers the 24/7 line day or night.",
      },
    ];
    edited.faq.links = [{ label: "Talk to a coordinator", href: "/contact" }];

    const saved = await saveLandingContent(edited);
    expect(saved.updated_at).not.toBeNull();

    const html = await renderFaq();
    expect(html).toContain("Questions families ask");
    expect(html).toContain("Do you answer at night?");
    expect(html).toContain("a coordinator answers the 24/7 line day or night");
    expect(html).toContain('<a href="/contact">Talk to a coordinator</a>');
    // The replaced questions are gone — the page is not a merge of old and new.
    expect(html).not.toContain(content.faq.items[0].question);

    // Restore the recorded seed so this file leaves the store as it found it.
    await saveLandingContent(content);
  });
});

describe("the FAQ rules live in the one validator", () => {
  it("refuses an entry missing its answer and a link missing its destination", async () => {
    const content = await listLandingContent();

    const halfEntry = cloneDoc(content);
    halfEntry.faq.items = [{ id: "x", question: "A question with no answer", answer: "  " }];
    const verdict = validateLandingContent(halfEntry, LOT_PRICE_CATEGORIES);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/question and an answer/i);

    const halfLink = cloneDoc(content);
    halfLink.faq.links = [{ label: "Where?", href: "" }];
    const verdict2 = validateLandingContent(halfLink, LOT_PRICE_CATEGORIES);
    expect(verdict2.ok).toBe(false);
    if (!verdict2.ok) expect(verdict2.error).toMatch(/label and a destination/i);

    expect(validateLandingContent(content, LOT_PRICE_CATEGORIES).ok).toBe(true);
  });
});

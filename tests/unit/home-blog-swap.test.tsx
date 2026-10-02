import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";

/**
 * The home/blog swap (captain, 2026-10-02): `/` is the blog page's anchored
 * storefront composition, its middle column opening on a banner instead of the
 * post list; `/blog` is a dedicated blog (covered by blog-document.test.ts).
 *
 * This file pins the home half: the banner's office-owned words, the 24/7 call
 * and the supporting action survive, the storefront bands render, and NO post
 * list appears on the home any more. Every value is read from the same landing
 * document the route reads, never typed here.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ push: () => {} }),
}));

const { HomeStorefront } = await import("@/components/landing/home-storefront");
const { HomeBanner } = await import("@/components/landing/home-banner");
const { listLandingContent } = await import("@/lib/api-client/landing");
const { loadPricingDocument } = await import("@/lib/api-client/pricing");

/** The shell provides BOTH baskets; render the bands inside both, as the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(CartProvider, null, createElement(QuoteBasketProvider, null, node));
}

async function home(): Promise<{ html: string; content: Awaited<ReturnType<typeof listLandingContent>> }> {
  const [content, pricing] = await Promise.all([listLandingContent(), loadPricingDocument()]);
  const html = renderToStaticMarkup(
    withBaskets(
      HomeStorefront({
        content,
        planPricing: pricing.plans,
        lotCategories: pricing.lotCategories,
        mapNode: null,
        mapLive: false,
        sectionCount: 0,
      }),
    ),
  );
  return { html, content };
}

describe("the home opens on the banner and carries no posts", () => {
  it("renders the banner lead with the office's place line and one h1", async () => {
    const { html, content } = await home();
    expect(html).toContain("home-open");
    expect(html).toContain("home-banner");
    // The office's own words and the live 24/7 line, never a typed string.
    expect(html).toContain(content.home.gateway.place);
    expect(html).toContain(content.contact.phoneDisplay);
    expect(html).toContain(content.home.gateway.secondary.label);
    // The captain removed the three-item trust ribbon (2026-10-02): it no
    // longer renders anywhere on the home. The facts stay in the document.
    expect(html).not.toContain("home-open__trust");
    expect(html).not.toContain("home-trust__item");
    // Exactly one h1: the office's rotating gateway title.
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('id="home-gateway-title"');
  });

  it("still renders the anchored storefront bands", async () => {
    const { html } = await home();
    for (const marker of [
      "anchored-rail--left",
      "anchored-rail--right",
      "plan-lot-grid",
      "plan-board",
      "mid-section--map",
      "about-grid",
    ]) {
      expect(html, marker).toContain(marker);
    }
  });

  it("lists NO blog posts anywhere on the home", async () => {
    const { html } = await home();
    expect(html).not.toContain("blog-rows");
    expect(html).not.toContain("blog-feed");
    expect(html).not.toContain('aria-label="Blog posts"');
    expect((html.match(/class="post-card"/g) ?? []).length).toBe(0);
  });
});

describe("the banner degrades without a photograph", () => {
  it("renders the authored empty state instead of a broken image", async () => {
    const content = await listLandingContent();
    const noPhoto = structuredClone(content);
    noPhoto.home.photo.image = null;
    const html = renderToStaticMarkup(withBaskets(HomeBanner({ content: noPhoto })));
    expect(html).toContain("home-engraved");
    expect(html).not.toContain("<img");
  });
});

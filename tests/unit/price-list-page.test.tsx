import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { planContentFromDocument } from "@/lib/plan-content";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * The consolidated Price list page (/price-list) — the captain's 2026-09-21
 * consolidation of the 2026 plan payments tables (was `#plan-payments` on
 * /plans), the package comparison (was /plans/compare), the products & price
 * list view (was /plans/villa-memorial-plan) and the senior-citizen plan (was
 * /plans/senior-benefits).
 *
 * Its only public entry point is the grouped "Explore more" menu; the retired
 * routes redirect here (tests/unit/retired-routes.test.ts). This suite pins the
 * page's presence and that the four consolidated surfaces are actually on it.
 */
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const { default: PriceListPage } = await import("@/app/(public)/price-list/page");

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(withBaskets( await PriceListPage()));
}

describe("the consolidated Price list page", () => {
  it("renders exactly one h1 and names the page Price list", async () => {
    const html = await renderPage();
    expect((html.match(/<h1\b/g) ?? []).length).toBe(1);
    // The redesign's opening is the home gateway, so the h1 is the page's
    // headline (the route's own name stays in the metadata/title).
    expect(html).toContain(">Every published 2026 amount</h1>");
  });

  it("carries all four consolidated surfaces on one page", async () => {
    const html = await renderPage();
    // 1 · the package comparison
    expect(html).toContain("Compare the packages");
    // 2 · the products & price list view
    expect(html).toContain("Coffin options");
    expect(html).toContain("Lots &amp; mausoleum");
    // 3 · the senior-citizen plan
    expect(html).toContain("Senior citizen plan");
    // 4 · the 2026 plan payment tables
    expect(html).toContain("Villa Memorial Plan");
    expect(html).toContain("payment schedule (PHP)");
  });

  it("compares every live package and links each to its detail page", async () => {
    const html = await renderPage();
    const items = await listCatalogItems("package");
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const item of items) {
      expect(html, item.sku).toContain(`href="/plans/${item.sku}"`);
      expect(html, item.sku).toContain(item.name);
      expect(html, item.sku).toContain(item.display_price);
    }
    // "View packages" points at the Basic package (the /packages destination).
    expect(html).toContain('href="/plans/PKG-BASIC"');
  });

  it("prints the plan copy from the content document, never hard-coded", async () => {
    const html = await renderPage();
    const document = await getPageDocument("plans");
    const content = planContentFromDocument(document);
    for (const term of content.seniorTerms) expect(html).toContain(term);
    for (const inclusion of content.packageInclusions) {
      expect(html, inclusion.label).toContain(inclusion.label.replace(/&/g, "&amp;"));
    }
    expect(html).toContain(content.notes.contestability);
  });

  it("keeps the retired sub-page doors off the page", async () => {
    const html = await renderPage();
    expect(html).not.toContain('href="/packages"');
    expect(html).not.toContain('href="/plans/compare"');
    expect(html).not.toContain('href="/plans/senior-benefits"');
    expect(html).not.toContain('href="/plans/villa-memorial-plan"');
  });
});

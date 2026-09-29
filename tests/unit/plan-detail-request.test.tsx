import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


// The detail page's add control calls useRouter ("Go to checkout"); the server
// render under test only needs the hook to resolve.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
// The views are server components; the harness has no app router.
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

const { default: PlanDetailPage } = await import("@/app/(public)/plans/[sku]/page");
const { getCatalogItem } = await import("@/lib/api-client/commerce");

/**
 * The item detail page every /plans card links to. For a catalogue entry that
 * is NOT a plan package (a service or an add-on — including every sellable 2026
 * casket, a-la-carte fee and chapel product), the sticky card must offer BOTH
 * storefront actions: Add to cart for this exact catalogue SKU, and the
 * prefilled Request order carrying the same name/SKU/price the page shows.
 */
async function renderDetail(sku: string): Promise<{ html: string; item: NonNullable<Awaited<ReturnType<typeof getCatalogItem>>> }> {
  const item = await getCatalogItem(sku);
  expect(item, `${sku} must be in the catalogue`).toBeTruthy();
  const ui = await PlanDetailPage({ params: Promise.resolve({ sku }) });
  return {
    html: renderToStaticMarkup(withBaskets( ui)),
    item: item!,
  };
}

describe("/plans/[sku] — a service/add-on detail page is actionable, not a dead end", () => {
  it("offers Add to cart with the page's own SKU and a prefilled Request order", async () => {
    const { html, item } = await renderDetail("SRV-INTERMENT");
    // The shared add control (this page's own SKU), then the request pair.
    expect(html).toContain("Add to cart");
    // The page names its own SKU…
    expect(html).toContain(item.sku);
    expect(html).toContain("Request order");
    // The request echoes exactly what the page shows.
    expect(html).toContain("href=\"/contact?");
    expect(html).toContain(encodeURIComponent(item.name).replace(/%20/g, "+"));
    expect(html).toContain(`sku=${item.sku}`);
    // The page's own price string reaches the request (display_price is trusted
    // as-is; it is never re-derived from the minor units).
    expect(html).toContain(encodeURIComponent(item.display_price).replace(/%20/g, "+"));
    expect(html).toContain("View cart");
  });

  it("keeps the packaging buy card off a non-package item", async () => {
    const { html } = await renderDetail("CSK-LUMINA");
    // The tier × term selector is the package page's own rail card.
    expect(html).not.toContain("Use senior-citizen rates");
    expect(html).toContain("Request order");
  });
});

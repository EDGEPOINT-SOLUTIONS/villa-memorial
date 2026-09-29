import { type AnchorHTMLAttributes, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
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


/**
 * Monthly-first pricing on the plan and lot SURFACES (Villa Memorial minutes,
 * 2026-09-21, item 8). The pure derivation is pinned by
 * tests/unit/monthly-pricing.test.ts; this suite renders the real pages and
 * pins that the monthly installment LEADS, that the payment term prints, and
 * that a plan names the missing term honestly instead of a guessed month count.
 *
 * The amounts are read from the same fixtures the pages read, so a
 * transcription slip fails here rather than shipping.
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
  usePathname: () => "/",
  useRouter: () => ({ push: () => {} }),
}));

const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: PriceListPage } = await import("@/app/(public)/price-list/page");
const { default: MapPage } = await import("@/app/(public)/map/page");
const { default: LotPriceListPage } = await import("@/app/(public)/lots/price-list-2026/page");
const { default: LotDetailPage } = await import("@/app/(public)/lots/[id]/page");
const { PENDING_TERM_LABEL, LOT_TERM_LABEL } = await import("@/lib/monthly-pricing");

const LOT_ID = "00000000-0000-4000-8000-000000000D01"; // A-001, section A / Prime Lots

function firstCardOf(html: string): string {
  return html.match(/<li class="shop-card">([\s\S]*?)<\/li>/)?.[1] ?? "";
}

describe("/plans leads with the monthly plan rate and names the pending term", () => {
  it("prints the monthly installment on every tier column, with the honest pending term once", async () => {
    const html = renderToStaticMarkup(await PlansPage());
    // Every tier column carries a monthly figure (whole pesos; the exact
    // centavos stay where the catalogue carts the item).
    expect((html.match(/class="plan-tier__price"/g) ?? []).length).toBe(5);
    expect(html).toContain("₱600");
    // The unrecorded plan term is named honestly, exactly once, in the band note.
    expect(html.split(PENDING_TERM_LABEL).length - 1).toBe(1);
  });
});

describe("/lots leads each plot card with its section family's monthly figure", () => {
  it("shows the monthly installment, the 72-month term and the recorded total", async () => {
    const html = renderToStaticMarkup(
      await MapPage({ searchParams: Promise.resolve({ tab: "lots", park: "villa" }) }),
    );
    const card = firstCardOf(html);
    const at = (needle: string) => card.indexOf(needle);
    const monthly = at('class="monthly-price__amount"');
    const total = at("Total contract price");
    expect(monthly, "monthly amount").toBeGreaterThanOrEqual(0);
    expect(at(`Payment term: ${LOT_TERM_LABEL}`), "term").toBeGreaterThanOrEqual(0);
    expect(total, "total").toBeGreaterThanOrEqual(0);
    // The monthly leads the total.
    expect(monthly).toBeLessThan(total);
    // A-001 is section A → Prime Lots: ₱1,920/month over 72 months, ₱128,000 total.
    expect(card).toContain("₱1,920.00");
    expect(card).toContain("Total contract price ₱128,000");
  });
});

describe("/lots/[id] leads the lot detail with the monthly figure", () => {
  it("prints the monthly installment, its term and the total contract price", async () => {
    const html = renderToStaticMarkup(
      await LotDetailPage({ params: Promise.resolve({ id: LOT_ID }) }),
    );
    expect(html).toContain("Monthly payment");
    expect(html).toContain("₱1,920.00 / month");
    expect(html).toContain("Payment term");
    expect(html).toContain(LOT_TERM_LABEL);
    expect(html).toContain("Total contract price");
    expect(html).toContain("₱128,000");
    // The hero lead names the monthly figure too.
    expect(html).toMatch(/₱1,920\.00 \/ month/);
  });
});

describe("the price lists open with the monthly-first summary", () => {
  it("/price-list prints a monthly row per plan tier and per lot product", async () => {
    const html = renderToStaticMarkup(await PriceListPage());
    expect(html).toContain("Monthly installments at a glance");
    expect((html.match(/class="table installment-table"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // Plans: the monthly amount leads, the term is pending, no total is shown.
    expect(html).toContain("₱600.00 / month");
    expect(html).toContain(PENDING_TERM_LABEL);
    // Lots: the monthly amount leads, the recorded term and total follow.
    expect(html).toContain("₱1,920.00 / month");
    expect(html).toContain(LOT_TERM_LABEL);
    expect(html).toContain("₱128,000");
  });

  it("/lots/price-list-2026 prints the monthly-first summary for every family", async () => {
    // The rows carry the add-to-quote control, so the page renders inside the
    // shared basket (the app provides it in the public shell).
    const html = renderToStaticMarkup(
      withBaskets( await LotPriceListPage()),
    );
    expect(html).toContain("Monthly installments");
    expect((html.match(/class="table installment-table"/g) ?? []).length).toBe(1);
    expect(html).toContain("₱1,920.00 / month");
    expect(html).toContain(LOT_TERM_LABEL);
    expect(html).toContain("₱128,000");
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { saveLotPricing, savePlanPricing } from "@/lib/api-client/pricing";
import { SEED_PRICING } from "@/lib/villa-pricing";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * The whole point of the pricing store: an office edit must reach the PUBLIC
 * pages. These tests save through the same API client the staff screens use and
 * then render the real public pages, asserting the edited figures are what a
 * visitor reads (and the replaced ones are gone). Pages are server components;
 * next/link and next/navigation are stubbed because the harness has no router.
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
  useRouter: () => ({ push: () => undefined, replace: () => undefined, refresh: () => undefined }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: PriceListPage } = await import("@/app/(public)/price-list/page");
const { default: PlanDetailPage } = await import("@/app/(public)/plans/[sku]/page");
const { default: LotsPriceListPage } = await import("@/app/(public)/lots/price-list-2026/page");

// The path must exist before any hook runs (the first describe saves in its own
// beforeAll), so the throwaway store is created at module scope.
const dir = mkdtempSync(path.join(os.tmpdir(), "villa-pricing-render-"));
process.env.PRICING_STORE_PATH = path.join(dir, "pricing.json");

afterAll(() => {
  delete process.env.PRICING_STORE_PATH;
  rmSync(dir, { recursive: true, force: true });
});

/** Bronze 1 monthly ₱619 (annual ₱7,428) + senior Bronze 1 monthly ₱555 (annual ₱6,660). */
function editedPlans() {
  const plans = structuredClone(SEED_PRICING.plans);
  const set = (table: "regular" | "senior", tier: "bronze1", monthly: number) => {
    plans[table].find((r) => r.mode === "Monthly")![tier] = monthly;
    plans[table].find((r) => r.mode === "Annual")![tier] = monthly * 12;
    plans[table].find((r) => r.mode === "Semi-annual")![tier] = monthly * 6;
    plans[table].find((r) => r.mode === "Quarterly")![tier] = monthly * 3;
  };
  set("regular", "bronze1", 619);
  set("senior", "bronze1", 555);
  return plans;
}

/** Prime Lots regular selling ₱130,000 with the matching six-year annual. */
function editedLots() {
  const categories = structuredClone(SEED_PRICING.lotCategories);
  const prime = categories[0].rows.find((r) => r.product === "Prime Lots")!;
  prime.regular.selling = 130000;
  prime.regular.annual = 21667;
  return categories;
}

async function renderWithCart(page: ReactNode): Promise<string> {
  return renderToStaticMarkup(withBaskets( page));
}

describe("public pages read the saved plan rates", () => {
  beforeAll(async () => {
    await savePlanPricing(editedPlans(), "Sam Staff");
    await saveLotPricing(editedLots(), "Sam Staff");
  });

  it("/plans prints the edited monthly tier rate; /price-list prints the edited schedule cells", async () => {
    // The tier card prints the live monthly (Bronze 1 regular ₱619.00).
    const plans = await renderWithCart(await PlansPage());
    expect(plans).toContain("₱619.00");
    expect(plans).not.toContain("₱7,428");
    // The 2026 payment-mode tables now live on the consolidated Price list page.
    const html = await renderWithCart(await PriceListPage());
    expect(html).toContain("₱7,428");
    expect(html).toContain("₱619");
    expect(html).not.toContain("₱7,200");
    // Senior Bronze 1: annual 6,660 stays inside the senior half.
    expect(html).toContain("₱6,660");
    expect(html).toContain("₱555");
  });

  it("/price-list prints both schedules and the edited lot price", async () => {
    const html = await renderWithCart(await PriceListPage());
    expect(html).toContain("₱7,428");
    expect(html).toContain("₱6,660");
    expect(html).toContain("₱130,000");
    expect(html).toContain("₱21,667");
    expect(html).not.toContain("₱128,000");
  });

  it("/price-list prints the edited senior cell only", async () => {
    const html = await renderWithCart(await PriceListPage());
    expect(html).toContain("₱6,660");
    expect(html).toContain("₱555");
    // The replaced Bronze 1 annual is gone; the other 6,600 (Silver 2's own
    // semi-annual cell) is untouched.
    expect(html).not.toContain("Bronze 1 plan, Annual — ₱6,600");
  });

  it("the package page's selector and price module print the edited figures", async () => {
    const html = await renderWithCart(
      await PlanDetailPage({ params: Promise.resolve({ sku: "PKG-BASIC" }) }),
    );
    // The buy card opens on Bronze 1 · Monthly at centavo precision.
    expect(html).toContain("₱619.00");
    expect(html).not.toContain("₱600.00");
    // The prototype price module prints the lot table without the ₱ sign.
    expect(html).toContain(">130,000<");
    expect(html).toContain(">21,667<");
    expect(html).not.toContain(">128,000<");
  });

  it("/lots/price-list-2026 prints the edited lot row and drops the replaced price", async () => {
    const html = renderToStaticMarkup(
      withBaskets( await LotsPriceListPage()),
    );
    expect(html).toContain("₱130,000");
    expect(html).toContain("₱21,667");
    expect(html).not.toContain("₱128,000");
    // The request link for that row carries the edited selling price.
    expect(html).toContain("Prime Lots");
    expect(html).toMatch(/130%2C000\+regular\+selling\+price/);
  });
});

describe("a refused edit never reaches the public pages", () => {
  beforeAll(async () => {
    // Put the recorded seed back (the previous describe saved an edit), so this
    // test observes the refusal against the published sheet.
    await savePlanPricing(structuredClone(SEED_PRICING.plans), "Reset to seed");
  });

  it("keeps the seed figures when the store rejects an invariant-breaking save", async () => {
    const broken = editedPlans();
    broken.regular.find((r) => r.mode === "Monthly")!.bronze1 = 500; // senior 550 > 500
    await expect(savePlanPricing(broken, "Sam Staff")).rejects.toMatchObject({ status: 422 });

    const priceList = await renderWithCart(await PriceListPage());
    expect(priceList).toContain("₱7,200");
    expect(priceList).toContain("₱600");
    expect(priceList).not.toContain("₱7,428");
    const plans = await renderWithCart(await PlansPage());
    expect(plans).toContain("₱600.00");
  });
});

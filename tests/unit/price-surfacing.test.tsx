import { beforeAll, describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_INCLUSIONS,
  CASKET_MODELS,
  CHAPEL_NOTES,
  CHAPEL_RATES,
  EMBALMING_RATES,
  php,
} from "@/lib/villa-pricing";
import {
  ALACARTE_SKUS,
  CHAPEL_SKUS,
  EMBALMING_EXTRA_DAY_SKU,
  coffinSku,
  embalmingDaySku,
} from "@/lib/catalogue-skus";

/**
 * The 2026 price list must be SEEN and SELLABLE, not just stored: these render
 * tests walk the exact components /products and /services mount and assert that
 * every figure the client's sheets carry actually reaches the markup AND that
 * every line carries the two real actions (Add to cart with the exact catalogue
 * SKU/price, or the prefilled request). tests/unit/villa-pricing.test.ts pins
 * the transcribed numbers; this file pins that they are published and clickable.
 *
 * next/link is stubbed (the views are server components; the harness has no app
 * router), so the pages below are the real page components otherwise.
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

const { default: ProductsPage } = await import("@/app/(public)/products/page");
const { default: ServicesPage } = await import("@/app/(public)/services/page");
const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: LotsPriceListPage } = await import(
  "@/app/(public)/lots/price-list-2026/page"
);
const { SENIOR_PAYMENTS, VMP_PAYMENTS, CASH_ASSISTANCE, VMP_ELIGIBILITY, VMP_NOTES } =
  await import("@/lib/villa-pricing");
const { LOT_PRICE_CATEGORIES } = await import("@/lib/villa-pricing");
const { listCatalogItems } = await import("@/lib/api-client/commerce");

/** Every request link on the page, decoded into its params. */
function requestLinks(html: string): URLSearchParams[] {
  return [...html.matchAll(/href="\/contact\?([^"]+)"/g)].map(
    (m) => new URLSearchParams(m[1].replace(/&amp;/g, "&")),
  );
}

/** Request links indexed by the catalogue SKU they carry. */
function requestLinksBySku(html: string): Map<string, URLSearchParams> {
  const bySku = new Map<string, URLSearchParams>();
  for (const params of requestLinks(html)) {
    const sku = params.get("sku");
    if (sku && !bySku.has(sku)) bySku.set(sku, params);
  }
  return bySku;
}

/** Server pages that render cart buttons need the cart context wrapper. */
async function renderWithCart(page: ReactNode): Promise<string> {
  return renderToStaticMarkup(createElement(CartProvider, null, page));
}

describe("/products publishes the whole 2026 casket catalogue", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ProductsPage());
  });

  it("renders every model with its SRP, senior discount and discounted price", () => {
    for (const m of CASKET_MODELS) {
      expect(html, `${m.model} name`).toContain(m.model);
      expect(html, `${m.model} srp`).toContain(php(m.srp));
      expect(html, `${m.model} discount`).toContain(php(m.seniorDiscount));
      expect(html, `${m.model} discounted`).toContain(php(m.seniorPrice));
    }
    // The sheet's collection headers group the rows.
    for (const header of ["Lumina", "The White Rose Collection", "The Crown Collection", "The Dynasty Collection"]) {
      expect(html).toContain(header);
    }
  });

  it("no longer hides pricing behind 'contact the park office for pricing'", () => {
    expect(html).not.toMatch(/contact the park office for pricing/i);
    expect(html).toMatch(/published price/i);
  });

  it("gives every model an Add to cart (exact catalogue SKU) and a Request order link", () => {
    const bySku = requestLinksBySku(html);
    for (const m of CASKET_MODELS) {
      const sku = coffinSku(m.model);
      // Add to cart — the button announces the exact catalogue item.
      expect(html, `${m.model} add button`).toContain(
        `aria-label="Add ${m.model} casket to cart"`,
      );
      // Request order — prefilled with the exact SKU and the sheet's SRP.
      const request = bySku.get(sku);
      expect(request, `${m.model} request link`).toBeTruthy();
      expect(request!.get("item")).toContain(m.model);
      expect(request!.get("price")).toContain(php(m.srp));
    }
    expect(html).toContain("Request order");
  });

  it("keeps the tier photography treatment with the sheet's lid line", () => {
    for (const lid of ["Half-glass lid", "Full glass lid"]) {
      expect(html).toContain(lid);
    }
    expect(html).toMatch(/bronze-casket\.jpg/);
    expect(html).toMatch(/silver-casket\.jpg/);
    expect(html).toMatch(/gold-casket\.jpg/);
  });

  it("publishes sheet III's inclusion row and chapel day rates for every family", () => {
    for (const row of CASKET_INCLUSIONS) {
      expect(html, row.family).toContain(row.family);
      expect(html, `${row.family} common chapel`).toContain(
        `${php(row.commonChapelPerDay)} / day`,
      );
    }
    // The YES/NO cells are rendered as the sheet's own words.
    expect((html.match(/>YES</g) ?? []).length).toBe(
      CASKET_INCLUSIONS.reduce(
        (n, r) =>
          n +
          [r.flowers, r.tarp, r.lapida, r.familyCar, r.dozenRoses, r.thankYouCard].filter(Boolean)
            .length,
        0,
      ),
    );
    expect(html).toContain("1,000");
  });
});

describe("/services publishes the 2026 service rates as sellable lines", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
  });

  it("renders the embalming day table and the per-day rate beyond nine", () => {
    expect(html).toContain("Embalming — per day");
    for (const r of EMBALMING_RATES) {
      expect(html, `day ${r.days}`).toContain(php(r.amount));
    }
    expect(html).toMatch(/More than 9/);
    expect(html).toContain("+₱1,500 / day");
  });

  it("renders the five a-la-carte fees and the sheet's total", () => {
    for (const f of ALACARTE_SERVICE_FEES) {
      expect(html, f.service).toContain(f.service);
      expect(html, `${f.service} amount`).toContain(php(f.amount));
    }
    expect(html).toContain(php(19500));
    expect(html).toMatch(/If they will not get the package/);
  });

  it("renders the chapel table (common & private, regular & senior) with its notes", () => {
    for (const r of CHAPEL_RATES) {
      expect(html, `day ${r.days}`).toContain(php(r.common.ratePerDay));
      expect(html, `day ${r.days} common regular`).toContain(php(r.common.regular));
      expect(html, `day ${r.days} common senior`).toContain(php(r.common.senior));
      expect(html, `day ${r.days} private regular`).toContain(php(r.private.regular));
      expect(html, `day ${r.days} private senior`).toContain(php(r.private.senior));
    }
    expect(html).toContain("Chapel use");
    expect(html).toContain(CHAPEL_NOTES.miscFee);
    expect(html).toContain(CHAPEL_NOTES.seniorPerDay);
    expect(html).toContain(CHAPEL_NOTES.privateChapelOnly);
  });

  it("makes every service line actionable with its catalogue SKU and unit", () => {
    const bySku = requestLinksBySku(html);
    // Embalming per day: one catalogue entry per 3–9 day stay + the extra day.
    for (const r of EMBALMING_RATES) {
      const sku = embalmingDaySku(r.days);
      expect(html, `embalming ${r.days} add`).toContain(`aria-label="Add Embalming — ${r.days} days to cart"`);
      expect(bySku.get(sku)?.get("price"), `embalming ${r.days} request`).toContain(php(r.amount));
      expect(html).toContain(`${r.days} days`);
    }
    expect(html).toContain(`aria-label="Add Additional embalming day to cart"`);
    expect(bySku.get(EMBALMING_EXTRA_DAY_SKU)).toBeTruthy();
    // The five a-la-carte fees.
    for (const f of ALACARTE_SERVICE_FEES) {
      const sku = ALACARTE_SKUS[f.service];
      expect(html, `${f.service} add`).toContain(`aria-label="Add ${f.service} to cart"`);
      expect(bySku.get(sku)?.get("price"), `${f.service} request`).toContain(php(f.amount));
    }
    expect(html).toContain("per service");
  });

  it("sells the two chapel products per day and lets a whole stay be requested", () => {
    // The per-day products keep the Add to cart + Request order pair.
    expect(html).toContain('aria-label="Add Chapel use — common chapel, per day to cart"');
    expect(html).toContain('aria-label="Add Chapel use — private chapel, per day to cart"');
    expect(html).toContain("Request order");
    // Every 3–9 day row adds a whole stay (quantity = days) and can be requested.
    for (const r of CHAPEL_RATES) {
      expect(html, `common stay ${r.days}`).toContain(`Add common ${r.days} days`);
      expect(html, `private stay ${r.days}`).toContain(`Add private ${r.days} days`);
    }
    expect(html).toContain("Request this stay");
    // The two per-day products' card requests carry the sheet's own per-day rate.
    const bySku = requestLinksBySku(html);
    expect(bySku.get(CHAPEL_SKUS.common)?.get("price")).toContain(
      php(CHAPEL_RATES[0].common.ratePerDay),
    );
    expect(bySku.get(CHAPEL_SKUS.private)?.get("price")).toContain(
      php(CHAPEL_RATES[0].private.ratePerDay),
    );
    const stays = requestLinks(html).filter((p) => p.get("note")?.includes("Chapel use"));
    expect(stays.length).toBeGreaterThanOrEqual(CHAPEL_RATES.length);
  });

  it("keeps the existing service cards and links", () => {
    expect(html).toContain("Death at home");
    expect(html).toContain("Death at hospital");
    expect(html).toContain("/services/death-at-home");
    expect(html).toContain("/plans");
  });
});

describe("the plan payment tables render on every plan surface", () => {
  it("renders all five tiers × four terms, regular and senior", () => {
    const regular = renderToStaticMarkup(<PlanPaymentTable rows={VMP_PAYMENTS} />);
    const senior = renderToStaticMarkup(<PlanPaymentTable rows={SENIOR_PAYMENTS} senior />);
    for (const tier of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(regular).toContain(tier);
      expect(senior).toContain(tier);
    }
    for (const rows of [VMP_PAYMENTS, SENIOR_PAYMENTS]) {
      for (const row of rows) {
        for (const amount of [row.bronze1, row.bronze2, row.silver1, row.silver2, row.gold]) {
          expect(regular + senior).toContain(php(amount));
        }
      }
    }
    for (const mode of ["Monthly", "Quarterly", "Semi-annual", "Annual"]) {
      expect(regular).toContain(mode);
    }
  });

  it("makes every tier × term cell a prefilled request (the cart only prices monthly)", () => {
    const html = renderToStaticMarkup(<PlanPaymentTable rows={VMP_PAYMENTS} />);
    expect(html).toContain("price-request-link");
    const links = requestLinks(html);
    // 4 payment modes × 5 tiers.
    expect(links.length).toBe(VMP_PAYMENTS.length * 5);
    const monthlyGold = links.find(
      (p) => p.get("item") === "Gold plan — Monthly",
    );
    expect(monthlyGold).toBeTruthy();
    const monthlyRow = VMP_PAYMENTS.find((r) => r.mode === "Monthly")!;
    expect(monthlyGold!.get("price")).toContain(php(monthlyRow.gold));
    // A different term carries that term's own sheet amount, not the monthly one.
    const annualGold = links.find((p) => p.get("item") === "Gold plan — Annual");
    const annualRow = VMP_PAYMENTS.find((r) => r.mode === "Annual")!;
    expect(annualGold!.get("price")).toContain(php(annualRow.gold));
    expect(annualGold!.get("price")).not.toBe(monthlyGold!.get("price"));
    expect(monthlyGold!.get("note")).toMatch(/Villa Memorial Plan enquiry/);
    // The senior table names the eligibility condition.
    const seniorHtml = renderToStaticMarkup(
      <PlanPaymentTable rows={SENIOR_PAYMENTS} senior />,
    );
    const seniorGold = requestLinks(seniorHtml).find(
      (p) => p.get("item") === "Gold plan — Monthly",
    );
    expect(seniorGold!.get("note")).toMatch(/Senior-citizen rates/);
  });

  it("/plans itself prints both schedules, cash assistance, eligibility and the notes", async () => {
    const ui = await PlansPage({ searchParams: Promise.resolve({}) });
    // The catalog cards mount the real add-to-cart control, which needs the cart
    // context (same wrapper the cart render tests use).
    const html = renderToStaticMarkup(createElement(CartProvider, null, ui));
    for (const rows of [VMP_PAYMENTS, SENIOR_PAYMENTS]) {
      for (const row of rows) {
        expect(html).toContain(row.mode);
        expect(html).toContain(php(row.bronze1));
        expect(html).toContain(php(row.gold));
      }
    }
    for (const c of CASH_ASSISTANCE) {
      // React escapes the sheet's ampersand in "Bronze 1 & 2".
      expect(html).toContain(c.tiers.replace(/&/g, "&amp;"));
      expect(html).toContain(php(c.amount));
    }
    for (const e of VMP_ELIGIBILITY) expect(html).toContain(e);
    expect(html).toContain(VMP_NOTES.contestability);
    expect(html).toContain(VMP_NOTES.assign);
    expect(html).toContain("2026 payment schedules");
  });

  it("/plans cards every catalogue item with Add to cart AND Request order", async () => {
    const items = await listCatalogItems();
    const ui = await PlansPage({ searchParams: Promise.resolve({}) });
    const html = renderToStaticMarkup(createElement(CartProvider, null, ui));
    const bySku = requestLinksBySku(html);
    for (const item of items) {
      // React escapes the sheet's ampersand in "Lights & Sound Setup".
      const name = item.name.replace(/&/g, "&amp;");
      expect(html, `${item.sku} add button`).toContain(
        `aria-label="Add ${name} to cart"`,
      );
      const request = bySku.get(item.sku);
      expect(request, `${item.sku} request link`).toBeTruthy();
      expect(request!.get("item")).toBe(item.name);
      expect(request!.get("price")).toBe(item.display_price);
    }
    expect(html).toContain("Request order");
    expect(html).toContain("View this item");
  });
});

describe("/lots/price-list-2026 makes every lot row a request, never a cart line", () => {
  const html = renderToStaticMarkup(<LotsPriceListPage />);

  it("keeps every 2026 lot figure the client's sheet prints", () => {
    for (const cat of LOT_PRICE_CATEGORIES) {
      expect(html).toContain(cat.title);
      for (const r of cat.rows) {
        expect(html, `${cat.title} · ${r.product}`).toContain(r.product);
        expect(html).toContain(php(r.regular.selling));
        expect(html).toContain(php(r.senior.selling));
        expect(html).toContain(php(r.regular.monthly));
      }
    }
  });

  it("offers Request this lot with the category and price, plus a map link", () => {
    expect((html.match(/Request this lot/g) ?? []).length).toBe(
      LOT_PRICE_CATEGORIES.reduce((n, cat) => n + cat.rows.length, 0),
    );
    const links = requestLinks(html);
    expect(links.length).toBe(LOT_PRICE_CATEGORIES.reduce((n, cat) => n + cat.rows.length, 0));
    for (const link of links) {
      expect(link.get("item")).toBeTruthy();
      expect(link.get("price")).toMatch(/selling price/);
      expect(link.get("note")).toMatch(/does not reserve it/);
    }
    expect(html).toContain("See it on the map");
    expect(html).toContain('href="/map"');
    // Lots are NOT cart items: no Add-to-cart control on this page.
    expect(html).not.toContain("Add to cart");
  });
});

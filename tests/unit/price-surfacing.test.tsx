import { beforeAll, describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_INCLUSIONS,
  CASKET_MODELS,
  CHAPEL_RATES,
  COFFINS,
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

// These tests pin the recorded seed: point the pricing store at a path that does
// not exist, so a developer's local .data/commerce-pricing.json cannot leak in.
process.env.PRICING_STORE_PATH = path.join(os.tmpdir(), "villa-price-surfacing-no-store.json");

const { default: ProductsPage } = await import("@/app/(public)/products/page");
const { default: ServicesPage } = await import("@/app/(public)/services/page");
const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: PriceListPage } = await import("@/app/(public)/price-list/page");
const { default: LotsPriceListPage } = await import(
  "@/app/(public)/lots/price-list-2026/page"
);
const { SENIOR_PAYMENTS, VMP_PAYMENTS, CASH_ASSISTANCE } = await import("@/lib/villa-pricing");
const { LOT_PRICE_CATEGORIES } = await import("@/lib/villa-pricing");
const { listCatalogItems } = await import("@/lib/api-client/commerce");
const { seedPageDocuments } = await import("@/lib/api-client/content-pages");
const { planContentFromDocument } = await import("@/lib/plan-content");

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

/** Every Request-for-Quote link on a page, decoded into its params. */
function quoteLinks(html: string): URLSearchParams[] {
  return [...html.matchAll(/href="\/quote\?([^"]+)"/g)].map(
    (m) => new URLSearchParams(m[1].replace(/&amp;/g, "&")),
  );
}

/** Quote links indexed by the catalogue SKU they carry. */
function quoteLinksBySku(html: string): Map<string, URLSearchParams> {
  const bySku = new Map<string, URLSearchParams>();
  for (const params of quoteLinks(html)) {
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
    html = await renderWithCart(await ProductsPage({ searchParams: Promise.resolve({}) }));
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
        `aria-label="Add to cart: ${m.model} casket"`,
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
    // 2026-09-19: the tier ledger shows the client's OWN 2026 photographs
    // (lib/villa-pricing.ts TIER_PHOTOS), not the sheet's 300-550 px crops.
    for (const tier of COFFINS) {
      expect(html, `${tier.tier} photograph`).toContain(tier.photo);
    }
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

describe("/services offers a Request for Quote instead of a service price", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
  });

  it("renders no price for any funeral service", () => {
    // Request-for-Quote (captain's minutes 2026-09-21, item 5): the page is not
    // a price list. The a-la-carte, embalming and chapel figures live with the
    // office now.
    for (const f of ALACARTE_SERVICE_FEES) {
      expect(html, `${f.service} amount`).not.toContain(php(f.amount));
    }
    expect(html).not.toContain(php(19500));
    for (const r of EMBALMING_RATES) {
      expect(html, `embalming day ${r.days}`).not.toContain(php(r.amount));
    }
    expect(html).not.toContain(php(1500));
    for (const chapelClass of ["common", "private"] as const) {
      expect(html, `${chapelClass} per day`).not.toContain(
        php(CHAPEL_RATES[0][chapelClass].ratePerDay),
      );
      expect(html, `${chapelClass} 3-day regular`).not.toContain(
        php(CHAPEL_RATES[0][chapelClass].regular),
      );
      expect(html, `${chapelClass} 3-day senior`).not.toContain(
        php(CHAPEL_RATES[0][chapelClass].senior),
      );
    }
    // Nothing priced at all remains on the page.
    expect(html).not.toMatch(/₱/);
    expect(html).not.toContain("Add to cart");
    expect(html).not.toContain("Request order");
  });

  it("keeps every service name and the day ladder", () => {
    for (const f of ALACARTE_SERVICE_FEES) {
      expect(html, f.service).toContain(f.service);
    }
    expect(html).toContain("Services we provide");
    expect(html).toContain("Embalming — quoted by the day");
    expect(html).toContain("Chapel — ask us for dates and a quote");
    expect(html).toContain("How many days will the viewing be open?");
    expect(html).toMatch(/More than 9/);
  });

  it("offers one Request-for-Quote action per line, day count and chapel", () => {
    const bySku = quoteLinksBySku(html);
    for (const f of ALACARTE_SERVICE_FEES) {
      const link = bySku.get(ALACARTE_SKUS[f.service]);
      expect(link, `${f.service} quote link`).toBeTruthy();
      expect(link!.get("item")).toBe(f.service);
    }
    for (const r of EMBALMING_RATES) {
      const link = bySku.get(embalmingDaySku(r.days));
      expect(link, `embalming ${r.days} quote`).toBeTruthy();
      expect(link!.get("item")).toContain(`${r.days} days`);
    }
    const extra = bySku.get(EMBALMING_EXTRA_DAY_SKU);
    expect(extra).toBeTruthy();
    expect(extra!.get("item")).toContain("beyond 9 days");
    for (const chapelClass of ["common", "private"] as const) {
      const link = bySku.get(CHAPEL_SKUS[chapelClass]);
      expect(link, `${chapelClass} chapel quote`).toBeTruthy();
      expect(link!.get("item")).toContain("Chapel use");
    }
    // The whole-set request exists, and no quote link carries a price.
    expect(quoteLinks(html).some((p) => p.get("item") === "At-need services — all five")).toBe(true);
    expect(quoteLinks(html).every((p) => p.get("price") === null)).toBe(true);
  });

  it("keeps the chapel cards' names, capacity and photos but no booking dialog", () => {
    expect((html.match(/class="story-chapel"/g) ?? []).length).toBe(2);
    expect(html).not.toContain("Check dates &amp; price");
    expect(html).not.toContain('aria-haspopup="dialog"');
  });

  it("no longer lists the service guide cards on /services (captain 2026-09-21)", () => {
    // The three guide routes remain, but the section that listed them left the
    // service page.
    expect(html).not.toContain('id="guides"');
    expect(html).not.toContain("/services/death-at-home");
    expect(html).not.toContain("/services/death-at-hospital");
    // Assert the ROUTE, not the bare word. `not.toContain("/transport")` was a
    // false positive waiting to happen: it also matches a media filename, and on
    // 2026-09-27 the Delivery service card began rendering
    // `/media/composition/thumbs/transport-960.webp` — a picture, not a link.
    expect(html).not.toContain('href="/transport"');
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

  it("/plans prints the five tier checklists; /price-list prints the schedules, cash assistance, eligibility and the notes", async () => {
    const plans = seedPageDocuments().find((doc) => doc.key === "plans")!;
    const content = planContentFromDocument(plans);
    const planHtml = renderToStaticMarkup(
      createElement(CartProvider, null, await PlansPage()),
    );
    for (const tier of content.tiers) expect(planHtml).toContain(tier.heading);
    expect(planHtml).toContain("The five tiers — what each one includes");
    // The 2026 payment tables left the tier page (captain, 2026-09-21).
    expect(planHtml).not.toContain("2026 rates — five tiers, four payment terms");

    const html = renderToStaticMarkup(
      createElement(CartProvider, null, await PriceListPage()),
    );
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
    // Eligibility and the notes are the plans document's own content (Phase 2).
    for (const e of content.eligibility) expect(html).toContain(e);
    expect(html).toContain(content.notes.contestability);
    expect(html).toContain(content.notes.assign);
  });

  it("/plans shows the five tiers and no longer cards the service catalogue", async () => {
    const items = await listCatalogItems();
    const html = renderToStaticMarkup(
      createElement(CartProvider, null, await PlansPage()),
    );
    // The captain's Phase-2 direction: the mixed 42-item catalogue left this
    // page. Services and caskets (add-ons) belong to /services and /products.
    const services = items.filter((item) => item.item_type === "service" || item.item_type === "add_on");
    for (const item of services) {
      expect(html, `${item.sku} must not be on /plans`).not.toContain(
        `aria-label="Add to cart: ${item.name.replace(/&/g, "&amp;")}"`,
      );
    }
    // The five client tiers render, one checklist each.
    for (const tier of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html, tier).toContain(tier);
    }
    expect(html).toContain("The five tiers — what each one includes");
    // The hero's trimmed chips (captain, 2026-09-21): only View packages and
    // Coffins & caskets remain; the four retired chips are gone.
    expect(html).toContain('href="/plans/PKG-BASIC">View packages</a>');
    expect(html).toContain('href="/products">Coffins &amp; caskets</a>');
    expect(html).not.toContain("2026 plan payments");
    expect(html).not.toContain('href="/plans/compare"');
    expect(html).not.toContain('href="/plans/senior-benefits"');
    expect(html).not.toContain('href="/plans/villa-memorial-plan"');
  });
});

describe("/lots/price-list-2026 makes every lot row a request, never a cart line", () => {
  let html: string;

  beforeAll(async () => {
    html = renderToStaticMarkup(await LotsPriceListPage());
  });

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

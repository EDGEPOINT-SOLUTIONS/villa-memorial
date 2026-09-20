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

describe("/services publishes the 2026 service rates as sellable lines", () => {
  let html: string;

  beforeAll(async () => {
    html = await renderWithCart(await ServicesPage());
  });

  it("renders the embalming day counts and the per-day rate beyond nine", () => {
    expect(html).toContain("Embalming — priced by the day");
    for (const r of EMBALMING_RATES) {
      expect(html, `day ${r.days}`).toContain(php(r.amount));
    }
    expect(html).toMatch(/More than 9/);
    expect(html).toContain("+₱1,500");
    expect(requestLinksBySku(html).get(EMBALMING_EXTRA_DAY_SKU)?.get("price")).toContain(
      "₱1,500 / day",
    );
  });

  it("renders the five a-la-carte fees and the sheet's total", () => {
    for (const f of ALACARTE_SERVICE_FEES) {
      expect(html, f.service).toContain(f.service);
      expect(html, `${f.service} amount`).toContain(php(f.amount));
    }
    expect(html).toContain(php(19500));
    expect(html).toMatch(/If they will not get the package/);
  });

  it("keeps the chapel cards' rates and drops the full schedule with its notes", () => {
    // The cards keep the sheet's per-day rate and the 3-day regular/senior
    // example; the full 3–9 day schedule and the senior-rate/fee notes left the
    // section (captain 2026-09-21).
    for (const chapelClass of ["common", "private"] as const) {
      expect(html, `${chapelClass} per day`).toContain(
        php(CHAPEL_RATES[0][chapelClass].ratePerDay),
      );
      const threeDay = CHAPEL_RATES[0][chapelClass];
      expect(html, `${chapelClass} 3-day regular`).toContain(php(threeDay.regular));
      expect(html, `${chapelClass} 3-day senior`).toContain(php(threeDay.senior));
    }
    // Both chapels are sellable requests, decoded from their contact links.
    expect(
      requestLinks(html).some((p) => p.get("item")?.startsWith("Chapel use")),
    ).toBe(true);
    expect(html).not.toContain('id="chapel-stays"');
    expect(html).not.toContain("See every stay");
    expect(html).not.toContain("Senior rate:");
  });

  it("makes every service line actionable with its catalogue SKU and unit", () => {
    const bySku = requestLinksBySku(html);
    // Embalming per day: one catalogue entry per 3–9 day stay + the extra day.
    for (const r of EMBALMING_RATES) {
      const sku = embalmingDaySku(r.days);
      expect(html, `embalming ${r.days} add`).toContain(`aria-label="Add ${r.days} days: Embalming — ${r.days} days"`);
      expect(bySku.get(sku)?.get("price"), `embalming ${r.days} request`).toContain(php(r.amount));
      expect(html).toContain(`${r.days} days`);
    }
    expect(html).toContain(`aria-label="Add to cart: Additional embalming day"`);
    expect(bySku.get(EMBALMING_EXTRA_DAY_SKU)).toBeTruthy();
    // The five a-la-carte fees.
    for (const f of ALACARTE_SERVICE_FEES) {
      const sku = ALACARTE_SKUS[f.service];
      expect(html, `${f.service} add`).toContain(`aria-label="Add to cart: ${f.service}"`);
      expect(bySku.get(sku)?.get("price"), `${f.service} request`).toContain(php(f.amount));
    }
    expect(html).toContain("per service");
  });

  it("opens the chapel booking step (never a straight add) and keeps the request path", () => {
    // A chapel is not a one-click product: each card's “Check dates & price” is
    // a dialog trigger. The full 3–9 day row schedule left the section (captain
    // 2026-09-21), so the two cards are the booking entry points.
    expect((html.match(/Check dates &amp; price/g) ?? []).length).toBe(2);
    expect((html.match(/aria-haspopup="dialog"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // None of them is the old straight Add-to-cart control.
    expect(html).not.toContain('aria-label="Add to cart: Chapel use — common chapel, per day"');
    expect(html).not.toContain('aria-label="Add to cart: Chapel use — private chapel, per day"');
    expect(html).toContain("Request order");
    // The two per-day products' card requests carry the sheet's own per-day rate.
    const bySku = requestLinksBySku(html);
    expect(bySku.get(CHAPEL_SKUS.common)?.get("price")).toContain(
      php(CHAPEL_RATES[0].common.ratePerDay),
    );
    expect(bySku.get(CHAPEL_SKUS.private)?.get("price")).toContain(
      php(CHAPEL_RATES[0].private.ratePerDay),
    );
  });

  it("no longer lists the service guide cards on /services (captain 2026-09-21)", () => {
    // The three guide routes remain, but the section that listed them left the
    // service page.
    expect(html).not.toContain('id="guides"');
    expect(html).not.toContain("/services/death-at-home");
    expect(html).not.toContain("/services/death-at-hospital");
    expect(html).not.toContain("/transport");
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

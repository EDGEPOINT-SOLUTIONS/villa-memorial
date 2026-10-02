import { beforeAll, describe, expect, it, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import {
  ALACARTE_SERVICE_FEES,
  CASKET_MODELS,
  CHAPEL_RATES,
  COFFINS,
  EMBALMING_RATES,
  php,
} from "@/lib/villa-pricing";
import { coffinSku } from "@/lib/catalogue-skus";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * The 2026 price list must be SEEN and SELLABLE, not just stored: these render
 * tests walk the exact components /products and /services mount and assert that
 * every figure the client's sheets carry actually reaches the markup AND that
 * every priced line carries the two real actions (Add to cart with the exact catalogue
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
  // The public request capture (/contact) AND the family plan/lot gate
  // (/client/ask) carry the same item/sku/price/note intent — walk both.
  return [...html.matchAll(/href="\/(?:contact|client\/ask)\?([^"]+)"/g)].map(
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
/** Server pages that render cart buttons need the cart context wrapper. */
async function renderWithCart(page: ReactNode): Promise<string> {
  return renderToStaticMarkup(withBaskets( page));
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
    expect(html).toMatch(/with its price/i);
  });

  it("gives every model an Add to cart (exact catalogue SKU) and a Request order link", () => {
    const bySku = requestLinksBySku(html);
    for (const m of CASKET_MODELS) {
      const sku = coffinSku(m.model);
      // Add to cart — a casket has a published price, so it belongs to the cart
      // (the quote basket takes the quote-only lines). The button announces the
      // exact catalogue item.
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
    // The products page's reference blocks (the five-tier ledger and the
    // inclusions table) are retired (captain, 2026-09-30): the casket listing is
    // the page. The inclusion data itself stays pinned by the component's own
    // tests, so this page-level surface no longer prints it.
    expect(html).not.toContain("Chapel days");
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
    expect(html).not.toContain("Add to quote");
    expect(html).not.toContain("Request order");
  });

  it("keeps every service name and the day ladder", () => {
    for (const f of ALACARTE_SERVICE_FEES) {
      expect(html, f.service).toContain(f.service);
    }
    expect(html).toContain("Embalming — quoted by the day");
    expect(html).toContain("Two rooms for your dates");
    expect(html).toContain("How many days will the viewing be open?");
    expect(html).toMatch(/More than 9/);
  });

  it("offers one Add-to-Quote action per line, day count and chapel", () => {
    // The per-line actions are BASKET BUTTONS now (office, inbox 047): each adds
    // its line to the quote basket, so there are no /quote? per-item links left
    // to parse. The accessible name is the contract (the SKU rides the client
    // call, pinned by the source the button reads: ALACARTE_LINES /
    // embalmingDaySku / CHAPEL_SKUS).
    for (const f of ALACARTE_SERVICE_FEES) {
      expect(html, `${f.service} add action`).toContain(
        `aria-label="Add to Quote: ${f.service}"`,
      );
    }
    for (const r of EMBALMING_RATES) {
      expect(html, `embalming ${r.days} add action`).toContain(
        `aria-label="Add to Quote: Embalming — ${r.days} days"`,
      );
    }
    expect(html).toContain('aria-label="Add to Quote: Embalming — beyond 9 days"');
    // The chapel card's action is the real booking step (captain D5-A), so it is
    // a dialog trigger named "Ask for dates", not a one-click basket add.
    expect((html.match(/aria-label="Ask for dates: /g) ?? []).length).toBe(2);
    expect(html).not.toContain('aria-label="Add to Quote: Chapel use');
    // The centred action adds all five lines, and nothing publishes a figure.
    expect(html).toContain('aria-label="Add all five to Quote: At-need services — all five"');
    expect(html).not.toMatch(/₱/);
  });

  it("keeps the chapel cards' names, capacity and photos and re-links the booking step (D5-A)", () => {
    expect((html.match(/class="sv-room"/g) ?? []).length).toBe(2);
    expect(html).not.toContain("Check dates &amp; price");
    // The booking dialog is a closed trigger here, so no figures render yet —
    // but the step IS wired again (captain D5-A).
    expect((html.match(/aria-haspopup="dialog"/g) ?? []).length).toBe(2);
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

  it("/plans prints the five tier columns; /price-list prints the schedules, cash assistance, eligibility and the notes", async () => {
    const plans = seedPageDocuments().find((doc) => doc.key === "plans")!;
    const content = planContentFromDocument(plans);
    const planHtml = renderToStaticMarkup(
      withBaskets( await PlansPage()),
    );
    for (const tier of content.tiers) expect(planHtml).toContain(tier.heading);
    expect(planHtml).toContain("Compare the five tiers");
    // The 2026 payment tables left the tier page (captain, 2026-09-21).
    expect(planHtml).not.toContain("2026 rates — five tiers, four payment terms");

    const html = renderToStaticMarkup(
      withBaskets( await PriceListPage()),
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
      withBaskets( await PlansPage()),
    );
    // The captain's Phase-2 direction: the mixed 42-item catalogue left this
    // page. Services and caskets (add-ons) belong to /services and /products.
    const services = items.filter((item) => item.item_type === "service" || item.item_type === "add_on");
    for (const item of services) {
      expect(html, `${item.sku} must not be on /plans`).not.toContain(
        `aria-label="Add to cart: ${item.name.replace(/&/g, "&amp;")}"`,
      );
    }
    // The five client tiers render, one column each.
    for (const tier of ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"]) {
      expect(html, tier).toContain(tier);
    }
    expect(html).toContain("Compare the five tiers");
    // The hero's trimmed chips (captain, 2026-09-21): only View packages and
    // Coffins & caskets remain; the four retired chips are gone.
    expect(html).toContain('href="/plans/packages">View packages</a>');
    expect(html).toContain('href="/products">Coffins &amp; caskets</a>');
    expect(html).not.toContain("2026 plan payments");
    expect(html).not.toContain('href="/plans/compare"');
    expect(html).not.toContain('href="/plans/senior-benefits"');
    expect(html).not.toContain('href="/plans/villa-memorial-plan"');
  });
});

describe("/lots/price-list-2026 opens every lot row at the family ask gate", () => {
  let html: string;

  beforeAll(async () => {
    // The page's rows no longer join the public quote basket (a lot inquiry needs
    // a family account since 2026-10-02); the rendered links are the family gate.
    html = renderToStaticMarkup(
      withBaskets( await LotsPriceListPage()),
    );
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

  it("asks about every 2026 lot row through the family gate, with a map link", () => {
    const rows = LOT_PRICE_CATEGORIES.reduce((n, cat) => n + cat.rows.length, 0);
    // The captain's wording is exact: one "Ask about this lot" per row (2026-10-02).
    expect((html.match(/Ask about this lot/g) ?? []).length).toBe(rows);
    // No lot joins the public quote basket any more — lot inquiries need an account.
    expect(html).not.toContain("Add to quote");
    const links = requestLinks(html).filter(
      (params) => params.get("kind") === "lot" && /selling price/.test(params.get("price") ?? ""),
    );
    expect(links.length).toBe(rows);
    for (const link of links) {
      expect(link.get("item")).toBeTruthy();
      expect(link.get("price")).toMatch(/selling price/);
      expect(link.get("note")).toMatch(/does not reserve it/);
      expect(link.get("amount")).toBeTruthy();
    }
    expect(html).toContain("See it on the map");
    expect(html).toContain('href="/map"');
  });
});

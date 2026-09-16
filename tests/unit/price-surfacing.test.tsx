import { describe, expect, it, vi } from "vitest";
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

/**
 * The 2026 price list must be SEEN, not just stored: these render tests walk the
 * exact components /products and /services mount and assert that every figure the
 * client's sheets carry actually reaches the markup. tests/unit/villa-pricing.test.ts
 * pins the transcribed numbers; this file pins that they are published.
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
const { SENIOR_PAYMENTS, VMP_PAYMENTS, CASH_ASSISTANCE, VMP_ELIGIBILITY, VMP_NOTES } =
  await import("@/lib/villa-pricing");

describe("/products publishes the whole 2026 casket catalogue", () => {
  const html = renderToStaticMarkup(<ProductsPage />);

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

describe("/services publishes the 2026 service rates as the client's tables", () => {
  const html = renderToStaticMarkup(<ServicesPage />);

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

  it("keeps the existing service cards and links", () => {
    expect(html).toContain("Death at home");
    expect(html).toContain("Death at hospital");
    expect(html).toContain("/services/death-at-home");
    expect(html).toContain("/plans");
  });
});

describe("the plan payment tables render on every plan surface", () => {  it("renders all five tiers × four terms, regular and senior", () => {
    const regular = renderToStaticMarkup(<PlanPaymentTable rows={VMP_PAYMENTS} />);
    const senior = renderToStaticMarkup(<PlanPaymentTable rows={SENIOR_PAYMENTS} />);
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
});

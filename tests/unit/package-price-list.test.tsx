import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceList2026Module } from "@/app/(public)/plans/[sku]/price-list-2026-module";
import { LOT_PRICE_CATEGORIES } from "@/lib/villa-pricing";

/**
 * Render tests for the package page's prototype-exact 2026 price module
 * (docs/prototypes/villa-home-ui/package.html §"OFFICIAL 2026 PRICE LIST").
 * They pin the structure the captain reviewed: the four family tables with
 * their printed captions, the grouped two-row header, the term-highlight switch
 * and the senior toggle, and a `data-term` tag on every amortization cell so
 * the column highlight can never silently lose its target.
 */
describe("the package page's Official price list 2026 module", () => {
  const html = renderToStaticMarkup(<PriceList2026Module categories={LOT_PRICE_CATEGORIES} />);

  it("renders the prototype's price-module head + controls", () => {
    expect(html).toContain("Sanctuario de Mercedes y Gloria");
    expect(html).toContain("Official price list 2026");
    expect(html).toContain("Highlight amortization term");
    expect(html).toContain("Highlight senior-citizen rates");
    // The switch order and default are the prototype's: Annual … Monthly,
    // Monthly pressed on load.
    const switchOrder = ["Annual", "Semi-Annual", "Quarterly", "Monthly"];
    for (const label of switchOrder) expect(html).toContain(label);
    expect(html).toContain('aria-label="Highlight amortization term"');
    expect(html).toMatch(/data-term="monthly"[^>]*aria-pressed="true"/);
  });

  it("renders every family table under its printed caption", () => {
    expect(LOT_PRICE_CATEGORIES).toHaveLength(4);
    for (const cat of LOT_PRICE_CATEGORIES) {
      expect(html).toContain(`<caption>${cat.caption}</caption>`);
    }
  });

  it("renders the prototype's grouped two-row header", () => {
    expect(html).toContain("6 years amortization");
    expect(html).toContain("(Senior citizen) 6 years amortization");
    expect(html).toContain("Selling price");
    expect(html).toContain("Area (sqm)");
  });

  it("keeps data-term on every amortization cell (highlight targets)", () => {
    // (header row + body rows) × 4 terms × (regular + senior half), plus the
    // four data-term tags on the prototype's term-switch buttons.
    const expected = LOT_PRICE_CATEGORIES.reduce(
      (n, cat) => n + (cat.rows.length + 1) * 4 * 2,
      0,
    ) + 4;
    expect((html.match(/data-term="/g) ?? []).length).toBe(expected);
    // The monthly column opens highlighted; senior stays off until toggled.
    expect(html).toContain("is-term-hl");
    expect(html).not.toContain("is-senior-hl");
  });

  it("maps each term to the client's transcribed amount (quarterly → quarter)", () => {
    // Lot Only · Mausoleum, exactly as printed on PRICE LIST FOR 2026.
    expect(html).toContain(">1,073,000<");
    expect(html).toContain(">178,833<"); // annual
    expect(html).toContain(">92,993<"); // semi-annual
    expect(html).toContain(">48,285<"); // quarterly
    expect(html).toContain(">16,095<"); // monthly
    expect(html).toContain(">924,462<"); // senior selling
    expect(html).toContain(">13,867<"); // senior monthly
    expect(html).toContain(">24.00<"); // area as printed
  });

  it("credits the source sheet as the prototype does", () => {
    expect(html).toContain("Source: PRICE LIST FOR 2026 (Sanctuario de Mercedes y Gloria)");
    expect(html).toContain("reproduced exactly");
  });
});

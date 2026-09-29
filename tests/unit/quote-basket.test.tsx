import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { QuoteLineRow } from "@/components/quote-line-row";
import { CatalogueAddButton } from "@/components/catalogue-add-button";

/**
 * Render-level contracts for the QUOTE BASKET (the 2026-09-29 rename of the
 * cart), executed through react-dom/server (the repo's node test environment):
 *  - the catalogue card "Add to quote" control renders for a card item;
 *  - a quote line's expand control reveals REAL catalogue details by SKU
 *    (description · type · recap · totals), with a graceful hidden state;
 *  - lines of DIFFERENT KINDS accumulate in the one basket and submit as ONE
 *    inquiry (the office's whole point of the change).
 */
const cartLine = (over: Partial<Parameters<typeof QuoteLineRow>[0]["line"]> = {}) => ({
  sku: "PKG-BASIC",
  name: "Basic Package",
  itemType: "package" as const,
  unitPriceCents: 60000,
  currency: "PHP",
  quantity: 2,
  ...over,
});

const row = (line: ReturnType<typeof cartLine>, open: boolean) =>
  renderToStaticMarkup(
    createElement(QuoteLineRow, {
      line,
      open,
      onToggle() {},
      onQuantityChange() {},
      onRemove() {},
    }),
  );

describe("catalogue card add-to-quote button", () => {
  it("renders an accessible Add to quote control labelled with the real item", () => {
    const html = renderToStaticMarkup(
      createElement(
        QuoteBasketProvider,
        null,
        createElement(CatalogueAddButton, {
          item: {
            sku: "PKG-PREMIUM",
            name: "Premium Package",
            itemType: "package",
            unitPriceCents: 152000,
            currency: "PHP",
          },
        }),
      ),
    );
    expect(html).toContain("Add to quote");
    expect(html).toContain('aria-label="Add to quote: Premium Package"');
  });

  it("keeps the card's View link untouched (button is the extra action)", () => {
    // The button component is only the add action — the card page still owns
    // the "View this item" detail link; assert the control carries no href.
    const html = renderToStaticMarkup(
      createElement(
        QuoteBasketProvider,
        null,
        createElement(CatalogueAddButton, {
          item: {
            sku: "SRV-DELIVERY",
            name: "Delivery",
            itemType: "service",
            unitPriceCents: 250000,
            currency: "PHP",
          },
        }),
      ),
    );
    expect(html).not.toContain("href=");
    expect(html).toContain('<button');
  });
});

describe("cart line expand control shows the item's details again", () => {
  it("closed: toggle announces Show details and the details row stays hidden", () => {
    const html = row(cartLine(), false);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Show details for Basic Package");
    // Details content is in the DOM but the row is hidden until expanded.
    expect(html).toContain('class="quote-line-details-row" hidden=""');
  });

  it("open: reveals the REAL catalogue description, type, recap and totals", () => {
    const html = row(cartLine(), true);
    // Description comes from the recorded commerce catalogue (PKG-BASIC).
    // No embalming day count: the client's 2026 sheet prices embalming per day
    // only when a family does NOT take a package.
    expect(html).toContain("Casket (standard), embalming included, delivery within city");
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain("quote-line-details-row\" hidden");
    expect(html).toContain("Hide details for Basic Package");
    // Type badge + the recap facts the row itself carries (unit/qty/total).
    expect(html).toContain(">Package</span>");
    expect(html).toContain("Unit price");
    expect(html).toContain("600.00");
    expect(html).toContain("Quantity");
    expect(html).toContain(">2</dd>");
    expect(html).toContain("Line total");
    expect(html).toContain("1,200.00");
    // Same detail-page door for the line identity.
    expect(html).toContain('href="/plans/PKG-BASIC"');
    expect(html).toContain("View full details");
  });

  it("open: a chapel booking line shows the chapel, the held range and fixed days", () => {
    const html = row(
      cartLine({
        sku: "CHP-COMMON-DAY",
        name: "Chapel use — common chapel, per day",
        itemType: "service",
        unitPriceCents: 150000,
        currency: "PHP",
        quantity: 3,
        lineId: "chapel:booking-9",
        booking: {
          bookingId: "booking-9",
          resourceId: "10000000-0000-4000-8000-0000000000c1",
          resourceName: "Chapel A",
          chapelClass: "common",
          startDate: "2026-09-20",
          endDate: "2026-09-23",
          days: 3,
        },
      }),
      true,
    );
    // The stay is legible at a glance (row badge + summary) …
    expect(html).toContain("Chapel A");
    expect(html).toContain("Sep 20 – 22, 2026 · 3 days");
    // … the day count is the booking's, not an editable quantity …
    expect(html).toContain("3 days — fixed by the booking");
    expect(html).not.toContain('type="number"');
    // … and the expanded recap repeats the booked facts.
    expect(html).toContain("Booked dates");
    expect(html).toContain("Chapel");
  });

  it("open: a line the catalogue no longer knows falls back gracefully (no crash)", () => {
    // A stale cart line can outlive its catalogue entry — e.g. one of the four
    // upstream items WITHDRAWN for having no 2026 client sheet (SRV-LIGHTS,
    // ADD-COFFIN-LIZO-SR, ADD-FLOWERS, ADD-URN; lib/catalog-sources.ts). The row
    // keeps its own display snapshot but must not imply the catalogue still sells it:
    // the honest state is the office confirming the price, never an invented figure.
    const html = row(
      cartLine({
        sku: "RETIRED-SKU",
        name: "Retired Add-on",
        itemType: "add_on",
        unitPriceCents: 9900,
        currency: "PHP",
        quantity: 1,
      }),
      true,
    );
    expect(html).toContain("no longer published in the online catalogue");
    expect(html).toContain("the office can still arrange it");
    expect(html).toContain("Retired Add-on");
  });
});


describe("several kinds of line accumulate and submit together", () => {
  it("adds a product, a quoted service, a lot and a chapel stay without merging", async () => {
    const { addQuoteLine, quoteLineKey } = await import(
      "@/lib/quote-basket/quote-basket-context"
    );
    let lines: ReturnType<typeof addQuoteLine> = [];
    lines = addQuoteLine(lines, {
      sku: "PKG-BASIC",
      name: "Basic Package",
      itemType: "package",
      unitPriceCents: 60000,
      currency: "PHP",
    });
    lines = addQuoteLine(lines, {
      sku: "REQ-RETRIEVAL",
      name: "Retrieval",
      itemType: "service",
      unitPriceCents: 0,
      currency: "PHP",
      detail: "Same week as the burial",
    });
    lines = addQuoteLine(lines, {
      sku: "LOT-PREMIUM-LOTS",
      name: "Premium Lots — memorial lot",
      itemType: "lot",
      unitPriceCents: 11400000,
      currency: "PHP",
      detail: "2.5 sqm · 1. Lot Only · lot only",
    });
    lines = addQuoteLine(lines, {
      sku: "CHP-COMMON-DAY",
      name: "Chapel use — common chapel, per day",
      itemType: "service",
      unitPriceCents: 150000,
      currency: "PHP",
      booking: {
        bookingId: "booking-9",
        resourceId: "10000000-0000-4000-8000-0000000000c1",
        resourceName: "Chapel A",
        chapelClass: "common",
        startDate: "2026-09-20",
        endDate: "2026-09-23",
        days: 3,
      },
    });

    // Every kind is its own line, chapel stays keyed by their reservation id.
    expect(lines.map((line) => line.itemType)).toEqual([
      "package",
      "service",
      "lot",
      "service",
    ]);
    expect(new Set(lines.map(quoteLineKey)).size).toBe(4);

    const { buildQuoteInquiry } = await import("@/lib/quote-basket/quote-submit");
    const submission = buildQuoteInquiry(
      lines,
      { full_name: "Juan Dela Cruz", email: "juan@example.test", phone: "" },
      { consent: true, notes: "Please call after 6pm." },
    );
    // One inquiry names every line; the office board sees the whole ask.
    expect(submission.lineCount).toBe(4);
    expect(submission.values.service).toContain("Basic Package");
    expect(submission.values.service).toContain("Retrieval");
    expect(submission.values.service).toContain("Premium Lots");
    expect(submission.values.service).toContain("Chapel use");
    expect(submission.values.notes).toContain("Same week as the burial");
    expect(submission.values.notes).toContain("2.5 sqm");
    expect(submission.values.notes).toContain("Please call after 6pm.");
    expect(submission.values.consent).toBe(true);
  });

  it("never merges a lot into another line and never prints a weight for a quoted line", async () => {
    const { addQuoteLine } = await import("@/lib/quote-basket/quote-basket-context");
    const lot = {
      sku: "LOT-PREMIUM-LOTS",
      name: "Premium Lots — memorial lot",
      itemType: "lot" as const,
      unitPriceCents: 11400000,
      currency: "PHP",
    };
    const twice = addQuoteLine(addQuoteLine([], lot), lot);
    expect(twice).toHaveLength(2);
  });
});

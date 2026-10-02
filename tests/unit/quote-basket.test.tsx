import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { QuoteLineRow } from "@/components/quote-line-row";
import { ItemQuoteButton } from "@/components/villa/item-quote-button";
import { quoteLineDescriptor, type QuoteLine } from "@/lib/quote-basket/quote-line";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}

/**
 * Render-level contracts for the QUOTE BASKET after the 2026-09-30 revisioning
 * (captain answers D3-A/D4-A/D6-A): every line is described by its own
 * descriptor and pricing mode, a quote-only line never prints a figure, and the
 * office receives a structured payload.
 */
const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  sku: "PKG-BASIC",
  name: "Basic Package",
  kind: "package",
  descriptor: quoteLineDescriptor("package"),
  pricing: { mode: "published", unitPriceCents: 60000, currency: "PHP" },
  quantity: 2,
  ...over,
});

const row = (value: QuoteLine, open: boolean) =>
  renderToStaticMarkup(
    createElement(QuoteLineRow, {
      line: value,
      open,
      onToggle() {},
      onQuantityChange() {},
      onRemove() {},
    }),
  );

describe("a quote line's expand control shows the item's details again", () => {
  it("closed: toggle announces Show details and the details pane stays hidden", () => {
    const html = row(line(), false);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Show details for Basic Package");
    expect(html).toContain('class="quote-line-details-row" hidden=""');
  });

  it("open: reveals the REAL catalogue description, type, recap and totals", () => {
    const html = row(line(), true);
    // Description comes from the recorded commerce catalogue (PKG-BASIC).
    expect(html).toContain("Casket (standard), embalming included, delivery within city");
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain('quote-line-details-row" hidden');
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
    expect(html).toContain('href="/plans/packages"');
    expect(html).toContain("View full details");
  });

  it("open: a chapel booking line shows the chapel, the held range and fixed days", () => {
    const html = row(
      line({
        sku: "CHP-COMMON-DAY",
        name: "Chapel use — common chapel, per day",
        kind: "chapel",
        descriptor: quoteLineDescriptor("chapel"),
        pricing: { mode: "on_request" },
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
    const html = row(
      line({
        sku: "RETIRED-SKU",
        name: "Retired Add-on",
        kind: "add_on",
        descriptor: quoteLineDescriptor("add_on"),
        pricing: { mode: "published", unitPriceCents: 9900, currency: "PHP" },
        quantity: 1,
      }),
      true,
    );
    expect(html).toContain("no longer published in the online catalogue");
    expect(html).toContain("the office can still arrange it");
    expect(html).toContain("Retired Add-on");
  });
});

describe("honest pricing (D3-A / D4-A)", () => {
  it("an on_request line prints the office-quotes label and NO figure or line total", () => {
    const html = row(
      line({
        sku: "SRV-RETRIEVAL",
        name: "Retrieval",
        kind: "service",
        descriptor: quoteLineDescriptor("service"),
        pricing: { mode: "on_request" },
        quantity: 1,
      }),
      false,
    );
    expect(html).toContain('data-pricing="on_request"');
    expect(html).toContain("To be quoted by the office");
    // No line-total fact and no peso figure anywhere on an on_request line.
    expect(html).not.toContain("Line total");
    expect(html).not.toMatch(/₱/);
    expect(html).not.toContain("2,500.00");
  });

  it("a published line prints its figure and a line total", () => {
    const html = row(
      line({
        sku: "LOT-MAUSOLEUM",
        name: "Mausoleum — memorial lot",
        kind: "lot",
        descriptor: quoteLineDescriptor("lot"),
        pricing: { mode: "published", unitPriceCents: 107300000, currency: "PHP" },
        quantity: 1,
      }),
      false,
    );
    expect(html).toContain('data-pricing="published"');
    expect(html).toContain("1,073,000.00");
    expect(html).toContain("Line total");
    expect(html).toContain("1 lot");
  });

  it("a new kind with no catalogue default still renders from its descriptor", () => {
    const html = row(
      line({
        sku: "KEEP-001",
        name: "Memorial keepsake",
        kind: "keepsake",
        descriptor: quoteLineDescriptor("keepsake", { label: "Keepsake" }),
        pricing: { mode: "on_request" },
        quantity: 1,
      }),
      false,
    );
    expect(html).toContain(">Keepsake</span>");
    expect(html).toContain("Memorial keepsake");
    expect(html).toContain("To be quoted by the office");
  });
});

describe("the add-to-quote controls build the flexible line", () => {
  it("the service control adds an on_request line (never a figure)", () => {
    const html = renderToStaticMarkup(
      withBaskets(
        createElement(ItemQuoteButton, {
          lines: [{ sku: "SRV-RETRIEVAL", name: "Retrieval", detail: "scope" }],
          name: "Retrieval",
          label: "Add to Quote",
        }),
      ),
    );
    // SSR renders the button, not the basket line; the contract is that the
    // control carries no price. The pure model is asserted below.
    expect(html).toContain("Add to Quote: Retrieval");
  });
});

describe("several kinds of line accumulate and submit together", () => {
  it("adds a quoted service, a lot and a chapel stay without merging", async () => {
    const { addQuoteLine, quoteLineKey } = await import(
      "@/lib/quote-basket/quote-basket-context"
    );
    let lines: QuoteLine[] = [];
    lines = addQuoteLine(lines, {
      sku: "REQ-RETRIEVAL",
      name: "Retrieval",
      kind: "service",
      descriptor: quoteLineDescriptor("service"),
      pricing: { mode: "on_request" },
      detail: "Same week as the burial",
    });
    lines = addQuoteLine(lines, {
      sku: "LOT-PREMIUM-LOTS",
      name: "Premium Lots — memorial lot",
      kind: "lot",
      descriptor: quoteLineDescriptor("lot"),
      pricing: { mode: "published", unitPriceCents: 11400000, currency: "PHP" },
      detail: "2.5 sqm · 1. Lot Only · lot only",
    });
    lines = addQuoteLine(lines, {
      sku: "CHP-COMMON-DAY",
      name: "Chapel use — common chapel, per day",
      kind: "chapel",
      descriptor: quoteLineDescriptor("chapel"),
      pricing: { mode: "on_request" },
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

    // Every kind is its own line, chapel stays keyed by reservation id.
    expect(lines.map((l) => l.kind)).toEqual(["service", "lot", "chapel"]);
    expect(new Set(lines.map(quoteLineKey)).size).toBe(3);

    const { buildQuoteInquiry } = await import("@/lib/quote-basket/quote-submit");
    const submission = buildQuoteInquiry(
      lines,
      { full_name: "Juan Dela Cruz", email: "juan@example.test", phone: "" },
      { consent: true, notes: "Please call after 6pm." },
    );
    expect(submission.lineCount).toBe(3);
    // A concise subject; the lines are structured (D6-A), not a blob.
    expect(submission.summary).toBe("Quote request — 3 items");
    expect(submission.lines).toHaveLength(3);
    expect(submission.lines[0]).toMatchObject({ sku: "REQ-RETRIEVAL", pricingMode: "on_request", unitPriceCents: null });
    expect(submission.lines[1]).toMatchObject({ sku: "LOT-PREMIUM-LOTS", pricingMode: "published", unitPriceCents: 11400000 });
    expect(submission.lines[2]).toMatchObject({ sku: "CHP-COMMON-DAY", pricingMode: "on_request", dateRange: "Sep 20 – 22, 2026 · 3 days" });
    // The family's own note travels alone; the lines are their own rows.
    expect(submission.values.notes).toBe("Please call after 6pm.");
    expect(submission.values.service).toBe("Quote request — 3 items");
    expect(submission.values.consent).toBe(true);
  });

  it("never merges a lot into another line", async () => {
    const { addQuoteLine } = await import("@/lib/quote-basket/quote-basket-context");
    const lot = {
      sku: "LOT-PREMIUM-LOTS",
      name: "Premium Lots — memorial lot",
      kind: "lot",
      descriptor: quoteLineDescriptor("lot"),
      pricing: { mode: "published" as const, unitPriceCents: 11400000, currency: "PHP" },
    };
    const twice = addQuoteLine(addQuoteLine([], lot), lot);
    expect(twice).toHaveLength(2);
  });

  it("THE RULE: a priced item lands in the cart, a quote-only item in the quote basket", async () => {
    const { addQuoteLine } = await import("@/lib/quote-basket/quote-basket-context");
    const { addCartLine } = await import("@/lib/cart/cart-context");
    const priced = {
      sku: "PKG-BASIC",
      name: "Basic Package",
      itemType: "package" as const,
      unitPriceCents: 60000,
      currency: "PHP",
    };
    const quoted = {
      sku: "REQ-RETRIEVAL",
      name: "Retrieval",
      itemType: "service" as const,
      unitPriceCents: 0,
      currency: "PHP",
    };
    const lot = {
      sku: "LOT-PREMIUM-LOTS",
      name: "Premium Lots — memorial lot",
      itemType: "lot" as const,
      unitPriceCents: 11400000,
      currency: "PHP",
    };

    // The cart takes the priced item and refuses the quote-only ones.
    expect(addCartLine([], priced)).toHaveLength(1);
    expect(addCartLine([], quoted)).toHaveLength(0);
    expect(addCartLine([], lot)).toHaveLength(0);

    // The quote basket takes the quote-only items and refuses the priced one.
    const quotedLine = {
      sku: "REQ-RETRIEVAL",
      name: "Retrieval",
      kind: "service",
      descriptor: quoteLineDescriptor("service"),
      pricing: { mode: "on_request" as const },
    };
    const lotLine = {
      sku: "LOT-PREMIUM-LOTS",
      name: "Premium Lots — memorial lot",
      kind: "lot",
      descriptor: quoteLineDescriptor("lot"),
      pricing: { mode: "published" as const, unitPriceCents: 11400000, currency: "PHP" },
    };
    const pricedLine = {
      sku: "PKG-BASIC",
      name: "Basic Package",
      kind: "package",
      descriptor: quoteLineDescriptor("package"),
      pricing: { mode: "published" as const, unitPriceCents: 60000, currency: "PHP" },
    };
    expect(addQuoteLine([], quotedLine)).toHaveLength(1);
    expect(addQuoteLine([], lotLine)).toHaveLength(1);
    expect(addQuoteLine([], pricedLine)).toHaveLength(0);

    // Neither basket holds the other's line.
    const cartLines = addCartLine([], priced);
    expect(addQuoteLine(cartLines as never, pricedLine)).toHaveLength(cartLines.length);
    const quoteLines = addQuoteLine([], lotLine);
    expect(addCartLine(quoteLines as never, lot)).toHaveLength(quoteLines.length);
  });
});

import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import {
  ChapelBookingButton,
  ChapelBookingDialog,
  type ChapelCatalogueItem,
} from "@/components/chapel-booking-dialog";
import { CHAPEL_NOTES } from "@/lib/villa-pricing";

/**
 * The chapel booking step's render contract, executed through
 * react-dom/server (the repo's node test environment):
 *  · the chapel action is a dialog trigger — never the old straight Add-to-cart;
 *  · the dialog lays out the three steps in the app's capture grammar and
 *    publishes the 2026 sheet figures and the ₱1,000 miscellaneous-fee note;
 *  · Add to quote stays disabled until the park's schedule confirms a free range
 *    (SSR state = no schedule yet), and the Request-order path stays beside it.
 */
const ITEMS: Record<"common" | "private", ChapelCatalogueItem> = {
  common: {
    sku: "CHP-COMMON-DAY",
    name: "Chapel use — common chapel, per day",
    itemType: "service",
    unitPriceCents: 150000,
    currency: "PHP",
  },
  private: {
    sku: "CHP-PRIVATE-DAY",
    name: "Chapel use — private chapel, per day",
    itemType: "service",
    unitPriceCents: 350000,
    currency: "PHP",
  },
};

describe("the chapel action", () => {
  it("is a dialog trigger, not an add-to-quote, and renders no closed dialog", () => {
    const html = renderToStaticMarkup(
      createElement(
        QuoteBasketProvider,
        null,
        createElement(ChapelBookingButton, {
          chapelClass: "common",
          days: 3,
          items: ITEMS,
          label: "Book common 3 days",
        }),
      ),
    );
    expect(html).toContain("Book common 3 days");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("Add to quote");
  });
});

describe("the booking dialog's steps", () => {
  it("lays out chapel, dates and price with the sheet's figures and fee note", () => {
    const html = renderToStaticMarkup(
      createElement(
        QuoteBasketProvider,
        null,
        createElement(ChapelBookingDialog, {
          open: true,
          onClose() {},
          initialChapelClass: "common",
          initialDays: 3,
          items: ITEMS,
        }),
      ),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Book chapel dates");
    expect(html).toContain("Choose the chapel");
    expect(html).toContain("Choose the dates");
    expect(html).toContain("Price for this range");
    // The common chapel's 2026 figures for the default 3-day stay, both columns.
    expect(html).toContain("₱1,500");
    expect(html).toContain("₱4,500");
    expect(html).toContain("₱4,320");
    // The sheet's own miscellaneous-fee note, and its senior-per-day scope
    // (single source: lib/villa-pricing.ts, compressed to the reading budget).
    expect(html).toContain(CHAPEL_NOTES.miscFee);
    expect(html).toContain("the office applies the senior rate");
    // Nothing can be added before the schedule confirms a free range.
    expect(html).toContain("Add to quote");
    expect(html).toContain('disabled=""');
    // The prefilled request stays available as the alternative.
    expect(html).toContain("Request order");
    expect(html).toContain("/contact?");
  });

  it("opens the private chapel's own per-day rate when the caller came from it", () => {
    const html = renderToStaticMarkup(
      createElement(
        QuoteBasketProvider,
        null,
        createElement(ChapelBookingDialog, {
          open: true,
          onClose() {},
          initialChapelClass: "private",
          initialDays: 9,
          items: ITEMS,
        }),
      ),
    );
    expect(html).toContain("₱3,500");
    expect(html).toContain("₱31,500");
    expect(html).toContain("₱30,240");
    expect(html).toContain("9 days");
  });
});

import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartLineRow } from "@/components/cart-line-row";
import { CatalogueAddButton } from "@/components/catalogue-add-button";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * Render-level contracts for the two cart/checkout UX additions, executed
 * through react-dom/server (the repo's node test environment):
 *  - the catalogue card "Add to cart" control renders for a card item;
 *  - the cart line expand control reveals REAL catalogue details by SKU
 *    (description · type · recap · totals), with a graceful hidden state.
 */
const cartLine = (over: Partial<Parameters<typeof CartLineRow>[0]["line"]> = {}) => ({
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
    createElement(CartLineRow, {
      line,
      open,
      onToggle() {},
      onQuantityChange() {},
      onRemove() {},
    }),
  );

describe("catalogue card add-to-cart button", () => {
  it("renders an accessible Add to cart control labelled with the real item", () => {
    const html = renderToStaticMarkup(
      withBaskets(
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
    expect(html).toContain("Add to cart");
    expect(html).toContain('aria-label="Add to cart: Premium Package"');
  });

  it("keeps the card's View link untouched (button is the extra action)", () => {
    // The button component is only the add action — the card page still owns
    // the "View this item" detail link; assert the control carries no href.
    const html = renderToStaticMarkup(
      withBaskets(
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
    expect(html).toContain('class="cart-line-details-row" hidden=""');
  });

  it("open: reveals the REAL catalogue description, type, recap and totals", () => {
    const html = row(cartLine(), true);
    // Description comes from the recorded commerce catalogue (PKG-BASIC).
    // No embalming day count: the client's 2026 sheet prices embalming per day
    // only when a family does NOT take a package.
    expect(html).toContain("Casket (standard), embalming included, delivery within city");
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain("cart-line-details-row\" hidden");
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

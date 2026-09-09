import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { CartLineRow } from "@/components/cart-line-row";
import { CatalogueAddButton } from "@/components/catalogue-add-button";

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
  unitPriceCents: 150000,
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
      createElement(
        CartProvider,
        null,
        createElement(CatalogueAddButton, {
          item: {
            sku: "PKG-PREMIUM",
            name: "Premium Package",
            itemType: "package",
            unitPriceCents: 520000,
            currency: "PHP",
          },
        }),
      ),
    );
    expect(html).toContain("Add to cart");
    expect(html).toContain('aria-label="Add Premium Package to cart"');
  });

  it("keeps the card's View link untouched (button is the extra action)", () => {
    // The button component is only the add action — the card page still owns
    // the "View this item" detail link; assert the control carries no href.
    const html = renderToStaticMarkup(
      createElement(
        CartProvider,
        null,
        createElement(CatalogueAddButton, {
          item: {
            sku: "SRV-DELIVERY",
            name: "Delivery & Pick-up",
            itemType: "service",
            unitPriceCents: 35000,
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
    // Description comes from the recorded commerce catalogue (PKG-BASIC seed).
    expect(html).toContain("Casket (standard), 1-day embalming, delivery within city");
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain("cart-line-details-row\" hidden");
    expect(html).toContain("Hide details for Basic Package");
    // Type badge + the recap facts the row itself carries (unit/qty/total).
    expect(html).toContain(">Package</span>");
    expect(html).toContain("Unit price");
    expect(html).toContain("1,500.00");
    expect(html).toContain("Quantity");
    expect(html).toContain(">2</dd>");
    expect(html).toContain("Line total");
    expect(html).toContain("3,000.00");
    // Same detail-page door for the line identity.
    expect(html).toContain('href="/plans/PKG-BASIC"');
    expect(html).toContain("View full details");
  });

  it("open: a service line with no published description shows the honest fallback", () => {
    const html = row(
      cartLine({
        sku: "SRV-INTERMENT",
        name: "Interment Service",
        itemType: "service",
        unitPriceCents: 120000,
        currency: "PHP",
        quantity: 1,
      }),
      true,
    );
    expect(html).toContain("No description is published for this service yet");
    expect(html).toContain("1,200.00");
  });

  it("open: a line the catalogue no longer knows falls back gracefully (no crash)", () => {
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
    expect(html).toContain("Catalogue details are no longer published for this line");
    expect(html).toContain("Retired Add-on");
  });
});

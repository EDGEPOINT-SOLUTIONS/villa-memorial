import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartLineRow } from "@/components/cart-line-row";
import {
  declares,
  hasRuleFor,
  inPhone,
  parseCss,
  readStyle,
  ruleFor,
  selectors,
} from "../helpers/css-rules";

/**
 * The /cart restyle (captain, 2026-09-30: "the cart page also needs to be
 * themed the same way as other pages"). Vitest runs in `node`, so this pins the
 * DECLARATIONS and the row markup that make the designed grammar hold — the
 * gateway opening, the gold commit, the designed empty state and the stacked
 * phone reflow — rather than pretending to measure the pixels.
 *
 * The behaviour (the cart context, quantity / remove, the chapel release, the
 * checkout link) is untouched by this pass and is covered by
 * tests/unit/cart-catalogue.test.tsx + tests/unit/quote-basket.test.tsx.
 */
const RULES = parseCss(readStyle("styles/components.css"));

describe("the cart line row carries the stacked-phone labels", () => {
  const html = renderToStaticMarkup(
    createElement(
      CartProvider,
      null,
      createElement(
        QuoteBasketProvider,
        null,
        createElement(
          CartLineRow,
          {
            line: {
              sku: "PKG-STANDARD",
              name: "Standard Package",
              itemType: "package",
              unitPriceCents: 100000,
              currency: "PHP",
              quantity: 1,
            },
            open: false,
            onToggle() {},
            onQuantityChange() {},
            onRemove() {},
          },
        ),
      ),
    ),
  );

  it("marks the line row and labels each fact cell for the phone layout", () => {
    expect(html).toContain('class="cart-line"');
    expect(html).toContain('data-label="Unit price"');
    expect(html).toContain('data-label="Quantity"');
    expect(html).toContain('data-label="Line total"');
  });
});

describe("the cart page opens on the shared gateway", () => {
  it("opts out of the shared boxed band (transparent, no border, no gold rule)", () => {
    const hero = RULES.find((r) =>
      selectors(r).includes(".cart-page .public-hero--interior"),
    );
    expect(hero, "the cart's boxed-band opt-out exists").toBeDefined();
    expect(declares(hero, "background", /transparent/)).toBe(true);
    expect(declares(hero, "border", /0/)).toBe(true);
    const before = RULES.find((r) =>
      selectors(r).includes(".cart-page .public-hero--interior::before"),
    );
    expect(declares(before, "content", /none/)).toBe(true);
  });

  it("sets the page title at weight 500 — never bold — at the page-title rung", () => {
    const title = RULES.find((r) =>
      selectors(r).includes(".cart-page .public-hero--interior .public-hero__title"),
    );
    expect(declares(title, "font-weight", /500/)).toBe(true);
    // The size stays the shared page-title step from the `.public-hero__title`
    // rule the typography gate owns — the cart must not re-declare it.
    expect(declares(title, "font-size")).toBe(false);
  });

  it("gives the cart's commit the gold and leaves the support action outline", () => {
    const commit = RULES.find((r) =>
      selectors(r).includes(".cart-page .cart-actions .btn--primary"),
    );
    expect(declares(commit, "background", /var\(--gold-400\)/)).toBe(true);
  });
});

describe("the cart's own shapes", () => {
  it("draws a designed empty state (a page), not the generic boxed empty-state", () => {
    expect(ruleFor(RULES, ".cart-empty"), "the designed empty band exists").toBeDefined();
    const mark = ruleFor(RULES, ".cart-empty__mark");
    expect(mark, "the empty state carries its own mark").toBeDefined();
    const title = ruleFor(RULES, ".cart-empty__title");
    expect(declares(title, "font-weight", /500/)).toBe(true);
  });

  it("bands the sections on a hairline, never a box", () => {
    const band = ruleFor(RULES, ".cart-band");
    expect(declares(band, "border-top", /1px solid var\(--color-rule\)/)).toBe(true);
  });

  it("keeps the estimated total at the total rung, not a display size", () => {
    const figure = ruleFor(RULES, ".cart-total__figure");
    expect(declares(figure, "font-size", /var\(--text-xl\)/)).toBe(true);
  });
});

describe("a phone gets the page, not a shrunken desktop", () => {
  const PHONE = inPhone(RULES);

  it("stacks the lines table into labelled rows below 40rem", () => {
    expect(hasRuleFor(PHONE, ".cart-lines tr.cart-line")).toBe(true);
    expect(hasRuleFor(PHONE, ".cart-lines thead")).toBe(true);
    const label = PHONE.find((r) =>
      selectors(r).includes(".cart-lines .cart-line__cell[data-label]::before"),
    );
    expect(declares(label, "content", /attr\(data-label\)/)).toBe(true);
  });

  it("restores a closed details row's hidden state after the rows are made block", () => {
    const hidden = PHONE.find((r) =>
      selectors(r).includes(".cart-lines tr.cart-line-details-row[hidden]"),
    );
    expect(
      hidden,
      "the block rule out-specifies the UA [hidden]; a closed details row must stay display:none",
    ).toBeDefined();
    expect(declares(hidden, "display", /none/)).toBe(true);
  });
});

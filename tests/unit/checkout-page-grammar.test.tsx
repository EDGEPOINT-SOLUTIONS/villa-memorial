import { describe, expect, it } from "vitest";
import {
  declares,
  inPhone,
  parseCss,
  readStyle,
  ruleFor,
  selectors,
} from "../helpers/css-rules";

/**
 * The /checkout restyle (captain, 2026-09-30: "and also the checkout page it
 * should be revised for it to follow how every other pages looks like. the forms
 * should be in the center also."). Vitest runs in `node`, so this pins the
 * DECLARATIONS that make the designed grammar hold — the gateway opening, the
 * centred single column, the gold commit, the designed empty state and the phone
 * reflow — rather than pretending to measure the pixels.
 *
 * The behaviour (the cart context, validation, the `POST /api/orders` payload,
 * the order-number redirect, the chapel-free priced cart) is untouched by this
 * pass and is covered by tests/unit/cart-catalogue.test.tsx,
 * tests/unit/order-store.test.ts and tests/unit/catalog-admin.test.ts.
 */
const RULES = parseCss(readStyle("styles/components.css"));
const PHONE = inPhone(RULES);

describe("the checkout page opens on the shared gateway", () => {
  it("opts out of the shared boxed band (transparent, no border, no gold rule)", () => {
    const hero = RULES.find((r) =>
      selectors(r).includes(".checkout-page .public-hero--interior"),
    );
    expect(hero, "the checkout's boxed-band opt-out exists").toBeDefined();
    expect(declares(hero, "background", /transparent/)).toBe(true);
    expect(declares(hero, "border", /0/)).toBe(true);
    const before = RULES.find((r) =>
      selectors(r).includes(".checkout-page .public-hero--interior::before"),
    );
    expect(declares(before, "content", /none/)).toBe(true);
  });

  it("sets the page title at weight 500 — never bold — and re-declares no size", () => {
    const title = RULES.find((r) =>
      selectors(r).includes(".checkout-page .public-hero--interior .public-hero__title"),
    );
    expect(declares(title, "font-weight", /500/)).toBe(true);
    // The size stays the shared page-title step from the `.public-hero__title`
    // rule the typography gate owns — checkout must not re-declare it.
    expect(declares(title, "font-size")).toBe(false);
  });

  it("centres the opening copy", () => {
    const inner = RULES.find((r) =>
      selectors(r).includes(".checkout-page .public-hero--interior .public-hero__inner"),
    );
    expect(declares(inner, "text-align", /center/)).toBe(true);
    const actions = RULES.find((r) =>
      selectors(r).includes(".checkout-page .public-hero--interior .public-hero__actions"),
    );
    expect(declares(actions, "justify-content", /center/)).toBe(true);
  });
});

describe("the form is one centred column", () => {
  it("caps every band at the reading measure and centres it with auto margins", () => {
    const band = ruleFor(RULES, ".checkout-band");
    expect(band, "the checkout band exists").toBeDefined();
    expect(declares(band, "max-width", /var\(--measure-prose\)/)).toBe(true);
    expect(declares(band, "margin-inline", /auto/)).toBe(true);
  });

  it("bands the sections on a hairline, never a box", () => {
    const band = ruleFor(RULES, ".checkout-band");
    expect(declares(band, "border-top", /1px solid var\(--color-rule\)/)).toBe(true);
  });

  it("gives the commit the gold and leaves the support action outline", () => {
    const commit = RULES.find((r) =>
      selectors(r).includes(".checkout-page .checkout-actions .btn--primary"),
    );
    expect(commit, "the checkout commit's gold rule exists").toBeDefined();
    expect(declares(commit, "background", /var\(--gold-400\)/)).toBe(true);
    expect(declares(commit, "color", /var\(--ink-900\)/)).toBe(true);
  });

  it("keeps the estimated total at the total rung, not a display size", () => {
    const figure = ruleFor(RULES, ".checkout-total__figure");
    expect(declares(figure, "font-size", /var\(--text-xl\)/)).toBe(true);
  });
});

describe("the checkout's own shapes", () => {
  it("draws a designed empty state (a page), not the generic boxed empty-state", () => {
    expect(ruleFor(RULES, ".checkout-empty"), "the designed empty band exists").toBeDefined();
    expect(ruleFor(RULES, ".checkout-empty__mark"), "the empty state carries its own mark").toBeDefined();
    const title = ruleFor(RULES, ".checkout-empty__title");
    expect(declares(title, "font-weight", /500/)).toBe(true);
  });

  it("sets the band head at the page-title step, like every other interior band", () => {
    const title = RULES.find((r) =>
      selectors(r).includes(".checkout-page .section-head__title"),
    );
    expect(declares(title, "font-family", /var\(--font-display\)/)).toBe(true);
    expect(declares(title, "font-weight", /500/)).toBe(true);
  });
});

describe("a phone gets the page, not a shrunken desktop", () => {
  it("stacks the commit band full-width below 40rem", () => {
    const actions = PHONE.filter((r) =>
      selectors(r).includes(".checkout-actions") &&
      declares(r, "flex-direction", /column/),
    );
    expect(actions.length).toBeGreaterThanOrEqual(1);
    const full = PHONE.filter((r) =>
      selectors(r).includes(".checkout-actions .btn") &&
      declares(r, "width", /100%/),
    );
    expect(full.length).toBeGreaterThanOrEqual(1);
  });
});

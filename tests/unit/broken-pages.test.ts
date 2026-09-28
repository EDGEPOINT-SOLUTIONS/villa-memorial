import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The night the pages broke (captain, 2026-09-19 — "the product's pages render
 * broken, the landing page first, and others too").
 *
 * Four defects were found BY EYE on the running pages and are pinned here. Each
 * one is a rule that reads correct on its own and only fails when combined with
 * something else, which is why the unit tests were green while the pages were
 * visibly wrong. The assertions below are deliberately written against the
 * DECLARATION (the house style of composition-pass.test.tsx): cheap, and they
 * name the exact rule that regressed.
 *
 *   1. `/` — the "Services we offer" band's lead photograph rendered 330x480
 *      (portrait) at every width from 390 to 1440 instead of the 3:2 the box
 *      declares. Cause: an `<img width height>` attribute is a presentational
 *      hint supplying a DEFINITE height, and a definite height makes the box's
 *      `aspect-ratio` a no-op — the rule never reset `height: auto`.
 *   2. `/` — the newsfeed lead caption printed an empty "tofu" box: an emoji in
 *      staff-authored copy, which neither self-hosted face carries.
 *   3. `/services` — both guide cards: the photograph took the whole right
 *      column at the top while the heading was baseline-dropped to the image's
 *      bottom, leaving a ~174px void in the top-left. Cause: the guide cards
 *      reused the retired services price-card class, which the composition pass
 *      re-templated into a two-column price ledger (`minmax(0, 1fr) auto` +
 *      `align-items: baseline`) without giving the guide variant its own template.
 *      (That whole services surface was retired later; this defect's guard went
 *      with it on 2026-09-28.)
 *   4. `/products` — every row of the five-coffin-tier band was drawn as a
 *      bordered box with its copy crushed into a 131px ribbon and three empty
 *      columns. Cause: `.tier-row` was declared twice at top level — the package
 *      page's tier x term segmented control (the older owner) and this ledger
 *      row — so source order silently applied the segmented control's
 *      `repeat(5, minmax(0, 1fr))` plus its box chrome.
 *
 * Round 2 (captain, 2026-09-25 — "fix all the broken pages"). The public sweep
 * was clean; one admin surface panned: `/staff/pricing` (and `/staff/plans`,
 * which renders the same screen) overflowed by 434px at 1440. Cause: the lot
 * price tables' far-right `<th>` carries a `.visually-hidden` span
 * (`position: absolute !important`). The `.table-wrapper` it lives in was
 * `position: static`, so the absolute 1px box was laid out against the initial
 * containing block instead of the scroll container, landed at x≈1873 and
 * escaped the `overflow-x: auto` clip — the whole document could pan sideways.
 * `.table-wrapper { position: relative }` makes the wrapper the containing
 * block the clipped table needs; the guard below pins it.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const css = read("styles/components.css");
/** Comments quote the defect in prose, so strip them: these checks are about
 *  the DECLARATIONS. */
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { selector: string; body: string; topLevel: boolean };

/** Brace-aware walk so "inside a media query" is distinguishable from
 *  "declared twice at top level" — the distinction defect 4 turned on. */
function rules(source: string): Rule[] {
  const out: Rule[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      const selector = buf.trim().replace(/\s+/g, " ");
      let d = 1;
      let j = i + 1;
      while (j < source.length && d > 0) {
        if (source[j] === "{") d += 1;
        else if (source[j] === "}") d -= 1;
        j += 1;
      }
      out.push({ selector, body: source.slice(i + 1, j - 1), topLevel: depth === 0 });
      depth += 1;
      i += 1;
      buf = "";
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      buf = "";
      continue;
    }
    buf += ch;
  }
  return out;
}

const ALL_RULES = rules(cssRules);
const declarationRules = ALL_RULES.filter((r) => !r.selector.startsWith("@"));

/** `aspect-ratio` set straight on an `img` sizes that image's own box, so a
 *  presentational `height` attribute can defeat it. An `aspect-ratio` on a
 *  WRAPPER (`.media-block`) is safe: the picture inside gets an author
 *  `height: 100%`, which outranks the hint. */
describe("defect 1 — a ratio declared on an img must reset the height attribute's hint", () => {
  const imgRatioRules = declarationRules.filter(
    (r) =>
      /(^|[\s,>+~])img\b/.test(r.selector) &&
      /aspect-ratio\s*:/.test(r.body) &&
      /(?<![-\w])width\s*:\s*100%/.test(r.body),
  );

  it("finds the img-level ratio rules this check is about", () => {
    // If this drops to zero the guard below would pass vacuously.
    expect(imgRatioRules.length).toBeGreaterThanOrEqual(5);
  });

  it("every one of them declares height: auto", () => {
    const offenders = imgRatioRules
      .filter((r) => !/(?<![-\w])height\s*:\s*auto\b/.test(r.body))
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it("the kit card's media is one of them, and the card reserves its box", () => {
    // The home's plans & lots cards (and every catalogue grid) render through
    // the kit ProductCard, whose `.shop-card__media img` carries the 4:3 ratio.
    expect(imgRatioRules.some((r) => r.selector === ".shop-card__media img")).toBe(true);
    // The reservation stays (it is what stops the layout shifting); the CSS is
    // what has to cooperate with it.
    const kit = read("components/kit/product-card.tsx");
    expect(kit).toMatch(/width=\{photo\.width\}/);
    expect(kit).toMatch(/height=\{photo\.height\}/);
  });
});

// "defect 3 — the guide cards own their layout, not the price ledger's" was here.
// It pinned the rules for the RETIRED services guide cards: no class in them is
// named anywhere in app/, components/ or lib/, and the rule was matched on none of
// 218 routes x 3 viewports. Naming a dead selector in this file — comment included —
// is what kept its rule in the sheet. Removed 2026-09-28; the manifest is in the
// design record.

describe("round 2 defect — a scroll wrapper must contain its absolute descendants", () => {
  // `position: absolute` escapes an `overflow` clip unless the scroll container
  // is also the positioned containing block. `.visually-hidden` is absolute, so
  // the pair (.table-wrapper + wide table) turns a hidden label into page-level
  // horizontal scroll. `position: relative` on the wrapper is the fix; a
  // `.visually-hidden` that moved to `static` would lose its own hiding, so the
  // wrapper stays the place to pin it.
  const wrappers = declarationRules.filter((r) => r.selector === ".table-wrapper");

  it("the house wide-table wrapper declares position: relative", () => {
    expect(wrappers.length).toBeGreaterThanOrEqual(1);
    const offenders = wrappers.filter((r) => !/position\s*:\s*relative\s*;/.test(r.body));
    expect(offenders.map((r) => r.selector)).toEqual([]);
  });

  it("it still clips sideways (overflow-x: auto) — the scroll is not the bug", () => {
    expect(wrappers.some((r) => /overflow-x\s*:\s*auto\s*;/.test(r.body))).toBe(true);
  });

  it("the escape is real: .visually-hidden is absolute, so it needs a positioned clip", () => {
    const hidden = read("styles/base.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = rules(hidden).find((r) => r.selector === ".visually-hidden");
    expect(rule).toBeDefined();
    expect(rule?.body).toMatch(/position\s*:\s*absolute\s*!important/);
  });

  it("the pricing editors render their tables through the wrapper", () => {
    for (const file of [
      "app/(staff)/staff/pricing/lot-prices-editor.tsx",
      "app/(staff)/staff/plans/plan-rates-editor.tsx",
    ]) {
      const src = read(file);
      expect(src).toContain('className="table-wrapper');
      expect(src).toContain('className="table pricing-editor__table"');
    }
  });
});

describe("defect 4 — one class, one declaration", () => {
  it("the package page's segmented control is the only top-level .tier-row", () => {
    const topLevel = declarationRules.filter((r) => r.topLevel && r.selector === ".tier-row");
    expect(topLevel.length).toBe(1);
    // ...and it is the segmented control's, not the ledger row's.
    expect(topLevel[0].body).toMatch(/grid-template-columns\s*:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("no rule anywhere hands the ledger row the segmented control's template", () => {
    const ledger = declarationRules.find((r) => r.selector === ".tier-ledger__row");
    expect(ledger).toBeDefined();
    expect(ledger?.body).toMatch(/grid-template-columns\s*:\s*clamp\(9rem,\s*14vw,\s*11rem\)\s+minmax\(0,\s*1fr\)/);
    expect(ledger?.body).not.toMatch(/repeat\(5,/);
    // The box chrome belongs to the segmented control alone.
    expect(ledger?.body).not.toMatch(/border\s*:\s*1px/);
    expect(ledger?.body).not.toMatch(/background\s*:/);
  });

  it("the products tier band renders the ledger row's classes, and /products has no .tier-row", () => {
    const page = read("app/(public)/products/page.tsx");
    expect(page).toContain('className="tier-ledger__row"');
    expect(page).toContain('className="tier-ledger__media"');
    expect(page).toContain('className="tier-ledger__body"');
    expect(page).not.toContain('className="tier-row"');
    // The segmented control keeps its own name and its own consumer.
    const selector = read("app/(public)/plans/[sku]/plan-term-selector.tsx");
    expect(selector).toContain('className="tier-row"');
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { VMP_PAYMENTS } from "@/lib/villa-pricing";
import {
  allStyles,
  appSources,
  declares,
  inPhone,
  parseCss,
  readSource,
  ruleFor,
  selectors,
  staticClassNameTokens,
  topLevel,
} from "../helpers/css-rules";

/**
 * The captain's second report (2026-09-19): "the pages render broken" — this
 * time named at /plans and /lots. The previous pass fixed four defects by eye
 * and MISSED these two, because its detectors measured the wrong thing (the
 * document never scrolled sideways; the breakage lived inside pan frames and
 * inside one wrapped border-radius).
 *
 * Vitest runs in `node`, so nothing here can measure layout. What these gates
 * can do — and what the class of defect needs — is pin the DECLARATIONS that
 * make each phone surface work, so the next edit that removes one fails here
 * instead of in front of the captain:
 *
 *   1. The rate card is a five-tier × four-term table. At 390 it overflowed the
 *      page's 342px card by 175px inside a pan frame that sliced its caption
 *      and column headers. It now re-lays-out as stacked payment-mode blocks
 *      below 40rem; above that the client's table is untouched. The component
 *      must label every amount cell with its tier so the stacked view keeps
 *      the column header it hides.
 *   2. A `border-radius: 999px` capsule is only a capsule while it is one row.
 *      Any top-level rule that pairs a 999px radius with `flex-wrap: wrap` must
 *      cap its radius below 40rem, where it can wrap past two rows — the /lots
 *      legend filter turned into an ellipse cutting through its own chips. (The
 *      2026-09-20 listing pass removed that capsule from /lots altogether; the
 *      guard below still covers every surface that keeps one, /plans included.)
 *   3. Wide-data-table containers must declare `overflow-x`, so a table that is
 *      genuinely wider than a phone stays reachable.
 *   4. The utility vocabulary is closed: a `text-*` / `stack-*` / `nowrap` /
 *      `sr-only` class referenced in a static className must exist in the
 *      stylesheets. Three shipped surfaces referenced classes that had no rule
 *      (and one that had been deleted from the stylesheet while the page kept
 *      the name — the price-list hero printed two 560px logos).
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const STYLES = allStyles();
const RULES = parseCss(STYLES);
const TOP = topLevel(RULES);
const PHONE = inPhone(RULES);

describe("a rate table at 390 — the /plans defect", () => {
  const planRules = PHONE.filter((r) => selectors(r).some((s) => s.startsWith(".price-table--plan")));

  it("re-lays the table out as stacked blocks below 40rem", () => {
    expect(declares(ruleFor(RULES, ".price-table--plan"), "display", /block/)).toBe(true);
    expect(declares(ruleFor(RULES, ".price-table--plan thead"), "display", /none/)).toBe(true);
    expect(declares(ruleFor(RULES, ".price-table--plan tbody"), "display", /block/)).toBe(true);
    expect(declares(ruleFor(RULES, ".price-table--plan tr"), "display", /block/)).toBe(true);
    const cellRules = PHONE.filter((r) => selectors(r).includes(".price-table--plan td"));
    // The stacked cell is a label/amount row, so it must be flex, not table-cell.
    expect(cellRules.some((r) => declares(r, "display", /flex/))).toBe(true);
  });

  it("keeps the pan frame's overflow for widths where the table still pans", () => {
    expect(declares(ruleFor(RULES, ".table-wrapper"), "overflow-x", /auto|scroll/)).toBe(true);
  });

  it("gives every amount cell the tier label the hidden header used to hold", () => {
    const html = renderToStaticMarkup(<PlanPaymentTable rows={VMP_PAYMENTS} />);
    expect(html).toContain("price-table price-table--plan");
    const tiers = ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"];
    const labelled = [...html.matchAll(/data-tier="([^"]+)"/g)].map((m) => m[1]);
    // 4 payment modes × 5 tiers, every cell labelled (never an anonymous amount).
    expect(labelled).toHaveLength(VMP_PAYMENTS.length * tiers.length);
    for (const tier of tiers) expect(labelled.filter((t) => t === tier)).toHaveLength(4);
    // The phone re-layout adds no duplicate controls: one request link per cell.
    expect(html.match(/price-request-link/g) ?? []).toHaveLength(VMP_PAYMENTS.length * 5);
  });

  it("does not hide the phone header without moving its labels onto the cells", () => {
    const before = ruleFor(RULES, ".price-table--plan td::before");
    expect(before).toBeDefined();
    expect(declares(before, "content", /attr\(data-tier\)/)).toBe(true);
    // The stacked look is phone-only: no top-level rule stacks the table.
    const topLevelStack = TOP.find(
      (r) => selectors(r).includes(".price-table--plan") && /display\s*:\s*block/.test(r.body),
    );
    expect(topLevelStack).toBeUndefined();
    expect(planRules.length).toBeGreaterThan(3);
  });
});

describe("wrapping capsule controls at 390", () => {
  const capsules = TOP.filter(
    (r) => /border-radius:\s*999px/.test(r.body) && /flex-wrap:\s*wrap/.test(r.body),
  );

  it("finds the wrapping capsules this gate is about", () => {
    // If this drops to zero the guard would pass vacuously.
    expect(capsules.map((r) => r.selector)).toEqual(
      expect.arrayContaining([".seg-filter", ".term-switch"]),
    );
  });

  it("caps every one of them below 40rem, where they can wrap past two rows", () => {
    const offenders = capsules
      .filter((rule) => {
        const capped = PHONE.some(
          (phone) =>
            selectors(phone).some((s) => selectors(rule).includes(s)) &&
            /border-radius:\s*(?!999px)/.test(phone.body),
        );
        return !capped;
      })
      .map((r) => r.selector);
    expect(offenders).toEqual([]);
  });

  it("the /lots listing replaced the capsule with full-width checkbox rows", () => {
    // Captain 2026-09-20 rebuilt /lots as a product listing whose filter rail is
    // a 17rem column of refine rows. A 999px capsule inside that column resolves
    // to an ellipse as soon as the types wrap — so the listing stopped using
    // `.seg-filter` entirely and declares its own 44px rows. The generic cap
    // above still covers every surface that keeps the capsule (/plans).
    const panelSource = readSource("app/(public)/lots/lot-filters.tsx");
    expect(panelSource).not.toContain("seg-filter");
    const row = ruleFor(RULES, ".lot-filter__row");
    expect(declares(row, "min-height", /2\.75rem/)).toBe(true);
    // The rail is sticky on desktop and hidden below the rail breakpoint in
    // favour of the phone sheet (the same rule pair that keeps results reachable
    // at 390 without a column pushing them down).
    const rail = RULES.find(
      (r) => selectors(r).includes(".lot-rail") && declares(r, "display", /none/),
    );
    expect(rail, "the rail is hidden below its breakpoint").toBeDefined();
    const railDesktop = RULES.filter(
      (r) => selectors(r).includes(".lot-rail") && /position:\s*sticky/.test(r.body),
    );
    expect(railDesktop.length).toBe(1);
    const sheetHidden = RULES.find(
      (r) => selectors(r).includes(".lot-sheet") && declares(r, "display", /none/),
    );
    expect(sheetHidden, "the phone sheet is hidden on desktop").toBeDefined();
    expect(readSource("app/(public)/lots/lot-listing.tsx")).toContain("lot-sheet__toggle");
  });
});

describe("wide data tables stay reachable at 390", () => {
  const panClasses = [".table-wrapper", ".pl-scroll", ".plan-scroll", ".pricing-editor__scroll"];

  it("every pan container declares a horizontal scroll", () => {
    const missing = panClasses.filter((selector) => {
      const rule = ruleFor(RULES, selector);
      return !declares(rule, "overflow-x", /auto|scroll/);
    });
    expect(missing).toEqual([]);
  });

  it("none of them hides its overflow instead", () => {
    const hidden = TOP.filter(
      (r) =>
        panClasses.some((c) => selectors(r).includes(c)) &&
        /overflow-x:\s*hidden/.test(r.body),
    ).map((r) => r.selector);
    expect(hidden).toEqual([]);
  });

  it("the other phone-fitted tables keep their ≤40rem rules", () => {
    expect(
      declares(ruleFor(PHONE, ".compare-table th"), "padding"),
    ).toBe(true);
    expect(
      declares(ruleFor(PHONE, ".compare-table td.text-sm"), "overflow-wrap", /anywhere/),
    ).toBe(true);
    expect(declares(ruleFor(PHONE, ".term-grid"), "grid-template-columns", /repeat\(2,/)).toBe(true);
    expect(declares(ruleFor(PHONE, ".plan-table th"), "padding")).toBe(true);
  });
});

describe("the product detail page stacks at 390 — the P3 Amazon layout", () => {
  // The PDP collapses at 64rem (the sticky-gallery breakpoint), which is wider
  // than the shared 40rem phone query, so this gate reads the 64rem rules.
  const collapse = RULES.filter(
    (r) =>
      r.media !== null &&
      /max-width:\s*64rem/.test(r.media) &&
      selectors(r).includes(".pdp-layout"),
  );

  it("is a two-column structure that becomes one column on a narrow screen", () => {
    const layout = ruleFor(RULES, ".pdp-layout");
    expect(declares(layout, "grid-template-columns", /minmax\(0,\s*1fr\)\s+minmax/)).toBe(true);
    expect(
      collapse.some((r) => declares(r, "grid-template-columns", /minmax\(0,\s*1fr\)/)),
    ).toBe(true);
  });

  it("stacks the gallery above the buy box and the content below it", () => {
    const layout = ruleFor(RULES, ".pdp-layout");
    expect(layout?.body).toMatch(/grid-template-areas/);
    expect(layout?.body).toMatch(/"media buy"/);
    const phone = collapse.find((r) => declares(r, "grid-template-areas"));
    expect(phone?.body).toMatch(/"media"[\s\S]*"buy"[\s\S]*"below"/);
  });

  it("makes the gallery sticky only on desktop, never inside the phone stack", () => {
    const sticky = RULES.filter(
      (r) => selectors(r).includes(".pdp-media") && /position:\s*sticky/.test(r.body),
    );
    expect(sticky).toHaveLength(1);
    expect(sticky[0]?.media).toMatch(/min-width:\s*64rem/);
  });

  it("opens a fixed zoom dialog with a pan frame and a 44px trigger", () => {
    expect(declares(ruleFor(RULES, ".pdp-zoom"), "position", /fixed/)).toBe(true);
    expect(declares(ruleFor(RULES, ".pdp-zoom__frame"), "overflow", /auto/)).toBe(true);
    const trigger = ruleFor(RULES, ".pdp-gallery__zoom");
    expect(declares(trigger, "height", /2\.75rem/)).toBe(true);
    expect(declares(trigger, "width", /2\.75rem/)).toBe(true);
  });
});

describe("the utility vocabulary is closed", () => {
  it("every text-/stack-/nowrap/sr-only class in a static className is defined", async () => {
    const sources = await appSources();
    const tokens = staticClassNameTokens(sources);
    const defined = new Set(
      [...STYLES.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)].map((m) => m[1]),
    );
    const utility = /^(text-(xs|sm|md|lg|muted)|stack(-[2-4])?|nowrap|sr-only|visually-hidden|mt-\d|mb-\d)$/;
    const orphans = [...tokens.entries()]
      .filter(([token]) => utility.test(token) && !defined.has(token))
      .map(([token, files]) => `${token} (${files[0]})`);
    expect(orphans).toEqual([]);
  });
});

describe("the price-list hero logo row — a class whose rule was deleted", () => {
  it("the page uses the live .logo-row, not the orphaned name", () => {
    const page = readSource("app/(public)/price-list/page.tsx");
    expect(page).toContain('className="logo-row"');
    expect(page).not.toMatch(/className="[^"]*plan-logo-row/);
    expect(declares(ruleFor(RULES, ".logo-row img"), "height", /2\.6rem/)).toBe(true);
  });

  it("no shipped source still references the deleted class", async () => {
    const sources = await appSources();
    const users = sources
      .filter(({ source }) => /className="[^"]*plan-logo-row/.test(source))
      .map(({ file }) => file);
    expect(users).toEqual([]);
  });
});

describe("the public layout contract's phone ceilings (Phase 0)", () => {
  it("caps the phone home hero at 42 vh so content starts above the fold", () => {
    const hero = PHONE.find((r) => r.selector === ".hero-home");
    expect(hero, "the phone .hero-home rule exists").toBeDefined();
    expect(declares(hero, "max-height", /42vh/)).toBe(true);
    // The compact phone hero hides the desktop-only brand row and eyebrow.
    const hidden = PHONE.filter(
      (r) =>
        selectors(r).some((s) => s === ".hero-home__brand" || s === ".hero-home__eyebrow") &&
        declares(r, "display", /none/),
    );
    expect(hidden.length).toBeGreaterThanOrEqual(1);
    expect(selectors(hidden[0])).toEqual(
      expect.arrayContaining([".hero-home__brand", ".hero-home__eyebrow"]),
    );
  });

  it("caps the phone-shrunk image roles", () => {
    const shrunk = PHONE.filter(
      (r) =>
        selectors(r).some((s) => s.startsWith(".public-image--")) &&
        declares(r, "max-height", /14rem/),
    );
    expect(shrunk.length).toBeGreaterThanOrEqual(1);
  });

  it("declares the 4-across catalogue grid inside the catalogue envelope", () => {
    expect(declares(ruleFor(RULES, ".public-grid"), "grid-template-columns", /repeat/)).toBe(true);
    expect(ruleFor(RULES, ".public-grid--cards")?.body).toMatch(/21rem/);
    expect(ruleFor(RULES, ".container--catalogue")?.body).toMatch(
      /var\(--layout-catalogue-w\)/,
    );
    expect(ruleFor(RULES, ".container--reading")?.body).toMatch(/var\(--layout-reading-w\)/);
  });
});

/** A tiny guard on this file itself: the style source must be the real one. */
describe("the gates read the shipped stylesheets", () => {
  it("found the phone media query and enough rules to be meaningful", () => {
    expect(PHONE.length).toBeGreaterThan(10);
    expect(TOP.length).toBeGreaterThan(100);
    expect(readFileSync(path.join(ROOT, "styles/components.css"), "utf8").length).toBeGreaterThan(10000);
  });
});

/**
 * Typography system — the regression home for the type-voice decision
 * (2026-09-18) and the captain's consistency pass (2026-09-22).
 *
 * The product owns ONE typeface, Inter (self-hosted, styles/fonts.css), and
 * every rendered text size is one of seven ladder steps (12px floor) chosen
 * through a single role→step map (styles/tokens.css). The paper/legal print
 * layer keeps the client's own faces — that is a separate, deliberate scale.
 *
 * The reproduced defects this file pins:
 *   1. the product shipped no font files, so every visitor saw different
 *      fallback stacks;
 *   2. 39 rendered text sizes, 21 of them fractional (9.92px, 11.52px,
 *      18.4px, 34.56px…) and 9 below 12px, because each view nudged its own
 *      rem value or clamp();
 *   3. decorative gold tints used as text (gold-300 on white = 1.55:1);
 *   4. the SAME role picking different rungs on different pages (a page title
 *      at 28px here and 36px there, a section head at 36px here and 22px
 *      there) — the drift the captain reported as "the consistent of the font
 *      sizes", fixed by the role map below.
 *
 * If a future change introduces a raw `font-size`, a sub-12px value, a
 * fractional step, a second typeface, a gold-as-text rule, or moves one role
 * class off its step, this file fails.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCss, readStyle, type CssRule } from "../helpers/css-rules";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

/** The seven steps, in px. 12 is the hard floor. */
const LADDER: Record<string, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 36,
};
const LADDER_REM: Record<string, string> = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.125rem",
  xl: "1.375rem",
  "2xl": "1.75rem",
  "3xl": "2.25rem",
};
/** The eight roles and the ladder rung each one uses. `hero` is the one fluid
 *  display size; every other role is a plain ladder step. */
const ROLE_STEPS: Record<string, string> = {
  hero: "display",
  "page-title": "3xl",
  "section-title": "2xl",
  "card-title": "xl",
  body: "md",
  ui: "md",
  caption: "sm",
  micro: "xs",
};
const ROLE_TOKENS = Object.keys(ROLE_STEPS).map((r) => `var(--text-${r})`);
const LADDER_TOKENS = new Set([
  ...[...Object.keys(LADDER)].map((k) => `var(--text-${k})`),
  "var(--text-display)",
  ...ROLE_TOKENS,
]);

const STYLESHEETS = [
  "styles/fonts.css",
  "styles/tokens.css",
  "styles/base.css",
  "styles/components.css",
  "styles/utilities.css",
];

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(clean.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("type ladder", () => {
  const tokens = read("styles/tokens.css");

  it("defines exactly the seven steps, in px, with 12px as the floor", () => {
    for (const [name, rem] of Object.entries(LADDER_REM)) {
      expect(tokens).toMatch(new RegExp(`--text-${name}: *${rem};`));
    }
    expect(tokens).toMatch(
      /--text-display: *clamp\(2\.25rem, 2rem \+ 1\.6vw, 2\.5rem\);/,
    );
    // The captain's public-page ceiling: the one fluid display size tops out at
    // 40px (2026-09-25). A future edit that widens the clamp fails here.
    const displayMax = tokens.match(/--text-display: *clamp\([^;]*?(\d+(?:\.\d+)?)rem\);/);
    expect(displayMax, "--text-display declares a rem maximum").not.toBeNull();
    expect(Number(displayMax![1]) * 16, "public hero display ceiling").toBeLessThanOrEqual(40);
    const steps = Object.values(LADDER);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(12);
  });

  it("has retired the off-ladder tokens", () => {
    for (const dead of ["--text-base", "--text-4xl", "--text-5xl", "--text-title-page", "--text-stat"]) {
      expect(tokens).not.toMatch(new RegExp(`${dead}:`));
    }
  });

  it("keeps every font-size in the stylesheets on a ladder or role token (no raw values, no clamps, nothing under 12px)", () => {
    const offenders: string[] = [];
    // The printed paper sheet is allowed its own print sizes in points, and only from
    // the ONE paper profile (lib/export/paper-profile.ts): the sheet's sizes are the
    // client's own paper sizes, declared as `--paper-body-pt` on the sheet element.
    const PAPER_PT_SIZE = /^(?:var\(--paper-body-pt,[^)]*\)|calc\(var\(--paper-body-pt,[^)]*\)[^)]*\))$/;
    for (const file of STYLESHEETS) {
      for (const match of read(file).matchAll(/font-size: *([^;}]+);/g)) {
        const value = match[1].trim();
        // `pt` is allowed only for the printed paper-sheet simulation.
        if (LADDER_TOKENS.has(value) || value.endsWith("pt")) continue;
        if (PAPER_PT_SIZE.test(value)) continue;
        offenders.push(`${file}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("declares the role→step map in tokens.css and nothing off-ladder", () => {
    for (const [role, step] of Object.entries(ROLE_STEPS)) {
      expect(tokens, role).toMatch(
        new RegExp(`--text-${role}: *var\\(--text-${step}\\);`),
      );
    }
    // A phone is a rendering contract, not a smaller desktop: the display roles
    // step down in the ONE token map (styles/tokens.css), not per class.
    const phone = tokens.slice(tokens.indexOf("@media (max-width: 48rem)"));
    expect(phone).toMatch(/--text-page-title: *var\(--text-2xl\);/);
    expect(phone).toMatch(/--text-section-title: *var\(--text-xl\);/);
    expect(phone).toMatch(/--text-card-title: *var\(--text-lg\);/);
  });

  it("keeps the family reading-scale overrides on ladder values", () => {
    const components = read("styles/components.css");
    const allowed = new Set(Object.values(LADDER_REM));
    const overrides: string[] = [];
    for (const match of components.matchAll(/--text-(xs|sm|md|lg|xl|2xl|3xl): *([^;]+);/g)) {
      if (!allowed.has(match[2].trim())) overrides.push(match[0]);
    }
    expect(overrides).toEqual([]);
  });
});

/** The role classes the map owns. `files` names where each declaration lives so
 *  the check reads the real stylesheet, not a copy. */
const ROLE_CLASSES: Record<string, Array<{ file: string; selectors: string[] }>> = {
  hero: [
    {
      file: "styles/components.css",
      selectors: [
        ".landing__title",
        ".hero-home__title",
        ".hero-premium__title",
        ".pkg-title",
        ".gal-hero__title",
        ".sv-page h1",
        ".mem-profile__name",
      ],
    },
  ],
  "page-title": [
    {
      file: "styles/components.css",
      selectors: [
        ".page-hero__title",
        ".app-shell .app-main .page-header h1",
        ".paper-hero__title",
        ".ag-hero__title",
        ".ia-hero__title",
        ".pdp-buy__title",
      ],
    },
    { file: "styles/base.css", selectors: ["h1"] },
  ],
  "section-title": [
    {
      file: "styles/components.css",
      selectors: [
        ".section-title",
        ".mid-section > h2",
        ".sv-page h2",
        ".fac-section__title",
        ".gal-group__title",
        ".gal-walk__title",
        ".gal-visit__title",
        ".landing-showcase__title",
        ".app-shell .app-main .page-section-title",
        ".page-section-title",
        ".plan-section-title",
        ".rich-text h2",
        ".rte__host h2",
        ".ag-h2",
        ".ia-steps h2",
        ".ia-alts h2",
        ".sv-sources h2",
        ".ed-section__head h2",
        ".sv-help h2",
        ".mem-section-title",
        ".next-steps__title",
        ".mem-find__title",
        ".price-module__title",
        ".ledger__title",
        ".band-head__title",
        ".pdp-section__title",
      ],
    },
    { file: "styles/base.css", selectors: ["h2"] },
  ],
  "card-title": [
    {
      file: "styles/components.css",
      selectors: [
        ".card__header h2",
        ".item-card__title",
        ".ledger__row-title",
        ".empty-state__title",
        ".ag-card__title",
        ".capture-section__title",
        ".rich-text h3",
        ".rte__host h3",
        ".shop-card__title",
        ".casket-collection__title",
        ".ag-state__title",
        ".ag-work__title",
        ".ag-action__title",
        ".sv-page .booking-step__title",
        ".mem-step__title",
        ".mem-result__name",
        ".mem-hero__card-title",
        ".case-card__name",
        ".ops-card__name",
        ".fac-room__name",
        ".pdp-feature-group__title",
      ],
    },
    { file: "styles/base.css", selectors: ["h3"] },
  ],
};

describe("role → step map", () => {
  const cache = new Map<string, CssRule[]>();
  const topLevel = (file: string) => {
    if (!cache.has(file)) cache.set(file, parseCss(readStyle(file)).filter((r) => r.depth === 0));
    return cache.get(file)!;
  };
  const fontSizeFor = (file: string, selector: string) => {
    const rule = topLevel(file).find((r) => r.selector === selector);
    return rule?.body.match(/(?<![-\w])font-size\s*:\s*([^;]+);/)?.[1].trim();
  };

  it("gives every mapped class in every role exactly that role's token", () => {
    const offenders: string[] = [];
    for (const [role, groups] of Object.entries(ROLE_CLASSES)) {
      for (const { file, selectors } of groups) {
        for (const selector of selectors) {
          const size = fontSizeFor(file, selector);
          const expected = `var(--text-${role})`;
          if (size !== expected) {
            offenders.push(`${file} ${selector}: ${size ?? "MISSING"} (want ${expected})`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never lets a page title ride a different rung than another page title", () => {
    // The concrete drift the captain reported: route h1s were split 28/36 and
    // the staff header was 36 while the public catalogue was 28.
    const sizes = new Set(
      (["styles/components.css", "styles/base.css"] as const).flatMap((file) =>
        (ROLE_CLASSES["page-title"].find((g) => g.file === file)?.selectors ?? []).map(
          (s) => fontSizeFor(file, s),
        ),
      ),
    );
    expect([...sizes]).toEqual(["var(--text-page-title)"]);
  });
});

/**
 * The capped figure roles (captain, 2026-09-25: "the prices are so big… Fonts
 * size should just be at the right size with no oversizing").
 *
 * A figure may ride BELOW its cap, never above it. The caps in px:
 *   · price — a card / line price headline: body + one rung = 18px
 *   · total — a band lead, estimate total, PDP figure: 22px
 *   · stat  — a KPI / stat / finance figure: 24px → the ladder's 22px rung
 *
 * Hierarchy comes from weight, colour and spacing, not size. This gate fails a
 * class bumped back to `--text-2xl`/`--text-3xl` on the desktop OR the phone
 * rule, naming the class and the measured value, so oversizing cannot return by
 * review alone.
 */
const FIGURE_CAPS: Array<{ role: string; max: number; selectors: string[] }> = [
  {
    role: "price",
    max: 18,
    selectors: [
      ".shop-card__price",
      ".plan-tier__price",
      ".buy-card__price",
      ".day-ladder__price",
      ".story-rate__price",
      ".ag-lot__price strong",
      ".item-card__price",
      ".sv-price-card__amount",
    ],
  },
  {
    role: "total",
    max: 22,
    selectors: [
      ".ledger__figure",
      ".cat-lead .ledger__figure",
      ".ledger__row-figure",
      ".detail-sticky__price",
      ".svc-total__amount",
      ".sv-total__amount",
      ".sb-estimate__total-amount",
      ".sb-estimate__arranged-figure, .sb-arranged__title",
      ".paper-hero__price-value",
      ".chapel-card__rate",
      ".sv-chapel__rate",
      ".fac-room__rate",
      ".story-total__amount",
      ".story-chapel__rate",
      ".story-room__rate",
    ],
  },
  {
    role: "stat",
    max: 22,
    selectors: [
      ".stat__value",
      ".kpi-card__value",
      ".app-shell .app-main .kpi-card__value",
      ".ops-summary__value",
      ".finance-glance__amount",
      ".app-shell .app-main .finance-glance__amount",
      ".ag-money__value",
      ".ag-commission__amount",
      ".membership-rate__value",
      ".membership-glance__value",
      ".payment-alerts__figure",
      ".payment-alerts__amount",
    ],
  },
];

describe("figure caps (captain 2026-09-25)", () => {
  const rules = parseCss(readStyle("styles/components.css"));

  /** Resolve a `var(--text-…)` value to px through the ladder + role map. */
  const pxFor = (value: string): number | null => {
    const token = value.match(/var\(--text-([a-z0-9-]+)\)/)?.[1];
    if (!token) return null;
    const step = ROLE_STEPS[token] ?? token;
    if (step === "display") return 40;
    return LADDER[step] ?? null;
  };

  it("keeps every money / stat figure at or under its role's rung", () => {
    const offenders: string[] = [];
    for (const { role, max, selectors } of FIGURE_CAPS) {
      for (const selector of selectors) {
        const matches = rules.filter(
          (r) =>
            r.selector === selector ||
            r.selector.split(",").map((s) => s.trim()).includes(selector),
        );
        if (matches.length === 0) {
          offenders.push(`${selector}: MISSING (${role} ≤ ${max}px)`);
          continue;
        }
        for (const rule of matches) {
          const size = rule.body.match(/(?<![\-\w])font-size\s*:\s*([^;]+);/)?.[1].trim();
          if (!size) continue; // a wrapper that inherits its figure is fine
          const px = pxFor(size);
          if (px === null) offenders.push(`${selector}: ${size} (not a ladder token)`);
          else if (px > max) {
            offenders.push(`${selector}: ${size} = ${px}px > ${max}px ${role} cap`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("typefaces", () => {
  it("actually loads the @font-face file ahead of every stylesheet", () => {
    // Regression: fonts.css existed once but was imported nowhere, so every
    // page kept rendering the OS fallbacks while the test still passed.
    const globals = read("app/globals.css");
    const imports = [...globals.matchAll(/@import "([^"]+)";/g)].map((m) => m[1]);
    expect(imports[0]).toBe("../styles/fonts.css");
  });

  it("declares Inter as the product's one face (both semantic tokens)", () => {
    const tokens = read("styles/tokens.css");
    expect(tokens).toMatch(/--font-serif: *"Inter", system-ui/);
    expect(tokens).toMatch(/--font-sans: *"Inter", system-ui/);
    // The retired faces stay retired.
    expect(tokens).not.toMatch(/Alegreya|Source Sans 3/);
  });

  it("ships the Inter woff2 files and the OFL licence text, and no retired files", () => {
    const files = [
      "public/fonts/inter/inter-latin.woff2",
      "public/fonts/inter/inter-latin-ext.woff2",
      "public/fonts/inter/inter-latin-italic.woff2",
      "public/fonts/inter/inter-latin-ext-italic.woff2",
      "public/fonts/inter/OFL.txt",
    ];
    for (const file of files) {
      expect(existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(read(file).length).toBeGreaterThan(0);
    }
    for (const gone of [
      "public/fonts/alegreya",
      "public/fonts/source-sans-3",
    ]) {
      expect(existsSync(path.join(ROOT, gone)), gone).toBe(false);
    }
    // The paper/legal layer keeps its own faces (the client's papers win).
    expect(existsSync(path.join(ROOT, "public/fonts/paper/texgyrebonum-regular.otf"))).toBe(true);
  });

  it("declares no @font-face for a retired family", () => {
    const fonts = read("styles/fonts.css");
    expect(fonts).not.toMatch(/Alegreya|Source Sans 3/);
    expect(fonts).toContain('font-family: "Inter"');
    expect(fonts).toContain('font-family: "TeX Gyre Bonum"');
  });

  it("keeps the peso sign (U+20B1) inside the shipped latin-ext ranges", () => {
    const fonts = read("styles/fonts.css");
    // U+20B1 sits inside the latin-ext range U+20AD-20C0 of Inter (normal + italic).
    const latinExtCount = fonts.split("U+20AD-20C0").length - 1;
    expect(latinExtCount).toBeGreaterThanOrEqual(2);
    expect(fonts).toContain('font-family: "Inter"');
  });

  it("preloads the latin subset above the fold", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("/fonts/inter/inter-latin.woff2");
    expect(layout).not.toContain("alegreya");
    expect(layout).not.toContain("source-sans-3");
  });
});

describe("ink roles", () => {
  it("uses pure black text ink and neutral supporting greys (captain, 2026-09-21)", () => {
    const tokens = read("styles/tokens.css");
    expect(tokens).toMatch(/--color-text-primary: *#000000;/);
    expect(tokens).toMatch(/--color-text-secondary: *#333333;/);
    expect(tokens).toMatch(/--color-text-muted: *#595959;/);
    expect(tokens).toMatch(/--color-text-accent: *var\(--gold-800\);/);
    expect(tokens).toMatch(/--color-figure: *#000000;/);

    // Every text ink that can land on a light surface passes AA at any size.
    const inks = ["#000000", "#333333", "#595959", "#574300"];
    const surfaces = ["#f2f9fe", "#ffffff"];
    for (const ink of inks) {
      for (const surface of surfaces) {
        expect(contrast(ink, surface), `${ink} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("never carries the navy tint in a text colour (navy stays surface/border)", () => {
    // Direct `color: var(--navy-*)` would re-tint body copy/headings on the
    // surfaces that predate the ink tokens; the tokens own every text colour.
    const offenders: string[] = [];
    for (const file of STYLESHEETS) {
      for (const match of read(file).matchAll(/(?<![-\w])color: *var\(--navy-[0-9]+\)/g)) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never paints text with a decorative gold tint (the 1.55:1 regression)", () => {
    const offenders: string[] = [];
    for (const file of STYLESHEETS) {
      // gold-300/400/500/600 and brass-300/400/500 are decoration: on the
      // page they measure 1.46–3.49:1. gold-700/800 and brass-600 pass AA
      // and remain legal accent text; the inverse golds (100/200) are for
      // text on navy surfaces only.
      for (const match of read(file).matchAll(
        /(^|[\s{;])color: *var\(--(?:gold-(?:300|400|500|600)|brass-(?:300|400|500))\)/g,
      )) {
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("routes the previously-gold numerals through the accent ink", () => {
    const components = read("styles/components.css");
    // Light surfaces → the dark accent ink (gold-800).
    for (const selector of [".ed-nav__num", ".ed-service__num"]) {
      const block = components.slice(components.indexOf(`${selector} {`));
      expect(block.slice(0, 400), selector).toContain("color: var(--color-text-accent);");
    }
    // The rail's lead card is a DARK surface (photo under a navy scrim): the
    // accent ink measured ~1.6:1 there, so its price takes the inverse gold
    // tokens.css reserves for text on navy (craft pass, 2026-09-18).
    const lead = components.slice(
      components.indexOf(".rail-item--lead .rail-item__price {"),
    );
    expect(lead.slice(0, 400), ".rail-item--lead .rail-item__price").toContain(
      "color: var(--gold-200);",
    );
  });
});

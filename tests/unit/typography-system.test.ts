/**
 * Typography system — the regression home for the type-voice decision
 * (2026-09-18), the captain's consistency pass (2026-09-22) and the 2026-09-27
 * rebuild to the aitooltiphub.com UI guide.
 *
 * The product owns TWO self-hosted faces, each with a job: TeX Gyre Bonum for
 * display (the client's own letterhead face) and Manrope for the interface
 * (office, 2026-09-29), with Inter kept behind Manrope as the interface
 * fallback. Every
 * rendered text size is one of seven ladder steps (12px floor) chosen through a
 * single role→step map (styles/tokens.css). The paper/legal print layer keeps
 * the client's own faces — that is a separate, deliberate scale.
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
 *   5. a ladder whose steps were ~1.1× apart, so headings, body and labels all
 *      read at the same level and the page had no focal point.
 *
 * If a future change introduces a raw `font-size`, a sub-12px value, a
 * fractional step, an unshipped typeface, a decorative-gold-as-text rule, or
 * moves one role class off its step, this file fails.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCss, readStyle, type CssRule } from "../helpers/css-rules";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

/** The seven steps, in px. 12 is the hard floor. */
// The ladder, in the px each step actually RENDERS at the shipped 80% scale
// (`html { font-size: 80% }` in styles/base.css — see tokens.css for why). These
// are the numbers a person sees, so they are the numbers the contrast and figure
// guards must reason about.
//
// The bottom two rungs are declared in ABSOLUTE px and deliberately do not
// scale: at a 12.8px root a rem step would put them at 9.6 and 11.2px, under
// this product's hard 12px floor, on a site read by older people. 12px is the
// floor and it holds.
const LADDER: Record<string, number> = {
  xs: 12,
  sm: 13,
  md: 13.6,
  lg: 16,
  xl: 19.2,
  "2xl": 25.6,
  "3xl": 35.2,
};
// …and the exact strings tokens.css must declare for each step. The two small
// ones are px on purpose; the rest are rem so they ride the global scale.
const LADDER_REM: Record<string, string> = {
  xs: "12px",
  sm: "13px",
  md: "1.0625rem",
  lg: "1.25rem",
  xl: "1.5rem",
  "2xl": "2rem",
  "3xl": "2.75rem",
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

/**
 * Follow a `var()` chain in tokens.css down to a literal hex.
 *
 * The 2026-09-27 rebuild made every semantic role an alias (`--color-text-primary:
 * var(--ink-900)`), so a guard that hardcoded the old hex would still pass while
 * the ramp underneath it changed. Resolving means these guards check the PROMISE
 * (this ink is readable on that ground), not a literal someone has to retype.
 */
function resolveHex(css: string, name: string, depth = 0): string | null {
  if (depth > 8) return null;
  const raw = css.match(new RegExp(`${name}: *([^;]+);`))?.[1]?.trim();
  if (!raw) return null;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  const inner = raw.match(/var\((--[a-z0-9-]+)\)/i)?.[1];
  return inner ? resolveHex(css, inner, depth + 1) : null;
}

describe("type ladder", () => {
  const tokens = read("styles/tokens.css");

  it("defines exactly the seven steps, in px, with 12px as the floor", () => {
    for (const [name, rem] of Object.entries(LADDER_REM)) {
      expect(tokens).toMatch(new RegExp(`--text-${name}: *${rem};`));
    }
    // The one fluid display size. Asserted as a SHAPE (a clamp with a fluid
    // middle term and a rem ceiling) rather than a literal string, so a palette
    // or ratio change updates one file instead of two — but the ceiling is the
    // real guard and it is deliberate: the ladder tops at 44px and the hero tops
    // at 72px. The old 40px ceiling (captain, 2026-09-25) left the home with no
    // focal point, which is the defect UI-guide prompt 05 exists to fix.
    expect(tokens).toMatch(/--text-display: *clamp\(\s*[\d.]+rem,\s*[\d.]+rem \+ [\d.]+vw,\s*[\d.]+rem\s*\);/);
    const displayMax = tokens.match(/--text-display: *clamp\([^;]*?(\d+(?:\.\d+)?)rem\);/);
    expect(displayMax, "--text-display declares a rem maximum").not.toBeNull();
    const ceilingPx = Number(displayMax![1]) * 16;
    expect(ceilingPx, "public hero display ceiling").toBeLessThanOrEqual(72);
    // …and the hero must actually be the biggest thing on the page.
    const topStep = Math.max(...Object.values(LADDER));
    const leadingEdge = Number(
      tokens.match(/--text-display: *clamp\(\s*([\d.]+)rem/)?.[1] ?? 0
    ) * 16;
    expect(leadingEdge, "the hero's small end must out-rank the ladder's top").toBeGreaterThanOrEqual(topStep);
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
    // ONE declaration is not a text size at all: the root font size that carries
    // the global 80% scale (styles/base.css). It is a scale knob, not a rung, so
    // it is allowed by exact selector — never by value, so a view cannot smuggle
    // a `font-size: 80%` in.
    const ROOT_SCALE = /(?:^|\n)html\s*\{[^}]*font-size:\s*[\d.]+%\s*;/;
    // THE ENTRANCE OVERLAY'S WORDS are ARTWORK text scaled to the cloud the
    // office's own reference draws (intro-reference.html: 0.05 and 0.0633 of
    // the cloud's width), clamped to ladder steps at both ends. They are the
    // one proportional type on the site and are named here, so the rule stays
    // exact rather than loosened.
    const ARTWORK_SCALE =
      /^clamp\(var\(--text-\w+\), calc\(var\(--home-intro-cw\) \* 0\.\d+\), var\(--text-[\w-]+\)\)$/;
    for (const file of STYLESHEETS) {
      const source = read(file);
      // COMMENTS ARE PROSE, NOT DECLARATIONS. This gate is about what the
      // stylesheet DOES, so strip comments first — the same discipline
      // composition-pass.test.tsx uses. Without this, a comment that merely
      // mentions "font-size: 80%" is scanned as a declaration and reported as an
      // off-ladder size, which is a false alarm that teaches people to stop
      // documenting the rules.
      const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
      for (const match of css.matchAll(/font-size: *([^;}]+);/g)) {
        const value = match[1].trim();
        // `pt` is allowed only for the printed paper-sheet simulation.
        if (LADDER_TOKENS.has(value) || value.endsWith("pt")) continue;
        if (ARTWORK_SCALE.test(value)) continue;
        if (PAPER_PT_SIZE.test(value)) continue;
        if (file === "styles/base.css" && ROOT_SCALE.test(source) && value.endsWith("%")) continue;
        offenders.push(`${file}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("pins sup/sub to the ladder, because the UA default can break the floor silently", () => {
    // The 80% scale exposed this: `sup`/`sub` carry NO declared size, so the
    // stylesheet scan above cannot see them at all — the browser's own
    // `font-size: smaller` (0.833em of the parent) decides. At the old 17px body
    // step that computed 14.2px and nobody noticed; at the shipped 13.6px step
    // it computes 11.33px, under the hard 12px floor. Measured, on /products.
    // A declaration is therefore required, and this asserts it exists.
    const base = read("styles/base.css");
    const rule = /sup,\s*\nsub\s*\{([^}]*)\}/.exec(base.replace(/\/\*[\s\S]*?\*\//g, ""))?.[1] ?? "";
    expect(rule, "base.css declares an explicit sup/sub size").not.toBe("");
    expect(rule, "sup/sub must ride a ladder token, never `smaller`").toMatch(
      /font-size:\s*var\(--text-[a-z0-9]+\);/
    );
    expect(rule).not.toMatch(/smaller|%/);
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
        ".hero-home__title",
        ".hero-premium__title",
        ".pkg-title",
        // ".sv-page h1" was here. It is gone on purpose: it forced /services's
        // opening up to the hero rung while the other nine public pages opened
        // at the shared page-title step. That page renders `PublicHero` now, so
        // its h1 is owned by `.public-hero__title` (page-title) and one heading
        // has exactly one role.
      ],
    },
  ],
  "page-title": [
    {
      file: "styles/components.css",
      selectors: [
        ".public-hero__title",
        ".app-shell .app-main .page-header h1",
        ".paper-hero__title",
        ".ag-hero__title",
        ".pdp-buy__title",
        // The memorial profile's name is the visitor's name, but the captain's
        // 2026-09-30 rule sets every interior title at the page-title step
        // (35.2px / weight 500) — not the home hero's display rung.
        ".mem-profile__name",
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
        ".gal-walk__title",
        ".app-shell .app-main .page-section-title",
        ".page-section-title",
        ".plan-section-title",
        ".rich-text h2",
        ".rte__host h2",
        ".ag-h2",
        ".ed-section__head h2",
        ".next-steps__title",
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
        ".ledger__row-title",
        ".empty-state__title",
        ".ag-card__title",
        ".capture-section__title",
        ".rich-text h3",
        ".rte__host h3",
        ".shop-card__title",
        ".ag-state__title",
        ".ag-work__title",
        ".ag-action__title",
        ".sv-page .booking-step__title",
        ".mem-step__title",
        ".mem-result__name",
        ".case-card__name",
        ".ops-card__name",
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
 *   · price — a card / line price headline: body + one rung = 20px
 *   · total — a band lead, estimate total, PDP figure: 24px
 *   · stat  — a KPI / stat / finance figure: 24px → the ladder's 24px rung
 *
 * The numbers moved with the 2026-09-27 ladder rebuild (18→20, 22→24). The
 * RULE did not: a figure must not out-shout its own role, and hierarchy comes
 * from weight, colour and spacing rather than size. This gate fails a class
 * bumped back to `--text-2xl`/`--text-3xl`/`--text-display` on the desktop OR
 * the phone rule, naming the class and the measured value.
 */
const FIGURE_CAPS: Array<{ role: string; max: number; selectors: string[] }> = [
  {
    role: "price",
    max: 20,
    selectors: [
      ".shop-card__price",
      ".plan-tier__price",
      ".buy-card__price",
      ".ag-lot__price strong",
    ],
  },
  {
    role: "total",
    max: 24,
    selectors: [
      ".detail-sticky__price",
      ".sb-estimate__total-amount",
      ".sb-estimate__arranged-figure, .sb-arranged__title",
      ".paper-hero__price-value",
      // Six dead entries were removed from this role on 2026-09-28: every one a
      // retired services/ledger class with no markup in app/, components/ or lib/,
      // matched on none of 218 routes x 3 viewports. Naming a dead class here — as
      // this list did — is what kept its rule alive. The manifest of what went is in
      // docs/08-delivery/design-audit-cleanup-design/, not in this file.
      ".fac-room__rate",
    ],
  },
  {
    role: "stat",
    max: 24,
    selectors: [
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
    if (step === "display") return 72;
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

  it("declares TWO faces, each with a job, and both self-hosted", () => {
    // Rebuilt 2026-09-27 (UI-guide prompt 07, "Add a Signature"). The one-face
    // rule produced a product that was clean and forgettable, which is exactly
    // the defect that prompt names. The pairing is deliberate:
    //   display = TeX Gyre Bonum — the CLIENT'S OWN letterhead face, already
    //             vendored for the printed papers, so the website and the
    //             contract a family signs speak in one voice;
    //   ui      = Manrope (office, 2026-09-29) — body, controls, tables,
    //             figures; Inter stays in the stack behind it purely as the
    //             fallback, so a font-load failure degrades to the previous
    //             face rather than a system default.
    // AGENTS.md anticipates this: "a second face means updating
    // tests/unit/typography-system.test.ts in the same PR".
    const tokens = read("styles/tokens.css");
    expect(tokens).toMatch(/--font-display: *"TeX Gyre Bonum"/);
    expect(tokens).toMatch(/--font-sans: *"Manrope", "Inter", system-ui/);
    // `--font-serif` is the display role under its historical name, so the ~60
    // rules written against it adopt the serif instead of silently falling back.
    expect(tokens).toMatch(/--font-serif: *var\(--font-display\)/);
    // The display face must be a real, shipped face — never a hopeful name that
    // falls back to Times on every machine.
    const fonts = read("styles/fonts.css");
    expect(fonts).toMatch(/@font-face\s*\{[^}]*font-family: *"TeX Gyre Bonum"/s);
    expect(existsSync(path.join(ROOT, "public/fonts/paper/texgyrebonum-regular.otf"))).toBe(true);
    // The retired faces stay retired.
    expect(tokens).not.toMatch(/Alegreya|Source Sans 3|Iowan|Palatino/);
  });

  it("ships the Manrope woff2 files and the OFL licence text beside them", () => {
    // The interface face (office, 2026-09-29). Its variable file covers
    // 200–800 and its latin-ext subset carries U+20B1 (checked below). No
    // italic file ships: Manrope has no italic and the product's italic text
    // is the display serif.
    const files = [
      "public/fonts/manrope/manrope-latin.woff2",
      "public/fonts/manrope/manrope-latin-ext.woff2",
      "public/fonts/manrope/OFL.txt",
    ];
    for (const file of files) {
      expect(existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(read(file).length).toBeGreaterThan(0);
    }
    const fonts = read("styles/fonts.css");
    expect(fonts).toMatch(/@font-face\s*\{[^}]*font-family: *"Manrope"/s);
    expect(fonts).not.toContain("Manrope-italic");
  });

  it("keeps the Inter woff2 files as the interface fallback", () => {
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
    expect(fonts).toContain('font-family: "Manrope"');
    expect(fonts).toContain('font-family: "TeX Gyre Bonum"');
  });

  it("keeps the peso sign (U+20B1) inside every shipped latin-ext range", () => {
    const fonts = read("styles/fonts.css");
    // U+20B1 sits inside the latin-ext range U+20AD-20C0: Inter (normal +
    // italic) and Manrope (normal) — three declarations carry it.
    const latinExtCount = fonts.split("U+20AD-20C0").length - 1;
    expect(latinExtCount).toBeGreaterThanOrEqual(3);
    expect(fonts).toContain('font-family: "Inter"');
    expect(fonts).toContain('font-family: "Manrope"');
  });

  it("preloads the interface face's latin subset above the fold", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("/fonts/manrope/manrope-latin.woff2");
    // Inter is the fallback only: it must not be preloaded (it downloads only
    // if Manrope fails), and no retired face may return.
    expect(layout).not.toContain("/fonts/inter/inter-latin.woff2");
    expect(layout).not.toContain("alegreya");
    expect(layout).not.toContain("source-sans-3");
  });
});

describe("ink roles", () => {
  it("keeps every text ink readable — the promise, not a hardcoded hex", () => {
    // Rebuilt 2026-09-27: the ink is a WARM near-black (the old pure #000 on
    // clinical white read cold), and every semantic role is now an alias into
    // the ink/paper ramps. So this guard resolves each role through its var()
    // chain and checks the actual contrast promise — which is the thing that
    // matters, and which the old hardcoded-hex version could not do: it would
    // have kept passing while the ramp underneath it silently changed.
    const tokens = read("styles/tokens.css");
    for (const role of [
      "--color-text-primary",
      "--color-text-secondary",
      "--color-text-muted",
      "--color-text-accent",
      "--color-figure",
    ]) {
      expect(resolveHex(tokens, role), `${role} resolves to a literal hex`).not.toBeNull();
    }

    // Every text ink must clear AA at body size on every light ground the
    // product paints, including the new warm paper and the brass wash.
    const inks = [
      "--color-text-primary",
      "--color-text-secondary",
      "--color-text-muted",
      "--color-text-accent",
      "--color-figure",
    ].map((r) => resolveHex(tokens, r)!);
    const grounds = ["--paper-0", "--paper-100", "--paper-200", "--ink-50"].map(
      (r) => resolveHex(tokens, r)!
    );
    for (const ink of inks) {
      for (const ground of grounds) {
        expect(contrast(ink, ground), `${ink} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }

    // The primary ink must be the darkest thing in the palette — if a lighter
    // value ever wins, hierarchy has inverted.
    const primary = resolveHex(tokens, "--color-text-primary")!;
    const muted = resolveHex(tokens, "--color-text-muted")!;
    expect(relativeLuminance(primary)).toBeLessThan(relativeLuminance(muted));
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
      // gold-300/400/500/600 are decoration: on the page they measure
      // 1.46–3.49:1. gold-700/800 pass AA and remain legal accent text; the
      // inverse golds (100/200) are for text on navy surfaces only.
      // (The `brass-*` alternates this regex used to carry were retired when the
      // byte-identical brass ramp collapsed into gold — see styles/tokens.css.)
      for (const match of read(file).matchAll(
        /(^|[\s{;])color: *var\(--(?:gold-(?:300|400|500|600))\)/g,
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

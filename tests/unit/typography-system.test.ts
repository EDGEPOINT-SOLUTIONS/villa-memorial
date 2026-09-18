/**
 * Typography system — the regression home for the type-voice decision
 * (2026-09-18): the product owns its two typefaces, every rendered size is one
 * of seven ladder steps (12px floor), and the four text inks stay accessible.
 *
 * The reproduced defects this file pins:
 *   1. the product shipped no font files, so every visitor saw different
 *      fallback stacks (Iowan/Palatino/Georgia/system sans/Times/Lucida);
 *   2. 39 rendered text sizes, 21 of them fractional (9.92px, 11.52px,
 *      18.4px, 34.56px…) and 9 below 12px, because each view nudged its own
 *      rem value or clamp();
 *   3. decorative gold tints used as text (gold-300 on white = 1.55:1).
 *
 * If a future change introduces a raw `font-size`, a sub-12px value, a
 * fractional step, a second typeface or a gold-as-text rule, this file fails.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const LADDER_TOKENS = new Set([
  ...[...Object.keys(LADDER)].map((k) => `var(--text-${k})`),
  "var(--text-display)",
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
      /--text-display: *clamp\(2\.25rem, 2rem \+ 1\.6vw, 3\.25rem\);/,
    );
    const steps = Object.values(LADDER);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(12);
  });

  it("has retired the off-ladder tokens", () => {
    for (const dead of ["--text-base", "--text-4xl", "--text-5xl", "--text-title-page", "--text-stat"]) {
      expect(tokens).not.toMatch(new RegExp(`${dead}:`));
    }
  });

  it("keeps every font-size in the stylesheets on a ladder token (no raw values, no clamps, nothing under 12px)", () => {
    const offenders: string[] = [];
    for (const file of STYLESHEETS) {
      for (const match of read(file).matchAll(/font-size: *([^;}]+);/g)) {
        const value = match[1].trim();
        // `pt` is allowed only for the printed paper-sheet simulation.
        if (LADDER_TOKENS.has(value) || value.endsWith("pt")) continue;
        offenders.push(`${file}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
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

describe("typefaces", () => {
  it("actually loads the @font-face file ahead of every stylesheet", () => {
    // Regression: fonts.css existed once but was imported nowhere, so every
    // page kept rendering the OS fallbacks while the test still passed.
    const globals = read("app/globals.css");
    const imports = [...globals.matchAll(/@import "([^"]+)";/g)].map((m) => m[1]);
    expect(imports[0]).toBe("../styles/fonts.css");
  });

  it("declares Alegreya + Source Sans 3 as the product's own faces", () => {
    const tokens = read("styles/tokens.css");
    expect(tokens).toMatch(/--font-serif: *"Alegreya", Georgia, serif;/);
    expect(tokens).toMatch(/--font-sans: *"Source Sans 3", system-ui/);
  });

  it("ships the woff2 files and their OFL licence texts", () => {
    const files = [
      "public/fonts/alegreya/alegreya-latin.woff2",
      "public/fonts/alegreya/alegreya-latin-ext.woff2",
      "public/fonts/alegreya/alegreya-latin-italic.woff2",
      "public/fonts/alegreya/alegreya-latin-ext-italic.woff2",
      "public/fonts/source-sans-3/source-sans-3-latin.woff2",
      "public/fonts/source-sans-3/source-sans-3-latin-ext.woff2",
      "public/fonts/source-sans-3/source-sans-3-latin-italic.woff2",
      "public/fonts/source-sans-3/source-sans-3-latin-ext-italic.woff2",
      "public/fonts/alegreya/OFL.txt",
      "public/fonts/source-sans-3/OFL.txt",
    ];
    for (const file of files) {
      expect(existsSync(path.join(ROOT, file)), file).toBe(true);
      expect(read(file).length).toBeGreaterThan(0);
    }
  });

  it("keeps the peso sign (U+20B1) inside the shipped latin-ext ranges", () => {
    const fonts = read("styles/fonts.css");
    // U+20B1 sits inside the latin-ext range U+20AD-20C0 of both families.
    const latinExtCount = fonts.split("U+20AD-20C0").length - 1;
    expect(latinExtCount).toBeGreaterThanOrEqual(4); // alegreya + source sans, normal + italic
    expect(fonts).toContain("Source Sans 3");
    expect(fonts).toContain("Alegreya");
  });

  it("preloads both latin subsets above the fold", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain("/fonts/alegreya/alegreya-latin.woff2");
    expect(layout).toContain("/fonts/source-sans-3/source-sans-3-latin.woff2");
  });
});

describe("ink roles", () => {
  it("defines the four light-surface inks and keeps them readable (AA at every size)", () => {
    const tokens = read("styles/tokens.css");
    expect(tokens).toMatch(/--color-text-primary: *var\(--navy-900\);/);
    expect(tokens).toMatch(/--color-text-secondary: *var\(--navy-700\);/);
    expect(tokens).toMatch(/--color-text-muted: *var\(--navy-500\);/);
    expect(tokens).toMatch(/--color-text-accent: *var\(--gold-800\);/);

    const inks = ["#0d2942", "#1c4366", "#41709c", "#574300"];
    const surfaces = ["#f2f9fe", "#ffffff"];
    for (const ink of inks) {
      for (const surface of surfaces) {
        expect(contrast(ink, surface), `${ink} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
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

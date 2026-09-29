import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * The home ships a stylesheet — the regression this pins.
 *
 * The rebuilt home (`components/public/home-page.tsx`, 2026-09-27) shipped its
 * markup with NO CSS: `git log -S "home-fork" -- styles/components.css` is empty,
 * so `/` rendered as raw, unstyled HTML for the life of the rebuild. Nothing
 * caught it — `public-page-budget` only checks that the sections RENDER, not that
 * they are styled. This is the class check the home was missing, the same shape as
 * `admin-portal-sweep.test.ts` for the staff portal: every `home-*` class used in
 * the component must have a rule (or be a styled BEM root) in the stylesheets.
 */

const ROOT = process.cwd();
const SOURCE = readFileSync(path.join(ROOT, "components/public/home-page.tsx"), "utf8");
const CSS = ["styles/components.css", "styles/base.css", "styles/utilities.css"]
  .map((file) => readFileSync(path.join(ROOT, file), "utf8"))
  .join("\n");

/** Every `home…` class token a `className=` literal or template names. A
 *  template's `${…}` expressions are stripped first: they are code, and their
 *  tokens (`home-niche${index`) are not class names. Conditional classes inside
 *  an expression are checked by the exact-rule half when they are literals in
 *  the stylesheet's own vocabulary. */
function homeTokens(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const raw = (match[1] ?? match[2] ?? "").replace(/\$\{[^}]*\}/g, " ");
    for (const token of raw.split(/\s+/)) {
      if (/^home(-|$)/.test(token)) found.add(token);
    }
  }
  return [...found];
}

describe("the home ships its stylesheet", () => {
  const defined = new Set([...CSS.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]));
  const namespaces = new Set<string>();
  for (const m of CSS.matchAll(/\.([A-Za-z_][\w-]*?)__/g)) namespaces.add(m[1]);
  for (const m of CSS.matchAll(/\.([A-Za-z_][\w-]*?)--/g)) namespaces.add(m[1]);

  it("uses a real set of home classes (the check cannot pass vacuously)", () => {
    expect(homeTokens(SOURCE).length).toBeGreaterThan(20);
  });

  it("every home class has a rule, or is a styled BEM root", () => {
    const offenders = homeTokens(SOURCE)
      .filter((token) => !defined.has(token) && !namespaces.has(token))
      .sort();
    expect(offenders, `no stylesheet rule for:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("covers every section the page blueprint pins", () => {
    // The seven sections of the approved home-rebuild plan (2026-09-29).
    for (const section of [
      "home-gateway",
      "home-photo",
      "home-park",
      "home-plans",
      "home-services",
      "home-lots",
      "home-contact",
    ]) {
      expect(defined.has(section), section).toBe(true);
    }
  });
});

/** Comments carry prose ("the wash was removed"), so strip them before the
 *  declarations below are read. */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every top-level rule body for an exact selector (a base rule plus any media
 *  or supports re-declaration). */
function ruleBodies(selector: string): string[] {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*${selector.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`,
    "g",
  );
  return [...RULES.matchAll(pattern)].map((match) => match[1]);
}

describe("the gateway's arch and the drawn clouds (office 2026-09-29)", () => {
  it("keeps band 1 white: the gateway declares no ground", () => {
    const bodies = ruleBodies(".home-gateway");
    expect(bodies.length, "the .home-gateway rules exist").toBeGreaterThan(0);
    for (const body of bodies) {
      // No wash, no gradient, no tint — the clouds carry the sky alone.
      expect(body, ".home-gateway paints a ground").not.toMatch(/background/);
    }
  });

  it("carries no arch and no clouds anywhere (office, inbox 032)", () => {
    // Both decorations were removed entirely — the home has no arch at all
    // (page frame or gateway) and no drifting shape. Markup, rules and
    // keyframes are all gone; band 1 is plain white.
    for (const token of ["home-frame", "home-gateway__frame", "home-gateway__arch", "home-gateway__cloud", "CLOUD_PATH"]) {
      expect(SOURCE).not.toContain(token);
    }
    for (const selector of [".home-frame", ".home-gateway__frame", ".home-gateway__arch", ".home-gateway__cloud", "@keyframes home-cloud-drift"]) {
      expect(RULES).not.toContain(selector);
    }
  });

  it("runs the band as a funnel by size, not weight (inbox 032)", () => {
    // Row 1 smallest, row 2 the band's LARGEST at a light weight, row 3 under
    // it — scale carries the hierarchy, never weight.
    const eyebrow = ruleBodies(".home-gateway__place")[0];
    const title = ruleBodies(".home-gateway__title")[0];
    const lead = ruleBodies(".home-gateway__lead")[0];
    expect(eyebrow).toMatch(/font-size:\s*var\(--text-micro\)/);
    expect(title).toMatch(/font-size:\s*var\(--text-hero\)/);
    expect(title).toMatch(/font-weight:\s*500/);
    expect(lead).toMatch(/font-size:\s*var\(--text-lg\)/);
    // The icon row keeps its labels and loses its detail lines.
    expect(SOURCE).not.toContain("fact.note");
    expect(RULES).not.toContain(".home-trust__note");
  });

  it("steps the band down 10px from its 1.5× scale, desktop only (captain, 2026-09-30)", () => {
    // One multiplier drives the display scale and each role then drops 10px,
    // scoped to band 1 and to desktop — nothing else in the product moves. The
    // small steps meet the ladder's 12px floor instead of going under it.
    const at = RULES.indexOf("--gateway-type-scale: 1.5;");
    expect(at, "the gateway scale block exists").toBeGreaterThanOrEqual(0);
    const block = RULES.slice(RULES.lastIndexOf("@media", at), RULES.indexOf("\n}", at));
    expect(block).toContain("@media (min-width: 48.001rem)");
    // The eyebrow drops the 1.5× override entirely: it renders the ladder's
    // 12px micro step (18 − 10 = 8, floored).
    expect(block).not.toMatch(/--text-micro/);
    expect(block).toMatch(
      /--text-hero:\s*calc\(var\(--gateway-type-scale\) \* var\(--text-display\) - 10px\)/,
    );
    expect(block).not.toContain("min(");
    expect(block).toMatch(
      /--text-body:\s*calc\(var\(--gateway-type-scale\) \* var\(--text-lg\) - 10px\)/,
    );
    expect(block).toMatch(
      /--text-ui:\s*max\(var\(--text-xs\), calc\(var\(--gateway-type-scale\) \* var\(--text-md\) - 10px\)\)/,
    );
    // The call grows as a button: padding from the same tokens (unchanged).
    expect(block).toMatch(/padding:\s*calc\(var\(--gateway-type-scale\) \* var\(--space-2\)\)/);
    expect(block).toMatch(/calc\(var\(--gateway-type-scale\) \* var\(--space-4\)\)/);
    // The band's own reduced top gap rides the same desktop block.
    expect(block).toMatch(/\.home > \.home-gateway \{\s*padding-top:\s*var\(--space-7\);\s*\}/);
  });
});

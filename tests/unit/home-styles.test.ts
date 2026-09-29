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

/** The first block that starts with `marker` AND contains `needle` — the
 *  sheet already holds many `prefers-reduced-motion` blocks, so a bare
 *  `indexOf` would read the wrong one. */
function blockWith(marker: string, needle: string): string {
  for (let at = RULES.indexOf(marker); at >= 0; at = RULES.indexOf(marker, at + 1)) {
    const block = RULES.slice(at, RULES.indexOf("\n}", at));
    if (block.includes(needle)) return block;
  }
  throw new Error(`no ${marker} block containing ${needle}`);
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

  it("keeps the arc in band 1 only, a still TRUE CIRCULAR ARCH over the words", () => {
    // The page-wide follow-through frame was removed at the captain's call:
    // the home carries no `.home-frame` layer at all.
    expect(SOURCE).not.toContain("home-frame");
    // The gateway keeps its self-sizing arch, behind the words.
    expect(SOURCE).toContain('className="home-gateway__frame"');
    expect(SOURCE).toContain('className="home-gateway__arch"');
    // A TRUE CIRCULAR ARC over the legs (inbox 031), not the plan's ellipse
    // sweep: viewBox 1000 × 536, head rise 268 (305px at the rendered width),
    // radius 600 — the curve springs from the legs at ~56°.
    expect(SOURCE).toContain('viewBox="0 0 1000 536"');
    expect(SOURCE).toContain('d="M0,536 L0,268 A600,600 0 0 1 1000,268 L1000,536"');
    // The frame is absolutely positioned inside the band and sized from the
    // content box + breathing room, so the arc always clears the words and the
    // legs live in the band's side margin.
    const frame = ruleBodies(".home-gateway__frame")[0];
    expect(frame).toMatch(/position:\s*absolute/);
    expect(frame).toMatch(/width:\s*calc\(100% \+ 2 \* var\(--space-8\)\)/);
    // Still, with a static sky-blue glow, and desktop only.
    const arch = ruleBodies(".home-gateway__arch")[0];
    expect(arch).toMatch(/color:\s*var\(--sky-300\)/);
    expect(arch).toMatch(/drop-shadow/);
    expect(arch).not.toMatch(/animation/);
    const small = blockWith("@media (max-width: 52rem)", ".home-gateway__frame");
    expect(small).toMatch(/\.home-gateway__frame\s*\{\s*display:\s*none/);
  });

  it("carries no clouds at all (office, inbox 031)", () => {
    // Removed entirely: no cloud markup, no cloud rules, no drift keyframes —
    // band 1 is plain white and nothing moves over it.
    expect(SOURCE).not.toContain("home-gateway__cloud");
    expect(SOURCE).not.toContain("CLOUD_PATH");
    expect(RULES).not.toContain(".home-gateway__cloud");
    expect(RULES).not.toContain("@keyframes home-cloud-drift");
  });
});

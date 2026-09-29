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

describe("the page frame and the drawn clouds (office 2026-09-29)", () => {
  it("keeps band 1 white: the gateway declares no ground", () => {
    const bodies = ruleBodies(".home-gateway");
    expect(bodies.length, "the .home-gateway rules exist").toBeGreaterThan(0);
    for (const body of bodies) {
      // No wash, no gradient, no tint — the clouds carry the sky alone.
      expect(body, ".home-gateway paints a ground").not.toMatch(/background/);
    }
  });

  it("draws ONE page arch, in its own layer behind everything", () => {
    // One frame element per page, with its semicircular head, shaft and legs.
    expect((SOURCE.match(/className="home-frame"/g) ?? []).length).toBe(1);
    expect(SOURCE).toContain('className="home-frame__head"');
    expect(SOURCE).toContain('className="home-frame__crown"');
    expect(SOURCE).toContain('className="home-frame__shaft"');
    expect(SOURCE).toContain('className="home-frame__leg home-frame__leg--left"');
    expect(SOURCE).toContain('className="home-frame__leg home-frame__leg--right"');
    // The frame paints at -1 inside `.home`'s own stacking context, so a
    // section, card or photograph always covers the legs and the decoration
    // never lands on top of content.
    const home = ruleBodies(".home").join("\n");
    expect(home).toMatch(/position:\s*relative/);
    expect(home).toMatch(/z-index:\s*0/);
    expect(ruleBodies(".home-frame").join("\n")).toMatch(/z-index:\s*-1/);
  });

  it("stands the arch in the page's own margin, as a true semicircle", () => {
    // Twenty-eight pixels each side (--space-5, inside the office's 20-40px
    // range): the legs run in the margin, clear of a full-width picture.
    const frame = ruleBodies(".home-frame").join("\n");
    expect(frame).toMatch(/inset:\s*0 calc\(-1 \* var\(--space-5\)\)/);
    // The head is a SEMICIRCLE over the legs, not the shallow dome: its height
    // is half the arch width, and the drawn path's radius is half the span, so
    // the curve meets the legs at vertical tangents.
    expect(ruleBodies(".home-frame__head").join("\n")).toMatch(/padding-top:\s*50%/);
    expect(SOURCE).toContain('viewBox="0 0 1000 500"');
    expect(SOURCE).toContain('d="M0,500 A500,500 0 0 1 1000,500"');
    // Desktop only: below the home's own wide-layout breakpoint (52rem) the
    // frame is absent altogether — nothing rendered, nothing animating.
    const small = blockWith("@media (max-width: 52rem)", ".home-frame");
    expect(small).toMatch(/\.home-frame\s*\{\s*display:\s*none/);
    // The glow is on the static head and the leg line itself, never a
    // JavaScript animation.
    expect(ruleBodies(".home-frame__head").join("\n")).toMatch(/drop-shadow/);
    expect(ruleBodies(".home-frame__leg")[0]).toMatch(/drop-shadow/);
  });

  it("tracks the visitor's middle, and closes on the last section's ground", () => {
    // The leg's paint is pinned to the viewport and cut at the viewport's
    // middle — the reader's eye-line — so it follows continuously with the
    // scroll: no thresholds, no JavaScript, no animation-timeline dependency.
    const leg = ruleBodies(".home-frame__leg")[0];
    expect(leg).toMatch(/background-attachment:\s*fixed/);
    expect(leg).toMatch(/linear-gradient\(\s*180deg,\s*var\(--home-frame-ink\) 0 50%/);
    expect(leg).toMatch(/background-size:\s*100% 100vh/);
    // The leg's own box supplies the arch's ends — it starts on the springing
    // line (the shaft's top) and stops at the frame's bottom, the last
    // section's ground, so the frame closes there and never runs past it.
    const shaft = ruleBodies(".home-frame__shaft").join("\n");
    expect(shaft).toMatch(/position:\s*relative/);
    expect(shaft).toMatch(/flex:\s*1/);
    expect(leg).toMatch(/top:\s*0/);
    expect(leg).toMatch(/bottom:\s*0/);
    // Reduced motion: complete and still — a solid full-height leg, not the
    // viewport-fixed tracking paint.
    const reduced = blockWith("@media (prefers-reduced-motion: reduce)", ".home-frame__leg");
    expect(reduced).toMatch(/background-image:\s*none/);
    expect(reduced).toMatch(/background-color:\s*var\(--home-frame-ink\)/);
    expect(reduced).toMatch(/background-attachment:\s*scroll/);
  });

  it("draws the clouds as one reused silhouette, filled from the sky ramp", () => {
    // One shape, reused by three clouds: a single path constant, three uses.
    expect(SOURCE).toContain("const CLOUD_PATH");
    expect((SOURCE.match(/d=\{CLOUD_PATH\}/g) ?? []).length).toBe(3);
    for (const variant of ["a", "b", "c"]) {
      expect(SOURCE).toContain(`className="home-gateway__cloud home-gateway__cloud--${variant}"`);
    }
    // Drawn, not washed: a sky fill with a deeper edge, at the office's 75%
    // opacity — and no background.
    const cloud = ruleBodies(".home-gateway__cloud").join("\n");
    expect(cloud).toMatch(/fill:\s*var\(--sky-/);
    expect(cloud).toMatch(/stroke:\s*var\(--sky-/);
    expect(cloud).toMatch(/opacity:\s*0\.75/);
    expect(cloud).not.toMatch(/background/);
    // The drift is transform-only, so the band never reflows while it moves.
    const drift = blockWith("@keyframes home-cloud-drift", "translate3d");
    expect(drift).toMatch(/transform:\s*translate3d/);
    expect(drift).not.toMatch(/\b(left|top|width|height|margin|padding):/);
  });
});

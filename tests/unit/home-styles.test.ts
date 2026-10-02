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
/** The home is three sibling components: the page plus the two bands it pulls
 *  in as their own module (the cost builder, the plot explorer). */
const HOME_SOURCES = [
  "components/public/home-page.tsx",
  "components/public/home-plot-explorer.tsx",
  "components/public/home-cost-builder.tsx",
];
const SOURCE = HOME_SOURCES.map((file) => readFileSync(path.join(ROOT, file), "utf8")).join("\n");
const CSS = ["styles/components.css", "styles/base.css", "styles/utilities.css"]
  .map((file) => readFileSync(path.join(ROOT, file), "utf8"))
  .join("\n");

/** Every `home…` class token a `className=` literal or template names. A
 *  template's `${…}` expressions are stripped first: they are code, and their
 *  tokens (`home-niche${index`) are not class names. A token left ending in `-`
 *  or `--` is the PREFIX of a BEM modifier built by that expression
 *  (`home-pin--${state}`); it is checked as a prefix below, because the
 *  expression's own value is a literal in the stylesheet's vocabulary. */
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
    const styled = (token: string) =>
      defined.has(token) ||
      namespaces.has(token) ||
      // a `home-x--` prefix: the stylesheet carries at least one of its values
      [...defined].some((name) => name.startsWith(token));
    const offenders = homeTokens(SOURCE).filter((token) => !styled(token)).sort();
    expect(offenders, `no stylesheet rule for:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("renders and styles every band the page blueprint pins", () => {
    // The SIX bands of the 2026-10-02 re-vision, in render order. A band is
    // styled when the stylesheet carries a selector under its name — the block
    // root itself, or any of its BEM children (`__` / `--`), exactly the rule
    // the check above applies to every other home class.
    const selectors = [...CSS.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]);
    for (const section of [
      "home-open",
      "home-arrange",
      "home-lots",
      "home-plans",
      "home-services",
      "home-contact",
    ]) {
      const styled = selectors.some(
        (name) => name === section || name.startsWith(`${section}__`) || name.startsWith(`${section}--`),
      );
      expect(styled, `${section} has no stylesheet rule`).toBe(true);
      expect(SOURCE, `${section} is not rendered`).toContain(section);
    }
  });
});

/** Comments carry prose ("the wash was removed"), so strip them before the
 *  declarations below are read. */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every top-level rule body for an exact selector (a base rule plus any media
 *  or supports re-declaration). A selector inside a GROUP (`.a,\n.b { … }`) is
 *  matched too — the office's rotating title component stamps its own class on
 *  the opening's h1, so that class shares this band's title rule. */
function ruleBodies(selector: string): string[] {
  const pattern = new RegExp(
    `(?:^|\\n)\\s*${selector.replace(/\./g, "\\.")}\\s*(?:,|\\{)([^}]*)\\}`,
    "g",
  );
  return [...RULES.matchAll(pattern)].map((match) => match[1]);
}

describe("the re-visioned home (2026-10-02)", () => {
  it("keeps the opening white: it declares no ground", () => {
    const bodies = ruleBodies(".home-open");
    expect(bodies.length, "the .home-open rules exist").toBeGreaterThan(0);
    for (const body of bodies) {
      // No wash, no gradient, no tint — the type and the one photograph carry
      // the band, and a wash here would fight the photograph beside it.
      expect(body, ".home-open paints a ground").not.toMatch(/background/);
    }
  });

  it("carries no arch and no clouds anywhere (office, inbox 032)", () => {
    // Both decorations were removed entirely — the home has no arch at all
    // (page frame or gateway) and no drifting shape. Markup, rules and
    // keyframes are all gone; the opening is plain white.
    for (const token of ["home-frame", "home-gateway__frame", "home-gateway__arch", "home-gateway__cloud", "CLOUD_PATH"]) {
      expect(SOURCE).not.toContain(token);
    }
    for (const selector of [".home-frame", ".home-gateway__frame", ".home-gateway__arch", ".home-gateway__cloud", "@keyframes home-cloud-drift"]) {
      expect(RULES).not.toContain(selector);
    }
  });

  it("runs the opening as a funnel by SIZE, not weight (captain 2026-10-02)", () => {
    // Row 1 smallest, row 2 the band's LARGEST — scale carries the hierarchy,
    // never weight, and nothing rides a raw rung. There is no third text row:
    // the captain cut the lead paragraph (main, 6dc03dc), so the band is the
    // eyebrow, the headline + its promise line, the actions and the facts.
    const eyebrow = ruleBodies(".home-open__eyebrow")[0];
    const title = ruleBodies(".home-open__title")[0];
    const promise = ruleBodies(".home-open__promise")[0];
    expect(eyebrow).toMatch(/font-size:\s*var\(--text-micro\)/);
    expect(title).toMatch(/font-size:\s*var\(--text-page-title\)/);
    // The promise is the headline's SECOND line, on the same step.
    expect(promise).toMatch(/display:\s*block/);
    // The office's rotating title component (captain, 2026-10-02) renders this
    // band's h1 and stamps ITS class on it — so the same type step and the same
    // promise line must be declared for the component's class too, or the
    // rotating title would fall back to an unstyled h1 mid-page.
    expect(ruleBodies(".home-gateway__title")[0]).toMatch(
      /font-size:\s*var\(--text-page-title\)/,
    );
    expect(ruleBodies(".home-gateway__promise")[0]).toMatch(/display:\s*block/);
    // The retired lead paragraph leaves no rule behind.
    expect(SOURCE).not.toContain("home-open__lead");
    expect(RULES).not.toContain(".home-open__lead");
    // The icon row keeps its labels and loses its detail lines.
    expect(SOURCE).not.toContain("fact.note");
    expect(RULES).not.toContain(".home-trust__note");
  });

  it("types NOTHING above the ladder's own top step (captain 2026-10-02)", () => {
    // The retired 1.5× gateway scale is gone: the page's one display size is
    // the ladder's `--text-page-title`, and no band declares its own scale.
    expect(RULES).not.toContain("--gateway-type-scale");
    for (const body of ruleBodies(".home-open__title")) {
      expect(body).toMatch(/font-size:\s*var\(--text-page-title\)/);
      expect(body).not.toMatch(/font-size:\s*\d+(\.\d+)?px/);
    }
  });

  it("gives every band the SAME content width (captain 2026-10-02)", () => {
    // ONE envelope for the page — the folio — and no band, grid or inner panel
    // declaring a second measure. Only the four TEXT measures below are allowed
    // a `max-width`, because they bound a paragraph, not a band's content.
    const home = ruleBodies(".home")[0];
    expect(home).toMatch(/max-width:\s*var\(--layout-folio-w\)/);

    const band = ruleBodies(".home > section");
    expect(band.length, "the one shared band rule exists").toBeGreaterThan(0);
    for (const body of band) {
      expect(body, "a band declares its own width").not.toMatch(/max-width/);
    }

    const TEXT_MEASURES = new Set([
      "home-open__words", // the opening's prose column
      "home-builder__note", // the builder's note
      "home-lot-detail", // the dossier panel under the list
    ]);
    // Scoped to the home's OWN stylesheet block: the shared `.home-band-head*`
    // grammar lives above it and is no longer the home's, so a paragraph
    // measure there is not a second envelope on `/`. The markers are in the
    // block's own header comment, so the slice is taken on `CSS` and the
    // comments are stripped from the slice afterwards.
    const from = CSS.indexOf("public: home block");
    const to = CSS.indexOf("block's one control-state ground on its allowlist.");
    expect(from, "the home block header is found").toBeGreaterThanOrEqual(0);
    expect(to, "the home block footer is found").toBeGreaterThan(from);
    const block = CSS.slice(from, to).replace(/\/\*[\s\S]*?\*\//g, "");
    const offenders: string[] = [];
    for (const match of block.matchAll(/(?:^|\n)\s*(\.home[\w-]*)\s*\{([^}]*)\}/g)) {
      const selector = match[1].slice(1);
      if (!match[2].includes("max-width")) continue;
      if (selector === "home" || TEXT_MEASURES.has(selector)) continue;
      offenders.push(selector);
    }
    expect(offenders, "a home rule declares a second content width").toEqual([]);
  });
});

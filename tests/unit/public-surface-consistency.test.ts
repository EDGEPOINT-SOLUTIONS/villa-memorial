/**
 * Public surface consistency — the declaration-level home for the public-site
 * sweep of the 2026-09-25 UI/UX renovation.
 *
 * The captain: "all background color should be white, sky blue theme is for
 * buttons only and footer… the look must be sharp, human-made and Apple-inspired,
 * never an AI template."
 *
 * PR #121 (the foundation) made every semantic ground white and confined the sky
 * to controls + the footer. It deliberately left the page-level composition to a
 * dependent sweep. This file is that sweep's guard, and it lives beside its
 * sibling `tests/unit/page-backgrounds.test.ts`:
 *
 *   · that file owns the GROUND tokens and the sky allowlist;
 *   · this file owns the public BANDS, HEROES and MEDIA PLACEHOLDERS — the
 *     surfaces that still carried a decorative gold radial bloom, a white→beige
 *     gradient wash, or a warm marble placeholder on top of the white ground.
 *
 * What it fails, by declaration (vitest runs in `node`; these are cheap and
 * name the exact rule):
 *
 *   1. a decorative `gradient(…)` background on a shared public band or hero;
 *   2. a `marble-*` (warm off-white) background on a public surface — the
 *      grounds are white or the ONE neutral quiet wash (`--color-bg-subtle`);
 *   3. a public media placeholder that does not use the neutral quiet wash.
 *
 * The home hero (`.hero-home`) is deliberately out of scope: the foundation
 * keeps its restrained gold bloom (the captain's one sanctioned exception). The
 * navigation bar (`.anchored-*`) is exempt everywhere — the captain asked for it
 * to be left exactly as it is.
 */
import { describe, expect, it } from "vitest";
import { parseCss, readStyle, selectors, type CssRule } from "../helpers/css-rules";

const RULES = parseCss(readStyle("styles/components.css"));

/** A background declaration value (shorthand, `background-color` or
 *  `background-image`) — the three ways a surface gets its ground. */
const BACKGROUND_DECL = /(?<![-\w])background(?:-color|-image)?\s*:\s*([^;]+);/g;

/** Every background value declared by any rule targeting `selector` (a rule may
 *  be re-declared inside a media query, so a single `find` is not enough). */
function backgroundsFor(selector: string): string[] {
  const out: string[] = [];
  for (const rule of RULES) {
    if (!selectors(rule).includes(selector)) continue;
    for (const m of rule.body.matchAll(BACKGROUND_DECL)) out.push(m[1]);
  }
  return out;
}

function ruleExists(selector: string): boolean {
  return RULES.some((r) => selectors(r).includes(selector));
}

/**
 * Shared public bands and heroes. Each is a page- or band-level ground; none
 * may paint a decorative gradient or a warm marble wash. (`paint` is the flat
 * value the sweep landed, asserted positively below.)
 */
const FLAT_PUBLIC_SURFACES = [
  ".next-steps",
  ".contact-facts",
  ".ia-hero",
  ".hero-premium",
  ".gal-hero",
  ".mem-profile__hero",
  ".plan-statement",
  ".park-map",
  ".media-block",
] as const;

/** Photo placeholders. These sit behind a real photograph (or an honest
 *  "no image yet" initial), so they take the neutral quiet wash — never the
 *  warm marble the white-ground pass retired. */
const NEUTRAL_MEDIA_GROUNDS = [
  ".shop-card__media",
  ".ledger__media",
  ".tier-ledger__media",
  ".plan-tier__media",
  ".casket-sample__media",
  ".tribute-figure img",
  ".pdp-variant__thumb",
  ".pdp-gallery__main",
  ".pdp-gallery__thumb",
  ".pdp-gallery__placeholder",
  ".pdp-zoom__frame",
  ".rail-thumb",
  ".mem-profile__portrait",
  ".mem-rule-card--never",
  // Dead entries were removed from this list on 2026-09-27 and 2026-09-28: every one
  // a retired public band/hero with no markup in app/, components/ or lib/, matched on
  // none of 218 routes x 3 viewports. Naming a dead class here is what kept its rule
  // in the sheet. The manifest of what went is in
  // docs/08-delivery/design-audit-cleanup-design/, not in this file.
] as const;

describe("public bands and heroes are flat — no decorative gradient, no marble", () => {
  it("names the surfaces the product ships (a prune/rename must update this file)", () => {
    const missing = [...FLAT_PUBLIC_SURFACES, ...NEUTRAL_MEDIA_GROUNDS].filter(
      (s) => !ruleExists(s),
    );
    expect(missing, `missing selectors: ${missing.join(", ")}`).toEqual([]);
  });

  it("has no `gradient(` background on a shared public band or hero", () => {
    const offenders: string[] = [];
    for (const selector of FLAT_PUBLIC_SURFACES) {
      for (const value of backgroundsFor(selector)) {
        if (/gradient\(/.test(value)) offenders.push(`${selector} → ${value.trim()}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("has no marble/beige background on a public band, hero or media placeholder", () => {
    const offenders: string[] = [];
    for (const selector of [...FLAT_PUBLIC_SURFACES, ...NEUTRAL_MEDIA_GROUNDS]) {
      for (const value of backgroundsFor(selector)) {
        if (/marble-/.test(value)) offenders.push(`${selector} → ${value.trim()}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("paints the shared closing band on the flat white surface", () => {
    // The band is on every public page (PublicShell / LandingView / NextSteps),
    // so this is the highest-leverage single declaration in the sweep.
    expect(backgroundsFor(".next-steps")).toContain("var(--color-bg-surface)");
  });

  it("paints the media placeholders on the neutral quiet wash", () => {
    for (const selector of NEUTRAL_MEDIA_GROUNDS) {
      const values = backgroundsFor(selector).map((v) => v.trim());
      expect(values, `${selector} declares no background`).not.toHaveLength(0);
      expect(values, `${selector} never takes the neutral wash`).toContain(
        "var(--color-bg-subtle)",
      );
    }
  });
});

describe("the sweep is declaration-level and names its allowlist", () => {
  it("keeps the home hero's sanctioned gold bloom out of this pass's scope", () => {
    // `.hero-home` is the foundation's documented exception; if it is ever
    // flattened that is a captain decision, not a drive-by sweep.
    const hero = RULES.find((r: CssRule) => r.selector === ".hero-home");
    expect(hero, "the .hero-home rule exists").toBeDefined();
    expect(hero!.body).toMatch(/gradient\(/);
  });
});

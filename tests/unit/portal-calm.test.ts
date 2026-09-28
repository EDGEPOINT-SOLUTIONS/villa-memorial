/**
 * Portal calm — the regression home for the captain's 2026-09-25 direction on
 * the two signed-in portals: "the agent and family portals should be
 * professional looking, not an overwhelming ui/ux"; the look must be "sharp,
 * human-made and Apple-inspired, never an AI template".
 *
 * The foundation lane (tests/unit/page-backgrounds.test.ts) whitened the
 * grounds and confined sky to controls + the footer. This guard pins the second
 * half on the portal grammar itself: the shared `ag-*` / `fv-*` kit plus the
 * `portal-*` chrome and the sign-in doors are TYPE + HAIRLINES on white — not a
 * stack of gradient-washed, drop-shadowed cards. A regression that re-adds a
 * decorative gradient, a per-row drop shadow, or a boxed hero fails here and
 * names the exact rule.
 *
 * Declaration-level on purpose (vitest runs in `node`): cheap, and it cannot be
 * satisfied by a stray utility class in a view. The measured before/after lives
 * in docs/08-delivery/portal-calm-design/README.md.
 */
import { describe, expect, it } from "vitest";
import { parseCss, readStyle, selectors, type CssRule } from "../helpers/css-rules";

const RULES: CssRule[] = parseCss(readStyle("styles/components.css"));

/** The portal grammar's own selectors: the agent `ag-*` kit, the family `fv-*`
 *  additions, the shared `portal-*` chrome, the sign-in doors and the shells. */
const PORTAL_SCOPE = /\.(ag-|fv-|portal-|signin-|family-shell)/;

const portalRules = RULES.filter((rule) =>
  selectors(rule).some((selector) => PORTAL_SCOPE.test(selector)),
);

/** A background declaration value (shorthand, `-color` or `-image`). */
function backgroundValues(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(/(?<![-\w])background(?:-color|-image)?\s*:\s*([^;]+);/g)) {
    out.push(m[1]);
  }
  return out;
}

function find(selector: string): CssRule | undefined {
  // Match a selector inside a comma list too (the theme scope combines pairs).
  return RULES.find((rule) => selectors(rule).includes(selector));
}

describe("the portal grammar is type + hairlines on white", () => {
  it("finds the portal grammar this guard is about (never vacuous)", () => {
    expect(portalRules.length).toBeGreaterThanOrEqual(80);
  });

  it("declares no decorative gradient in the portal scope", () => {
    const offenders: string[] = [];
    for (const rule of portalRules) {
      for (const value of backgroundValues(rule.body)) {
        if (!/gradient\(/.test(value)) continue;
        // Two FUNCTIONAL gradients, both sanctioned elsewhere: the loading
        // skeleton's shimmer, and the shared opening band's 2px gold rule
        // (`--gold-hairline`) that matches the home hero + gallery band.
        if (rule.selector.includes("ag-skeleton")) continue;
        if (rule.selector.includes(".ag-hero::before")) continue;
        offenders.push(`${rule.selector} → ${value.trim().slice(0, 70)}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the hero is the shared designed opening band — a surface + gold rule, never a shadow", () => {
    // Captain, 2026-09-25: a page opening is a designed, familiar band, never a
    // bare title on white. The portal hero renders the SAME band the public and
    // admin openings render (the block lives in the "page opening band" section
    // of components.css). It stays flat: one surface, one hairline, one 2px gold
    // rule — no drop shadow, no lift, no decorative gradient on the field.
    const heroRules = RULES.filter((rule) => selectors(rule).includes(".ag-hero"));
    expect(heroRules.length, "the .ag-hero rules exist").toBeGreaterThan(0);
    const body = heroRules.map((rule) => rule.body).join("\n");
    expect(body, "the band paints its own surface").toMatch(/(?<![-\w])background\s*:\s*var\(--color-bg-surface\)/);
    expect(body, "the band carries one hairline").toMatch(
      /(?<![-\w])border\s*:\s*1px solid var\(--color-rule\)/,
    );
    expect(body, "the band takes the large radius").toMatch(
      /border-radius:\s*var\(--radius-lg\)/,
    );
    expect(body).not.toMatch(/box-shadow/);
    const hairline = find(".ag-hero::before");
    expect(hairline, "the band's gold rule exists").toBeDefined();
    expect(hairline!.body).toMatch(/var\(--gold-hairline\)/);
  });

  it("the action band is a hairline separator, not a second shadowed card", () => {
    const action = find(".ag-action");
    expect(action, "the .ag-action rule exists").toBeDefined();
    expect(action!.body).toMatch(/border-top:\s*1px solid var\(--color-border\)/);
    expect(action!.body).not.toMatch(/box-shadow/);
    expect(action!.body).not.toMatch(/(?<![-\w])border-radius/);
  });

  const FLAT_GRAMMAR = [
    ".ag-card",
    ".ag-work",
    ".ag-appt",
    ".ag-money",
    ".ag-quick",
    ".ag-commission",
    ".ag-deal",
    ".ag-lot",
    ".ag-material",
    ".fv-record",
    ".signin-card",
  ];

  it("the card/list grammar sits on hairlines, never a drop shadow", () => {
    const offenders: string[] = [];
    for (const selector of FLAT_GRAMMAR) {
      const rule = find(selector);
      if (!rule) continue;
      if (/box-shadow\s*:/.test(rule.body)) offenders.push(selector);
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("keeps the FUNCTIONAL shadows (map pin, switch knob, focus ring)", () => {
    // These are indicators/controls, not card decoration — the guard must not
    // be satisfied by flattening a pin that has to read over a map, or the
    // switch knob a person grabs.
    expect(find(".ag-map__pin")!.body).toMatch(/box-shadow/);
    expect(find(".fv-switch__track::after")!.body).toMatch(/box-shadow/);
  });

  it("no noisy 5px status edges on the work list (tone lives in the chip)", () => {
    const heavy = portalRules.filter((rule) => /border-left:\s*[45]px/.test(rule.body));
    expect(heavy.map((r) => r.selector)).toEqual([]);
  });

  it("keeps the portal rails and content white (the foundation's ground)", () => {
    for (const selector of [
      ".portal-frame[data-portal=\"agent\"]",
      ".portal-frame[data-portal=\"family\"]",
      ".portal-frame[data-portal=\"agent\"] .portal-sidebar",
      ".portal-frame[data-portal=\"family\"] .portal-sidebar",
      ".portal-frame[data-portal=\"agent\"] .portal-content",
      ".portal-frame[data-portal=\"family\"] .portal-content",
    ]) {
      const rule = find(selector);
      expect(rule, `${selector} must exist`).toBeDefined();
      for (const value of backgroundValues(rule!.body)) {
        expect(value, `${selector} must not carry a sky tint`).not.toMatch(/var\(--sky-\d+\)/);
      }
    }
  });
});

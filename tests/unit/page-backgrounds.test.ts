/**
 * Page backgrounds — the regression home for the captain's 2026-09-25
 * direction: "all background color should be white, sky blue theme is for
 * buttons only and footer".
 *
 * The reproduction that motivated it: every page, section, table and band was
 * washed with a light-sky token, so the product read as a template ("it's
 * making every page feel cheap and very AI"). The brand blue is now a CONTROL
 * colour — primary buttons, selected states, the phone call actions — and the
 * footer surface; every page/surface ground is white.
 *
 * This file is declaration-level on purpose (vitest runs in `node`): it fails
 * on the exact rule or token that regressed, and it cannot be satisfied by a
 * stray utility class in a view. It pins three things:
 *
 *   1. the semantic ground tokens are white and the hairline tokens neutral;
 *   2. every shell / page-ground class paints no sky tint;
 *   3. no stylesheet paints a sky background anywhere except the explicit
 *      allowlist (controls, the footer, the untouched nav bar, tiny status
 *      indicators) — so a new sky wash is a test failure, not a review miss.
 *
 * The navigation BAND (`.anchored-header*`) is deliberately out of scope: the
 * captain asked for it to be left exactly as it is, so its rules are exempt.
 */
import { describe, expect, it } from "vitest";
import { parseCss, readStyle, selectors, type CssRule } from "../helpers/css-rules";

const TOKENS = readStyle("styles/tokens.css");
/** The shared sheets a page ground can be declared in. `fonts.css` is faces
 *  only and `tokens.css` is variables, so neither carries a ground. */
const SHEETS = ["styles/components.css", "styles/base.css", "styles/utilities.css"];

const RULES: CssRule[] = SHEETS.flatMap((file) =>
  parseCss(readStyle(file)).map((rule) => ({ ...rule, selector: rule.selector })),
);

/** A background declaration value (shorthand, `background-color` or
 *  `background-image`) — the three ways a surface gets its ground. */
const BACKGROUND_DECL =
  /(?<![-\w])background(?:-color|-image)?\s*:\s*([^;]+);/g;

function backgroundValues(body: string): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(BACKGROUND_DECL)) out.push(m[1]);
  return out;
}

/** A sky ground = a background value that reaches for a sky primitive or a
 *  sky-role alias. `gold`/`marble`/status washes are not the tell. The inverse
 *  role (`--color-bg-inverse`, sky-900) is a DARK functional label — map pins,
 *  3D tags — so it is only forbidden on a shell/page ground below. */
const hasSkyGround = (value: string) =>
  /var\(--sky-\d+\)/.test(value) || /var\(--color-sky/.test(value);
const hasInverseGround = (value: string) =>
  /var\(--color-bg-inverse\)/.test(value) || /var\(--sky-900\)/.test(value);

describe("the semantic ground tokens are white and the hairlines neutral", () => {
  it("points every page/surface ground at white", () => {
    for (const token of ["--color-bg-page", "--color-bg-surface", "--color-bg-surface-raised", "--color-bg-desk"]) {
      expect(TOKENS, token).toMatch(
        new RegExp(`${token}: *#ffffff;`),
      );
    }
  });

  it("keeps the quiet hover wash neutral, never a sky tint", () => {
    expect(TOKENS).not.toMatch(/--color-bg-subtle: *var\(--sky-/);
    expect(TOKENS).toMatch(/--color-bg-subtle: *var\(--granite-/);
  });

  it("keeps every hairline / rule token off the sky ladder", () => {
    for (const token of ["--color-border", "--color-border-strong", "--color-rule", "--color-rule-strong"]) {
      const value = TOKENS.match(new RegExp(`${token}: *([^;]+);`))?.[1] ?? "";
      expect(value, `${token} still resolves to a sky tint`).not.toMatch(/sky-/);
    }
  });
});

/** The shells and page-ground classes the foundation owns. Each must paint a
 *  white / neutral ground, never a sky wash. `.anchored-footer` is the single
 *  documented exception and is asserted separately below. */
const PAGE_GROUND_SHELLS = [
  ".public-shell",
  ".public-main",
  ".anchored-page",
  ".anchored-mid__inner",
  ".app-shell .app-main",
  ".app-shell .app-topbar",
  ".app-shell .app-sidebar",
  ".family-shell",
  ".family-shell__header",
  ".family-shell__main",
  ".family-shell__footer",
  ".portal-frame",
  ".portal-frame[data-portal=\"agent\"]",
  ".portal-frame[data-portal=\"family\"]",
  ".portal-frame[data-portal=\"agent\"] .portal-sidebar",
  ".portal-frame[data-portal=\"family\"] .portal-sidebar",
  ".portal-frame[data-portal=\"agent\"] .portal-content",
  ".portal-frame[data-portal=\"family\"] .portal-content",
  ".signin-shell",
  ".auth-shell",
  ".fv-signin-scope .signin-shell",
  ".card",
  ".table-wrapper",
  ".empty-state",
  ".hero-home",
  ".sv-page",
  ".ia-hero",
  ".ag-hero",
  ".gal-hero",
  ".mem-profile__hero",
  ".mem-unavailable",
  ".next-steps",
];

describe("every shell / page ground paints white, never a sky wash", () => {
  it("names at least the shells the product ships (a rename must update this file)", () => {
    const shipped = RULES.filter((r) =>
      selectors(r).some((s) => PAGE_GROUND_SHELLS.includes(s)),
    ).length;
    expect(shipped).toBeGreaterThanOrEqual(PAGE_GROUND_SHELLS.length - 3);
  });

  it("has no sky tint in any shell or page-ground class", () => {
    const offenders: string[] = [];
    for (const rule of RULES) {
      for (const selector of selectors(rule)) {
        if (!PAGE_GROUND_SHELLS.includes(selector)) continue;
        for (const value of backgroundValues(rule.body)) {
          if (hasSkyGround(value) || hasInverseGround(value)) {
            offenders.push(`${selector} → ${value.trim()}`);
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});

/**
 * The captain's rule made executable: sky is confined to CONTROLS and the
 * footer. Anything else painting a sky background fails, naming itself.
 * The nav bar (`.anchored-header*` / `.anchored-explore*`) is exempt because
 * the captain asked for it untouched.
 */
const ALLOWED_SKY_GROUNDS: Array<{ match: string; why: string }> = [
  { match: "anchored-header", why: "public nav bar — left exactly as-is (captain)" },
  { match: "anchored-explore", why: "public nav bar (Explore more menu) — untouched" },
  { match: ".anchored-footer", why: "the footer keeps the sky brand surface" },
  { match: ".btn--primary", why: "the one page-commitment button rung" },
  { match: "[aria-pressed=\"true\"]", why: "a pressed toggle is a control state" },
  { match: "[aria-current", why: "a current nav/step item is a control state" },
  { match: ":has(input:checked)", why: "a checked radio/checkbox card is a control state" },
  { match: "input:checked", why: "a checked switch is a control state" },
  { match: ".pill-toggle--active", why: "an active filter pill is a control state" },
  { match: ".quick-call", why: "the home's one-tap call control" },
  { match: ".sv-callbar", why: "the services page's sticky call control" },
  { match: ".portal-topbar__call", why: "the family portal's call control" },
  { match: ".anchored-phonebar__btn--call", why: "the phone bar's call control" },
  { match: ".ag-filter--on", why: "an active agent filter is a control state" },
  { match: ".term-btn__check", why: "the tick inside a selected term button" },
  { match: ".ag-target__fill", why: "the commission target's value bar (data viz)" },
  { match: ".ag-map__pin", why: "a small functional map pin label" },
  { match: ".sv-subnav", why: "the services page's in-page nav chips (a control state)" },
  { match: ".ia-step__num", why: "the immediate-assistance step disc (white numeral)" },
  { match: ".mem-list", why: "the memorial bullet dot (a status indicator)" },
  { match: ".ag-tl__dot", why: "the agent timeline dot (a status indicator)" },
  { match: ".ag-trail__dot", why: "the lead-stage trail dot (a status indicator)" },
  { match: ".lead-trail__dot", why: "the lead-stage trail dot (a status indicator)" },
  { match: ".post-card__avatar", why: "a small identity avatar disc" },
  { match: ".topbar-avatar", why: "the topbar identity avatar disc" },
];

function allowed(selector: string): boolean {
  return ALLOWED_SKY_GROUNDS.some((entry) => selector.includes(entry.match));
}

describe("sky backgrounds are confined to controls and the footer", () => {
  it("finds no sky background outside the allowlist", () => {
    const offenders: string[] = [];
    for (const rule of RULES) {
      for (const value of backgroundValues(rule.body)) {
        if (!hasSkyGround(value)) continue;
        const hits = selectors(rule).filter((s) => !allowed(s));
        if (hits.length > 0) {
          offenders.push(`${hits.join(", ")} → ${value.trim()}`);
        }
      }
    }
    expect(
      offenders,
      `Sky background outside the control/footer allowlist:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps the footer's sky brand surface (the exception, asserted positively)", () => {
    const footer = RULES.find((r) => r.selector === ".anchored-footer");
    expect(footer, "the .anchored-footer rule exists").toBeDefined();
    expect(footer!.body).toMatch(/background:\s*var\(--sky-200\)/);
  });

  it("still ships the sky primary button and the gold item button (identity kept)", () => {
    const primary = RULES.find((r) => r.selector === ".btn--primary");
    const accent = RULES.find((r) => r.selector === ".btn--accent");
    expect(primary!.body).toContain("background: var(--sky-300);");
    expect(accent!.body).toContain("background: var(--gold-400);");
  });
});

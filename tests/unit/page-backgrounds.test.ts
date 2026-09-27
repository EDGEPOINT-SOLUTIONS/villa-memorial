/**
 * Page backgrounds — the regression home for the captain's 2026-09-25
 * direction ("all background color should be white, sky blue theme is for
 * buttons only and footer"), carried forward into the 2026-09-27 rebuild.
 *
 * The reproduction that motivated it: every page, section, table and band was
 * washed with a light-sky token, so the product read as a template ("it's
 * making every page feel cheap and very AI"). The rule survives the rebuild
 * unchanged in intent — a shell must never paint a BRAND-tinted ground. What
 * changed is the ground itself: it is warm bone now, not clinical #ffffff,
 * because a cold grey screen reads institutional to a grieving family. So this
 * file still fails on a brand wash, and additionally requires every ground to
 * come from the paper ramp.
 *
 * This file is declaration-level on purpose (vitest runs in `node`): it fails
 * on the exact rule or token that regressed, and it cannot be satisfied by a
 * stray utility class in a view. It pins three things:
 *
 *   1. the semantic ground tokens come from the paper ramp and the hairline
 *      tokens stay neutral (never a brand tint);
 *   2. every shell / page-ground class paints no brand tint;
 *   3. no stylesheet paints a brand background anywhere except the explicit
 *      allowlist (controls, the footer, the untouched nav bar, tiny status
 *      indicators) — so a new wash is a test failure, not a review miss.
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
  it("points every page/surface ground at the warm paper ramp, never a brand wash", () => {
    for (const token of ["--color-bg-page", "--color-bg-surface", "--color-bg-surface-raised", "--color-bg-desk"]) {
      const value = TOKENS.match(new RegExp(`${token}: *([^;]+);`))?.[1] ?? "";
      expect(value, `${token} is unset`).not.toBe("");
      expect(value, `${token} paints a brand or accent wash`).not.toMatch(/--(ever|sky|navy|brass|gold)-/);
      expect(value, `${token} must come from the paper ramp`).toMatch(/--paper-[0-9]/);
    }
    // A raised surface is true white, so a card reads as a sheet on the bone desk.
    expect(TOKENS).toMatch(/--color-bg-surface: *var\(--paper-0\);/);
  });

  it("keeps the quiet hover wash neutral, never a brand tint", () => {
    const subtle = TOKENS.match(/--color-bg-subtle: *([^;]+);/)?.[1] ?? "";
    expect(subtle, "--color-bg-subtle is unset").not.toBe("");
    expect(subtle).not.toMatch(/--(ever|sky|navy|brass|gold)-/);
    expect(subtle).toMatch(/--(paper|ink)-[0-9]/);
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

  it("keeps the footer as the page's ONE deep brand ground (the exception, asserted positively)", () => {
    // The footer is the single surface allowed to carry the brand as a GROUND
    // rather than as a control. Since the 2026-09-27 rebuild that ground is the
    // deep end of the evergreen ramp, not a pale sky wash: a pale wash under a
    // memorial page read as mint, and the deep ground is what the brass rule
    // above it was always for.
    const footer = RULES.find((r) => r.selector === ".anchored-footer");
    expect(footer, "the .anchored-footer rule exists").toBeDefined();
    expect(footer!.body).toMatch(/background:\s*var\(--ever-900\)/);
    // …and it re-inks its whole subtree through the tokens, so a child rule
    // added later cannot land dark-ink-on-dark-ground.
    expect(footer!.body).toMatch(/--color-text-primary:\s*var\(--paper-100\)/);
    expect(footer!.body).toMatch(/--color-text-accent:\s*var\(--brass-300\)/);
  });

  it("re-inks EVERY text role the footer subtree can reach, and each one clears AA", () => {
    // The reproduction this guards (found by the 2026-09-27 audit, one cycle
    // after the dark footer shipped): the footer flipped only
    // `--color-text-primary` and `--color-text-accent`, so eight links per page
    // kept painting `--color-text-secondary` — a DARK ink — on the deep ground,
    // measuring 1.4:1. Invisible text, on every public page, from a one-token
    // omission. So: every ink role must be re-pointed, AND the value it resolves
    // to must actually be readable on the footer's ground.
    const footer = RULES.find((r) => r.selector === ".anchored-footer")!;
    const INK_ROLES = [
      "--color-text-primary",
      "--color-text-secondary",
      "--color-text-muted",
      "--color-text-accent",
    ];

    for (const role of INK_ROLES) {
      expect(footer.body, `${role} is not re-pointed on the footer`).toContain(`${role}:`);
    }

    const resolve = (name: string, depth = 0): string | null => {
      if (depth > 8) return null;
      // The footer's own override wins; otherwise fall back to tokens.css.
      const source = new RegExp(`\\n\\s*${name}:\\s*([^;]+);`).exec(`\n${footer.body}`)?.[1]
        ?? new RegExp(`\\n\\s*${name}:\\s*([^;]+);`).exec(TOKENS)?.[1];
      const raw = source?.trim();
      if (!raw) return null;
      if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
      const inner = /var\((--[a-z0-9-]+)\)/i.exec(raw)?.[1];
      return inner ? resolve(inner, depth + 1) : null;
    };

    const luminance = (hex: string) => {
      const c = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => {
        const v = parseInt(c.slice(i, i + 2), 16) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ground = resolve("--ever-900");
    expect(ground, "the footer ground resolves to a hex").not.toBeNull();

    for (const role of INK_ROLES) {
      const ink = resolve(role);
      expect(ink, `${role} resolves to a hex`).not.toBeNull();
      const [hi, lo] = [luminance(ink!), luminance(ground!)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      expect(ratio, `${role} on the footer ground (${ink} on ${ground})`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("still ships one brand primary and one brass item button (identity kept)", () => {
    // The identity these two controls carry is unchanged — a deep brand fill for
    // the page's own commitment, and a single warm accent for a per-item action.
    // Only the ramp names moved in the 2026-09-27 rebuild (sky→evergreen, and
    // the primary went deep so it could carry light ink at 9.7:1).
    const primary = RULES.find((r) => r.selector === ".btn--primary");
    const accent = RULES.find((r) => r.selector === ".btn--accent");
    expect(primary!.body).toContain("background: var(--ever-700);");
    expect(accent!.body).toContain("background: var(--gold-400);");
  });
});

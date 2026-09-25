import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHeader } from "@/components/ui/page";
import { PublicHero } from "@/components/public/public-hero";
import { PortalHero } from "@/components/portal/portal-ui";
import { STAFF_NAV } from "@/lib/rbac/nav";
import { parseCss, readSource, readStyle, selectors, type CssRule } from "../helpers/css-rules";

/**
 * Page opening — the regression home for the captain's 2026-09-25 direction:
 * "every page titles or 1st page section is so basic and whack … not a bare
 * title on white."
 *
 * One designed opening band now serves every page in the product: the public
 * interior pages (`.public-hero`), the Admin Portal (`.page-header`) and both
 * signed-in portals (`.ag-hero`). This suite pins, declaration-level (vitest runs
 * in `node`):
 *
 *   1. the three roots SHARE the band — one rule list paints the same surface,
 *      the same hairline and the same radius, so a later edit cannot split them;
 *   2. the composition — the title column leads and the page's action sits at
 *      its end on desktop, stacking on a phone;
 *   3. the lead/support roles the band reads (`page-header__lead`), and the
 *      right-sized page-title step (never the home's display hero);
 *   4. every principal Admin Portal screen passes a lead, so its opening is the
 *      band's one line, not an empty slot.
 */

const RULES: CssRule[] = parseCss(readStyle("styles/components.css"));
const read = (p: string) => readSource(p);

/** Every declaration any rule targeting `selector` carries (a rule may be
 *  re-declared in a media query). */
function bodiesFor(selector: string): string {
  return RULES.filter((rule) => selectors(rule).includes(selector))
    .map((rule) => rule.body)
    .join("\n");
}

const BAND_ROOTS = [".public-hero", ".page-header", ".ag-hero"] as const;

describe("one designed opening band serves every surface", () => {
  it("paints the same surface, hairline and radius on all three roots", () => {
    const shared = RULES.find(
      (rule) => BAND_ROOTS.every((root) => selectors(rule).includes(root)),
    );
    expect(
      shared,
      "one rule list must target .public-hero, .page-header and .ag-hero together",
    ).toBeDefined();
    const body = shared!.body;
    expect(body, "the band's white surface").toMatch(
      /(?<![-\w])background\s*:\s*var\(--color-bg-surface\)/,
    );
    expect(body, "the band's one hairline").toMatch(
      /(?<![-\w])border\s*:\s*1px solid var\(--color-rule\)/,
    );
    expect(body, "the band's radius").toMatch(/border-radius:\s*var\(--radius-lg\)/);
    expect(body, "the band's deliberate whitespace").toMatch(
      /padding:\s*clamp\(1\.5rem, 3vw, 2\.25rem\)/,
    );
  });

  it("carries the product's 2px gold rule on all three roots, never a shadow", () => {
    const hairline = RULES.find(
      (rule) =>
        rule.selector.includes("::before") &&
        BAND_ROOTS.every((root) => selectors(rule).includes(`${root}::before`)),
    );
    expect(hairline, "one ::before rule must target all three band roots").toBeDefined();
    expect(hairline!.body).toMatch(/var\(--gold-hairline\)/);
    for (const root of BAND_ROOTS) {
      const body = bodiesFor(root);
      expect(body, `${root} must not float`).not.toMatch(/box-shadow/);
    }
  });

  it("opens on a page-title, never the home's display hero (no oversizing)", () => {
    const title = RULES.find((rule) => rule.selector === ".public-hero__title");
    expect(title, "the .public-hero__title rule exists").toBeDefined();
    expect(title!.body).toMatch(/font-size:\s*var\(--text-page-title\)/);
  });
});

describe("the band's composition and lead role", () => {
  it("puts the title column first and the action at its end, stacking on a phone", () => {
    const desktop = RULES.filter((rule) => rule.depth === 0 && rule.selector === ".page-header")
      .map((rule) => rule.body)
      .join("\n");
    expect(desktop, "the desktop band is a two-column grid").toMatch(
      /grid-template-columns:\s*minmax\(0, 1fr\) auto/,
    );
    const phone = RULES.filter(
      (rule) =>
        rule.media !== null &&
        /max-width:\s*48rem/.test(rule.media) &&
        rule.selector === ".page-header",
    )
      .map((rule) => rule.body)
      .join("\n");
    expect(phone, "the phone band stacks to one column").toMatch(
      /grid-template-columns:\s*minmax\(0, 1fr\)/,
    );
  });

  it("declares the lead and text roles the band reads", () => {
    const text = RULES.find((rule) => rule.selector === ".page-header__text");
    expect(text, "the .page-header__text rule exists").toBeDefined();
    const lead = RULES.find((rule) => rule.selector === ".page-header__lead");
    expect(lead, "the .page-header__lead rule exists").toBeDefined();
    expect(lead!.body).toMatch(/font-size:\s*var\(--text-lg\)/);
    expect(lead!.body).toMatch(/color:\s*var\(--color-text-secondary\)/);
  });

  it("renders eyebrow · headline · lead · action as one band", () => {
    const html = renderToStaticMarkup(
      createElement(PageHeader, {
        eyebrow: "Operations",
        title: "Cases",
        lead: "Every funeral case the office is handling.",
        actions: createElement("a", { href: "/staff/cases/new" }, "Open a case"),
      }),
    );
    expect(html).toContain('class="page-header"');
    expect(html).toContain('class="page-header__text"');
    expect(html).toContain('class="page-header__eyebrow"');
    expect(html).toContain("<h1>Cases</h1>");
    expect(html).toContain('class="page-header__lead"');
    expect(html).toContain('class="page-header__actions"');
  });

  it("gives the public interior hero the same band, with its lead and action", () => {
    const html = renderToStaticMarkup(
      createElement(PublicHero, {
        variant: "interior",
        eyebrow: "Memorial lots",
        title: "Find a place of rest",
        lead: "Every plot, pictured.",
        primary: { label: "Walk the map", href: "/map" },
      }),
    );
    expect(html).toContain('data-public-hero="interior"');
    expect(html).toContain('class="public-hero__eyebrow"');
    expect(html).toContain('class="public-hero__title"');
    expect(html).toContain('class="public-hero__lead"');
    expect(html).toContain('class="public-hero__actions"');
  });

  it("gives both portals the same band", () => {
    const html = renderToStaticMarkup(
      createElement(PortalHero, {
        eyebrow: "Today",
        title: "Your family",
        lead: "What needs you, and what is already handled.",
      }),
    );
    expect(html).toContain('class="ag-hero"');
    expect(html).toContain('class="ag-hero__title"');
    expect(html).toContain('class="ag-hero__lead"');
  });
});

describe("every principal Admin Portal screen opens on the band's one line", () => {
  it("each nav route's page passes a lead", () => {
    const offenders: string[] = [];
    for (const section of STAFF_NAV) {
      for (const item of section.items) {
        const file = `app/(staff)${item.href}/page.tsx`;
        let source: string;
        try {
          source = read(file);
        } catch {
          offenders.push(`${item.href} → no page at ${file}`);
          continue;
        }
        if (!/lead=/.test(source)) offenders.push(`${item.href} (${file})`);
      }
    }
    expect(offenders, `these screens have no PageHeader lead: ${offenders.join(", ")}`).toEqual([]);
  });
});

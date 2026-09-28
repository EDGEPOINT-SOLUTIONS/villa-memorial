import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inPhone, parseCss, readStyle, ruleFor, type CssRule } from "../helpers/css-rules";
import {
  CONTENT_ENVELOPES,
  CTA_RUNGS,
  GRID,
  HERO,
  IMAGE_CEILINGS,
  PAGE_HEIGHT_CEILINGS,
  PROSE_MEASURE,
  READING_BUDGET,
  SECTION_RHYTHM,
  containerClass,
  ctaClass,
  gridVisibleCount,
  hiddenCount,
  isDisclosureNeeded,
  showAllLabel,
  visibleCount,
} from "@/lib/public-layout";

/**
 * The public layout contract — the regression home for Phase 0 of the captain's
 * public design plan (`data/villa-public-design-plan`, approved 2026-09-21).
 *
 * `lib/public-layout.ts` is the ONE place the numbers live; this suite ties every
 * one of them to the CSS declaration that implements it (or the token that
 * mirrors it), so a later page edit cannot silently widen an envelope, raise a
 * ceiling, change a grid floor or reword a CTA rung. It is deliberately
 * declaration-level (vitest runs in node): it names the exact rule that drifted.
 */

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const RULES = parseCss(readStyle("styles/components.css"));
const TOKENS = read("styles/tokens.css");
const PHONE = inPhone(RULES);

const rule = (selector: string): CssRule => {
  const found = ruleFor(RULES, selector);
  expect(found, `no stylesheet rule for ${selector}`).toBeDefined();
  return found!;
};

function declares(rule: CssRule, property: string, value: RegExp): boolean {
  return new RegExp(`(?<![-\\w])${property}\\s*:\\s*${value.source}`).test(rule.body);
}

describe("content envelopes (plan §4.1)", () => {
  it("the contract's rem widths are the tokens' values", () => {
    for (const envelope of Object.values(CONTENT_ENVELOPES)) {
      expect(TOKENS, envelope.token).toMatch(
        new RegExp(`${envelope.token}: *${envelope.rem}rem;`),
      );
      expect(envelope.px).toBe(envelope.rem * 16);
    }
  });

  it("the prose measure token is the contract value", () => {
    expect(TOKENS).toMatch(new RegExp(`${PROSE_MEASURE.token}: *${PROSE_MEASURE.value};`));
  });

  it("the catalogue and reading envelopes exist and cap the shared container", () => {
    const catalogue = rule(".container--catalogue");
    expect(declares(catalogue, "max-width", /var\(--layout-catalogue-w\)/)).toBe(true);
    const reading = rule(".container--reading");
    expect(declares(reading, "max-width", /var\(--layout-reading-w\)/)).toBe(true);
    // The folio envelope falls back to the class only (it IS .container).
    expect(CONTENT_ENVELOPES.folio.className).toBe("container");
  });

  it("containerClass keeps the shared base and overrides only the width", () => {
    expect(containerClass("folio")).toBe("container");
    expect(containerClass("catalogue")).toBe("container container--catalogue");
    expect(containerClass("reading")).toBe("container container--reading");
  });
});

describe("hero and image ceilings (plan §3 R3/R5, §4.4)", () => {
  it("the phone home hero is capped at the contract's vh", () => {
    const phoneHero = PHONE.find((r) => r.selector === ".hero-home");
    expect(phoneHero, "the phone .hero-home rule exists").toBeDefined();
    expect(
      declares(phoneHero!, "max-height", new RegExp(`${HERO.phoneMaxVh}vh`)),
      `the phone hero must declare max-height: ${HERO.phoneMaxVh}vh`,
    ).toBe(true);
  });

  it("every image role's frame declares its ratio and desktop ceiling", () => {
    for (const [role, ceiling] of Object.entries(IMAGE_CEILINGS)) {
      const frame = rule(`.public-image--${role}`);
      expect(
        declares(frame, "aspect-ratio", new RegExp(ceiling.ratio.replace(/\//g, "\\/"))),
        `${role}: aspect-ratio ${ceiling.ratio}`,
      ).toBe(true);
      if (ceiling.maxRem !== null) {
        expect(
          declares(frame, "max-height", new RegExp(`${ceiling.maxRem}rem`)),
          `${role}: max-height ${ceiling.maxRem}rem`,
        ).toBe(true);
      }
    }
  });

  it("the roles that shrink on a phone declare their phone ceiling", () => {
    for (const [role, ceiling] of Object.entries(IMAGE_CEILINGS)) {
      if (ceiling.phoneMaxRem === undefined) continue;
      const phone = PHONE.find((r) => r.selector.split(",").map((s) => s.trim()).includes(`.public-image--${role}`));
      expect(phone, `${role}: a phone rule`).toBeDefined();
      expect(
        declares(phone!, "max-height", new RegExp(`${ceiling.phoneMaxRem}rem`)),
        `${role}: phone max-height ${ceiling.phoneMaxRem}rem`,
      ).toBe(true);
    }
  });

  it("the home hero ratio is a landscape ratio, never portrait", () => {
    const [w, h] = IMAGE_CEILINGS["home-hero"].ratio.split("/").map((n) => Number(n.trim()));
    expect(w).toBeGreaterThan(h);
    expect(HERO.homeRatio).toBe(IMAGE_CEILINGS["home-hero"].ratio);
  });

  it("an image frame resets the width/height attribute's definite height", () => {
    // The picture inside a ratio frame gets an author height, which outranks the
    // presentational attribute (the trap broken-pages.test.ts records).
    const img = rule(".public-image img");
    expect(declares(img, "height", /100%/)).toBe(true);
    expect(declares(img, "object-fit", /cover/)).toBe(true);
  });
});

describe("the CTA rungs (plan §4.6, settles D8)", () => {
  it("maps the three rungs to the shipped button classes", () => {
    expect(CTA_RUNGS.commit.className).toBe("btn--primary");
    expect(CTA_RUNGS.item.className).toBe("btn--accent");
    expect(CTA_RUNGS.support.className).toBe("btn--secondary");
    expect(ctaClass("commit")).toBe("btn--primary");
    expect(ctaClass("item")).toBe("btn--accent");
    expect(ctaClass("support")).toBe("btn--secondary");
  });

  it("is a one-per-band / one-per-row grammar, not a free-for-all", () => {
    expect(CTA_RUNGS.commit.limit).toMatch(/1 per band/);
    expect(CTA_RUNGS.commit.limit).toMatch(/above the fold/);
    expect(CTA_RUNGS.item.limit).toMatch(/per row/);
  });

  it("the three button classes are shipped", () => {
    for (const rung of Object.values(CTA_RUNGS)) {
      expect(rule(`.${rung.className}`), `${rung.className} exists`).toBeDefined();
    }
  });
});

describe("the catalogue grid and the Show all N disclosure (plan §3 R4/R8)", () => {
  it("the grid floor yields four columns inside the catalogue envelope", () => {
    // 4 × floor + 3 × 24px gap ≤ 1200px content (1152px inside the container pad).
    const contentPx = 1200 - 2 * 24;
    const needed = 4 * GRID.catalogueFloorRem * 16 + 3 * GRID.columnGapRem * 16;
    expect(needed).toBeLessThanOrEqual(contentPx);
    expect(GRID.columnsDesktop).toBe(4);
    expect(GRID.catalogueFloorRem * 16).toBeGreaterThanOrEqual(180);
    expect(GRID.catalogueFloorRem * 16).toBeLessThanOrEqual(320);
  });

  it("the grid declares its floor", () => {
    expect(declares(rule(".public-grid"), "grid-template-columns", /repeat/)).toBe(true);
    const base = rule(".public-grid");
    expect(base.body).toContain(`${GRID.catalogueFloorRem}rem`);
    // The `--cards` modifier of `.public-grid` (a 21rem "card" floor) and
    // `GRID.cardFloorRem` were removed 2026-09-28: they were a "referenced but
    // never used" loop. The only page that renders `.public-grid`
    // (`/lots/price-list-2026`) uses `public-grid catalogue-photos`, so the
    // modifier, the constant and this assertion existed only to justify one
    // another. (Its selector is not spelled out here — naming a dead class in a
    // scanned file, comment included, keeps its rule alive.)
  });

  it("the disclosure threshold and the visible window agree", () => {
    expect(GRID.defaultVisible).toBe(GRID.disclosureAfter);
    expect(visibleCount(5)).toBe(5);
    expect(visibleCount(40)).toBe(GRID.defaultVisible);
    expect(hiddenCount(5)).toBe(0);
    expect(hiddenCount(40)).toBe(40 - GRID.defaultVisible);
    expect(isDisclosureNeeded(GRID.disclosureAfter)).toBe(false);
    expect(isDisclosureNeeded(GRID.disclosureAfter + 1)).toBe(true);
    expect(showAllLabel(24)).toBe("Show all 24");
  });

  it("a card grid shows the plan's 6–8 tiles, a list up to the 12-row window", () => {
    // Plan §3 R8: "a browsable rail shows 6–8 tiles, a list shows ≤ 12 rows".
    expect(GRID.gridVisible).toBeGreaterThanOrEqual(6);
    expect(GRID.gridVisible).toBeLessThanOrEqual(8);
    expect(gridVisibleCount(4)).toBe(4);
    expect(gridVisibleCount(24)).toBe(GRID.gridVisible);
    expect(gridVisibleCount(24)).toBeLessThan(visibleCount(24));
  });

  it("the phone keeps one card per row for the wide card grid", () => {
    expect(GRID.columnsPhone).toBe(1);
    // The floor is min(100%, …), so a 342px phone content box resolves to one.
    expect(rule(".public-grid").body).toMatch(/min\(100%/);
  });
});

describe("the section rhythm and page ceilings (plan §5)", () => {
  it("carries the shared gap and the non-grid section ceiling", () => {
    expect(SECTION_RHYTHM.gap).toBe("clamp(2rem, 4vw, 3.5rem)");
    expect(SECTION_RHYTHM.maxContentHeightRem).toBe(40);
  });

  it("names a ceiling for every public page family, the home included", () => {
    expect(PAGE_HEIGHT_CEILINGS.home).toEqual({ phone: 5, desktop: 4.5 });
    for (const [family, ceiling] of Object.entries(PAGE_HEIGHT_CEILINGS)) {
      expect(ceiling.phone, family).toBeGreaterThan(0);
      expect(ceiling.desktop, family).toBeGreaterThan(0);
    }
  });

  it("the SectionHead grammar is declared", () => {
    for (const selector of [
      ".section-head",
      ".section-head__text",
      ".section-head__kicker",
      ".section-head__title",
      ".section-head__lead",
      ".section-head__action",
    ]) {
      expect(rule(selector), `no ${selector}`).toBeDefined();
    }
    // The title rides the section role, never a raw size.
    expect(rule(".section-head__title").body).toContain("font-size: var(--text-section-title);");
  });

  it("the reading budget matches the numbers the reading guard enforces", () => {
    const guard = read("tests/unit/reading-budget.test.tsx");
    for (const [key, value] of Object.entries(READING_BUDGET)) {
      expect(guard, `reading-budget guard ${key}`).toMatch(
        new RegExp(`${key}: *${value}[,\\s]`),
      );
    }
  });
});

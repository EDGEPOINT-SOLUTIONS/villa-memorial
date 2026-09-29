import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicHero } from "@/components/public/public-hero";
import { CTA_RUNGS, ctaClass } from "@/lib/public-layout";
import { parseCss, readStyle } from "../helpers/css-rules";

/**
 * The 3-rung CTA contract — the regression home for D8 (the page-commitment CTA
 * alternated gold/sky page-to-page: `/services` and `/plans` gold, `/gallery`,
 * `/facilities`, `/memorials` sky).
 *
 * The rule (plan §4.6, captain call 4):
 *   1 commit  sky   — the PAGE's commitment (Pay/Send/Book/Search/Sign in);
 *                     ≤ 1 per band, ≤ 1 above the fold;
 *   2 item    gold  — per-ITEM commerce (Add to quote / Request / Check dates);
 *                     one per row;
 *   3 support outline — back, nav, filters' Clear.
 *
 * A band never shows rung 1 and rung 2 at equal weight. The home hero is the
 * Phase 0 proof surface: it carries ONE commit and ONE support, no per-item
 * gold. The four rollout lanes extend the SURFACES list below as each page moves
 * onto the grammar; the contract itself is fixed here.
 */

const RULES = parseCss(readStyle("styles/components.css"));

describe("the rung → class map", () => {
  it("is the shipped button classes", () => {
    expect(ctaClass("commit")).toBe("btn--primary");
    expect(ctaClass("item")).toBe("btn--accent");
    expect(ctaClass("support")).toBe("btn--secondary");
  });

  it("names the sky/gold/outline colour of each rung", () => {
    expect(CTA_RUNGS.commit.colour).toBe("sky");
    expect(CTA_RUNGS.item.colour).toBe("gold");
    expect(CTA_RUNGS.support.colour).toBe("outline");
  });

  it("never lets an item action stand in for the page's commitment", () => {
    // The home hero used to paint its commitment in the per-item gold. Its
    // action row must not carry an accent button.
    const dead = RULES.filter((r) => r.selector === ".hero-home__actions .btn--accent");
    expect(dead, "the hero's gold primary was retired for the sky commit rung").toEqual([]);
  });
});

describe("the home hero is the proof surface", () => {
  const html = renderToStaticMarkup(
    createElement(PublicHero, {
      variant: "home",
      brandName: "Villa Memorial Park",
      headline: "Honoring every life with dignity and light.",
      subline: "You are not alone.",
      primary: { label: "I need help now", href: "/immediate-assistance" },
      secondary: { label: "Plan ahead", href: "/plans" },
    }),
  );

  it("carries exactly one commit action", () => {
    expect(html.match(/class="btn btn--primary btn--lg"/g) ?? []).toHaveLength(1);
  });

  it("carries its supporting action as rung 3, not a second filled commit", () => {
    expect(html.match(/class="btn btn--secondary btn--lg"/g) ?? []).toHaveLength(1);
  });

  it("carries no per-item gold action in a page-level band", () => {
    expect(html).not.toContain("btn--accent");
  });
});

describe("the call-first hero uses the commit rung for its one action", () => {
  it("renders one sky commit and no gold", () => {
    const html = renderToStaticMarkup(
      createElement(PublicHero, {
        variant: "call-first",
        title: "Call us any hour",
        lead: "A person answers, every hour.",
        primary: { label: "Call 0917 617 8489", href: "tel:+639176178489" },
      }),
    );
    expect(html).toContain('data-public-hero="call-first"');
    expect(html.match(/class="btn btn--primary btn--lg"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("btn--accent");
  });
});

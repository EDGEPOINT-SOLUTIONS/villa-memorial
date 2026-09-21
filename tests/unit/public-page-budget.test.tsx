import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingView, type LandingViewProps } from "@/components/landing/landing-view";
import { listLandingContent } from "@/lib/api-client/landing";
import { LOT_PRICE_CATEGORIES, SENIOR_PAYMENTS, VMP_PAYMENTS } from "@/lib/villa-pricing";

/**
 * The public page budget / section blueprint — Phase 0's home proof surface.
 *
 * The measured audit (plan §2.7 / D9) found the public pages used twelve
 * different hero/section grammars for one job and nothing declared a page's
 * section list, so the next edit could quietly add a 20-section wall. This suite
 * pins, for each migrated surface, the SECTIONS it is allowed to render, in
 * order, plus the shared invariants every public page keeps: one `h1`, the
 * shared primitives in use, and the disclosure where the blueprint calls for it.
 *
 * The home is the only row for now: Phase 0 converts it and the four rollout
 * lanes append their own route (each rendering the real page component) in the
 * PR that sweeps it — the same "a page joins the guard in the PR that changes
 * it" pattern as tests/unit/reading-budget.test.tsx.
 */

type Blueprint = {
  name: string;
  render: () => Promise<string>;
  /** HTML markers in the order the blueprint declares. */
  sections: ReadonlyArray<string>;
  /** A primitive the surface must render (the shared grammar, not a bespoke head). */
  requires?: ReadonlyArray<string>;
};

const BLUEPRINTS: ReadonlyArray<Blueprint> = [
  {
    name: "home (/)",
    render: async () => {
      const content = await listLandingContent();
      const props: Omit<LandingViewProps, "planPricing" | "lotCategories"> = {
        content,
        mapNode: null,
        mapLive: false,
        sectionCount: 0,
      };
      return renderToStaticMarkup(
        LandingView({ ...props, planPricing: { regular: VMP_PAYMENTS, senior: SENIOR_PAYMENTS }, lotCategories: LOT_PRICE_CATEGORIES }),
      );
    },
    // plan §5.1: hero → the four ways → the plan board → the live map → one
    // news story → the closing band (the band is rendered by NextSteps).
    sections: [
      'data-public-hero="home"',
      "about-grid",
      "svc-grid",
      "plan-board",
      "mid-section--map",
      "blog-feed",
      "next-steps",
    ],
    requires: ['data-section-head', 'data-public-disclosure'],
  },
];

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

function positions(html: string, needles: ReadonlyArray<string>): number[] {
  return needles.map((n) => html.indexOf(n));
}

describe("the public page budget / section blueprint", () => {
  for (const page of BLUEPRINTS) {
    describe(page.name, () => {
      let html = "";
      it("renders exactly one h1", async () => {
        html = await page.render();
        expect(count(html, "<h1")).toBe(1);
      });

      it("renders the declared sections, in order", async () => {
        if (!html) html = await page.render();
        const at = positions(html, page.sections);
        at.forEach((pos, i) => {
          expect(pos, `${page.name}: section "${page.sections[i]}" is missing`).toBeGreaterThanOrEqual(0);
          if (i > 0) {
            expect(
              pos,
              `${page.name}: "${page.sections[i]}" must come after "${page.sections[i - 1]}"`,
            ).toBeGreaterThan(at[i - 1]);
          }
        });
      });

      it("renders the shared primitives, not a bespoke head/disclosure", async () => {
        if (!html) html = await page.render();
        for (const marker of page.requires ?? []) {
          expect(html, `${page.name}: missing primitive ${marker}`).toContain(marker);
        }
      });
    });
  }
});

describe("the home's named Phase 0 changes", () => {
  it("removed the left rail's 24/7 call card (captain 2026-09-21)", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      LandingView({
        content,
        mapNode: null,
        mapLive: false,
        sectionCount: 0,
        planPricing: { regular: VMP_PAYMENTS, senior: SENIOR_PAYMENTS },
        lotCategories: LOT_PRICE_CATEGORIES,
      }),
    );
    expect(html).not.toContain("rail-call");
  });

  it("keeps the mission/vision words available behind the shared disclosure", async () => {
    const content = await listLandingContent();
    const html = renderToStaticMarkup(
      LandingView({
        content,
        mapNode: null,
        mapLive: false,
        sectionCount: 0,
        planPricing: { regular: VMP_PAYMENTS, senior: SENIOR_PAYMENTS },
        lotCategories: LOT_PRICE_CATEGORIES,
      }),
    );
    expect(html).toContain("Mission and vision");
    // The words themselves stay in the DOM (the disclosure hides, never drops).
    expect(html).toContain(content.about.mission);
    expect(html).toContain(content.about.vision);
  });
});

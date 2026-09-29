import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingView, type LandingViewProps } from "@/components/landing/landing-view";
import { HomePage } from "@/components/public/home-page";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { LOT_PRICE_CATEGORIES, SENIOR_PAYMENTS, VMP_PAYMENTS } from "@/lib/villa-pricing";
import { CartProvider } from "@/lib/cart/cart-context";

// The lane's pages are server components that render next/link + next/navigation;
// the home proof surface does not, so the harness supplies the same mocks the
// other page tests use.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href?: string; children?: React.ReactNode } & Record<string, unknown>) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/",
  useRouter: () => ({ push: () => {} }),
}));

const { default: PlansPage } = await import("@/app/(public)/plans/page");
const { default: PriceListPage } = await import("@/app/(public)/price-list/page");
const { default: BuilderPage } = await import("@/app/(public)/builder/page");
const { default: PlanDetailPage } = await import("@/app/(public)/plans/[sku]/page");

// The four rollout lanes append their own route here on the PR that sweeps it.
// Lane 4 (identity): the digital-memorial pages (plan §5.9).
const { default: MemorialSearchPage } = await import("@/app/(public)/memorials/page");
const { default: FindMyLovedOnePage } = await import("@/app/(public)/memorials/find/page");
const { default: MemorialPage } = await import("@/app/(public)/memorials/[id]/page");

// Lane 2 (catalogue & grounds): /products, /lots, the 2026 lot price list,
// /gallery (plan §5.3/§5.5/§5.8).
const { default: ProductsPage } = await import("@/app/(public)/products/page");
const { default: LotsPage } = await import("@/app/(public)/lots/page");
const { default: GalleryPage } = await import("@/app/(public)/gallery/page");
const { default: LotPriceListPage } = await import("@/app/(public)/lots/price-list-2026/page");

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
    // The REAL home. This blueprint used to render `LandingView` and call it
    // "home (/)", which was true until the new home landed at `/` — after that it
    // measured the OLD home under the new page's name, and it only kept passing
    // because landing-view.tsx still rendered a hero. Removing that hero
    // (captain, 2026-09-27) exposed it: "home (/) renders exactly one h1" failed
    // against a component that is not on `/` at all.
    //
    // It now renders the page `/` actually serves.
    name: "home (/)",
    render: async () => {
      const [content, pricing] = await Promise.all([
        listLandingContent(),
        loadPricingDocument(),
      ]);
      return renderToStaticMarkup(
        HomePage({
          content,
          planPricing: pricing.plans,
          lotCategories: pricing.lotCategories,
          mapNode: null,
        }),
      );
    },
    // The home's own argument, in order: the promise → who it is for → the two
    // doors → the park → what it feels like. The blog band used to close it and
    // was removed by the captain on 2026-09-27 — `/blog` keeps the full feed and
    // is still linked from the header's "Explore more" menu and the footer, so
    // the page no longer reprints three posts and nothing became unreachable.
    sections: [
      "home-hero",
      "home-trust",
      "home-qualify",
      "home-fork",
      "home-process",
      "home-services",
      "home-caskets",
      "home-plans",
      "home-park",
      "home-gallery",
      "home-feel",
      "home-faq",
    ],
  },
  {
    // The blog (/blog) — where the old anchored catalogue actually renders now.
    // No hero: the captain removed it (2026-09-27), so the shelf leads.
    name: "blog (/blog)",
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
    // The storefront order, under the blog's own interior opening: the shelf →
    // the plan board → the live park map → the About/mission band → the blog
    // feed → the closing band.
    sections: [
      'data-public-hero="interior"',
      "plan-lot-grid",
      "plan-board",
      "mid-section--map",
      "about-grid",
      "blog-feed",
      "next-steps",
    ],
    requires: ['data-section-head', 'data-public-disclosure'],
  },
  {
    name: "plans (/plans)",
    render: async () =>
      renderToStaticMarkup(createElement(CartProvider, null, await PlansPage())),
    // The Lane-3 blueprint: the shared interior hero, then the five-card tier row.
    sections: ['data-public-hero="interior"', 'class="plan-tiers"'],
    requires: ["data-section-head"],
  },
  {
    name: "price list (/price-list)",
    render: async () =>
      renderToStaticMarkup(createElement(CartProvider, null, await PriceListPage())),
    // Hero, then the four disclosed bands in the blueprint's order.
    sections: [
      'data-public-hero="interior"',
      'id="packages"',
      'id="coffins"',
      'id="senior"',
      'id="vmp"',
      'id="prices"',
    ],
    requires: ["data-section-head", "data-public-disclosure"],
  },
  {
    name: "builder (/builder)",
    render: async () =>
      renderToStaticMarkup(createElement(CartProvider, null, await BuilderPage())),
    sections: ['data-public-hero="interior"', 'class="sb-layout"'],
  },
  {
    name: "package detail (/plans/PKG-BASIC)",
    render: async () =>
      renderToStaticMarkup(
        createElement(
          CartProvider,
          null,
          await PlanDetailPage({ params: Promise.resolve({ sku: "PKG-BASIC" }) }),
        ),
      ),
    // The approved package prototype, with the reference detail disclosed.
    sections: [
      'class="plan-page"',
      'class="public-disclosure"',
      "pkg-inclusions",
      'class="mid-section price-module"',
      "tribute-strip",
    ],
    requires: ["data-public-disclosure"],
  },
  {
    // plan §5.9: hero → the privacy rules (one line + the shared disclosure) →
    // the search. The rules keep `id="rules"` before the form (the test's pin).
    name: "/memorials (digital memorial search)",
    render: async () =>
      renderToStaticMarkup(await MemorialSearchPage({ searchParams: Promise.resolve({}) })),
    sections: ['data-public-hero="interior"', 'id="rules"', 'id="search"'],
    requires: ["data-section-head", "data-public-disclosure"],
  },
  {
    // plan §5.9: hero → the office's steps → the family's decision, with what to
    // have ready and the privacy promises behind the shared disclosure.
    name: "/memorials/find (find my loved one)",
    render: async () => renderToStaticMarkup(await FindMyLovedOnePage()),
    sections: ['data-public-hero="interior"', 'id="steps-title"', 'id="ask-title"'],
    requires: ["data-section-head", "data-public-disclosure"],
  },
  {
    // plan §5.9: the single uniform unavailable state (absent AND unpublished).
    name: "/memorials/[id] (unavailable)",
    render: async () =>
      renderToStaticMarkup(
        await MemorialPage({ params: Promise.resolve({ id: "not-published" }) }),
      ),
    sections: ['data-public-hero="interior"', 'id="memorial-why-title"'],
    requires: ["data-section-head", "data-public-disclosure"],
  },
  {
    // plan §5.3: hero → collection index → grid → "Show all N" → the reference
    // band → the inclusions → the closing band. Lane 2's catalogue envelope.
    name: "/products (coffins & caskets)",
    render: async () =>
      renderToStaticMarkup(
        createElement(
          CartProvider,
          null,
          await ProductsPage({ searchParams: Promise.resolve({}) }),
        ),
      ),
    sections: [
      'data-public-hero="interior"',
      "listing-layout",
      'class="shop-grid casket-grid"',
      "coffin-tiers-title",
      "casket-inclusions-title",
    ],
    requires: ["data-section-head", "data-public-disclosure"],
  },
  {
    // plan §5.3: hero → the sticky rail / phone sheet → the plot bands, each
    // band's over-threshold plots behind one "Show all N".
    name: "/lots (memorial lots)",
    render: async () =>
      renderToStaticMarkup(await LotsPage({ searchParams: Promise.resolve({}) })),
    sections: ['data-public-hero="interior"', "listing-layout", "cat-band", "public-disclosure"],
    requires: ["data-public-disclosure"],
  },
  {
    // plan §5.8: hero → three grouped photograph grids → the one /map entry.
    name: "/gallery (grounds)",
    render: async () => renderToStaticMarkup(await GalleryPage()),
    sections: [
      'data-public-hero="interior"',
      'id="park"',
      'id="care"',
      'id="chapels"',
      'id="walk"',
    ],
    requires: ["data-section-head", "data-public-image"],
  },
  {
    // plan §5.3/§5.5: hero → the family photographs → the four rate tables, the
    // first open and the rest disclosed.
    name: "/lots/price-list-2026 (lot price list)",
    render: async () => renderToStaticMarkup(await LotPriceListPage()),
    sections: ['data-public-hero="interior"', "lot-rates-title", "public-disclosure", "price-table"],
    requires: ["data-public-image", "data-public-disclosure"],
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
  it("the left rail leads with the always-reachable help card (captain 2026-09-25)", async () => {
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
    // The retired rail-call class stays retired; the help card ships as .rail-assist.
    expect(html).not.toContain("rail-call");
    expect(html).toContain("rail-assist");
    // The right rail is the short action list.
    expect(html).toContain("rail-action");
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

import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LandingView } from "@/components/landing/landing-view";
import { HomePage } from "@/components/public/home-page";
import { listLandingContent } from "@/lib/api-client/landing";
import { listLots } from "@/lib/api-client/property";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { homeMapEmbed } from "@/lib/home-model";
import { builderCatalog } from "@/lib/service-builder-catalog";
import { LOT_PRICE_CATEGORIES, SENIOR_PAYMENTS, VMP_PAYMENTS } from "@/lib/villa-pricing";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


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
const { default: BlogRoute } = await import("@/app/(public)/blog/page");
const { default: PublicMapPage } = await import("@/app/(public)/map/page");

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
    // The REAL home, rebuilt 2026-09-29 to the captain's approved home-rebuild
    // plan: seven sections in the plan's order. The blueprint is updated to the
    // new sections in the same PR that changed them (the file's own rule).
    name: "home (/)",
    render: async () => {
      const [content, pricing, lots] = await Promise.all([
        listLandingContent(),
        loadPricingDocument(),
        listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
      ]);
      return renderToStaticMarkup(
        withBaskets(
          HomePage({
            content,
            pricing: pricing.plans,
            lotCategories: pricing.lotCategories,
            builder: builderCatalog(pricing, "", []),
            lots,
            mapSrc: homeMapEmbed(null, content.contact.parkAddress).src,
            chapelResources: [],
          }),
        ),
      );
    },
    // The approved plan's seven sections, in order: the gateway → the hero
    // photograph → the first park with the builder and chapels → the five plan
    // tiers → the five service tiles → the lot types with the pinned map → the
    // contact band.
    sections: [
      "home-gateway",
      "home-photo",
      "home-park__grid",
      "home-lot-types",
      "home-niches",
      "home-plates",
      "home-contact__grid",
    ],
  },
  {
    // The blog (/blog) — inbox 016 + 025: the blog's OWN page document leads
    // (heading, intro, one horizontal row per post), then the whole former
    // LandingView layout returns BENEATH it, bands only — the rails, the
    // plans-and-lots grid, the tier board, the live park map, the About band
    // and the newsfeed. No second chrome: PublicShell owns header/footer.
    name: "blog (/blog)",
    render: async () => renderToStaticMarkup(await BlogRoute()),
    sections: [
      "blog-head",
      "blog-rows",
      "anchored-rail--left",
      "plan-lot-grid",
      "plan-board",
      "mid-section--map",
      "about-grid",
    ],
  },
  {
    name: "plans (/plans)",
    render: async () =>
      renderToStaticMarkup(withBaskets( await PlansPage())),
    // The rebuilt pricing surface: the shared interior hero, then the five tier
    // columns, the comparison matrix and the FAQ accordion, in order.
    sections: [
      'data-public-hero="interior"',
      'class="plan-tiers"',
      'class="plan-matrix"',
      'class="plan-faq"',
    ],
  },
  {
    name: "price list (/price-list)",
    render: async () =>
      renderToStaticMarkup(withBaskets( await PriceListPage())),
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
      renderToStaticMarkup(withBaskets( await BuilderPage())),
    sections: ['data-public-hero="interior"', 'class="sb-layout"'],
  },
  {
    name: "package detail (/plans/PKG-BASIC)",
    render: async () =>
      renderToStaticMarkup(
        withBaskets(
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
    // The captain's 2026-09-30 direction: the SEARCH comes first (no hero card),
    // then the privacy explainer with it (`id="rules"`), then the results.
    name: "/memorials (digital memorial search)",
    render: async () =>
      renderToStaticMarkup(await MemorialSearchPage({ searchParams: Promise.resolve({}) })),
    sections: ['id="search"', 'id="rules"'],
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
        withBaskets(
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
    // The park page (captain 2026-09-30): the gateway (Map / Lots actions and
    // the park-facts row) → the designed map band head → the framed canvas.
    // The lots tab is the same page and is covered by /lots' own blueprint.
    name: "/map (Villa Memorial Park)",
    render: async () =>
      renderToStaticMarkup(
        await PublicMapPage({ searchParams: Promise.resolve({}) }),
      ),
    sections: ['data-public-hero="interior"', "park-facts", "home-band-head", "map-shell"],
    requires: ["data-public-hero"],
  },
  {
    // plan §5.3/§5.5: hero → the family photographs → the four rate tables, the
    // first open and the rest disclosed.
    name: "/lots/price-list-2026 (lot price list)",
    render: async () =>
      renderToStaticMarkup(
        withBaskets( await LotPriceListPage()),
      ),
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

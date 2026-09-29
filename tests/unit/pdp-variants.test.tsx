import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuoteBasketProvider } from "@/lib/quote-basket/quote-basket-context";
import { CartProvider } from "@/lib/cart/cart-context";
import { getItemEntry, saveItemEntry } from "@/lib/api-client/content-entries";
import { getProductLine, saveProductLine } from "@/lib/api-client/product-lines";
import { activeVariant, ProductDetail, type PdpVariant } from "@/components/villa/product-detail";
import { COFFIN_SAMPLE_NOTE } from "@/lib/villa-pricing";
import { getCatalogItem, listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { coffinModelForSku } from "@/lib/catalogue-skus";
import type { Session } from "@/lib/auth/types";

/** The public shell provides BOTH baskets; render inside both the way the app does. */
function withBaskets(node: React.ReactNode) {
  return createElement(
    CartProvider,
    null,
    createElement(QuoteBasketProvider, null, node),
  );
}


/**
 * P2 — the PDP variant selector (data/villa-pdp-cms-plan/report.md §5).
 *
 * Pins that selecting a variant swaps the gallery, price and specs; that specs
 * resolve per variant against the line's shared defaults; the imagery fallback
 * states; and the accessible selector contract (a labelled radiogroup, per-radio
 * `aria-checked`, an `aria-live` announcement). The harness is the repo's node
 * test environment + `react-dom/server`: each SKU URL is rendered as its own
 * page, which is exactly what `history.replaceState` navigates to.
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

const { default: CasketDetailPage } = await import("@/app/(public)/products/[sku]/page");
const { default: CatalogItemContentPage } = await import(
  "@/app/(staff)/staff/catalog/[id]/content/page"
);

const SKU_FULL = "CSK-WHITE-ROSE-FULL";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-pdp-variants-"));
  process.env.CONTENT_ENTRIES_STORE_PATH = path.join(dir, "entries.json");
  process.env.PRODUCT_LINES_STORE_PATH = path.join(dir, "lines.json");
});
afterEach(async () => {
  delete process.env.CONTENT_ENTRIES_STORE_PATH;
  delete process.env.PRODUCT_LINES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function renderCart(page: ReactNode): string {
  return renderToStaticMarkup(withBaskets( page));
}

async function renderDetail(sku: string): Promise<string> {
  return renderCart(await CasketDetailPage({ params: Promise.resolve({ sku }) }));
}

/** Every `role="radio"` tag's aria-label → its aria-checked value. */
function radioStates(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tag of html.match(/<button[^>]*role="radio"[^>]*>/g) ?? []) {
    const label = /aria-label="([^"]+)"/.exec(tag)?.[1];
    const checked = /aria-checked="(true|false)"/.exec(tag)?.[1];
    if (label && checked) out[label] = checked;
  }
  return out;
}

/** A White Rose line sibling that is not the SKU under test. */
async function whiteRoseSibling(): Promise<string> {
  const line = await getProductLine("the-white-rose-collection");
  return line!.variantSkus.find((sku) => sku !== SKU_FULL)!;
}

describe("the variant selector", () => {
  it("groups the collection as a labelled radiogroup and marks the URL's model selected", async () => {
    const html = await renderDetail(SKU_FULL);
    // The group carries the accessible name the captain's pattern asks for.
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-labelledby="pdp-variants-label"');
    expect(html).toContain("Choose a model");
    // One radio per sheet model in the collection, with exactly the URL's one checked.
    const states = radioStates(html);
    expect(Object.keys(states)).toHaveLength(6);
    expect(states["White Rose Full casket"]).toBe("true");
    expect(Object.values(states).filter((state) => state === "true")).toHaveLength(1);
    // The swap announces itself and the current price.
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Now showing White Rose Full casket, ₱68,000.00.");
    // The h1 is the selected variant.
    expect(html).toMatch(/<h1[^>]*>White Rose Full casket<\/h1>/);
  });

  it("selects a different model when the per-SKU URL changes", async () => {
    const sibling = await whiteRoseSibling();
    const siblingItem = await getCatalogItem(sibling);
    const html = await renderDetail(sibling);
    const states = radioStates(html);
    expect(states[siblingItem.name]).toBe("true");
    expect(states["White Rose Full casket"]).toBe("false");
    expect(html).toContain(`Now showing ${siblingItem.name}, ${siblingItem.display_price}.`);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${siblingItem.name}</h1>`));
  });
});

describe("a swap swaps the gallery, price and specs", () => {
  it("prints the selected variant's authored gallery and specs, not its sibling's", async () => {
    const sibling = await whiteRoseSibling();
    for (const [sku, tag] of [
      [SKU_FULL, "full"],
      [sibling, "sibling"],
    ] as const) {
      const seed = await getItemEntry(sku);
      await saveItemEntry(
        sku,
        {
          ...seed,
          gallery: [
            {
              id: `g-${tag}`,
              src: `/media/client/${tag}-card-440.webp`,
              alt: `${tag} coffin`,
              caption: `The ${tag} photograph.`,
              sample: false,
            },
          ],
          specs: {
            columns: ["Attribute", "Detail"],
            rows: [["Finish", `${tag} finish`]],
          },
        },
        "editor@vm.demo",
      );
    }

    const fullHtml = await renderDetail(SKU_FULL);
    expect(fullHtml).toContain("/media/client/full-card-440.webp");
    expect(fullHtml).toContain("full finish");
    expect(fullHtml).not.toContain("/media/client/sibling-card-440.webp");
    expect(fullHtml).not.toContain("sibling finish");

    const siblingHtml = await renderDetail(sibling);
    expect(siblingHtml).toContain("/media/client/sibling-card-440.webp");
    expect(siblingHtml).toContain("sibling finish");
    expect(siblingHtml).not.toContain("/media/client/full-card-440.webp");
    expect(siblingHtml).not.toContain("full finish");
  });

  it("prints the selected variant's live catalogue price", async () => {
    const sibling = await whiteRoseSibling();
    const fullItem = await getCatalogItem(SKU_FULL);
    const siblingItem = await getCatalogItem(sibling);

    const fullHtml = await renderDetail(SKU_FULL);
    expect(fullHtml).toContain(
      `<div class="detail-sticky__price">${fullItem.display_price}</div>`,
    );

    const siblingHtml = await renderDetail(sibling);
    expect(siblingHtml).toContain(
      `<div class="detail-sticky__price">${siblingItem.display_price}</div>`,
    );
    if (fullItem.display_price !== siblingItem.display_price) {
      expect(siblingHtml).not.toContain(
        `<div class="detail-sticky__price">${fullItem.display_price}</div>`,
      );
    }
  });

  it("resolves per-variant specs against the line's shared defaults", async () => {
    const line = await getProductLine("the-white-rose-collection");
    await saveProductLine("the-white-rose-collection", {
      ...line,
      sharedSpecs: {
        columns: ["Attribute", "Detail"],
        rows: [["Material", "Metal"]],
      },
    });
    const seed = await getItemEntry(SKU_FULL);
    await saveItemEntry(
      SKU_FULL,
      {
        ...seed,
        specs: { columns: ["Attribute", "Detail"], rows: [["Finish", "Gold"]] },
      },
      "editor@vm.demo",
    );

    const html = await renderDetail(SKU_FULL);
    // The line's shared row and the variant's own delta print in ONE table.
    expect(html).toContain("pdp-specs");
    expect(html).toMatch(/<th scope="row">Material<\/th>/);
    expect(html).toContain("Metal");
    expect(html).toMatch(/<th scope="row">Finish<\/th>/);
    expect(html).toContain("Gold");
    // A line with shared specs but a variant with none still prints the line's row.
    const siblingHtml = await renderDetail(await whiteRoseSibling());
    expect(siblingHtml).toContain("Material");
  });
});

describe("the imagery fallback", () => {
  it("shows the rule-derived sample photograph with its label when a variant authors none", async () => {
    const html = await renderDetail(SKU_FULL);
    expect(html).toContain("casket-sample__media");
    expect(html).toContain(COFFIN_SAMPLE_NOTE);
    expect(html).not.toContain("casket-sample__chip");
    // The authored viewer is absent until the office adds photographs.
    expect(html).not.toContain("pdp-gallery__main");
  });

  it("prefers the variant's own gallery once it has one", async () => {
    const seed = await getItemEntry(SKU_FULL);
    await saveItemEntry(
      SKU_FULL,
      {
        ...seed,
        gallery: [
          {
            id: "g1",
            src: "/media/client/rose-card-440.webp",
            alt: "The White Rose Full coffin",
            caption: "Shown with the full lid raised.",
            sample: false,
          },
        ],
      },
      "editor@vm.demo",
    );
    const html = await renderDetail(SKU_FULL);
    expect(html).toContain("pdp-gallery__main");
    expect(html).not.toContain("casket-sample__media");
  });

  it("states an honest placeholder when a variant has no photographs and no model", async () => {
    const contact = (await listLandingContent()).contact;
    const item = {
      id: 1,
      sku: "CSK-MANUAL-1",
      name: "A manual line model",
      description: null,
      item_type: "package" as const,
      unit_price_cents: 1000,
      currency: "PHP",
      display_price: "₱10.00",
      image: null,
    };
    const variant: PdpVariant = {
      sku: item.sku,
      name: item.name,
      href: "/products/CSK-MANUAL-1",
      model: null,
      item,
      summary: "",
      description: null,
      gallery: [],
      specs: null,
      blocks: [],
      thumb: null,
    };
    const html = renderToStaticMarkup(
      withBaskets(
        createElement(ProductDetail, {
          lineName: "A manual line",
          selectedSku: variant.sku,
          variants: [variant],
          pricesBySku: { [variant.sku]: item.display_price },
          contact,
        }),
      ),
    );
    expect(html).toContain("Photographs for this model are being prepared");
    // Never another variant's photograph silently.
    expect(html).not.toContain("casket-sample__media");
    expect(html).not.toContain("pdp-gallery__main");
  });

  it("activeVariant resolves the URL's SKU and falls back to the first", () => {
    const variant = (sku: string): PdpVariant => ({
      sku,
      name: sku,
      href: `/products/${sku}`,
      model: null,
      item: {
        id: 1,
        sku,
        name: sku,
        description: null,
        item_type: "package",
        unit_price_cents: 1,
        currency: "PHP",
        display_price: "₱0.01",
        image: null,
      },
      summary: "",
      description: null,
      gallery: [],
      specs: null,
      blocks: [],
      thumb: null,
    });
    const variants = [variant("A"), variant("B")];
    expect(activeVariant(variants, "B")?.sku).toBe("B");
    expect(activeVariant(variants, "MISSING")?.sku).toBe("A");
    // Every variant keeps its own per-SKU URL, which the selector syncs to.
    expect(activeVariant(variants, "B")?.href).toBe("/products/B");
  });
});

describe("the line reaches the admin editor", () => {
  function session(scopes: string[]): Session {
    return {
      sub: "00000000-0000-4000-8000-000000000012",
      tenantId: "00000000-0000-4000-8000-000000000001",
      scopes,
      displayName: "Ada Admin",
      email: "admin@vm.demo",
      expiresAt: Date.now() + 60_000,
    } as unknown as Session;
  }

  it("renders the product-line panel for a casket entry", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(
      await CatalogItemContentPage({ params: Promise.resolve({ id: "125" }) }),
    );
    expect(html).toContain("Product line / variants");
    expect(html).toContain("Shared specifications");
    expect(html).toContain("the-white-rose-collection");
    // The panel links each variant to its own item content screen.
    expect(html).toContain("/staff/catalog/125/content");
  });

  it("answers a session without catalog:write with the designed 403", async () => {
    sessionHolder.current = session(["catalog:read"]);
    const html = renderToStaticMarkup(
      await CatalogItemContentPage({ params: Promise.resolve({ id: "125" }) }),
    );
    expect(html).toContain("catalog:write");
    expect(html).not.toContain("Product line / variants");
  });

  it("resolves a casket SKU to a line with real catalogue members", async () => {
    const line = await getProductLine("the-white-rose-collection");
    const items = await listCatalogItems();
    const skus = new Set(items.map((item) => item.sku));
    expect(line!.variantSkus.length).toBeGreaterThan(1);
    for (const sku of line!.variantSkus) {
      expect(skus.has(sku), sku).toBe(true);
      expect(coffinModelForSku(sku)?.collection).toBe("The White Rose Collection");
    }
  });
});

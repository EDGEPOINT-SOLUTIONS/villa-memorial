import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { getItemEntry, saveItemEntry } from "@/lib/api-client/content-entries";
import type { Session } from "@/lib/auth/types";

/**
 * Content-catalogue Phase 4 — the item entry reaches the storefront and the
 * Admin Portal has one editor for it.
 *
 *  - the catalogue item's own page prints the entry's authored description and
 *    blocks (a casket on /products/[sku], a package on /plans/[sku]);
 *  - the catalogue record still owns the name and price;
 *  - /staff/catalog/[id]/content renders the entry editor with the identity
 *    locked, and 403s without catalog:write.
 */

const sessionHolder = vi.hoisted(() => ({ current: null as Session | null }));
vi.mock("@/lib/auth/guard", () => ({
  requireSessionOrRedirect: async () => sessionHolder.current,
}));

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

const { default: CasketDetailPage } = await import("@/app/(public)/products/[sku]/page");
const { default: PlanDetailPage } = await import("@/app/(public)/plans/[sku]/page");
const { default: CatalogItemContentPage } = await import(
  "@/app/(staff)/staff/catalog/[id]/content/page"
);

const USER_ID = "00000000-0000-4000-8000-000000000012";
const TENANT_ID = "00000000-0000-4000-8000-000000000001";

// Fresh durable entry store per test: one suite's save cannot leak into the next.
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "vm-entry-page-"));
  process.env.CONTENT_ENTRIES_STORE_PATH = path.join(dir, "entries.json");
});
afterEach(async () => {
  delete process.env.CONTENT_ENTRIES_STORE_PATH;
  await rm(dir, { recursive: true, force: true });
});

function session(scopes: string[]): Session {
  return {
    sub: USER_ID,
    tenantId: TENANT_ID,
    scopes,
    displayName: "Ada Admin",
    email: "admin@vm.demo",
    expiresAt: Date.now() + 60_000,
  } as unknown as Session;
}

function renderCart(page: ReactNode): string {
  return renderToStaticMarkup(createElement(CartProvider, null, page));
}

describe("an item entry reaches the storefront", () => {
  it("prints the authored description and blocks on the casket detail page", async () => {
    const seed = await getItemEntry("CSK-WHITE-ROSE-FULL");
    await saveItemEntry(
      "CSK-WHITE-ROSE-FULL",
      {
        ...seed,
        summary: "A longer description the office wrote for this model.",
        blocks: [
          {
            id: "dims",
            type: "table",
            heading: "Dimensions",
            caption: null,
            columns: ["Measurement", "Size"],
            rows: [["Length", "2.10 m"], ["Width", "0.75 m"]],
          },
        ],
      },
      "editor@vm.demo",
    );

    const html = renderCart(
      await CasketDetailPage({ params: Promise.resolve({ sku: "CSK-WHITE-ROSE-FULL" }) }),
    );
    expect(html).toContain("A longer description the office wrote for this model.");
    expect(html).toContain("Dimensions");
    expect(html).toContain("2.10 m");
    // The record still owns the name.
    expect(html).toContain("White Rose Full casket");
  });

  it("prints the rich description as semantic HTML, the gallery viewer + rail, and the specs table", async () => {
    const seed = await getItemEntry("CSK-WHITE-ROSE-FULL");
    await saveItemEntry(
      "CSK-WHITE-ROSE-FULL",
      {
        ...seed,
        description: {
          nodes: [
            { type: "heading", level: 2, text: "About the White Rose Full" },
            { type: "paragraph", spans: [{ text: "A solid " }, { text: "hardwood", marks: ["bold"] }] },
            { type: "bulletList", items: [[{ text: "Half lid" }], [{ text: "Full lid" }]] },
          ],
        },
        gallery: [
          {
            id: "g1",
            src: "/media/client/rose-card-440.webp",
            alt: "The White Rose Full coffin",
            caption: "Shown with the full lid raised.",
            sample: false,
          },
          {
            id: "g2",
            src: "/media/client/rose-wide-960.webp",
            alt: "A sample arrangement",
            caption: "Illustrative sample.",
            sample: true,
          },
        ],
        specs: { columns: ["Material", "Finish"], rows: [["Metal", "White and gold"]] },
      },
      "editor@vm.demo",
    );

    const html = renderCart(
      await CasketDetailPage({ params: Promise.resolve({ sku: "CSK-WHITE-ROSE-FULL" }) }),
    );
    // The description is real nodes (an h2, a <strong>, a real list), never HTML.
    expect(html).toContain("About the White Rose Full");
    expect(html).toContain("<strong>hardwood</strong>");
    expect(html).toContain("Half lid");
    expect(html).toContain("pdp-gallery");
    // The viewer's lead photograph, its caption, and the sample photograph's label.
    expect(html).toContain("/media/client/rose-card-440.webp");
    expect(html).toContain("Shown with the full lid raised.");
    expect(html).toContain("Sample photograph");
    // The thumbnail rail is a real, labelled control set.
    expect(html).toContain('aria-label="Show photograph 2 of 2"');
    // The formatted specs table with a row header.
    expect(html).toContain("pdp-specs");
    expect(html).toContain("White and gold");
    expect(html).toMatch(/<th scope="row">Metal<\/th>/);
    // The rule-derived single sample figure is replaced by the authored gallery.
    expect(html).not.toContain("casket-sample__media");
  });

  it("prints the authored description and blocks on the package page", async () => {
    const seed = await getItemEntry("PKG-BASIC");
    await saveItemEntry(
      "PKG-BASIC",
      {
        ...seed,
        summary: "A package description the office wrote.",
        blocks: [
          {
            id: "note",
            type: "note",
            heading: "How to arrange",
            tone: "info",
            text: "Ask the office about the branch nearest you.",
          },
        ],
      },
      "editor@vm.demo",
    );

    const html = renderCart(
      await PlanDetailPage({ params: Promise.resolve({ sku: "PKG-BASIC" }) }),
    );
    expect(html).toContain("A package description the office wrote.");
    expect(html).toContain("How to arrange");
    expect(html).toContain("Ask the office about the branch nearest you.");
    expect(html).toContain("Basic Package");
  });
});

describe("the catalogue admin's item-content editor", () => {
  it("renders the entry editor with the identity locked to the record", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(
      await CatalogItemContentPage({ params: Promise.resolve({ id: "125" }) }),
    );
    expect(html).toContain("Casket entry");
    expect(html).toContain("Content blocks");
    expect(html).toContain("Long description");
    // The three new sections are present with their editors.
    expect(html).toContain("Description");
    expect(html).toContain("Product description");
    expect(html).toContain("Photographs");
    expect(html).toContain("Specifications");
    expect(html).toContain("Add specifications");
    // The identity is read-only, with a link to the catalogue record.
    expect(html).toContain("/staff/catalog/125/edit");
  });

  it("answers a session without catalog:write with the designed 403", async () => {
    sessionHolder.current = session(["catalog:read"]);
    const html = renderToStaticMarkup(
      await CatalogItemContentPage({ params: Promise.resolve({ id: "125" }) }),
    );
    expect(html).toContain("catalog:write");
    expect(html).not.toContain("Content blocks");
  });

  it("offers no content editor for a SKU without an entry", async () => {
    sessionHolder.current = session(["catalog:write"]);
    const html = renderToStaticMarkup(
      await CatalogItemContentPage({ params: Promise.resolve({ id: "104" }) }),
    );
    expect(html).toContain("no page-content entry");
  });
});

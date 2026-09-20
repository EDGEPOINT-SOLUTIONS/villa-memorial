import { describe, expect, it, vi } from "vitest";
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

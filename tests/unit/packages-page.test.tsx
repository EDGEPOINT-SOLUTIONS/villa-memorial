import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { planTierForPackageSku } from "@/lib/catalogue-skus";
import { CLIENT_PHOTOS } from "@/lib/client-photos";
import { PLAN_TIERS } from "@/lib/villa-pricing";
import { COFFIN_TIER_PHOTO_IDS, COFFIN_TIER_NOTE } from "@/lib/villa-pricing";

/**
 * The public packages page (/packages).
 *
 * The defect this suite exists to catch, reported by the captain 2026-09-19:
 * three DIFFERENT plan packages each reprinted the one plan poster, so the
 * package a family chose made no visual difference. The page must give each
 * package its own tier casket photograph — the tier its own catalogue mapping
 * names — and must keep the client's own sample wording on every one of them
 * (the photographs are not reconciled with the sheet's model names).
 */

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const { default: PackagesPage } = await import("@/app/(public)/packages/page");

async function renderPackages(): Promise<string> {
  return renderToStaticMarkup(createElement(CartProvider, null, await PackagesPage()));
}

describe("/packages gives every plan package its own photograph", () => {
  it("maps each catalogue package to a distinct tier photograph", async () => {
    const items = await listCatalogItems("package");
    const ids = items.map((item) => {
      const tier = planTierForPackageSku(item.sku);
      const tierName = tier ? PLAN_TIERS.find((entry) => entry.id === tier)?.name : undefined;
      return tierName ? COFFIN_TIER_PHOTO_IDS[tierName] : undefined;
    });
    expect(items.length).toBeGreaterThanOrEqual(3);
    for (const id of ids) expect(id, "every package SKU maps to a tier").toBeDefined();
    expect(new Set(ids).size, "two packages share one photograph").toBe(ids.length);
    for (const id of ids) expect(Object.keys(CLIENT_PHOTOS)).toContain(id);
  });

  it("renders one card per package, each with its own client photograph", async () => {
    const html = await renderPackages();
    const items = await listCatalogItems("package");
    const srcs = [...html.matchAll(/<img src="(\/media\/client\/[^"]+)"/g)].map((m) => m[1]);
    // One image per card, all distinct (the card, not the 1×/2× srcSet list).
    const perCard = [...html.matchAll(/<figure class="item-card__figure">([\s\S]*?)<\/figure>/g)].map(
      (card) => /<img src="(\/media\/client\/[^"]+)"/.exec(card[1])?.[1],
    );
    expect(perCard.length).toBe(items.length);
    expect(perCard.every(Boolean), "a package card fell back to the plan poster").toBe(true);
    expect(new Set(perCard).size).toBe(perCard.length);
    expect(srcs.length).toBe(items.length);
  });

  it("labels each photograph as the client's own sample, with the sheet's note", async () => {
    const html = await renderPackages();
    const captions = [...html.matchAll(/<figcaption class="item-card__caption">([\s\S]*?)<\/figcaption>/g)];
    expect(captions.length).toBe((await listCatalogItems("package")).length);
    for (const [, caption] of captions) {
      expect(caption).toContain("tier casket");
      expect(caption).toContain("a sample from the client\u2019s own photographs");
      // The sheet's own substitution note rides with every sample photograph.
      expect(caption).toContain(COFFIN_TIER_NOTE);
    }
  });
});

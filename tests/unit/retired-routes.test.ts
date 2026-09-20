import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { PUBLIC_PAGES } from "@/lib/seo";

/**
 * The retired public routes (captain, 2026-09-21).
 *
 * `/packages` lands on the Basic Package detail page and the four plan
 * sub-pages collapsed into the one consolidated Price list page. The redirects
 * live in next.config.ts — a routing-layer redirect, so no retired route 404s
 * AND a redirect never enters the sitemap table (tests/unit/seo.test.ts walks
 * app/(public) and would otherwise demand a public page for it).
 */
describe("the retired public routes redirect", () => {
  it("sends /packages to the Basic Package detail page", async () => {
    const redirects = await nextConfig.redirects!();
    const packs = redirects.find((r) => r.source === "/packages");
    expect(packs, "no /packages redirect").toBeTruthy();
    expect(packs!.destination).toBe("/plans/PKG-BASIC");
    expect(packs!.permanent).toBe(true);
  });

  it("folds the plan sub-pages into the consolidated /price-list", async () => {
    const redirects = await nextConfig.redirects!();
    for (const source of [
      "/plans/villa-memorial-plan",
      "/plans/senior-benefits",
      "/plans/compare",
    ]) {
      const rule = redirects.find((r) => r.source === source);
      expect(rule, `no redirect for ${source}`).toBeTruthy();
      expect(rule!.destination).toBe("/price-list");
      expect(rule!.permanent).toBe(true);
    }
  });

  it("keeps the canonical pages out of the redirect table and in the sitemap", () => {
    // The consolidated page and the plan index are real pages, never redirected.
    const paths = PUBLIC_PAGES.map((page) => page.path);
    expect(paths).toContain("/price-list");
    expect(paths).toContain("/plans");
    for (const retired of [
      "/packages",
      "/plans/villa-memorial-plan",
      "/plans/senior-benefits",
      "/plans/compare",
    ]) {
      expect(paths, retired).not.toContain(retired);
    }
  });
});

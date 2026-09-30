import type { NextConfig } from "next";

/**
 * Next config — the retired public routes (captain, 2026-09-21).
 *
 * `/packages` lands on the Basic Package detail page; the four plan sub-pages
 * collapsed into the one consolidated Price list page, whose only entry point
 * is the grouped "Explore more" menu. Doing it here (a routing-layer redirect)
 * rather than with a `page.tsx` keeps the sitemap table honest: a redirect is
 * not a public page (tests/unit/seo.test.ts walks app/(public)), and no retired
 * route 404s. The destination pairs are pinned by
 * tests/unit/retired-routes.test.ts.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      // The package view answers at /plans/packages now (captain, 2026-09-30):
      // its catalogue SKU is an inventory code, not a page a visitor reads.
      { source: "/plans/PKG-BASIC", destination: "/plans/packages", permanent: true },
      { source: "/plans/PKG-STANDARD", destination: "/plans/packages", permanent: true },
      { source: "/plans/PKG-PREMIUM", destination: "/plans/packages", permanent: true },
      { source: "/packages", destination: "/plans/packages", permanent: true },
      { source: "/plans/villa-memorial-plan", destination: "/price-list", permanent: true },
      { source: "/plans/senior-benefits", destination: "/price-list", permanent: true },
      { source: "/plans/compare", destination: "/price-list", permanent: true },
    ];
  },
};

export default nextConfig;

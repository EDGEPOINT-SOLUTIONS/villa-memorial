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
      { source: "/packages", destination: "/plans/PKG-BASIC", permanent: true },
      { source: "/plans/villa-memorial-plan", destination: "/price-list", permanent: true },
      { source: "/plans/senior-benefits", destination: "/price-list", permanent: true },
      { source: "/plans/compare", destination: "/price-list", permanent: true },
    ];
  },
};

export default nextConfig;

import type { MetadataRoute } from "next";
import { loadPublishedMemorials } from "@/lib/api-client/memorials";
import { listLots } from "@/lib/api-client/property";
import { COFFIN_SKUS } from "@/lib/catalogue-skus";
import { PUBLIC_PAGES, absoluteUrl } from "@/lib/seo";

/**
 * /sitemap.xml — every public page, plus the real detail routes the catalogue
 * and the lot listing currently carry.
 *
 * The static table is `PUBLIC_PAGES` in lib/seo.ts (pinned to the app/(public)
 * tree by tests/unit/seo.test.ts). The detail routes are read from the same
 * stores the pages render from — coffins from the frozen SKU map, lots from the
 * property reads, and ONLY family-published memorials from
 * `lib/api-client/memorials.ts` — so a staff catalogue edit, a new lot or a
 * family's decision to publish appears here on the next crawl. PLAN PACKAGES ARE
 * NOT LISTED PER SKU: since 2026-09-30 the package view answers at the single
 * `/plans/packages` URL (already in PUBLIC_PAGES) and every `/plans/PKG-*` SKU
 * URL 308-redirects there (next.config.ts), so advertising them here would put
 * redirects in the sitemap. A read that fails degrades to the static pages
 * instead of failing the sitemap.
 *
 * force-dynamic: the pages themselves are per-request reads; a build-time
 * sitemap would go stale the moment a staff edit lands.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const coffinPages: MetadataRoute.Sitemap = COFFIN_SKUS.map(({ sku }) => ({
    url: absoluteUrl(`/products/${sku}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  let lotPages: MetadataRoute.Sitemap = [];
  try {
    const lots = await listLots();
    lotPages = lots.map((lot) => ({
      url: absoluteUrl(`/lots/${lot.id}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch {
    // Same degradation as /map: the browse page still publishes the listing.
  }

  // Digital memorials (F-04): ONLY records whose family chose to publish them.
  // The reader drops every other visibility before it can reach a page shape, so
  // this loop cannot leak a private or undecided memorial to a crawler. The
  // fixture store publishes no one (nothing may be fabricated), so today this
  // contributes nothing — deliberately, and the search/find pages above still
  // publish the surface.
  let memorialPages: MetadataRoute.Sitemap = [];
  try {
    const memorials = await loadPublishedMemorials();
    memorialPages = memorials.map((memorial) => ({
      url: absoluteUrl(`/memorials/${encodeURIComponent(memorial.id)}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // A malformed store must never take the whole sitemap down.
  }

  return [...staticPages, ...coffinPages, ...lotPages, ...memorialPages];
}

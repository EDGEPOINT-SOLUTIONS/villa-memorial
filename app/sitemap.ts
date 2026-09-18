import type { MetadataRoute } from "next";
import { listCatalogItems } from "@/lib/api-client/commerce";
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
 * stores the pages render from — coffins from the frozen SKU map, plan packages
 * from the durable catalogue store, lots from the property reads, and ONLY
 * family-published memorials from `lib/api-client/memorials.ts` — so a staff
 * catalogue edit, a new lot or a family's decision to publish appears here on the
 * next crawl. A read that fails (live mode with no public lots path, per /map's
 * documented gap) degrades to the static pages instead of failing the sitemap.
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

  let packagePages: MetadataRoute.Sitemap = [];
  try {
    const packages = await listCatalogItems("package");
    packagePages = packages.map((item) => ({
      url: absoluteUrl(`/plans/${item.sku}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  } catch {
    // The static /plans page still publishes the plan tables — no detail URLs.
  }

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

  return [...staticPages, ...coffinPages, ...packagePages, ...lotPages, ...memorialPages];
}

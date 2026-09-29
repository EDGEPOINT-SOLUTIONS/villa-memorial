import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo";

/**
 * /robots.txt — crawl the public storefront, stay out of everything behind a
 * session or in the middle of a purchase.
 *
 * Disallowed: the staff/family/agent portals, the BFF (`/api`), the sign-in and
 * registration doors, the PLATFORM OPERATOR SURFACE (`/platform/` — tenant
 * management, the platform sign-in and tenant sign-up: operator-only screens a
 * crawler must never index; the platform's own head rule sets noindex too), the
 * quote/checkout/order pages (transactional, and
 * meaningless to a crawler), and the digital-memorial SEARCH RESULT state
 * (`/memorials?…` — a query-keyed page must never become an indexed directory
 * of names). Memorial detail pages stay crawlable because a published memorial
 * is meant to be found; an absent or unpublished one answers `noindex` from its
 * own head (`UNPUBLISHED_MEMORIAL_ROBOTS` in lib/seo.ts) — a robots disallow
 * cannot express that distinction.
 *
 * Everything else — the public pages in app/sitemap.ts — is allowed and linked
 * from the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/staff/",
          "/client/",
          "/agent/",
          "/cart",
          "/quote",
          "/checkout",
          "/orders/",
          "/signin",
          "/login",
          "/register",
          "/platform/",
          "/memorials?",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}

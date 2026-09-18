import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo";

/**
 * /robots.txt — crawl the public storefront, stay out of everything behind a
 * session or in the middle of a purchase.
 *
 * Disallowed: the staff/family/agent portals, the BFF (`/api`), the sign-in and
 * registration doors, and the cart/checkout/order pages (transactional, and
 * meaningless to a crawler). Everything else — the public pages in
 * app/sitemap.ts — is allowed and linked from the sitemap.
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
          "/checkout",
          "/orders/",
          "/signin",
          "/login",
          "/register",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl(),
  };
}

import { structuredDataJson } from "@/lib/seo";
import type { LandingContent } from "@/lib/api-client/landing";

/**
 * The browser-visible JSON-LD block for the public site (LocalBusiness +
 * WebSite — `lib/seo.ts` owns the payload). Server component: the landing
 * content document is read per request like every other public read, so a staff
 * edit to the wordmark, 24/7 number or location reaches the structured data on
 * the next request without a deploy.
 */
export function JsonLd({ content }: { content: LandingContent }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: structuredDataJson(content) }}
    />
  );
}

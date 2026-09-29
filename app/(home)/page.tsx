import type { Metadata } from "next";
import { HomePage } from "@/components/public/home-page";
import { JsonLd } from "@/components/seo/json-ld";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";
import { homePlotInventory } from "@/lib/home-park-inventory";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Villa Funeraria — someone has died? Call us. We come to you.",
  description: SITE_DESCRIPTION,
  path: "/",
});

// Reads the content, pricing and lot stores per request — a staff edit must
// never leave the busiest page in the product serving stale HTML.
export const dynamic = "force-dynamic";

/**
 * The public home — `/` — rebuilt 2026-09-29 to the captain's reference page.
 *
 * This route deliberately sits OUTSIDE `app/(public)`: the reference carries its
 * OWN header nav and footer, whose links are in-page anchors that exist only on
 * the homepage, so it must not inherit `PublicShell`'s shared chrome. The
 * `(home)` route group gives it the root layout alone while every other public
 * page keeps `app/(public)/layout.tsx` untouched. Metadata/JSON-LD and the
 * per-request store reads are unchanged — `HomePage` renders the whole page.
 */
export default async function HomeRoute() {
  const [content, lots, pricing] = await Promise.all([
    listLandingContent(),
    listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
    loadPricingDocument(),
  ]);

  return (
    <>
      {/* The home's two faces are the page's first paint: preload the latin
          subsets so the swap cannot reflow the display headings (React 19
          hoists these into <head>). */}
      <link
        rel="preload"
        href="/fonts/young-serif/young-serif-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/figtree/figtree-latin.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <JsonLd content={content} />
      <HomePage
        content={content}
        planPricing={pricing.plans}
        lotCategories={pricing.lotCategories}
        inventory={homePlotInventory(lots)}
      />
    </>
  );
}

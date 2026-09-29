import type { ReactNode } from "react";
import { HomePage } from "@/components/public/home-page";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";
import { PublicParkMap } from "@/components/public-park-map";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Villa Funeraria — someone has died? Call us. We come to you.",
  description: SITE_DESCRIPTION,
  path: "/",
});

// Reads the content, pricing and lot stores per request — a staff edit must
// never leave the busiest page in the product serving stale HTML.
export const dynamic = "force-dynamic";

/**
 * The public home — REBUILT 2026-09-27 to the seven prompts of the
 * aitooltiphub.com UI guide. `components/public/home-page.tsx` carries the
 * section-by-section mapping to those prompts; this file only gathers the data
 * and hands it over.
 *
 * WHAT MOVED: the previous home was the three-column "anchored catalogue"
 * (LandingView) — rails, band stack, newsfeed. It now lives verbatim at
 * `/blog` (`app/blog/page.tsx`), per the captain's instruction, so nothing was
 * lost. This route renders inside `app/(public)/layout.tsx`, which means it gets
 * the SAME header, footer, phone bar and closing action band as every other
 * public page — one chrome for the whole site, and no second closing grammar.
 *
 * The new home is deliberately NOT a catalogue: it argues (who it is for → the
 * fork → why us → what it feels like) and sends the catalogue elsewhere.
 */
export default async function HomeRoute() {
  const [content, lots, pricing] = await Promise.all([
    listLandingContent(),
    listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
    loadPricingDocument(),
  ]);

  // The live park map, rendered inside the home's winner band. The home is
  // VIEW-ONLY for everyone, exactly like /map (public-map-view-only.test.tsx).
  const mapNode: ReactNode =
    lots.length > 0 ? <PublicParkMap lots={lots} initialPark="villa" /> : null;

  return (
    <HomePage
      content={content}
      planPricing={pricing.plans}
      lotCategories={pricing.lotCategories}
      mapNode={mapNode}
    />
  );
}

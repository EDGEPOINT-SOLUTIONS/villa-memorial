import type { ReactNode } from "react";
import { PublicParkMap } from "@/components/public-park-map";
import { MobileQuickMenu } from "@/components/landing/mobile-quick-menu";
import { LandingView } from "@/components/landing/landing-view";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";

export const metadata = {
  title: "Villa Memorial Park — Memorial & funeral services, Isabela City, Basilan",
  description:
    "Honoring every life with dignity and light — funeral services, memorial plans and garden lots from the first memorial park in Basilan. Anchored catalogue: every service, plan and price one click away.",
};

// Reads the in-process content store + lot listing per request (like /map) — never
// let the home serve stale prerendered HTML after a staff edit lands in the store.
export const dynamic = "force-dynamic";

/**
 * Public landing page (root "/") — the approved three-column "anchored
 * catalogue" home (Lavish villa-landing-plan). Everything on this page renders
 * from the LandingPage content document in the fixture store (same store that
 * feeds lots/plans/services): hero copy, the fixed left/right rails (up to 5
 * staff-picked items each), about/mission/vision, the service editorial
 * sections, the plan card grid and the blog newsfeed. The live interactive
 * park map is the only hard feature: it reads the REAL lot listing, exactly
 * like /map. Staff edit the whole document at /staff/landing.
 */
export default async function LandingPage() {
  const [content, lots, pricing] = await Promise.all([
    listLandingContent(),
    listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
    loadPricingDocument(),
  ]);

  const sectionCount = new Set(lots.map((l) => l.section)).size;

  const mapNode: ReactNode =
    lots.length > 0 ? <PublicParkMap lots={lots} initialPark="villa" /> : null;

  return (
    <>
      <LandingView
        content={content}
        planPricing={pricing.plans}
        lotCategories={pricing.lotCategories}
        mapNode={mapNode}
        mapLive={lots.length > 0}
        sectionCount={sectionCount}
      />
      <MobileQuickMenu content={content} />
    </>
  );
}

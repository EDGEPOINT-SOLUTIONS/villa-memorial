import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { HomeStorefront } from "@/components/landing/home-storefront";
import { HomeSignOverlay } from "@/components/public/home-intro";
import { PublicParkMap } from "@/components/public-park-map";
import { INTRO_COOKIE } from "@/lib/home-intro";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Villa Funeraria — here for you, any hour",
  description: SITE_DESCRIPTION,
  path: "/",
});

// Reads the landing content, pricing and lot stores per request — a staff edit
// must never leave the busiest page in the product serving stale HTML.
export const dynamic = "force-dynamic";

/**
 * The public home (captain, 2026-10-02) — the blog page's design, promoted.
 *
 * "Remove our current Homepage, our blog page will become our homepage" — the
 * anchored storefront that used to render beneath `/blog`'s post list is the
 * home now. The middle column opens on a banner (`HomeBanner`) carrying the
 * office's gateway words, their 24/7 call and the trust facts beside the park
 * photograph, and the storefront's newsfeed band is OFF: the posts live on the
 * new dedicated `/blog` page, so the home lists none.
 *
 * The route only GATHERS what the storefront renders, all of it from the stores
 * that own it: the landing content document (the banner's words and the bands'
 * copy), the pricing store (the plan monthlies and every lot family figure) and
 * the live plot records (the map pins). It renders inside `app/(public)/layout.tsx`,
 * so it keeps the same header, footer, phone bar and closing action band as every
 * other public page.
 *
 * THE ENTRANCE IS PART OF THIS PAGE (office, inbox 058). The route reads the
 * session cookie BEFORE render: an unseen visitor gets the cloud-sign overlay in
 * the very first paint and a returning visitor gets the home alone.
 */
export default async function HomeRoute() {
  const cookieStore = await cookies();
  const introSeen = cookieStore.get(INTRO_COOKIE)?.value === "1";
  const [content, lots, pricing] = await Promise.all([
    listLandingContent(),
    listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
    loadPricingDocument(),
  ]);

  const sectionCount = new Set(lots.map((lot) => lot.section)).size;
  const mapNode: ReactNode =
    lots.length > 0 ? <PublicParkMap lots={lots} initialPark="villa" /> : null;

  return (
    <>
      {/* FIRST in the document: the overlay is parsed before the home's own
          markup, so the first paint is the sign even on a slow parse — no
          flash of the home it is covering. */}
      {introSeen ? null : <HomeSignOverlay welcome={content.home.intro.welcome} />}
      <HomeStorefront
        content={content}
        planPricing={pricing.plans}
        lotCategories={pricing.lotCategories}
        mapNode={mapNode}
        mapLive={lots.length > 0}
        sectionCount={sectionCount}
      />
    </>
  );
}

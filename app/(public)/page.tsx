import { cookies } from "next/headers";
import { HomePage } from "@/components/public/home-page";
import { HomeSignOverlay } from "@/components/public/home-intro";
import { INTRO_COOKIE } from "@/lib/home-intro";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";
import { listResources } from "@/lib/api-client/scheduling";
import { resolveGoogleMapsKey } from "@/lib/api-client/site-config";
import { homeMapEmbed } from "@/lib/home-model";
import { planContentFromDocument } from "@/lib/plan-content";
import { builderCatalog } from "@/lib/service-builder-catalog";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Villa Funeraria — someone has died? Call us. We come to you.",
  description: SITE_DESCRIPTION,
  path: "/",
});

// Reads the content, pricing, lot and catalogue stores per request — a staff
// edit must never leave the busiest page in the product serving stale HTML.
export const dynamic = "force-dynamic";

/**
 * The public home — rebuilt to the approved home-rebuild plan (2026-09-29).
 *
 * This route only GATHERS what the seven sections render, all of it from the
 * stores that own it:
 *   · the landing content document — the sections' words, actions and pictures,
 *     edited per section at /staff/landing/home;
 *   · the pricing store — the five plan monthlies and every lot family figure;
 *   · the live catalogue + the 2026 sheets — the builder's options;
 *   · the plot records — every recorded plot's own outline, for the map pins;
 *   · the server-side site config — the Google Maps key, read HERE and turned
 *     into the embed URL before the page serialises, so the key never reaches
 *     public JavaScript. With no key the map falls back to the keyless classic
 *     embed the plan uses.
 *
 * It renders inside `app/(public)/layout.tsx`, so it keeps the same header,
 * footer, phone bar and closing action band as every other public page.
 *
 * THE ENTRANCE IS PART OF THIS PAGE (office, inbox 058). The route reads the
 * session cookie BEFORE render: an unseen visitor gets the cloud-sign overlay
 * in the very first paint (motion already running in CSS, home rendered
 * underneath) and a returning visitor gets the home alone. No client-side
 * redirect, so no homepage flash and no blank hop through a second route.
 */
export default async function HomeRoute() {
  const cookieStore = await cookies();
  const introSeen = cookieStore.get(INTRO_COOKIE)?.value === "1";
  const [content, lots, pricing, catalogItems, plansPage, mapsKey, resources] = await Promise.all([
    listLandingContent(),
    listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
    loadPricingDocument(),
    listCatalogItems().catch(() => []),
    getPageDocument("plans").catch(() => null),
    resolveGoogleMapsKey(),
    listResources().catch(() => []),
  ]);

  // The catalogue is the LIVE selling record, so the builder's options quote what
  // the office actually charges today; the 2026 sheet is the module's fallback.
  const builder = builderCatalog(pricing, planContentFromDocument(plansPage).notes.contestability, catalogItems);
  const mapSrc = homeMapEmbed(mapsKey.key, content.contact.parkAddress).src;
  // The chapel card's capacity is a scheduling fact, not page copy.
  const chapelResources = resources
    .filter((resource) => resource.resource_type === "chapel")
    .map((resource) => ({ id: resource.id, name: resource.name, capacity: resource.capacity }));

  return (
    <>
      {/* FIRST in the document: the overlay is parsed before the home's own
          markup, so the first paint is the sign even on a slow parse — no
          flash of the home it is covering. */}
      {introSeen ? null : (
        <HomeSignOverlay hello={content.home.intro.hello} welcome={content.home.intro.welcome} />
      )}
      <HomePage
        content={content}
        pricing={pricing.plans}
        lotCategories={pricing.lotCategories}
        builder={builder}
        lots={lots}
        mapSrc={mapSrc}
        chapelResources={chapelResources}
      />
    </>
  );
}

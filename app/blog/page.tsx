import type { ReactNode } from "react";
import { PublicParkMap } from "@/components/public-park-map";
import { MobileQuickMenu } from "@/components/landing/mobile-quick-menu";
import { LandingView } from "@/components/landing/landing-view";
import { JsonLd } from "@/components/seo/json-ld";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";
import { SITE_DESCRIPTION, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Villa Funeraria — news, guides and notes from the park",
  description: SITE_DESCRIPTION,
  path: "/blog",
});

// Same rationale as the home it came from: the LandingPage document, the lot
// listing and the pricing store are all read per request, so a staff edit lands
// immediately instead of waiting for a rebuild.
export const dynamic = "force-dynamic";

/**
 * `/blog` — the FORMER public home, moved here verbatim (2026-09-27).
 *
 * The captain's instruction was that the existing home becomes the blog page
 * while a new home is designed at `/`. It is reproduced here byte-for-byte
 * rather than trimmed, so that nothing the old home did — the three-column
 * anchored shell, both staff-editable rails, the plans-and-lots card grid, the
 * tier × term board, the live park map and the newsfeed — was lost in the move.
 * That also means it keeps rendering itself inside the `(public)` group's
 * chrome: LandingView carries its OWN anchored header and footer, so this route
 * deliberately sits OUTSIDE `app/(public)/` to avoid painting two of them.
 *
 * NOTE FOR THE NEXT PASS: this route is currently a storefront that happens to
 * contain a newsfeed, not a blog. What a real `/blog` needs is the `content.blog`
 * posts as an article listing plus `/blog/[slug]` article pages; the copy for
 * that already exists in the landing document (`blog.heading`, `blog.intro`,
 * `blog.posts`) and `LandingView`'s newsfeed is the proof it renders. That change
 * was deliberately NOT bundled into the home rebuild.
 */
export default async function BlogRoute() {
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
      <JsonLd content={content} />
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

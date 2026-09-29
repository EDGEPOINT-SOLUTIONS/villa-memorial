import type { ReactNode } from "react";
import { BlogView } from "@/components/blog/blog-view";
import { PublicParkMap } from "@/components/public-park-map";
import { LandingBands } from "@/components/landing/landing-view";
import { EmptyState } from "@/components/ui/empty-state";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { listLots } from "@/lib/api-client/property";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog — news, guides and notes from the park",
  description:
    "Photographs, films and notes from Villa Memorial Park and the office — published by the office from Pages & content.",
  path: "/blog",
});

// The blog document, the landing document, the lot listing and the pricing
// store are all read per request, so a staff edit lands immediately instead of
// waiting for a rebuild.
export const dynamic = "force-dynamic";

/**
 * `/blog` — the blog, then the whole former storefront beneath it (office,
 * inbox 025).
 *
 * Top to bottom:
 *   1 · the BLOG's own page document (`PageDocument` key `blog`: heading ·
 *       intro · posts), rendered by `BlogView` — heading, intro, one horizontal
 *       row per post;
 *   2 · the former LandingView layout, BANDS ONLY, via `LandingBands` — both
 *       staff-editable rails, the plans-and-lots card grid, the tier board, the
 *       live park map, the About band and the newsfeed chrome — read from the
 *       landing document and the live stores exactly as they always were —
 *       MINUS the newsfeed band: it repeated the posts this page already lists
 *       (office, inbox 048), so it is not rendered here. Nothing else changed.
 *
 * NO DOUBLED CHROME: `LandingBands` renders the content of the former page, not
 * its header, footer or phone bar. This route lives inside `app/(public)/`, so
 * `PublicShell` already supplies exactly one of each (plus the closing action
 * band); the old route sat outside that group precisely because LandingView
 * carried its own. The two documents stay independent — only part 1 reads the
 * blog page document.
 */
export default async function BlogRoute() {
  const [content, document, lots, pricing] = await Promise.all([
    listLandingContent(),
    getPageDocument("blog"),
    listLots().catch(() => [] as Awaited<ReturnType<typeof listLots>>),
    loadPricingDocument(),
  ]);
  const blog = document?.blog ?? null;

  const sectionCount = new Set(lots.map((lot) => lot.section)).size;

  const mapNode: ReactNode =
    lots.length > 0 ? <PublicParkMap lots={lots} initialPark="villa" /> : null;

  return (
    <>
      {/* The blog is the middle column's first section (captain, 2026-09-30):
          the original rails-and-middle design, the blog first, then the story,
          the plans and the rest beneath it. */}
      <div className="blog-storefront">
        <LandingBands
          content={content}
          planPricing={pricing.plans}
          lotCategories={pricing.lotCategories}
          mapNode={mapNode}
          mapLive={lots.length > 0}
          sectionCount={sectionCount}
          newsfeed={false}
          open={
            <section className="mid-section blog-section" aria-label="Blog">
              {blog ? (
                <BlogView blog={blog} />
              ) : (
                <EmptyState
                  title="The blog is not configured"
                  hint="Pages & content → Blog publishes its heading, intro and posts."
                />
              )}
            </section>
          }
        />
      </div>
    </>
  );
}

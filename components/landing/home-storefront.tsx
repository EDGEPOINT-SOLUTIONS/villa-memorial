import { HomeBanner } from "@/components/landing/home-banner";
import { LandingBands, type LandingViewProps } from "@/components/landing/landing-view";

/**
 * HomeStorefront — the public home's body (captain, 2026-10-02).
 *
 * `/` is now the blog page's design: the anchored storefront (both rails and the
 * middle sheet) that `/blog` used to render beneath its post list. The middle
 * column opens on the captain's banner (`HomeBanner`) instead of the blog rows,
 * and the storefront's own newsfeed band is OFF — the post list lives on the new
 * dedicated `/blog` page, so the home carries no posts at all.
 *
 * Presentational and server-safe on purpose: the route owns the cookie read and
 * the store reads, and the node tests render this exact composition with the
 * live-map node stubbed, the way they rendered `LandingBands` before it.
 */
export function HomeStorefront(props: LandingViewProps) {
  return (
    <div className="blog-storefront">
      <LandingBands
        {...props}
        open={<HomeBanner content={props.content} />}
        newsfeed={false}
      />
    </div>
  );
}

export default HomeStorefront;

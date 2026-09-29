import type { Metadata } from "next";
import { BlogView } from "@/components/blog/blog-view";
import { EmptyState } from "@/components/ui/empty-state";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Blog — news, guides and notes from the park",
  description:
    "Photographs, films and notes from Villa Memorial Park and the office — published by the office from Pages & content.",
  path: "/blog",
});

// The blog document and the retained About copy are read per request, so a
// staff edit lands immediately instead of waiting for a rebuild.
export const dynamic = "force-dynamic";

/**
 * `/blog` — the blog's OWN page (office, 2026-09-29).
 *
 * It renders the blog page document (`PageDocument` key `blog`: heading ·
 * intro · posts) and leads with it: heading, intro, then one horizontal row per
 * post. The former storefront bands are gone — each has its own route now
 * (/plans, /lots, /map, /products, /builder). The one exception is the About
 * band (story · mission · vision), which exists nowhere else; it is retained
 * under the posts and reported in the PR status until the office places it.
 *
 * The page lives INSIDE `app/(public)/` now, so it gets the shared header,
 * footer and phone bar (the old route rendered LandingView's own chrome).
 */
export default async function BlogRoute() {
  const [content, document] = await Promise.all([
    listLandingContent(),
    getPageDocument("blog"),
  ]);
  const blog = document?.blog ?? null;

  return (
    <div className="container--reading blog-page">
      {blog ? (
        <BlogView blog={blog} about={content.about} wordmark={content.logo.wordmark} />
      ) : (
        <EmptyState
          title="The blog is not configured"
          hint="Pages & content → Blog publishes its heading, intro and posts."
        />
      )}
    </div>
  );
}

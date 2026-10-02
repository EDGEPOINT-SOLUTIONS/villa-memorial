import { BlogView } from "@/components/blog/blog-view";
import { EmptyState } from "@/components/ui/empty-state";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Blog — news, guides and notes from the park",
  description:
    "Photographs, films and notes from Villa Memorial Park and the office — published by the office from Pages & content.",
  path: "/blog",
});

// The blog document is read per request, so a staff edit lands immediately
// instead of waiting for a rebuild.
export const dynamic = "force-dynamic";

/**
 * `/blog` — the dedicated blog page (captain, 2026-10-02).
 *
 * The captain promoted the former blog-storefront composition to the home and
 * asked for "another blog page that's dedicated for a real blog page": this is
 * that page. It carries the blog's OWN page document (`PageDocument` key
 * `blog`: heading · intro · posts) through `BlogView` — the heading, the intro,
 * then ONE HORIZONTAL ROW PER POST, photograph beside text. Nothing else: the
 * storefront bands the page used to carry beneath the list are the home now, and
 * this page is only the reading surface.
 *
 * It renders inside `app/(public)/layout.tsx`, so the shared `PublicShell`
 * supplies exactly one header, footer, phone bar and closing action band.
 */
export default async function BlogRoute() {
  const document = await getPageDocument("blog");
  const blog = document?.blog ?? null;

  return (
    <div className="blog-main">
      {blog ? (
        <BlogView blog={blog} />
      ) : (
        <EmptyState
          title="The blog is not configured"
          hint="Pages & content → Blog publishes its heading, intro and posts."
        />
      )}
    </div>
  );
}

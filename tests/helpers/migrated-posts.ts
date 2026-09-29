import { getPageDocument } from "@/lib/api-client/content-pages";
import type { BlogPost, LandingContent } from "@/lib/api-client/landing";

/**
 * The posts MIGRATED from the landing document to the blog page document
 * (office, 2026-09-29), converted back to the landing model's `BlogPost` shape.
 *
 * The landing seed no longer carries posts — the blog owns them — so a test that
 * exercises a surface still taking the landing `blog` block (the now-unrouted
 * `LandingView`) injects the REAL migrated posts instead of re-typing samples,
 * and a test of the blog document reads them directly.
 */
export async function migratedLandingPosts(): Promise<BlogPost[]> {
  const doc = await getPageDocument("blog");
  return (doc?.blog?.posts ?? []).map((post) => ({
    id: post.id,
    author: post.author,
    date: post.date,
    caption: post.caption,
    media: post.media.map((item) => ({
      kind: item.kind,
      src: item.src,
      alt: item.alt,
      poster: item.poster,
    })),
    link: post.link,
  }));
}

/** The landing document with the migrated posts injected, cloned. */
export async function withMigratedPosts(content: LandingContent): Promise<LandingContent> {
  const clone = JSON.parse(JSON.stringify(content)) as LandingContent;
  clone.blog.posts = await migratedLandingPosts();
  return clone;
}

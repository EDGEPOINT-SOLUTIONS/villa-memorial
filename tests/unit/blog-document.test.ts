import { describe, expect, it, vi } from "vitest";
import { createElement, type AnchorHTMLAttributes, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  getPageDocument,
  savePageDocument,
} from "@/lib/api-client/content-pages";
import {
  listLandingContent,
  readLandingContent,
  saveLandingContent,
} from "@/lib/api-client/landing";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href?: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  usePathname: () => "/blog",
}));

const { default: BlogRoute } = await import("@/app/(public)/blog/page");

/**
 * The blog's own document (office, 2026-09-29).
 *
 * The blog stopped being the home page: its heading, intro and posts live in
 * the page-document store under key `blog`, migrated out of the landing
 * document. These tests pin the two things that matter:
 *   · the posts migrated and the landing document no longer owns them;
 *   · the two documents are independent — editing one cannot change the other;
 *   · `/blog` leads with the blog (heading, then one row per post) and keeps
 *     only the retained About band under it.
 */
describe("the blog is its own page document", () => {
  it("migrated every post and the landing document no longer owns them", async () => {
    const blog = await getPageDocument("blog");
    expect(blog, "the blog document exists").not.toBeNull();
    expect(blog!.blog, "the blog document carries its own schema").not.toBeNull();
    expect(blog!.blog!.posts.length).toBe(4);

    const landing = await listLandingContent();
    expect(landing.blog.posts).toEqual([]);
  });

  it("editing the blog cannot change the home, and editing the home cannot change the blog", async () => {
    const original = await getPageDocument("blog");
    const edited = structuredClone(original!);
    edited.blog!.heading = "Edited heading";
    edited.blog!.posts[0].caption = "Edited caption";
    const saved = await savePageDocument("blog", edited, "tester");
    expect(saved.blog?.heading).toBe("Edited heading");

    // The landing document's own blog block is a different document.
    const landing = await listLandingContent();
    expect(landing.blog.heading).toBe("Blog");
    expect(landing.blog.posts).toEqual([]);

    // Now edit the LANDING document and confirm the blog is untouched.
    const nextLanding = readLandingContent(landing);
    nextLanding.blog = { ...nextLanding.blog, heading: "Landing edit" };
    await saveLandingContent(nextLanding);

    const blogAfter = await getPageDocument("blog");
    expect(blogAfter?.blog?.heading).toBe("Edited heading");
    expect(blogAfter?.blog?.posts[0].caption).toBe("Edited caption");
  });

  it("renders the blog first, one horizontal row per post, then only the retained About band", async () => {
    const html = renderToStaticMarkup(await BlogRoute());
    const head = html.indexOf("blog-head");
    const rows = html.indexOf("blog-rows");
    const about = html.indexOf("blog-about");
    expect(head).toBeGreaterThanOrEqual(0);
    expect(head).toBeLessThan(rows);
    expect(rows).toBeLessThan(about);
    expect((html.match(/class="blog-row"/g) ?? []).length).toBe(4);
    // The former storefront bands are gone from this page.
    expect(html).not.toContain("plan-lot-grid");
    expect(html).not.toContain("plan-board");
    expect(html).not.toContain("mid-section--map");
    // Exactly one h1 — the blog's heading.
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });
});

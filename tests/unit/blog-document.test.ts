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
 *   · `/blog` leads with the blog (heading, then one row per post) and then
 *     restores the whole former LandingView storefront beneath it, bands only
 *     (inbox 025) — no second header, footer or phone bar.
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

  it("puts the blog as the middle column's first section, then the storefront bands", async () => {
    const html = renderToStaticMarkup(await BlogRoute());
    // The order is the captain's direction (2026-09-30): the original
    // rails-and-middle design, the blog as the middle's FIRST section, then
    // the story, the plans and the rest beneath it — MINUS the newsfeed band,
    // which repeated the posts the page already lists (office, inbox 048).
    const order = [
      "anchored-rail--left",
      "blog-head",
      "blog-rows",
      "plan-lot-grid",
      "plan-board",
      "mid-section--map",
      "about-grid",
    ];
    const positions = order.map((marker) => html.indexOf(marker));
    for (let i = 0; i < order.length; i++) {
      expect(positions[i], `${order[i]} is missing from /blog`).toBeGreaterThanOrEqual(0);
      if (i > 0) {
        expect(positions[i], `${order[i]} must follow ${order[i - 1]}`).toBeGreaterThan(
          positions[i - 1],
        );
      }
    }
    expect((html.match(/<li class="blog-row[^"]*"/g) ?? []).length).toBe(4);
    // The rows alternate their sides — picture left, picture right (captain,
    // 2026-09-30), so two of the four carry the flip.
    expect((html.match(/class="blog-row blog-row--flip"/g) ?? []).length).toBe(2);
    // The newsfeed band is GONE (inbox 048): it repeated the posts above, so
    // no second feed and no post cards render.
    expect(html).not.toContain('aria-label="Blog posts"');
    expect((html.match(/class="post-card"/g) ?? []).length).toBe(0);
    // BANDS ONLY — no doubled chrome. The former page carried its own header,
    // footer, phone bar and closing action band; this route is inside the
    // shared shell now, which renders exactly one of each.
    expect(html).not.toContain("anchored-header");
    expect(html).not.toContain("anchored-footer");
    expect(html).not.toContain("anchored-phonebar");
    expect(html).not.toContain("next-steps");
    // Exactly one h1 — the blog's heading (the bands add none).
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });
});

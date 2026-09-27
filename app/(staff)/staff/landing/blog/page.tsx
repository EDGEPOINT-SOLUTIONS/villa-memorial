import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLandingContent } from "@/lib/api-client/landing";
import { BlogAdminEditor } from "@/components/landing/landing-page-editor";

export const metadata: Metadata = { title: "Blog — Pages & content — Admin Portal" };

/**
 * The Blog document — its own door in Pages & content.
 *
 * WHY THIS ROUTE EXISTS. Blog posts were edited only as zone 08 of the Home
 * document's editor, so writing one post meant opening the home editor and
 * scrolling past seven unrelated zones. The surface is called Blog now (`/blog`)
 * and the office asked for it to be first-class in the admin panel, so it gets
 * its own entry beside the five page documents.
 *
 * ONE DOCUMENT, ONE STORE, ONE SAVE SEAM. It reads and writes the very same
 * landing content document as `/staff/landing/home` through the very same
 * `POST /api/landing/content` route — a post written here is the post the home
 * band and `/blog` render, and the two screens cannot drift. `BlogAdminEditor`
 * renders the same `BlogEditor` the Home screen's zone 08 renders, so there is
 * one definition of what a post is.
 *
 * Gated on `catalog:write` like every other Pages & content screen (the
 * provisional scope the content catalogue already uses — `rbac-scopes-v1` names
 * no content code).
 */
export default async function LandingBlogAdminPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Blog" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let content;
  try {
    content = await listLandingContent();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Blog" />
        <PageSection>
          <ErrorState message="The landing content store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <p className="text-sm" style={{ margin: 0 }}>
        <Link href="/staff/landing" className="back-link">
          ← Pages &amp; content
        </Link>
      </p>
      <PageHeader
        eyebrow="Commerce · Pages & content"
        title="Blog"
        lead="The posts that appear on /blog, and the newest few on the home page."
      />
      <BlogAdminEditor initialContent={content} />
      <p className="text-sm text-muted" style={{ margin: 0 }}>
        Saved to the same document as <Link href="/staff/landing/home">Home</Link> — the blog posts are part of it, so
        an edit here is the edit the home page&rsquo;s news band shows too. Staff name: {session.displayName}.
      </p>
    </div>
  );
}

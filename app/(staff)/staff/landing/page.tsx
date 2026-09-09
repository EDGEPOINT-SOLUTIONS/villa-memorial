import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLandingContent } from "@/lib/api-client/landing";
import { LandingPageEditor } from "@/components/landing/landing-page-editor";

export const metadata: Metadata = { title: "Landing page — Staff Portal" };

/**
 * Staff "Landing Page" editor (premium blue/gold folio, front-end CMS seam approved
 * in the Lavish villa-landing-plan). The public home at / renders ONLY from the
 * landing content document; this page is where staff edit every region of it:
 * brand mark/wordmark + the 24/7 line, hero copy + CTAs, the fixed left/right
 * rails (UNLIMITED real services/plans/products/links per side, with photo and
 * order), about/mission/vision + photo, the full service sections, the plan card
 * grid, the live park map heading/intro and the blog newsfeed (any number of rich
 * posts with photo/video attachments — photos come from the media library, a REAL
 * device upload, or a URL). Images can be picked from the uploaded library, from a
 * local file on this device (stored through the same fixture-store save path, no
 * backend), or from a public URL. Saving POSTs the whole document through the BFF
 * route, which validates it and persists it into the same fixture store the home
 * reads. The section navigator mirrors the public page order: map before newsfeed.
 */
export default async function LandingPageAdminPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Landing page" />
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
        <PageHeader eyebrow="Commerce" title="Landing page" />
        <PageSection>
          <ErrorState message="The landing content store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · Landing page"
        title="Landing page"
        actions={
          <Link href="/" className="btn btn--secondary btn--sm">
            View live page
          </Link>
        }
      />
      <LandingPageEditor
        initialContent={content}
        sessionName={session.displayName.split(" ")[0] ?? session.displayName}
      />
    </div>
  );
}

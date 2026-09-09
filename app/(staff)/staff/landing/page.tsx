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
 * Staff "Landing Page" editor (premium blue/gold, front-end CMS seam approved in
 * the Lavish villa-landing-plan). The public home at / renders ONLY from the
 * landing content document; this page is where staff edit every region of it:
 * brand mark/wordmark, hero copy + CTAs, the fixed left/right rails (pin up to
 * 5 real services/plans/products/links per side with photos and order), the
 * about/mission/vision text + photo, the full service detail sections, the plan
 * card grid and the blog newsfeed (any number of rich posts with photo/video
 * attachments). Saving POSTs the whole document through the BFF route, which
 * validates it (rails capped at 5 per side) and persists it into the same
 * fixture store the home reads.
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

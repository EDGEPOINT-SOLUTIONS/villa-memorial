import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { LandingPageEditor } from "@/components/landing/landing-page-editor";

export const metadata: Metadata = { title: "Pages & content — Admin Portal" };

/**
 * Staff content editor (the ONE content surface — captain, 2026-09-18). The
 * public home at / AND the FAQ page at /faq render ONLY from the content
 * document this page edits: brand mark/wordmark + the 24/7 line, hero copy +
 * CTAs, the fixed left/right rails (UNLIMITED real services/plans/products/links
 * per side, with photo and order), about/mission/vision + photo, the full
 * service sections, the plan card grid, the live park map heading/intro, the
 * blog newsfeed (any number of rich posts with photo/video attachments — photos
 * come from the media library, a REAL device upload, or a URL) and the FAQ page
 * copy. Images can be picked from the uploaded library, from a local file on
 * this device (stored through the same fixture-store save path, no backend), or
 * from a public URL. Saving POSTs the whole document through the BFF route,
 * which validates it and persists it into the same fixture store the public
 * pages read. The section navigator mirrors the public page order: map before
 * newsfeed. The old /staff/store stub redirects here (audit §7.1 G5).
 */
export default async function LandingPageAdminPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Pages & content" />
        <PageSection>
          <ForbiddenState requiredScopes={["catalog:write"]} />
        </PageSection>
      </>
    );
  }

  let content;
  let pricing;
  try {
    content = await listLandingContent();
    pricing = await loadPricingDocument();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Pages & content" />
        <PageSection>
          <ErrorState message="The landing content store is unavailable right now." />
        </PageSection>
      </>
    );
  }

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · Pages & content"
        title="Pages & content"
        actions={
          <Link href="/" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live page
          </Link>
        }
      />
      <LandingPageEditor
        initialContent={content}
        lotCategories={pricing.lotCategories}
        planPricing={pricing.plans}
        sessionName={session.displayName.split(" ")[0] ?? session.displayName}
      />
    </div>
  );
}

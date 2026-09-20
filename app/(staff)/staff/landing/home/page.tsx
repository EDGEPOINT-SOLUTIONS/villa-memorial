import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLandingContent } from "@/lib/api-client/landing";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { LandingPageEditor } from "@/components/landing/landing-page-editor";

export const metadata: Metadata = { title: "Home — Pages & content — Admin Portal" };

/**
 * The Home document — the existing full editor (brand, hero, rails, about,
 * service cards, plan board, map copy, blog, FAQ). Pages & content lists five
 * documents; Home is the one that already had its own editor, so it keeps it
 * (see lib/content-catalog.ts PAGE_DOCUMENTS: home.editor === "landing").
 *
 * The public home at / AND the FAQ page at /faq render ONLY from the content
 * document this page edits. Saving POSTs the whole document through the BFF
 * route, which validates it and persists it into the same fixture store the
 * public pages read. The section navigator mirrors the public page order: map
 * before newsfeed.
 */
export default async function LandingHomeAdminPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Home" />
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
        <PageHeader eyebrow="Commerce" title="Home" />
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
        title="Home"
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

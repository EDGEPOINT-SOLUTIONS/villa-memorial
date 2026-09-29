import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState, ErrorState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listLandingContent } from "@/lib/api-client/landing";
import { LandingPageEditor } from "@/components/landing/landing-page-editor";

export const metadata: Metadata = { title: "FAQ — Pages & content — Admin Portal" };

/**
 * The FAQ page's own editor (office, inbox 048).
 *
 * The FAQ block used to sit inside the Home document's full editor, which made
 * it look like a section of the home — but it renders on `/faq`, a different
 * page. It moved here, with the page it belongs to: only the FAQ zone is shown,
 * and the editor saves the same landing document through the same
 * `POST /api/landing/content` seam.
 */
export default async function LandingFaqAdminPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["catalog:write"])) {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="FAQ" />
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
        <PageHeader eyebrow="Commerce" title="FAQ" />
        <PageSection>
          <ErrorState message="The FAQ content store is unavailable right now." />
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
        title="FAQ"
        actions={
          <Link href="/faq" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live page
          </Link>
        }
      />
      <LandingPageEditor
        mode="faq"
        initialContent={content}
        sessionName={session.displayName.split(" ")[0] ?? session.displayName}
      />
    </div>
  );
}

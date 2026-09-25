import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listPageDocuments } from "@/lib/api-client/content-pages";
import { PAGE_DOCUMENTS, type PageDocument } from "@/lib/content-catalog";

export const metadata: Metadata = { title: "Pages & content — Admin Portal" };

/**
 * Pages & content — the page home (Phase 1 of the content-catalogue plan,
 * captain review 2026-09-21).
 *
 * ONE list of the five page documents the captain named — Home · Villa Memorial
 * Park · Funeraria Memorial Services · Villa Memorial Plan · Coffins & caskets —
 * each a door to the editor that owns its content:
 *   · Home opens the existing full landing/FAQ editor (/staff/landing/home);
 *   · the others open the page-document editor (/staff/landing/<key>).
 *
 * The list is the answer to "where do I edit this page?": every public page's
 * page-level content traces to exactly one card here. The service/plan/casket
 * item content still lives in the Commerce catalogue (its own pass).
 */
export default async function PagesAndContentPage() {
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

  let documents: PageDocument[];
  try {
    documents = await listPageDocuments();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Commerce" title="Pages & content" />
        <PageSection>
          <ErrorState message="The page documents are unavailable right now." />
        </PageSection>
      </>
    );
  }

  const byKey = new Map(documents.map((document) => [document.key, document]));

  return (
    <div className="stack-4">
      <PageHeader
        eyebrow="Commerce · Pages & content"
        title="Pages & content"
        lead="Every public page's content lives here — prices stay live references, never typed."
        actions={
          <Link href="/" target="_blank" rel="noreferrer" className="btn btn--secondary btn--sm">
            View live home
          </Link>
        }
      />

      {documents.length === 0 ? (
        <EmptyState title="No page documents yet" hint="The seeded pages appear here." />
      ) : (
        <div className="landing__grid">
          {PAGE_DOCUMENTS.map((def) => {
            const document = byKey.get(def.key);
            if (!document) return null;
            const updated = document.updated_at
              ? `Last saved ${new Date(document.updated_at).toLocaleString()}`
              : "Seed copy — not yet edited";
            const href = def.editor === "landing" ? "/staff/landing/home" : `/staff/landing/${def.key}`;
            return (
              <section key={def.key} className="card" aria-labelledby={`page-doc-${def.key}`}>
                <div className="card__body stack-3">
                  <div>
                    <p className="eyebrow-label" style={{ marginBottom: "var(--space-1)" }}>
                      {def.route}
                    </p>
                    <h2 id={`page-doc-${def.key}`} className="text-lg" style={{ margin: 0 }}>
                      {def.label}
                    </h2>
                  </div>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>
                    {def.hint}
                  </p>
                  <p className="text-sm text-muted" style={{ margin: 0 }}>
                    {updated}
                  </p>
                  <Link href={href} className="btn btn--primary btn--sm">
                    Edit this page
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
          {/* The Blog owns everything /blog renders (office, inbox 048): its own
              page document (the posts lead) AND the former storefront's landing
              sections, which the restored bands beneath the posts render. Its
              editor at /staff/landing/blog shows both, each saving through its
              own document. */}
          <section className="card" aria-labelledby="page-doc-blog">
            <div className="card__body stack-3">
              <div>
                <p className="eyebrow-label" style={{ marginBottom: "var(--space-1)" }}>
                  /blog
                </p>
                <h2 id="page-doc-blog" className="text-lg" style={{ margin: 0 }}>
                  Blog
                </h2>
              </div>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                The posts the office publishes (a caption plus photos or video) and the
                storefront sections that render beneath them — rails, About,
                plans-and-lots, the plan board and the park map copy.
              </p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                {byKey.get("blog")?.updated_at
                  ? `Last saved ${new Date(byKey.get("blog")!.updated_at!).toLocaleString()}`
                  : "Seed copy — not yet edited"}
              </p>
              <Link href="/staff/landing/blog" className="btn btn--primary btn--sm">
                Edit the blog
              </Link>
            </div>
          </section>

          {/* The FAQ has its own page and its own editor (inbox 048): the block
              used to sit inside the home editor, which made it look like part of
              the home. */}
          <section className="card" aria-labelledby="page-doc-faq">
            <div className="card__body stack-3">
              <div>
                <p className="eyebrow-label" style={{ marginBottom: "var(--space-1)" }}>
                  /faq
                </p>
                <h2 id="page-doc-faq" className="text-lg" style={{ margin: 0 }}>
                  FAQ
                </h2>
              </div>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                The questions families ask most, their answers and the next-step links.
              </p>
              <p className="text-sm text-muted" style={{ margin: 0 }}>
                {byKey.get("home")?.updated_at
                  ? `Last saved ${new Date(byKey.get("home")!.updated_at!).toLocaleString()}`
                  : "Seed copy — not yet edited"}
              </p>
              <Link href="/staff/landing/faq" className="btn btn--primary btn--sm">
                Edit the FAQ
              </Link>
            </div>
          </section>

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

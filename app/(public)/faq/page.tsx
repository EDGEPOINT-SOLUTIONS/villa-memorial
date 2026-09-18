import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { listLandingContent } from "@/lib/api-client/landing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Frequently asked questions — Villa Memorial",
  description:
    "Straight answers about calling the park day or night, planning ahead, and seeing available lots at Villa Memorial Park, Isabela City, Basilan.",
  path: "/faq",
});

// Reads the content store per request — a staff edit must be what the NEXT
// visitor sees, never a build-time snapshot (same rule as the home).
export const dynamic = "force-dynamic";

/**
 * Public FAQ — the questions families ask most, plus the next-step links under
 * them. Every word comes from the LandingPage content document (the `faq`
 * region, edited on the staff content editor at /staff/landing), so a typo is a
 * staff edit rather than a developer ticket (audit §7.1 G7). The layout is the
 * one this page shipped with: Help hero, question cards, page-links row.
 */
export default async function Page() {
  const { faq } = await listLandingContent();

  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">{faq.eyebrow}</p>
            <h1 className="hero-premium__title">{faq.heading}</h1>
            <p className="hero-premium__lead">{faq.lead}</p>
            <nav aria-label="Back" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/" className="back-link">← Back to home</Link>
            </nav>
          </div>
        </div>
      </section>

      {faq.items.length === 0 ? (
        <EmptyState
          title="No questions published yet"
          hint="Questions and answers will appear here once staff publishes them."
        />
      ) : (
        <div className="landing__grid">
          {faq.items.map((item) => (
            <article className="card" key={item.id}>
              <div className="card__body">
                <h3>{item.question}</h3>
                <p className="text-sm text-muted">{item.answer}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {faq.links.length > 0 ? (
        <nav className="page-links" aria-label="Next steps">
          {faq.links.map((link) => (
            <Link href={link.href} key={`${link.href}-${link.label}`}>{link.label}</Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PublicDisclosure, PublicHero, SectionHead } from "@/components/kit";
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
 * staff edit rather than a developer ticket (audit §7.1 G7).
 *
 * Story-lane pass (2026-09-22, plan §5.7): the page opens on the shared
 * `PublicHero` and the questions collapse into the shared `PublicDisclosure`
 * (the first one open), so a reader gets the answer they came for instead of a
 * three-card wall. The empty state and the next-step row are unchanged.
 */
export default async function Page() {
  const { faq } = await listLandingContent();

  return (
    <div className="story-page container--reading">
      <PublicHero
        variant="interior"
        eyebrow={faq.eyebrow}
        title={faq.heading || "Frequently asked questions"}
        lead={faq.lead}
      />

      {faq.items.length === 0 ? (
        <EmptyState
          title="No questions published yet"
          hint="Questions and answers will appear here once staff publishes them."
        />
      ) : (
        <section className="story-band" aria-labelledby="faq-title">
          <SectionHead id="faq-title" kicker="Questions" title="Straight answers" />
          {faq.items.map((item, index) => (
            <PublicDisclosure key={item.id} summary={item.question} defaultOpen={index === 0}>
              <p>{item.answer}</p>
            </PublicDisclosure>
          ))}
        </section>
      )}

      {faq.links.length > 0 ? (
        <nav className="page-links" aria-label="Next steps">
          {faq.links.map((link) => (
            <Link href={link.href} key={`${link.href}-${link.label}`}>{link.label}</Link>
          ))}
        </nav>
      ) : null}

      <nav className="story-back" aria-label="Back to home">
        <Link href="/" className="back-link">← Back to home</Link>
      </nav>
    </div>
  );
}

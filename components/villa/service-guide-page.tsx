import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl, publicMediaUrl } from "@/lib/media-url";
import { PublicDisclosure, PublicHero, SectionHead } from "@/components/kit";
import { StoryHelpBand, StorySteps } from "@/components/villa/story-ui";
import { listLandingContent } from "@/lib/api-client/landing";
import { getServiceEntry } from "@/lib/api-client/content-entries";
import { serviceEntryDef, serviceEntryView, serviceHeroVariant } from "@/lib/service-content";

/**
 * One guide page, rendered from its service entry (content-catalogue Phase 3).
 *
 * The three guide routes (death at home · death at hospital · transport) stay as
 * routes, but their title, lead, photograph and content blocks are the editable
 * service entries in Pages & content → Funeraria Memorial Services.
 *
 * The story-lane pass (2026-09-22, plan §5.2) rebuilt the page on the Phase 0
 * grammar: a `PublicHero` with ONE ≤12-word answer and one Call action, then the
 * THREE numbered steps (`StorySteps`) a family actually takes, then the shared
 * 24/7 band. The entry's longer summary and any staff-authored blocks stay
 * published behind the "More about …" disclosure, so the editable content is
 * never dropped — it just stops being the first thing a grieving reader scrolls.
 * The old hero paragraph (41 words on death-at-home) was the measured defect D4.
 */
export async function ServiceGuidePage({ entryKey }: { entryKey: string }) {
  const def = serviceEntryDef(entryKey);
  if (!def) notFound();

  const [entry, content] = await Promise.all([
    getServiceEntry(def.key).catch(() => null),
    listLandingContent(),
  ]);
  const view = serviceEntryView(entry, def);
  const hero = serviceHeroVariant(view.heroSrc, "wide");
  const mediaBase = mediaPublicBaseUrl();
  const { contact } = content;
  // A service guide publishes no price (Request-for-Quote, captain 2026-09-21):
  // a staff-authored price block resolves to no amount, so the page never
  // becomes a price list.
  const priceOf = (): string | null => null;

  const heroPhoto = hero
    ? {
        src: publicMediaUrl(hero.src, mediaBase),
        srcSet: hero.srcSet,
        sizes: "(max-width: 48rem) 92vw, 30rem",
        alt: view.heroAlt,
        width: 960,
        height: 640,
      }
    : undefined;

  return (
    <div className="story-page container--reading">
      <PublicHero
        variant="interior"
        eyebrow={view.eyebrow}
        title={view.title}
        lead={view.lead}
        primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
        secondary={{ label: def.secondaryLabel, href: def.secondaryHref }}
        image={heroPhoto}
      />

      <nav className="story-back" aria-label="Back to Funeraria Memorial Services">
        <Link href="/services" className="back-link">
          ← Back to Funeraria Memorial Services
        </Link>
      </nav>

      <section className="story-band" aria-labelledby="guide-steps-title">
        <SectionHead id="guide-steps-title" kicker="What to do now" title="Three steps, handled with you" />
        <StorySteps id="guide-steps-title" steps={view.steps} />
      </section>

      {view.summary || view.blocks.length > 0 ? (
        <section className="story-band">
          <PublicDisclosure summary={`More about ${view.title}`}>
            {view.summary ? <p>{view.summary}</p> : null}
            {view.blocks.length > 0 ? (
              <ContentBlocks
                blocks={view.blocks}
                priceOf={priceOf}
                mediaBaseUrl={mediaBase}
              />
            ) : null}
          </PublicDisclosure>
        </section>
      ) : null}

      <StoryHelpBand
        contact={contact}
        secondary={
          <Link className="btn btn--secondary" href="/immediate-assistance">
            Immediate assistance
          </Link>
        }
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { clientPhotoWide } from "@/lib/client-photos";
import { SERVICE_SAMPLE_NOTE } from "@/lib/media";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { StoryHelpBand } from "@/components/villa/story-ui";
import { PublicHero } from "@/components/kit";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";
import { buildQuoteHref } from "@/lib/public-forms/request-prefill";
import {
  isServiceCopyBlockId,
  servicePageContentFromDocument,
  serviceHeroVariant,
} from "@/lib/service-content";

export const metadata: Metadata = pageMetadata({
  title: "Funeraria Memorial Services — Villa Memorial",
  description:
    "At-need funeral care day or night — a-la-carte services, embalming by the day and chapel bookings at Villa Memorial Park, each quoted for your family.",
  path: "/services",
});

// Reads the content document and the chapel record per request — a staff edit
// must be what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Funeraria Memorial Services (content-catalogue Phase 3, captain 2026-09-21).
 *
 * ONE HERO, THEN STRAIGHT TO THE SERVICES. The hero (eyebrow, headline, lead,
 * photograph) is editable in Pages & content, and its one primary action is the
 * client's 24/7 line — read from the landing content document, never typed.
 *
 * REQUEST-FOR-QUOTE (captain's minutes, 2026-09-21, item 5): the page no longer
 * publishes a price. Every service line offers ONE "Request a quote" action,
 * which opens the public quote form prefilled with the service the visitor
 * asked about (components/villa/service-rates-2026.tsx · lib/public-forms/
 * request-prefill.ts). The office prepares a customised quotation. No amount
 * and no cart action lives on this page: plan and lot pricing are separate lanes.
 *
 * CONTENT HOMES:
 *  · the page document (Pages & content → Funeraria Memorial Services) holds the
 *    hero and the service descriptions (`lib/service-content.ts` is the ONE typed
 *    reading: the five a-la-carte notes and the two chapel-class copy lines);
 *  · the chapel NAMES and capacity are the park's own staff-editable record
 *    (`getChapelSchedule()`), so a rename on /staff/schedule reaches this card.
 */
export default async function ServicesPage() {
  const [content, page, schedule] = await Promise.all([
    listLandingContent(),
    getPageDocument("services").catch(() => null),
    getChapelSchedule().catch(() => null),
  ]);
  const { contact } = content;
  const serviceContent = servicePageContentFromDocument(page);

  // The hero photograph is the page document's when staff chose one; otherwise
  // the client's own 2026 set-up photograph the page always published.
  const defaultHero = clientPhotoWide("wake-setup-casket-draped");
  const heroVariant = serviceHeroVariant(page?.hero.image ?? null, "wide") ?? defaultHero;
  const heroHeadline = page?.hero.headline.trim() ?? "";
  const heroPhoto = {
    src: heroVariant.src,
    srcSet: heroVariant.srcSet,
    sizes: "(max-width: 48rem) 92vw, 30rem",
    alt: "A white casket with gold handles in a purple-draped viewing room the office prepared, under garlands of white flowers",
    width: 960,
    height: 640,
  };

  // The service descriptions are consumed by the rate cards below; any other
  // block staff add still renders through the shared block renderer. Service
  // pages publish no price, so a staff-authored price block resolves to no
  // amount (the honest "ask the office" fallback in ContentBlocks).
  const otherBlocks = (page?.blocks ?? []).filter((block) => !isServiceCopyBlockId(block.id));

  return (
    <div className="sv-page">
      <div className="sv-main">
        <nav className="sv-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-current="page">Funeraria Memorial Services</li>
          </ol>
        </nav>

        {/* The page opens on one sentence and one action (plan §4.7). */}
        <PublicHero
          variant="interior"
          eyebrow={page?.hero.eyebrow.trim() || undefined}
          title={heroHeadline || "Funeraria Memorial Services"}
          lead={page?.hero.lead.trim() || undefined}
          textColour={page?.hero.textColour ?? null}
          primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
          secondary={{ label: "Request a quote", href: buildQuoteHref({ item: "Funeral services" }) }}
          image={heroPhoto}
        >
          {/* The hero photograph is one of the client's own wake set-ups and is
              published under the sheet's sample discipline (`illustration-only`
              in lib/client-photos.ts), so the note must stay beside it. */}
          <p className="story-hero-note">{SERVICE_SAMPLE_NOTE}</p>
        </PublicHero>

        {/* Straight to the services: the a-la-carte lines, embalming per day and
            the chapel options, each carrying a Request-for-Quote action. */}
        <ServiceRates2026
          contact={contact}
          alacarteNotes={serviceContent.alacarteNotes}
          chapelNotes={serviceContent.chapelNotes}
          chapels={schedule?.chapels ?? []}
        />

        {otherBlocks.length > 0 ? (
          <section className="story-band" aria-labelledby="services-more-title">
            <h2 id="services-more-title">More about the service</h2>
            <ContentBlocks
              blocks={otherBlocks}
              priceOf={() => null}
              mediaBaseUrl={mediaPublicBaseUrl()}
            />
          </section>
        ) : null}

        <StoryHelpBand
          contact={contact}
          text="Questions about a service, chapel dates or the whole arrangement — by phone."
          secondary={
            <Link className="btn btn--secondary" href="/contact">
              Message us
            </Link>
          }
        />
      </div>
    </div>
  );
}

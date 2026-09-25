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
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";
import {
  isServiceCopyBlockId,
  servicePageContentFromDocument,
  serviceHeroVariant,
} from "@/lib/service-content";

export const metadata: Metadata = pageMetadata({
  title: "Funeraria Memorial Services — Villa Memorial",
  description:
    "At-need funeral care day or night: 2026 a-la-carte service rates, embalming by the day and chapel bookings at Villa Memorial Park.",
  path: "/services",
});

// Reads the content document, the catalogue and the chapel record per request —
// a staff edit must be what the NEXT visitor sees, never a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Funeraria Memorial Services (content-catalogue Phase 3, captain 2026-09-21).
 *
 * ONE HERO, THEN STRAIGHT TO THE SERVICES. The hero (eyebrow, headline, lead,
 * photograph) is editable in Pages & content, and its one primary action is the
 * client's 24/7 line — read from the landing content document, never typed. The
 * pre-migration steps section and sticky subnav are gone; the page leads into
 * the priced services immediately.
 *
 * CONTENT HOMES:
 *  · the page document (Pages & content → Funeraria Memorial Services) holds the
 *    hero and the service descriptions (`lib/service-content.ts` is the ONE typed
 *    reading: the five a-la-carte notes and the two chapel-class copy lines);
 *  · the chapel NAMES and capacity are the park's own staff-editable record
 *    (`getChapelSchedule()`), so a rename on /staff/schedule reaches this card and
 *    the booking dialog together.
 *
 * TRIMMED (captain, 2026-09-21): the "Guides for what comes next" section and
 * the "Where these figures come from" provenance block left the page. The three
 * guide pages themselves remain at their routes (service entries, edited in
 * Pages & content); they are simply no longer linked from here.
 *
 * MONEY: every figure comes through `lib/villa-pricing.ts` / `lib/catalogue-skus.ts`
 * in the shared rate components. No amount is authored here or in the document.
 */
export default async function ServicesPage() {
  const [items, content, page, schedule] = await Promise.all([
    listCatalogItems().catch(() => null),
    listLandingContent(),
    getPageDocument("services").catch(() => null),
    getChapelSchedule().catch(() => null),
  ]);
  if (!items) {
    return (
      <div className="stack-4">
        <h1>Funeraria Memorial Services</h1>
        <ErrorState
          message={`The service catalogue is unavailable right now, so the 2026 rates cannot be ordered online. Please try again shortly or call ${content.contact.phoneDisplay}.`}
        />
      </div>
    );
  }
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

  // The service descriptions are consumed by the rate cards above; any other
  // block staff add still renders through the shared block renderer.
  const otherBlocks = (page?.blocks ?? []).filter((block) => !isServiceCopyBlockId(block.id));
  const priceBySku = new Map(items.map((item) => [item.sku, item.display_price]));
  const priceOf = (sku: string): string | null => priceBySku.get(sku) ?? null;

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
          secondary={{ label: "See the 2026 prices", href: "#services" }}
          image={heroPhoto}
        >
          {/* The hero photograph is one of the client's own wake set-ups and is
              published under the sheet's sample discipline (`illustration-only`
              in lib/client-photos.ts), so the note must stay beside it. */}
          <p className="story-hero-note">{SERVICE_SAMPLE_NOTE}</p>
        </PublicHero>

        {/* Straight to the services: the a-la-carte lines, embalming per day and
            the chapel options, with their descriptions and prices. */}
        <ServiceRates2026
          items={items}
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
              priceOf={priceOf}
              mediaBaseUrl={mediaPublicBaseUrl()}
            />
          </section>
        ) : null}

        <StoryHelpBand
          contact={contact}
          text="Price questions, chapel dates or the whole arrangement — by phone."
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

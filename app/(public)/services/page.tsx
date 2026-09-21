import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { CHAPEL_SAMPLE_NOTE } from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { ContentBlocks } from "@/components/content/content-blocks";
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";
import { heroTextColourStyle } from "@/lib/landing/hero-background";
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
  const heroTextStyle = page ? heroTextColourStyle(page.hero) : null;
  const heroHeadline = page?.hero.headline.trim() ?? "";

  // The service descriptions are consumed by the rate cards above; any other
  // block staff add still renders through the shared block renderer.
  const otherBlocks = (page?.blocks ?? []).filter((block) => !isServiceCopyBlockId(block.id));
  const priceBySku = new Map(items.map((item) => [item.sku, item.display_price]));
  const priceOf = (sku: string): string | null => priceBySku.get(sku) ?? null;

  return (
    <div className="sv-page">
      <div className="sv-main">
        <section
          className="sv-hero"
          id="top"
          aria-labelledby="services-title"
          style={heroTextStyle ?? undefined}
        >
          <nav className="sv-breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-current="page">Funeraria Memorial Services</li>
            </ol>
          </nav>
          <div className="sv-hero__grid">
            <div>
              {page?.hero.eyebrow.trim() ? (
                <p className="sv-hero__eyebrow">{page.hero.eyebrow}</p>
              ) : null}
              <h1 className={`sv-hero__title${heroHeadline ? "" : " visually-hidden"}`} id="services-title">
                {heroHeadline || "Funeraria Memorial Services"}
              </h1>
              {/* The page's one-line answer (reading budget, captain 2026-09-18). */}
              {page?.hero.lead.trim() ? <p className="sv-hero__lead">{page.hero.lead}</p> : null}
              <div className="sv-hero__actions">
                <a className="btn btn--primary" href={contact.phoneHref}>
                  Call {contact.phoneDisplay}
                </a>
                <a className="btn btn--secondary" href="#services">
                  See the 2026 services
                </a>
              </div>
            </div>
            <figure className="sv-hero__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */}
              <img src={heroVariant.src} srcSet={heroVariant.srcSet} alt="A white casket with gold handles in a purple-draped viewing room the office prepared, under garlands of white flowers" />
              <figcaption>
                A wake set-up the office prepared — shown larger on the{" "}
                <Link href="/gallery">photo gallery</Link>. {CHAPEL_SAMPLE_NOTE}
              </figcaption>
            </figure>
          </div>
        </section>

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
          <section className="sv-section" aria-labelledby="services-more-title">
            <h2 className="sv-section__title" id="services-more-title">
              More about the service
            </h2>
            <ContentBlocks blocks={otherBlocks} priceOf={priceOf} />
          </section>
        ) : null}

        <section className="sv-help" aria-labelledby="help-title">
          <div>
            <h2 id="help-title">Talk to a person, any hour</h2>
            <p>Price questions, chapel dates, or the whole arrangement — by phone.</p>
          </div>
          <div className="sv-help__actions">
            <a className="btn btn--primary" href={contact.phoneHref}>
              Call {contact.phoneDisplay}
            </a>
            <Link className="btn btn--secondary" href="/contact">
              Message us
            </Link>
          </div>
        </section>
      </div>

      <div className="sv-callbar" role="region" aria-label="Call the park">
        <span>Someone has died?</span>
        <a href={contact.phoneHref}>Call {contact.phoneDisplay}</a>
      </div>
    </div>
  );
}

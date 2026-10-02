import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";
import { isServiceCopyBlockId, servicePageContentFromDocument } from "@/lib/service-content";

export const metadata: Metadata = pageMetadata({
  title: "Funeraria Memorial Services — Villa Funeraria",
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
 * NO OPENING BAND (captain, 2026-10-02): the home's gateway band and its three
 * orientation facts were stripped, so the page opens on the five service
 * plates themselves. A visually-hidden h1 keeps the heading. The page's own
 * service plates carry the imagery; the content document still holds the hero
 * fields, but they are no longer rendered here.
 *
 * REQUEST-FOR-QUOTE (captain's minutes, 2026-09-21, item 5): the page no longer
 * publishes a price. Every service line offers ONE "Add to Quote" action,
 * which opens the public quote form prefilled with the service the visitor
 * asked about (components/villa/service-rates-2026.tsx · lib/public-forms/
 * request-prefill.ts). The office prepares a customised quotation. No amount
 * and no quote-basket action lives on this page: plan and lot pricing are separate lanes.
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

  // The service descriptions are consumed by the rate cards below; any other
  // block staff add still renders through the shared block renderer. Service
  // pages publish no price, so a staff-authored price block resolves to no
  // amount (the honest "ask the office" fallback in ContentBlocks).
  const otherBlocks = (page?.blocks ?? []).filter((block) => !isServiceCopyBlockId(block.id));

  return (
    <div className="sv-page">
      <div className="sv-main">
        {/* The opening band is GONE (captain, 2026-10-02): /services opens on the
            five services themselves. One visually-hidden h1 keeps the page's
            heading for assistive tech and search; the a-la-carte band below
            labels itself. */}
        <h1 className="visually-hidden" id="services-page-title">
          {page?.hero.headline.trim() || "Funeraria Memorial Services"}
        </h1>

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
            <h2 id="services-more-title">More from the office</h2>
            <ContentBlocks
              blocks={otherBlocks}
              priceOf={() => null}
              mediaBaseUrl={mediaPublicBaseUrl()}
            />
          </section>
        ) : null}

        {/* The page's own closing band is GONE (captain, 2026-09-30): the shared
            shell's `NextSteps` already closes every public page, and keeping both
            printed two Calls — one sky, one gold — to the same number, back to
            back. */}
      </div>
    </div>
  );
}

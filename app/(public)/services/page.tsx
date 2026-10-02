import type { Metadata } from "next";
import Link from "next/link";
import { Phone, ScrollText, ShieldCheck } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { PublicHero } from "@/components/kit";
import { ContentBlocks } from "@/components/content/content-blocks";
import { mediaPublicBaseUrl } from "@/lib/media-url";
import { listLandingContent } from "@/lib/api-client/landing";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { getChapelSchedule } from "@/lib/api-client/chapel-reservations";
import { buildQuoteHref } from "@/lib/public-forms/request-prefill";
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
 * THE OPENING IS THE HOME'S GATEWAY (captain, 2026-09-30: "following how our
 * homepage looks, let's apply the same to services page"). It is a centred,
 * designed band — eyebrow, headline at the page-title step, one-line lead, the
 * gold call and one outline action, then the three orientation facts under a
 * hairline. It carries NO photograph: the client's hero photograph is gone from
 * the opening (the images overwhelmed the page) and the page's own service
 * plates below carry the imagery instead. The eyebrow, headline and lead stay
 * editable in Pages & content; the action reads the staff-editable 24/7 line.
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
  const heroHeadline = page?.hero.headline.trim() ?? "";

  // The service descriptions are consumed by the rate cards below; any other
  // block staff add still renders through the shared block renderer. Service
  // pages publish no price, so a staff-authored price block resolves to no
  // amount (the honest "ask the office" fallback in ContentBlocks).
  const otherBlocks = (page?.blocks ?? []).filter((block) => !isServiceCopyBlockId(block.id));

  return (
    <div className="sv-page">
      <div className="sv-main">
        {/* No breadcrumb (captain, 2026-09-30): the page opens directly on the
            gateway band, exactly as the home does. */}

        {/* The page opens on the home's gateway grammar: one sentence, one gold
            call, and the three facts a family needs before any list is useful. */}
        <PublicHero
          variant="interior"
          eyebrow={page?.hero.eyebrow.trim() || undefined}
          title={heroHeadline || "Funeraria Memorial Services"}
          lead={page?.hero.lead.trim() || undefined}
          textColour={page?.hero.textColour ?? null}
          primary={{ label: `Call ${contact.phoneDisplay}`, href: contact.phoneHref }}
          secondary={{ label: "Start a quote", href: buildQuoteHref({ item: "Funeral services" }) }}
        />

        {/* Three boxes, three short facts, one icon each (captain, 2026-09-27:
            "lesser text … more graphics … use boxes … dont overwhelm visitors").
            This replaced a paragraph-per-fact strip: same three facts, a third of
            the words, and a graphic to land each one. A family arriving at an
            at-need page has to learn these before any list is useful, and none of
            them were on the page at all. */}
        <ul className="sv-orient" aria-label="How these services work">
          <li>
            <span className="sv-orient__icon" aria-hidden="true">
              <ScrollText size={20} />
            </span>
            <p className="sv-orient__label">Quoted, not listed</p>
            <p className="sv-orient__text">A written quotation from the office.</p>
          </li>
          <li>
            <span className="sv-orient__icon" aria-hidden="true">
              <Phone size={20} />
            </span>
            <p className="sv-orient__label">A person, any hour</p>
            <p className="sv-orient__text">
              Call <a href={contact.phoneHref}>{contact.phoneDisplay}</a>.
            </p>
          </li>
          <li>
            <span className="sv-orient__icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <p className="sv-orient__label">A plan covers these</p>
            <p className="sv-orient__text">
              <Link href="/plans">See the plan →</Link>
            </p>
          </li>
        </ul>

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

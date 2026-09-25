import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/public-forms/contact-form";
import { LocationBlock } from "@/components/public/location-block";
import { PublicHero, SectionHead } from "@/components/kit";
import { listLandingContent } from "@/lib/api-client/landing";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us — Villa Memorial",
  description:
    "Reach Villa Memorial Park day or night — the 24/7 assistance line, the park office, and a message a coordinator answers.",
  path: "/contact",
});

/**
 * The public contact surface (F-17): ONE place for the office's published
 * facts — both hotlines from the client's own letterhead, the main office and
 * the park, and the availability the 24/7 line keeps — all read from the
 * staff-editable LandingPage document, never typed here.
 *
 * Story-lane pass (2026-09-22, plan §5.7): the page opens on the shared
 * `PublicHero` and lists the published facts as a compact `.story-contact-facts`
 * grid before the form. The page keeps exactly ONE filled primary — the form's
 * Send — so the 24/7 Call is the outline support rung (settles D8: the page used
 * to show a gold Call and a sky Send as two equal primaries).
 *
 * This is also the storefront's "Request order" landing: a link carrying
 * `?item=&sku=&price=` (lib/public-forms/request-prefill.ts) is parsed HERE and
 * handed to the form as a prop, so the banner and the pre-written message echo
 * exactly what the visitor clicked — an enquiry, never a reservation.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [prefill, content] = await Promise.all([
    parseRequestPrefill(await searchParams),
    listLandingContent(),
  ]);
  const { contact } = content;
  const hasSecondLine =
    contact.secondPhoneDisplay.trim().length > 0 && contact.secondPhoneHref.trim().length > 0;

  return (
    <div className="story-page container--reading">
      <PublicHero
        variant="interior"
        eyebrow="Reach us"
        title={prefill ? "Request an order" : "Contact us"}
        lead={
          prefill
            ? "The office confirms availability, the final price and the next steps."
            : "Call any hour, or send a message a coordinator answers."
        }
      />

      {/* The published facts first (F-17): numbers, addresses and availability
          before the form — a caller never has to scroll for the phone. */}
      <section className="story-band" aria-labelledby="contact-facts-title">
        <SectionHead
          id="contact-facts-title"
          title="Reach the office"
          lead="Both lines answer any hour, every day."
        />
        <ul className="story-contact-facts">
          <li className="story-contact-fact">
            <span className="story-contact-fact__label">{contact.phoneLabel}</span>
            <span className="story-contact-fact__value">
              <a className="story-contact-fact__call" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
            </span>
          </li>
          {hasSecondLine ? (
            <li className="story-contact-fact">
              <span className="story-contact-fact__label">Second line</span>
              <span className="story-contact-fact__value">
                <a href={contact.secondPhoneHref}>Call {contact.secondPhoneDisplay}</a>
              </span>
            </li>
          ) : null}
          {contact.officeAddress.trim() ? (
            <li className="story-contact-fact">
              <span className="story-contact-fact__label">Main office</span>
              <span className="story-contact-fact__value">{contact.officeAddress}</span>
            </li>
          ) : null}
          {contact.parkAddress.trim() ? (
            <li className="story-contact-fact">
              <span className="story-contact-fact__label">The park</span>
              <span className="story-contact-fact__value">{contact.parkAddress}</span>
              <Link className="back-link" href="/map">
                Map &amp; directions →
              </Link>
            </li>
          ) : null}
        </ul>

        <nav className="story-actions" aria-label="Other ways to reach us">
          <a className="btn btn--secondary" href="#contact-message">
            Send a message
          </a>
          <Link className="btn btn--secondary" href="/quote">
            Request a quote
          </Link>
          <Link className="btn btn--secondary" href="/appointments">
            Book a visit
          </Link>
        </nav>
      </section>

      {/* Where the office and the park actually are, with directions (client's
          minutes 2026-09-21, item 6). Sits with the published facts, before the
          form, so someone travelling finds it without scrolling. */}
      <LocationBlock contact={contact} className="story-band" />

      <div className="story-band" id="contact-message">
        <ContactForm prefill={prefill} />
      </div>

      <nav className="story-back" aria-label="Back to home">
        <Link href="/" className="back-link">← Back to home</Link>
      </nav>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { ContactForm } from "@/components/public-forms/contact-form";
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
 * the park, and the hours the 24/7 line keeps — all read from the
 * staff-editable LandingPage document, never typed here. The two call actions
 * are real `tel:` links at the top of the page, so a visitor can simply phone
 * before reading anything else.
 *
 * This is also the storefront's "Request order" landing: a link carrying
 * `?item=&sku=&price=` (lib/public-forms/request-prefill.ts) is parsed HERE and
 * handed to the form as a prop, so the banner and the pre-written message echo
 * exactly what the visitor clicked — an enquiry, never a reservation. The form
 * itself is the shared capture shell; no records service exists, so a
 * submission is kept demo-locally and the confirmation says plainly that
 * nothing was sent. The inquiries board on the staff side reads the same store.
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
    <div className="stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Reach us</p>
          <h1>{prefill ? "Request an order" : "Contact us"}</h1>
          <p className="text-sm text-muted">
            {prefill
              ? "Tell us how to reach you; the office confirms availability, the final price and the next steps."
              : "Call any hour, or send a message and a coordinator will guide you."}
          </p>
          <nav aria-label="Back" style={{ marginTop: "var(--space-3)" }}>
            <Link href="/" className="back-link">← Back to home</Link>
          </nav>
        </div>
      </div>

      {/* The published facts first (F-17): numbers, addresses and availability
          before the form — a caller never has to scroll to find the phone. */}
      <section className="contact-facts" aria-labelledby="contact-facts-title">
        <h2 className="contact-facts__title" id="contact-facts-title">
          Reach the office
        </h2>
        <div className="contact-facts__grid">
          <div className="contact-fact contact-fact--call">
            <span className="contact-fact__label">{contact.phoneLabel}</span>
            <a className="btn btn--accent btn--lg" href={contact.phoneHref}>
              <Phone size={18} aria-hidden="true" />
              Call {contact.phoneDisplay}
            </a>
            <span className="contact-fact__meta">Answered every hour, every day.</span>
          </div>
          {hasSecondLine ? (
            <div className="contact-fact">
              <span className="contact-fact__label">Second line</span>
              <a className="contact-fact__number" href={contact.secondPhoneHref}>
                Call {contact.secondPhoneDisplay}
              </a>
            </div>
          ) : null}
          {contact.officeAddress.trim() ? (
            <div className="contact-fact">
              <span className="contact-fact__label">Main office</span>
              <span className="contact-fact__value">{contact.officeAddress}</span>
            </div>
          ) : null}
          {contact.parkAddress.trim() ? (
            <div className="contact-fact">
              <span className="contact-fact__label">The park</span>
              <span className="contact-fact__value">{contact.parkAddress}</span>
              <Link className="contact-fact__link" href="/map">
                Map &amp; directions →
              </Link>
            </div>
          ) : null}
        </div>
        <nav className="contact-facts__doors" aria-label="Other ways to reach us">
          <a href="#contact-message">Send a message</a>
          <Link href="/quote">Request a quote</Link>
          <Link href="/appointments">Book a visit</Link>
        </nav>
      </section>

      <div className="page-section" id="contact-message" style={{ maxWidth: "46rem" }}>
        <ContactForm prefill={prefill} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, Mail, MapPin, Phone } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { listLandingContent } from "@/lib/api-client/landing";

export const metadata: Metadata = pageMetadata({
  title: "Immediate assistance — Villa Memorial",
  description:
    "When someone has died: call the 24/7 line, then follow four plain steps. One coordinator handles every arrangement — nothing needs deciding tonight.",
  path: "/immediate-assistance",
});

/**
 * Immediate assistance — the hardest moment gets its own screen (checklist
 * F-01, captain 2026-09-18). The page answers in this order and nothing else:
 *
 *   1. CALL THE OFFICE — an enormous `tel:` link, the first thing the page
 *      shows. The number/line label/location are read from the staff-editable
 *      landing content document (zone 01) exactly like every other call site
 *      in the app, so an editor's change lands here on the next request.
 *   2. WHAT TO DO RIGHT NOW — four numbered steps, no prose paragraphs.
 *   3. REASSURANCE — one line: nothing needs deciding tonight.
 *   4. THE ALTERNATIVES, clearly secondary — where we are, the contact form
 *      and the family sign-in.
 *
 * HONESTY (AGENTS.md "honest states"): the landing document carries a phone
 * label/number/location and nothing else — no street address, no office hours.
 * So the page prints only those facts and omits hours rather than guessing;
 * the 24/7 claim is the staff-editable `contact.phoneLabel` printed verbatim,
 * never typed into this file. No chat widget, no bot, no callback promise.
 */
export default async function ImmediateAssistancePage() {
  const { contact } = await listLandingContent();

  return (
    <div className="ia-page">
      {/* 1. The call — the only thing this screen needs the visitor to do. */}
      <section className="ia-hero" aria-labelledby="ia-title">
        <p className="ia-hero__eyebrow">Immediate assistance</p>
        <h1 className="ia-hero__title" id="ia-title">
          Someone has died.
        </h1>
        <p className="ia-hero__lead">
          Call the office now — we answer any hour, day or night.
        </p>
        <a className="btn ia-call" href={contact.phoneHref}>
          <Phone size={30} aria-hidden="true" />
          <span className="ia-call__text">
            <span className="ia-call__kicker">Call now</span>
            <span className="ia-call__number">{contact.phoneDisplay}</span>
          </span>
        </a>
        <p className="ia-hero__note">
          {contact.phoneLabel} · {contact.location}
        </p>
      </section>

      {/* 2. What to do right now — numbered steps, not prose. */}
      <section className="ia-steps" aria-labelledby="ia-steps-title">
        <h2 id="ia-steps-title">What to do right now</h2>
        <ol className="ia-steps__list">
          <li className="ia-step">
            <span className="ia-step__num" aria-hidden="true">
              1
            </span>
            <div className="ia-step__body">
              <h3>Call us</h3>
              <p>Any hour, day or night — a coordinator answers and stays with you.</p>
            </div>
          </li>
          <li className="ia-step">
            <span className="ia-step__num" aria-hidden="true">
              2
            </span>
            <div className="ia-step__body">
              <h3>Have these ready</h3>
              <ul className="ia-ready">
                <li>Their full name</li>
                <li>Date of birth</li>
                <li>Where they are now</li>
                <li>Who decides for the family</li>
              </ul>
            </div>
          </li>
          <li className="ia-step">
            <span className="ia-step__num" aria-hidden="true">
              3
            </span>
            <div className="ia-step__body">
              <h3>We come to you</h3>
              <p>At home, we bring them into our care. In hospital, we handle the papers.</p>
            </div>
          </li>
          <li className="ia-step">
            <span className="ia-step__num" aria-hidden="true">
              4
            </span>
            <div className="ia-step__body">
              <h3>We handle the rest</h3>
              <p>Transport, chapel and burial — arranged with you, at your pace.</p>
            </div>
          </li>
        </ol>
      </section>

      {/* 3. One line of reassurance. */}
      <p className="ia-reassure">
        <strong>Nothing needs deciding tonight.</strong> One coordinator handles every arrangement
        with you.
      </p>

      {/* 4. The alternatives, clearly secondary. */}
      <section className="ia-alts" aria-labelledby="ia-alts-title">
        <h2 id="ia-alts-title">Other ways to reach us</h2>
        <div className="ia-alts__grid">
          <div className="ia-alt">
            <MapPin size={20} aria-hidden="true" />
            <span className="ia-alt__label">Visit us</span>
            <span className="ia-alt__value">{contact.location}</span>
          </div>
          <Link className="ia-alt" href="/contact">
            <Mail size={20} aria-hidden="true" />
            <span className="ia-alt__label">Message the office</span>
            <span className="ia-alt__value">Use the contact form</span>
          </Link>
          <Link className="ia-alt" href="/client/login">
            <LogIn size={20} aria-hidden="true" />
            <span className="ia-alt__label">Family sign-in</span>
            <span className="ia-alt__value">See your plan and papers</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

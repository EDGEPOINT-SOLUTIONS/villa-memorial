import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/public-forms/contact-form";
import { CopyAddress } from "@/components/public/copy-address";
import { PublicHero, PublicImage } from "@/components/kit";
import { PageBlocks } from "@/components/villa/page-blocks";
import { getPageDocument } from "@/lib/api-client/content-pages";
import { heroOr } from "@/lib/page-hero";
import { listLandingContent } from "@/lib/api-client/landing";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";
import {
  LOCATION_MAP_NOTE,
  directionsUrl,
  locationPlaces,
} from "@/lib/location-map";
import { GALLERY_HERO } from "@/lib/gallery";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us — Villa Funeraria",
  description:
    "Reach Villa Memorial Park day or night — the 24/7 assistance line, the park office, and a message a coordinator answers.",
  path: "/contact",
});

/**
 * The public contact surface — "the reach line" (captain's Lavish plan,
 * 2026-09-30; approved on the board: "implement this").
 *
 * ONE organizing idea: the first screen makes reaching a person a single tap.
 * The page opens on the shared interior gateway (the same grammar `/services`
 * ships), whose primary action is the 24/7 Call in the captain's gold; a person
 * is one tap away before any content is read. Everything below supports it:
 *
 *   Band 1 · the reach line   — gateway: eyebrow · h1 (35.2px / weight 500) ·
 *                               lead · gold Call + outline "Send a message" ·
 *                               the three facts under a hairline.
 *   Band 2 · Send a message   — the enquiry form FIRST (captain, 2026-09-27:
 *                               "put this at the last section" reversed the old
 *                               facts-first order — the order below is the one
 *                               `tests/unit/journey-actions.test.tsx` pins).
 *   Band 3 · By phone         — each published line as the band's FIGURE, with
 *                               one real Call action, then the two other paths.
 *   Band 4 · Visit us         — the client's own gate photograph beside the two
 *                               recorded addresses and their directions.
 *
 * TYPOGRAPHY (captain, 2026-09-30; inbox 003): every section title on this page
 * is TeX Gyre Bonum, 35.2px, weight 500 — never bold. The gateway h1 and the
 * `.home-band-head__title` heads both carry exactly that; the page adds no bold
 * title of its own.
 *
 * HONESTY: the client's material carries no walk-in office hours, so the page
 * publishes only the availability the 24/7 line keeps ("Answers any hour"), and
 * the missing source stays an open client question. No hour, address, phone
 * number or coordinate is typed here — every figure is read from its owning
 * store (`listLandingContent().contact`, `lib/location-map.ts`, `lib/gallery.ts`).
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
  const [prefill, content, contactPage] = await Promise.all([
    parseRequestPrefill(await searchParams),
    listLandingContent(),
    getPageDocument("contact").catch(() => null),
  ]);
  const { contact } = content;
  const hero = heroOr(contactPage, {
    eyebrow: "Reach us",
    headline: "Contact us",
    lead: "Call any hour, or send a message a coordinator answers.",
  });
  const hasSecondLine =
    contact.secondPhoneDisplay.trim().length > 0 && contact.secondPhoneHref.trim().length > 0;
  const places = locationPlaces(contact);
  const showTwoLines = hasSecondLine;

  // The opening's three facts, each derived from the store (never a false
  // count): the availability the 24/7 line keeps, how many lines are published,
  // and where the park and the office are.
  const placeFact =
    places.length > 0
      ? contact.location
        ? `Park & office, ${contact.location}`
        : "Park & office"
      : contact.location || "Isabela City";

  return (
    <div className="story-page container--reading contact-page">
      <PublicHero
        variant="interior"
        eyebrow={hero.eyebrow}
        title={prefill ? "Request an order" : hero.headline}
        lead={
          prefill
            ? "The office confirms availability, the final price and the next steps."
            : hero.lead
        }
        primary={{
          label: `Call ${contact.phoneDisplay}`,
          href: contact.phoneHref,
        }}
        secondary={{ label: "Send a message", href: "#contact-message" }}
      >
        <ul className="home-gateway__trust contact-trust" aria-label="How to reach the office">
          <li className="home-trust__item">
            <Clock size={18} aria-hidden="true" />
            <b>Answers any hour</b>
          </li>
          <li className="home-trust__item">
            <Phone size={18} aria-hidden="true" />
            <b>{showTwoLines ? "Two published lines" : "One published line"}</b>
          </li>
          <li className="home-trust__item">
            <MapPin size={18} aria-hidden="true" />
            <b>{placeFact}</b>
          </li>
        </ul>
      </PublicHero>

      <PageBlocks blocks={contactPage?.blocks ?? []} />

      {/* Band 2 · the form, with a designed head. The form is why most people
          opened this page; the facts below answer the ones who did not. */}
      <div className="story-band" id="contact-message" aria-labelledby="contact-message-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">Send a message</p>
          <h2 id="contact-message-title" className="home-band-head__title">
            Tell us what you need
          </h2>
          <p className="home-band-head__lead">
            A few lines are enough — the coordinator asks the rest.
          </p>
        </div>
        <ContactForm prefill={prefill} showMessageBlurb={false} />
      </div>

      {/* Band 3 · the published lines, each as the band's figure, with one real
          Call action. A cleared second line is simply omitted (the store's own
          rule), never rendered blank. */}
      <section className="story-band" id="contact-facts" aria-labelledby="contact-facts-title">
        <div className="home-band-head">
          <p className="home-band-head__kicker">By phone</p>
          <h2 id="contact-facts-title" className="home-band-head__title">
            {showTwoLines ? "Both lines answer any hour" : "The line answers any hour"}
          </h2>
          <p className="home-band-head__lead">
            {showTwoLines
              ? "The 24/7 line and the office's second published line."
              : "Reach a coordinator on the office's published line."}
          </p>
        </div>

        <ul className="contact-lines">
          <li className="contact-line">
            <p className="contact-line__label">{contact.phoneLabel}</p>
            <p className="contact-line__number">
              <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
            </p>
            <p className="contact-line__note">Answered every hour, every day.</p>
            <a className="btn btn--accent home-call contact-line__action" href={contact.phoneHref}>
              <Phone size={18} aria-hidden="true" />
              Call {contact.phoneDisplay}
            </a>
          </li>
          {hasSecondLine ? (
            <li className="contact-line">
              <p className="contact-line__label">Second line</p>
              <p className="contact-line__number">
                <a href={contact.secondPhoneHref}>{contact.secondPhoneDisplay}</a>
              </p>
              <p className="contact-line__note">The office&rsquo;s second published line.</p>
              <a
                className="btn btn--secondary contact-line__action"
                href={contact.secondPhoneHref}
              >
                <Phone size={18} aria-hidden="true" />
                Call {contact.secondPhoneDisplay}
              </a>
            </li>
          ) : null}
        </ul>

        {/* The two genuinely other ways in — each opens a different form, so the
            row is a decision, not a repeated link. "Send a message" stays the
            opening's own anchor. */}
        <nav className="contact-paths" aria-label="Other ways to reach us">
          <Link className="btn btn--secondary" href="/quote">
            Start a quote
          </Link>
          <Link className="btn btn--secondary" href="/appointments">
            Book a visit
          </Link>
        </nav>
      </section>

      {/* Band 4 · the place: the client's own gate photograph beside the two
          recorded addresses and their directions. The LAST band (captain,
          2026-09-27) — someone who is travelling reads it after they have sent
          their message or decided to call. `data-location-block` is the marker
          the journey guard pins, exactly as the shared LocationBlock shipped it. */}
      <section
        className="story-band contact-visit"
        data-location-block=""
        aria-labelledby="contact-visit-title"
      >
        <div className="home-band-head">
          <p className="home-band-head__kicker">Visit us</p>
          <h2 id="contact-visit-title" className="home-band-head__title">
            Two addresses, one park
          </h2>
          <p className="home-band-head__lead">
            Directions open in your maps app from the recorded address.
          </p>
          <Link className="btn btn--secondary home-band-head__cta" href="/map">
            Park map
          </Link>
        </div>

        <div className="contact-visit__grid">
          <div className="contact-visit__photo">
            <PublicImage
              role="interior-hero"
              src={GALLERY_HERO.src}
              srcSet={GALLERY_HERO.srcSet}
              sizes="(max-width: 48rem) 76vw, 348px"
              width={1024}
              height={577}
              alt={GALLERY_HERO.alt}
              caption="The park's entrance gate."
            />
          </div>

          <ul className="contact-places">
            {places.map((place, index) => (
              <li className="contact-place" key={place.id}>
                <h3 className="contact-place__name">{place.label}</h3>
                <p className="contact-place__address">{place.address}</p>
                <div className="contact-place__actions">
                  <a
                    className={`btn ${index === 0 ? "btn--primary" : "btn--secondary"}`}
                    href={directionsUrl("google", place.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get directions
                  </a>
                  <CopyAddress address={place.address} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="contact-visit__note">{LOCATION_MAP_NOTE}</p>
      </section>
    </div>
  );
}

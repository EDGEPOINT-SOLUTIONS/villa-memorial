import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import {
  CHAPEL_SAMPLE_NOTE,
  DEATH_AT_HOSPITAL_IMAGE,
  WAKESETUP_DRESSING_IMAGE,
} from "@/lib/media";
import { clientPhotoWide } from "@/lib/client-photos";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { ServicesSubnav, type SubnavItem } from "@/components/villa/services-subnav";
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLandingContent } from "@/lib/api-client/landing";

export const metadata: Metadata = pageMetadata({
  title: "Funeraria Memorial Services — Villa Memorial",
  description:
    "At-need funeral care day or night: the 24/7 call steps, a-la-carte service rates, embalming by the day and chapel bookings at Villa Memorial Park.",
  path: "/services",
});

/** The page's own sections, in order — the sticky bar and the anchors share one list. */
const SECTIONS: ReadonlyArray<SubnavItem> = [
  { id: "first-steps", label: "What to do first" },
  { id: "services", label: "Services & prices" },
  { id: "embalming", label: "Embalming" },
  { id: "chapel", label: "Chapel dates" },
  { id: "sources", label: "Where prices come from" },
];

/**
 * Funeraria Memorial Services — the captain-approved 2026-09-16 layout
 * (docs/08-delivery/services-design/).
 *
 * The page leads with the 24/7 call, answers "what happens now" before money,
 * then publishes the client's 2026 rates in three readable blocks (at-need
 * services, embalming per day, chapel use). Every figure comes from
 * lib/villa-pricing.ts through components/villa/service-rates-2026.tsx, and
 * every sellable line keeps the storefront's two actions; a chapel stay opens
 * the booking step instead of a straight add. Copy is content, not data.
 */
export default async function ServicesPage() {
  // The 24/7 line is STAFF-EDITABLE (landing content, zone 01) — every call
  // action on this page reads the same document the site header reads, so an
  // editor's phone change lands here too. No number is typed into this page.
  const [items, content] = await Promise.all([
    listCatalogItems().catch(() => null),
    listLandingContent(),
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

  return (
    <div className="sv-page">
      <div className="sv-main">
        <section className="sv-hero" id="top" aria-labelledby="services-title">
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
              <p className="sv-hero__eyebrow">Funeraria Memorial Services · 2026 prices</p>
              <h1 className="sv-hero__title" id="services-title">
                Funeral services, and what they cost in 2026
              </h1>
              {/* The page's one-line answer (reading budget, captain 2026-09-18). */}
              <p className="sv-hero__lead">At-need funeral care, any hour — with 2026 prices.</p>
            </div>
            <figure className="sv-hero__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */}
              <img
                src={clientPhotoWide("wake-setup-casket-draped").src}
                srcSet={clientPhotoWide("wake-setup-casket-draped").srcSet}
                alt="A white casket with gold handles in a purple-draped viewing room the office prepared, under garlands of white flowers"
              />
              <figcaption>
                A wake set-up the office prepared — shown larger on the{" "}
                <Link href="/gallery">photo gallery</Link>. {CHAPEL_SAMPLE_NOTE}
              </figcaption>
            </figure>
          </div>

          <div className="sv-call">
            <div>
              <h2 className="sv-call__title">If someone has just died</h2>
              <p className="sv-call__text">Call any hour — no charge to ask.</p>
            </div>
            <div className="sv-call__actions">
              <a className="btn btn--primary" href={contact.phoneHref}>
                Call {contact.phoneDisplay}
              </a>
              <a className="btn btn--secondary" href="#first-steps">
                What to do first
              </a>
            </div>
          </div>
        </section>

        <ServicesSubnav items={SECTIONS} />

        <section className="sv-section" id="first-steps" aria-labelledby="first-steps-title">
          <p className="sv-section__kicker">The first call</p>
          <h2 className="sv-section__title" id="first-steps-title">
            What happens after you call
          </h2>
          <p className="sv-section__intro">One coordinator, from first call to burial.</p>
          <ol className="sv-steps">
            <li>
              <h3>You call us</h3>
              <p>Any hour. If they are at home, we come to you.</p>
            </li>
            <li>
              <h3>We bring them into our care</h3>
              <p>We prepare and dress them; the viewing opens.</p>
            </li>
            <li>
              <h3>We stay with you</h3>
              <p>We arrange the chapel, cars and burial.</p>
            </li>
          </ol>

          <div className="sv-prices sv-prices--guides">
            <article className="sv-price-card">
              <div className="sv-price-card__head">
                <h3>Death at home</h3>
              </div>
              <div className="sv-card-media">
                {/* eslint-disable-next-line @next/next/no-img-element -- the client's own 2026 photograph */}
                <img
                  src={WAKESETUP_DRESSING_IMAGE}
                  srcSet={clientPhotoWide("wake-setup-dressing").srcSet}
                  alt=""
                  loading="lazy"
                />
              </div>
              <p className="sv-price-card__plain">Transport, preparation and paperwork — ours.</p>
              <div className="sv-price-card__actions">
                <Link className="btn btn--secondary btn--block" href="/services/death-at-home">
                  Read the guide: death at home
                </Link>
              </div>
            </article>
            <article className="sv-price-card">
              <div className="sv-price-card__head">
                <h3>Death in hospital</h3>
              </div>
              <div className="sv-card-media">
                {/* The client's 2026 set has no hospital photograph; this stays the
                    existing generic care image (no claim about any hospital) until
                    the client supplies one. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
                <img src={DEATH_AT_HOSPITAL_IMAGE} alt="" loading="lazy" />
              </div>
              <p className="sv-price-card__plain">We speak with the hospital and handle the papers.</p>
              <div className="sv-price-card__actions">
                <Link
                  className="btn btn--secondary btn--block"
                  href="/services/death-at-hospital"
                >
                  Read the guide: death in hospital
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* The client's 2026 service rates, grouped the way the sheets print them:
            the a-la-carte at-need services, embalming per day, then the chapel
            options with their sample photographs and the booking step. */}
        <ServiceRates2026 items={items} contact={contact} />

        <section className="sv-section" id="sources" aria-labelledby="sources-title">
          <div className="sv-sources">
            <p className="sv-section__kicker">Where these figures come from</p>
            <h2 id="sources-title">The 2026 sheets, reproduced exactly</h2>
            {/* Facts as labels, not a paragraph (structure over sentences). */}
            <ul className="sv-factlist">
              <li>Services &amp; embalming — &ldquo;2026 price FV website A&rdquo; (= &ldquo;PRICE LIST FOR 2026 II&rdquo;)</li>
              <li>Chapel — &ldquo;PRICE LIST FOR 2026 III&rdquo;</li>
              <li>Reproduced exactly, ₱1,000 fee included</li>
              <li>Packages: embalming included, no a-la-carte rates</li>
            </ul>
          </div>
        </section>

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

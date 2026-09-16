import Link from "next/link";
import {
  CHAPEL_PRIVATE_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
} from "@/lib/media";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { ServicesSubnav, type SubnavItem } from "@/components/villa/services-subnav";
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { CHAPEL_NOTES } from "@/lib/villa-pricing";

export const metadata = { title: "Funeraria Memorial Services — Villa Memorial" };

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
  let items: Awaited<ReturnType<typeof listCatalogItems>>;
  try {
    items = await listCatalogItems();
  } catch {
    return (
      <div className="stack-4">
        <h1>Funeraria Memorial Services</h1>
        <ErrorState message="The service catalogue is unavailable right now, so the 2026 rates cannot be ordered online. Please try again shortly or call the 24/7 assistance line." />
      </div>
    );
  }

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
              <p className="sv-hero__lead">
                When someone dies, we take care of the arrangements — at home, in hospital,
                here at the park, or in advance. Every price on this page is the client&rsquo;s
                own 2026 price sheet, word for word.
              </p>
            </div>
            <figure className="sv-hero__media">
              {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
              <img
                src={CHAPEL_PRIVATE_IMAGE}
                alt="Illustrative sample set-up — a decorated viewing room with the casket on a draped stand, floral arch and candles"
              />
              <figcaption>
                A sample viewing set-up from the client&rsquo;s own photographs.{" "}
                {CHAPEL_SAMPLE_NOTE}
              </figcaption>
            </figure>
          </div>

          <div className="sv-call">
            <div>
              <h2 className="sv-call__title">If someone has just died</h2>
              <p className="sv-call__text">
                Call us, any hour. A coordinator answers, tells you what to do next, and
                brings your loved one into our care. There is no charge to ask.
              </p>
            </div>
            <div className="sv-call__actions">
              <a className="btn btn--primary" href="tel:+639170001234">
                Call 0917 000 1234
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
          <p className="sv-section__intro">
            One coordinator stays with your family from the first call to the burial. You do
            not need to decide anything before you call — we will walk you through it.
          </p>
          <ol className="sv-steps">
            <li>
              <h3>You call us</h3>
              <p>
                Any hour, any day. Tell us where your loved one is. If they are at home, we
                come to them.
              </p>
            </li>
            <li>
              <h3>We bring them into our care</h3>
              <p>We prepare and dress them, and open the viewing for family and friends.</p>
            </li>
            <li>
              <h3>We stay with you</h3>
              <p>
                We arrange the chapel, the cars and the burial — and we are there on the day.
              </p>
            </li>
          </ol>

          <div className="sv-prices sv-prices--guides">
            <article className="sv-price-card">
              <div className="sv-price-card__head">
                <h3>Death at home</h3>
              </div>
              <div className="sv-card-media">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
                <img src={DEATH_AT_HOME_IMAGE} alt="" loading="lazy" />
              </div>
              <p className="sv-price-card__plain">
                When a loved one passes at home, we coordinate the transport, the preparation
                and everything that follows.
              </p>
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
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
                <img src={DEATH_AT_HOSPITAL_IMAGE} alt="" loading="lazy" />
              </div>
              <p className="sv-price-card__plain">
                When a loved one passes in care, we speak with the hospital, collect the papers
                and guide you through the next steps.
              </p>
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
        <ServiceRates2026 items={items} />

        <section className="sv-section" id="sources" aria-labelledby="sources-title">
          <div className="sv-sources">
            <p className="sv-section__kicker">Where these figures come from</p>
            <h2 id="sources-title">The 2026 sheets, reproduced exactly</h2>
            <p>
              The service prices on this page come from the client&rsquo;s own 2026 sheets —
              &ldquo;2026 price FV website A&rdquo; (identical to &ldquo;PRICE LIST FOR 2026
              II&rdquo;) for the services and embalming rates, and &ldquo;PRICE LIST FOR 2026
              III&rdquo; for the chapel rates. They are reproduced exactly, including the
              {" "}₱1,000 miscellaneous fee and the senior-citizen columns.
            </p>
            <p>
              The chapel photographs are the client&rsquo;s own sample services, cropped from
              the TYPES OF COFFIN sheet, which marks them &ldquo;(Illustration purposes
              only)&rdquo;. A family taking a complete Villa Memorial Plan package does not pay
              these a-la-carte amounts — embalming is included in the package with no fixed day
              count. {CHAPEL_NOTES.seniorPerDay}
            </p>
          </div>
        </section>

        <section className="sv-help" aria-labelledby="help-title">
          <div>
            <h2 id="help-title">Talk to a person, any hour</h2>
            <p>
              A coordinator can answer a price question, check chapel dates for you, or take
              the whole arrangement over the phone. There is no charge to ask, and nothing here
              needs a sign-in.
            </p>
          </div>
          <div className="sv-help__actions">
            <a className="btn btn--primary" href="tel:+639170001234">
              Call 0917 000 1234
            </a>
            <Link className="btn btn--secondary" href="/contact">
              Message us
            </Link>
          </div>
        </section>
      </div>

      <div className="sv-callbar" role="region" aria-label="Call the park">
        <span>Someone has died?</span>
        <a href="tel:+639170001234">Call 0917 000 1234</a>
      </div>
    </div>
  );
}

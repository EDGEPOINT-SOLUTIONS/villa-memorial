import Link from "next/link";
import {
  CHAPEL_PRIVATE_IMAGE,
  CHAPEL_SAMPLE_NOTE,
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
  PLAN_PACKAGES_IMAGE,
} from "@/lib/media";
import { ServiceRates2026 } from "@/components/villa/service-rates-2026";
import { ErrorState } from "@/components/ui/states";
import { listCatalogItems } from "@/lib/api-client/commerce";

export const metadata = { title: "Funeraria Memorial Services — Villa Memorial" };

/**
 * Static marketing content (Module C public face) plus the client's 2026 service
 * price list, presented in the site's premium grammar: a hero with the client's
 * own sample photograph, the first-call cards, then one grouped section per
 * price block (at-need services, embalming per day, the chapel options with their
 * photographs). The catalogue supplies each line's SKU/price for the Add-to-cart
 * and Request-order actions (lib/catalogue-skus.ts binds the sheet row to the
 * entry); copy is content, not data. The price tables read lib/villa-pricing.ts —
 * the transcribed sheets — and never author a figure; see
 * components/villa/service-rates-2026.tsx for the sheet map.
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
    <div className="plan-page">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">What we help with</p>
            <h1 className="hero-premium__title">Funeraria Memorial Services</h1>
            <p className="hero-premium__lead">
              Compassionate guidance from the first call through the service itself.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              Day or night, a coordinator walks you through each step — at home, in
              hospital, or in advance.
            </p>
            <nav className="hero-chips" aria-label="Service shortcuts">
              <Link href="/services/death-at-home">Death at home</Link>
              <Link href="/services/death-at-hospital">Death at hospital</Link>
              <Link href="#at-need-title">2026 service rates</Link>
              <Link href="/transport">Transport</Link>
              <Link href="/plans">Memorial plans</Link>
              <Link href="/quote">Request a quote</Link>
              <Link href="/appointments">Book an appointment</Link>
            </nav>
            <div className="row" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
              <Link href="/contact" className="btn btn--accent btn--lg">
                Immediate assistance
              </Link>
              <Link href="/map" className="btn btn--secondary btn--lg">
                Explore the memorial park
              </Link>
            </div>
          </div>

          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- client sample photo */}
            <img
              src={CHAPEL_PRIVATE_IMAGE}
              alt="Illustrative sample set-up — a decorated viewing room with the casket on a draped stand, floral arch and candles"
            />
            <figcaption>
              A sample viewing set-up from the client&rsquo;s own photographs. {CHAPEL_SAMPLE_NOTE}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="mid-section" aria-labelledby="first-call-title">
        <p className="mid-kicker">The first call</p>
        <h2 id="first-call-title">Wherever the call comes from</h2>
        <p className="mid-intro">
          One coordinator stays with the family from the first call: we bring your loved one into
          our care, prepare and dress them, open the viewing, and stay through the interment.
        </p>
        <div className="landing__grid">
          <article className="card">
            <div className="media-block media-block--natural card-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
              <img src={DEATH_AT_HOME_IMAGE} alt="" loading="lazy" />
            </div>
            <div className="card__body">
              <h3>Death at home</h3>
              <p className="text-sm text-muted">
                When a loved one passes at home, we coordinate transport, preparation and
                the arrangements that follow.
              </p>
              <Link href="/services/death-at-home" className="btn btn--secondary btn--sm">
                More on death at home
              </Link>
            </div>
          </article>

          <article className="card">
            <div className="media-block media-block--natural card-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
              <img src={DEATH_AT_HOSPITAL_IMAGE} alt="" loading="lazy" />
            </div>
            <div className="card__body">
              <h3>Death at hospital</h3>
              <p className="text-sm text-muted">
                When a loved one passes in care, we liaise with the facility and guide you
                through the next steps.
              </p>
              <Link href="/services/death-at-hospital" className="btn btn--secondary btn--sm">
                More on death at hospital
              </Link>
            </div>
          </article>

          <article className="card">
            <div className="media-block media-block--natural card-media">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
              <img src={PLAN_PACKAGES_IMAGE} alt="" loading="lazy" />
            </div>
            <div className="card__body">
              <h3>Memorial plans</h3>
              <p className="text-sm text-muted">
                Plan ahead for yourself or your family with structured, thoughtful plans.
              </p>
              <Link href="/plans" className="btn btn--secondary btn--sm">
                View plans
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* The client's 2026 service rates, grouped the way the sheets print them:
          the a-la-carte at-need services, embalming per day, then the chapel
          options with their sample photographs. */}
      <ServiceRates2026 items={items} />

      <section className="mid-section" aria-labelledby="service-source-title">
        <p className="mid-kicker">Where every figure comes from</p>
        <h2 id="service-source-title">The 2026 sheets, reproduced exactly</h2>
        <p className="mid-intro">
          Source: the client&rsquo;s 2026 sheets — &ldquo;2026 price FV website A&rdquo; (identical
          to PRICE LIST FOR 2026 II) for the a-la-carte and embalming rates, and PRICE LIST FOR
          2026 III for the chapel rates — reproduced exactly. The ₱1,000 miscellaneous fee is added
          to chapel rates, and a family taking a complete package does not pay these amounts —
          embalming is included in the package with no fixed day count.
        </p>
        <p className="mid-note">
          The chapel and carriage photographs above are the client&rsquo;s own sample services
          cropped from the TYPES OF COFFIN sheet, which marks them &ldquo;(Illustration purposes
          only)&rdquo;: they show sample set-ups, not a fixed view of any one room.
        </p>
      </section>

      <p className="text-sm text-muted">
        Day or night, speak with a coordinator — or{" "}
        <Link href="/map">explore the memorial park</Link> and{" "}
        <Link href="/plans">browse services and plans</Link> online.</p>
      <p className="text-sm text-muted">
        Also: <Link href="/transport">Transport</Link> ·{" "}
        <Link href="/products">Coffins &amp; caskets with prices</Link> ·{" "}
        <Link href="/lots/price-list-2026">2026 lot price list</Link> ·{" "}
        <Link href="/quote">Request a quote</Link> ·{" "}
        <Link href="/appointments">Book an appointment</Link> ·{" "}
        <Link href="/contact">Contact us</Link> · <Link href="/faq">FAQ</Link>
      </p>
    </div>
  );
}

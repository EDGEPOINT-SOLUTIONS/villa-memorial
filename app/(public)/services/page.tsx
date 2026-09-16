import Link from "next/link";
import {
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
 * price list as sellable rows. The catalogue supplies each line's SKU/price for
 * the Add-to-cart and Request-order actions (lib/catalogue-skus.ts binds the
 * sheet row to the entry); copy is content, not data. The price tables read
 * lib/villa-pricing.ts — the transcribed sheets — and never author a figure;
 * see components/villa/service-rates-2026.tsx for the sheet map.
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
    <div className="stack-4">
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
              <Link href="#service-rates-title">2026 service rates</Link>
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
        </div>
      </section>

      {/* The client's 2026 service rates: a-la-carte (when a family does not take a
          package) and chapel use. Tables, not prose — see the source note below. */}
      <section className="stack-3" aria-labelledby="service-rates-title">
        <h2 className="section-title" id="service-rates-title">
          The 2026 price list
        </h2>
        <p className="text-sm text-muted">
          Embalming priced per day (3–9 days, plus ₱1,500 for every day beyond nine),
          retrieval, delivery, viewing equipment, ORD coffin and interment — the sheet
          prints these for families who do not take a package. Chapel use is priced
          separately, common or private, with the senior-citizen column. Every line can
          go straight into the cart, or be sent to the office as a request.
        </p>
        <ServiceRates2026 items={items} />
        <p className="text-sm text-muted">
          Source: the client&rsquo;s 2026 sheets — “2026 price FV website A” (identical to
          PRICE LIST FOR 2026 II) for the a-la-carte and embalming rates, and PRICE LIST
          FOR 2026 III for the chapel rates, reproduced exactly. The ₱1,000 miscellaneous
          fee is added to chapel rates, and a family taking a complete package does not pay
          these amounts — embalming is included in the package with no fixed day count.
        </p>
      </section>

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
              Learn more
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
              Learn more
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

import Link from "next/link";
import { PublicShell } from "@/components/ui/public-shell";
import { PublicParkMap } from "@/components/public-park-map";
import { listCatalogItems } from "@/lib/api-client/commerce";
import { listLots, type Lot } from "@/lib/api-client/property";
import {
  COFFIN_GOLD,
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
  HERO_IMAGE,
  LOT_GARDEN_NICHES,
  LOT_MAUSOLEUM,
  LOT_PREMIUM,
  LOT_PRIMARY,
  PLAN_PACKAGES_IMAGE,
  TRANSPORT_IMAGE,
  VILLA_PARK_AERIAL,
} from "@/lib/media";

export const metadata = { title: "In Memoriam — Plan ahead, honour every life" };

/**
 * Public landing page (root "/") — villa-memorial layout grammar on the DOC
 * palette, inside the SHARED public chrome (same header/footer as every public
 * page — one consistent shell). Stats are REAL data; media is the sample park
 * photo over a doc-palette gradient fallback.
 */
export default async function LandingPage() {
  let stats: { value: string; label: string }[] | null = null;
  let lots: Lot[] = [];
  try {
    const [items, loaded] = await Promise.all([listCatalogItems(), listLots()]);
    lots = loaded;
    const available = lots.filter((l) => l.status === "available").length;
    stats = [
      { value: String(items.length), label: "Plans & services online" },
      { value: String(lots.length), label: "Memorial lots" },
      { value: String(new Set(lots.map((l) => l.section)).size), label: "Park sections" },
      { value: String(available), label: "Available today" },
    ];
  } catch {
    stats = null;
  }

  return (
    <PublicShell flush>
      {/* Hero — full-bleed band; content in its own container */}
      <section className="landing__hero">
        <div className="container landing__hero-grid">
          <div>
            <p className="eyebrow-label">Memorial &amp; funeral services</p>
            <h1 className="landing__title">
              Honoring every life with dignity and light.
            </h1>
            <p className="landing__lead">
              Funeral services, memorial plans, and garden lots — planned with care and
              guided with compassion, so your family is never alone during life&rsquo;s
              most difficult moments.
            </p>
            <div className="row landing__actions">
              <Link href="/plans" className="btn btn--accent btn--lg">
                Plan ahead
              </Link>
              <Link href="/services" className="btn btn--secondary btn--lg">
                Immediate assistance
              </Link>
            </div>
          </div>
          <div className="media-block media-block--natural landing__hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- local sample imagery */}
            <img src={HERO_IMAGE} alt="A peaceful memorial garden" />
          </div>
        </div>
      </section>

      {/* Stats band — real data, not invented claims */}
      {stats ? (
        <section className="container landing__stats" aria-label="Current availability">
          {stats.map((s) => (
            <div className="stat" key={s.label}>
              <div className="stat__value">{s.value}</div>
              <div className="stat__label">{s.label}</div>
            </div>
          ))}
        </section>
      ) : null}

      {/* Services */}
      <section className="container landing__section">
        <p className="eyebrow-label">Our services</p>
        <h2 className="section-title">Care for every step of the way</h2>
        <div className="landing__grid">
          {[
            {
              t: "Death at home",
              d: "Coordination, transport and dignified preparation when a loved one passes at home.",
              to: "/services/death-at-home",
              img: DEATH_AT_HOME_IMAGE,
            },
            {
              t: "Death at hospital",
              d: "We liaise with the facility and guide you through the next steps in care.",
              to: "/services/death-at-hospital",
              img: DEATH_AT_HOSPITAL_IMAGE,
            },
            {
              t: "Memorial plans & lots",
              d: "Plan ahead for yourself or your family — browse plans online or walk the park map.",
              to: "/plans",
              img: PLAN_PACKAGES_IMAGE,
            },
          ].map((s) => (
            <Link key={s.t} href={s.to} className="card landing__card">
              <div className="media-block card-media media-block--natural">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photos */}
                <img src={s.img} alt={s.t} loading="lazy" />
              </div>
              <div className="card__body">
                <h3>{s.t}</h3>
                <p className="text-sm text-muted">{s.d}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* From the store — packages, products, transport */}
      <section className="container landing__section">
        <p className="eyebrow-label">From the store</p>
        <h2 className="section-title">Packages, products &amp; transport</h2>
        <div className="landing__grid">
          <Link href="/packages" className="card landing__card">
            <div className="media-block card-media media-block--natural">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo */}
              <img src={PLAN_PACKAGES_IMAGE} alt="Comprehensive memorial packages" loading="lazy" />
            </div>
            <div className="card__body">
              <h3>Packages</h3>
              <p className="text-sm text-muted">Thoughtfully bundled services at one clear price.</p>
            </div>
          </Link>
          <Link href="/products" className="card landing__card">
            <div className="media-block card-media media-block--natural">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded casket photo */}
              <img src={COFFIN_GOLD} alt="Gold casket" loading="lazy" />
            </div>
            <div className="card__body">
              <h3>Products &amp; keepsakes</h3>
              <p className="text-sm text-muted">Caskets, urns and keepsakes for remembrance.</p>
            </div>
          </Link>
          <Link href="/transport" className="card landing__card">
            <div className="media-block card-media media-block--natural">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded transport photo */}
              <img src={TRANSPORT_IMAGE} alt="Villa transport service" loading="lazy" />
            </div>
            <div className="card__body">
              <h3>Transport</h3>
              <p className="text-sm text-muted">Dignified transport, day or night.</p>
            </div>
          </Link>
        </div>
      </section>

      {/* The very first memorial park in Basilan — premium showcase */}
      <section className="landing-showcase" aria-labelledby="first-park-title">
        <div className="container">
          <div className="landing-showcase__grid">
            <div className="landing-showcase__copy">
              <p className="landing-showcase__eyebrow">Villa Memorial · Isabela City, Basilan</p>
              <h2 id="first-park-title" className="landing-showcase__title">
                The very first memorial park in Basilan
              </h2>
              <p className="landing-showcase__lead">
                Serene, landscaped grounds created to give Mindanao families a place of
                quiet rest — planned ahead or at the moment of need, close to home.
              </p>
              <ul className="landing-showcase__list">
                <li>Walk the grounds online — zoom, pan and click every plot on the live map.</li>
                <li>Every plot carries its type: Primary lots, Premium lots, Garden niches and Mausoleum.</li>
                <li>Status at a glance — available, reserved, sold or occupied.</li>
              </ul>
              <div className="row" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
                <a href="#park-explorer" className="btn btn--accent btn--lg">
                  Explore the live map
                </a>
                <Link href="/map" className="btn btn--secondary btn--lg">
                  Open the full map
                </Link>
              </div>
            </div>
            <figure className="landing-showcase__photo">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded aerial photo */}
              <img src={VILLA_PARK_AERIAL} alt="Aerial view of the first memorial park in Basilan" />
              <figcaption>
                The First Ever Memorial Park in Basilan
              </figcaption>
            </figure>
          </div>

          <div className="landing-showcase__types">
            {[
              { img: LOT_PRIMARY, label: "Primary lots", to: "/lots/price-list-2026" },
              { img: LOT_PREMIUM, label: "Premium lots", to: "/lots/price-list-2026" },
              { img: LOT_GARDEN_NICHES, label: "Garden niches", to: "/lots/price-list-2026" },
              { img: LOT_MAUSOLEUM, label: "Mausoleum", to: "/lots/price-list-2026" },
            ].map((x) => (
              <Link key={x.label} href={x.to} className="landing-showcase__type">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded lot photos */}
                <img src={x.img} alt={x.label} loading="lazy" />
                <span>{x.label} →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Live interactive park map (embedded, same store as /map) */}
      <section id="park-explorer" className="container landing__section" aria-labelledby="explorer-title">
        <p className="eyebrow-label">Interactive park map</p>
        <h2 id="explorer-title" className="section-title">Browse the grounds, live</h2>
        <p className="landing__lead" style={{ maxWidth: "44rem" }}>
          Explore all {lots.length > 0 ? `${new Set(lots.map((l) => l.section)).size} sections` : "sections"} of
          Villa Memorial — click any plot to see its type, status and asking price.
        </p>
        {lots.length > 0 ? (
          <div className="map-embed">
            <PublicParkMap lots={lots} initialPark="villa" />
            <p className="text-sm text-muted" style={{ textAlign: "center" }}>
              Tip: the same map lives at <Link href="/map">/map</Link> — share any plot deep link, e.g.{" "}
              <Link href="/map?park=villa&plot=A-001">/map?park=villa&amp;plot=A-001</Link>.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="card__body stack">
              <p>
                The lot listings are momentarily unavailable on this device. Open the{" "}
                <Link href="/map">interactive park map</Link> directly instead.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Who are you? — one product, four doors */}
      <section className="container landing__section">
        <p className="eyebrow-label">Portals</p>
        <h2 className="section-title">Who are you?</h2>
        <div className="landing__grid">
          <Link href="/client/login" className="card landing__card">
            <div className="card__body">
              <h3>For families</h3>
              <p className="text-sm text-muted">
                Arrangements, plans, payments and documents — one calm place for your
                family.
              </p>
              <span className="btn btn--accent btn--sm">Family portal</span>
            </div>
          </Link>
          <Link href="/agent/login" className="card landing__card">
            <div className="card__body">
              <h3>For sales partners</h3>
              <p className="text-sm text-muted">
                Clients, prospects and commissions for our agents.
              </p>
              <span className="btn btn--secondary btn--sm">Agent portal</span>
            </div>
          </Link>
          <Link href="/login" className="card landing__card">
            <div className="card__body">
              <h3>For our team</h3>
              <p className="text-sm text-muted">
                Operations, finance, property and the people who run it all.
              </p>
              <span className="btn btn--secondary btn--sm">Staff portal</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Feature split + steps */}
      <section className="landing__band">
        <div className="container">
          <div className="feature-split">
            <p className="eyebrow-label">Memorial plans</p>
            <h2 className="section-title">Prepare today, peace of mind tomorrow</h2>
            <p className="section-sub">
              Flexible pre-need plans with installment terms that protect your family
              from future burden — and honor a life well-lived.
            </p>
            <div style={{ marginTop: "var(--space-3)" }}>
              <Link href="/plans" className="btn btn--accent">
                View plans
              </Link>
            </div>
          </div>

          <ol className="steps">
            <li>
              <strong>Choose</strong>
              <span className="text-sm text-muted">
                Select a plan or lot that feels right for your family.
              </span>
            </li>
            <li>
              <strong>Pay in installments</strong>
              <span className="text-sm text-muted">
                Spread the cost over months or years, not days.
              </span>
            </li>
            <li>
              <strong>Rest assured</strong>
              <span className="text-sm text-muted">
                Your wishes are recorded and your family is protected.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* Quote */}
      <section className="container landing__section">
        <blockquote className="quote">
          They guided us through everything with patience and grace — it felt less like a
          service and more like family.
        </blockquote>
        <div className="quote__attribution">— A family we served</div>
      </section>

      {/* CTA band */}
      <section className="container landing__section" style={{ paddingTop: 0 }}>
        <div className="landing__cta card">
          <div className="card__body row row--wrap" style={{ justifyContent: "space-between" }}>
            <div>
              <h3>We are here, day or night</h3>
              <p className="text-sm">
                For immediate assistance or to begin planning, our care team is available
                24/7 — or start online and we&rsquo;ll take it from there.
              </p>
            </div>
            <Link href="/services" className="btn btn--accent btn--lg">
              Get started
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

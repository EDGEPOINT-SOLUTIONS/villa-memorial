import Link from "next/link";
import {
  DEATH_AT_HOME_IMAGE,
  DEATH_AT_HOSPITAL_IMAGE,
  PLAN_PACKAGES_IMAGE,
} from "@/lib/media";

export const metadata = { title: "Services — In Memoriam" };

/**
 * Static marketing content (Module C public face). Copy is content, not data:
 * no backend is required for pages that inform and direct to real surfaces
 * (catalog, park map, portals). No claims beyond what the platform does today.
 */
export default function ServicesPage() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">What we help with</p>
            <h1 className="hero-premium__title">Services</h1>
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
        <Link href="/quote">Request a quote</Link> ·{" "}
        <Link href="/appointments">Book an appointment</Link> ·{" "}
        <Link href="/contact">Contact us</Link> · <Link href="/faq">FAQ</Link>
      </p>
    </div>
  );
}

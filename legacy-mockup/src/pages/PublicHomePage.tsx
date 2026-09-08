import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { pic } from "../lib/media";

export function PublicHomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
          <div>
            <p className="eyebrow-label">Villa Memorial · Isabela City</p>
            <h1 className="hero__title">Honoring every life with dignity and light.</h1>
            <p className="hero__lead">
              Funeral services, memorial plans, and garden lots — planned with care, guided with
              compassion, so your family is never alone during life's most difficult moments.
            </p>
            <div className="hero__actions">
              <Link to="/site/plans">
                <Button variant="accent" size="lg">
                  Plan ahead
                </Button>
              </Link>
              <Link to="/site/services">
                <Button variant="secondary" size="lg">
                  Immediate assistance
                </Button>
              </Link>
            </div>
          </div>
          <div className="hero__media">
            <img src={pic("memorial-garden", 900, 600)} alt="A peaceful memorial garden" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid grid--4">
          <div className="stat">
            <div className="stat__value">40+</div>
            <div className="stat__label">Years of service</div>
          </div>
          <div className="stat">
            <div className="stat__value">3</div>
            <div className="stat__label">Memorial gardens</div>
          </div>
          <div className="stat">
            <div className="stat__value">24/7</div>
            <div className="stat__label">Immediate care</div>
          </div>
          <div className="stat">
            <div className="stat__value">10k+</div>
            <div className="stat__label">Families served</div>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="eyebrow-label">Our services</p>
        <h2 className="section-title-lg" style={{ marginBottom: "var(--space-5)" }}>
          Care for every step of the way
        </h2>
        <div className="catalog-grid">
          {[
            { t: "At-need services", d: "Guidance from the moment of need — arrangements, documentation, and coordination.", seed: "care-support" },
            { t: "Wake & viewing", d: "Chapels and viewing rooms arranged with warmth, comfort, and quiet dignity.", seed: "chapel" },
            { t: "Cremation & interment", d: "Dignified options for cremation, burial, and interment within our gardens.", seed: "garden-roses" },
          ].map((s) => (
            <div className="item-card" key={s.t}>
              <div className="item-card__media">
                <img src={pic(s.seed, 640, 360)} alt={s.t} />
              </div>
              <div className="item-card__body">
                <div className="item-card__title">{s.t}</div>
                <p className="item-card__meta">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ background: "#f6fbff" }}>
        <div className="feature-split">
          <div>
            <p className="eyebrow-label">Memorial plans</p>
            <h2 className="section-title-lg">Prepare today, peace of mind tomorrow</h2>
            <p className="section-sub" style={{ marginTop: "var(--space-3)" }}>
              Flexible pre-need plans with installment terms that protect your family from future
              burden — and honor a life well-lived.
            </p>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Link to="/site/plans">
                <Button variant="accent">View plans</Button>
              </Link>
            </div>
          </div>
          <div className="timeline">
            {[
              ["Choose", "Select a plan and garden that feels right."],
              ["Pay in installments", "Spread the cost over years, not days."],
              ["Rest assured", "Your family is protected when it matters."],
            ].map(([l, d]) => (
              <div className="timeline__item" key={l}>
                <div className="timeline__label">{l}</div>
                <p className="small muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <blockquote className="quote">
          "They guided us through everything with patience and grace — it felt less like a
          service and more like family."
        </blockquote>
        <div className="quote__attribution">— A Villa Memorial family</div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="cta-band">
          <div>
            <div className="cta-band__title">We are here, day or night</div>
            <p className="cta-band__body" style={{ marginTop: "var(--space-2)" }}>
              For immediate assistance or to begin planning, our care team is available 24/7.
            </p>
          </div>
          <Link to="/site/services">
            <Button variant="accent" size="lg">
              Get started
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

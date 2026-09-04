import { Link } from "react-router-dom";
import { Button } from "../components/ui";

export function PublicAtNeedPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ textAlign: "center" }}>
          <p className="eyebrow-label">At-need services</p>
          <h1 className="hero__title" style={{ maxWidth: "40rem", margin: "var(--space-3) auto 0" }}>
            Immediate, compassionate care
          </h1>
          <p className="hero__lead" style={{ margin: "var(--space-3) auto 0" }}>
            When the time comes, we are here — 24 hours a day, 7 days a week. Tell us where the
            death occurred and we'll guide you from there.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="catalog-grid">
          {[
            { t: "Death occurred at home", d: "We'll send our team to your residence to care for your loved one.", to: "/site/services/death-at-home" },
            { t: "Death occurred at hospital", d: "Our staff coordinates directly with the hospital for a seamless transfer.", to: "/site/services/death-at-hospital" },
            { t: "Death occurred elsewhere", d: "For other locations, call our 24/7 care line for immediate guidance.", to: "/site/transport" },
          ].map((s) => (
            <div className="item-card" key={s.t}>
              <div className="item-card__body">
                <div className="item-card__title">{s.t}</div>
                <p className="item-card__meta">{s.d}</p>
                <Link to={s.to}>
                  <Button variant="secondary" block>
                    View details
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

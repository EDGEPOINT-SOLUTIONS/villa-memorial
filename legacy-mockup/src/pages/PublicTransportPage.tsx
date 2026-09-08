import { Button } from "../components/ui";
import { pic } from "../lib/media";

const FLEET = [
  { t: "Hearse (standard)", d: "Modern, dignified transfer vehicle for city and provincial routes.", price: "₱ 5,500", seed: "hearse-standard" },
  { t: "Hearse (premium)", d: "Flagship vehicle with full escort and floral provision.", price: "₱ 9,000", seed: "hearse-premium" },
  { t: "Long-distance transport", d: "Inter-province transfer with permits and route coordination.", price: "₱ 14,500", seed: "long-distance" },
  { t: "Airport / seaport transfer", d: "Domestic repatriation support and documentation.", price: "₱ 18,000", seed: "repatriation" },
];

export function PublicTransportPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ textAlign: "center" }}>
          <p className="eyebrow-label">Transportation & hearse services</p>
          <h1 className="hero__title" style={{ maxWidth: "40rem", margin: "var(--space-3) auto 0" }}>
            Every journey handled with care
          </h1>
          <p className="hero__lead" style={{ margin: "var(--space-3) auto 0" }}>
            A modern fleet and experienced drivers, available around the clock for transfers near
            and far.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="catalog-grid">
          {FLEET.map((f) => (
            <div className="item-card" key={f.t}>
              <div className="item-card__media">
                <img src={pic(f.seed, 640, 360)} alt={f.t} />
              </div>
              <div className="item-card__body">
                <div className="item-card__title">{f.t}</div>
                <div className="item-card__price">{f.price}</div>
                <p className="item-card__meta">{f.d}</p>
                <Button variant="secondary" block>
                  Request transport
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

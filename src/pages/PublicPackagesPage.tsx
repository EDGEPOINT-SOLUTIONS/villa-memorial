import { Button } from "../components/ui";
import { pic } from "../lib/media";

const PACKAGES = [
  { name: "Serenity Wake", price: "₱ 42,000", seed: "serenity-wake", includes: ["3-day chapel viewing", "Embalming", "Flower arrangement", "Memorial guest book"] },
  { name: "Garden Farewell", price: "₱ 68,500", seed: "garden-farewell", includes: ["Cremation", "Urn (standard)", "Viewing room", "Transport within the city"] },
  { name: "Legacy Complete", price: "₱ 96,000", seed: "legacy-complete", includes: ["Full chapel", "Vehicle fleet", "Interment service", "Memorial page"] },
];

export function PublicPackagesPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ textAlign: "center" }}>
          <p className="eyebrow-label">Wake & funeral packages</p>
          <h1 className="hero__title" style={{ maxWidth: "40rem", margin: "var(--space-3) auto 0" }}>
            Clear packages, gentle pricing
          </h1>
          <p className="hero__lead" style={{ margin: "var(--space-3) auto 0" }}>
            Transparent bundles so you can focus on family — not on cost.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="catalog-grid">
          {PACKAGES.map((p) => (
            <div className="item-card" key={p.name}>
              <div className="item-card__media">
                <img src={pic(p.seed, 640, 360)} alt={p.name} />
              </div>
              <div className="item-card__body">
                <div className="item-card__title">{p.name}</div>
                <div className="item-card__price">{p.price}</div>
                <ul className="small" style={{ color: "var(--color-text-secondary)", paddingLeft: "var(--space-4)", display: "grid", gap: "4px" }}>
                  {p.includes.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <Button variant="accent" block>
                  Request a quote
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

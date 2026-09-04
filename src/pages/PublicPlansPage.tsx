import { Button } from "../components/ui";
import { PLANS } from "../lib/data";
import { pic } from "../lib/media";

export function PublicPlansPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ textAlign: "center" }}>
          <p className="eyebrow-label">Memorial plans</p>
          <h1 className="hero__title" style={{ maxWidth: "44rem", margin: "var(--space-3) auto 0" }}>
            A plan for every legacy
          </h1>
          <p className="hero__lead" style={{ margin: "var(--space-3) auto 0" }}>
            Choose a garden, spread the cost over time, and give your family the comfort of
            knowing everything is arranged.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="catalog-grid">
          {PLANS.map((p) => (
            <div className="item-card" key={p.id}>
              <div className="item-card__media">
                <img src={pic(`plan-${p.name}`, 640, 360)} alt={p.name} />
              </div>
              <div className="item-card__body">
                <div className="item-card__title">{p.name}</div>
                <div className="item-card__price">{p.price}</div>
                <div className="item-card__meta">{p.term} · {p.holders} holders</div>
                <ul className="small" style={{ color: "var(--color-text-secondary)", paddingLeft: "var(--space-4)", display: "grid", gap: "4px" }}>
                  {p.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <Button variant="accent" block>
                  Choose this plan
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

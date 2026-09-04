import { Link } from "react-router-dom";
import { Button, Badge } from "../components/ui";
import { LOTS, type LotStatus } from "../lib/data";
import { pic } from "../lib/media";

type Tone = "available" | "reserved" | "sold" | "occupied" | "maintenance" | "transferred";
const tone: Record<LotStatus, Tone> = {
  Available: "available",
  Reserved: "reserved",
  Sold: "sold",
  Occupied: "occupied",
  Maintenance: "maintenance",
  Transferred: "transferred",
};

export function PublicLotsPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ textAlign: "center" }}>
          <p className="eyebrow-label">Memorial lots</p>
          <h1 className="hero__title" style={{ maxWidth: "40rem", margin: "var(--space-3) auto 0" }}>
            A lasting place in the garden
          </h1>
          <p className="hero__lead" style={{ margin: "var(--space-3) auto 0" }}>
            Explore our gardens and select a lot that feels right — each with its own story and a
            digital profile that lives on.
          </p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <Link to="/site/map">
              <Button variant="accent">Explore the park map</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="catalog-grid">
          {LOTS.slice(0, 9).map((l) => (
            <div className="item-card" key={l.id}>
              <div className="item-card__media">
                <img src={pic(`lot-${l.code}`, 640, 360)} alt={`${l.section} — Lot ${l.code}`} />
              </div>
              <div className="item-card__body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="item-card__title">Lot {l.code}</div>
                  <Badge tone={tone[l.status]}>{l.status}</Badge>
                </div>
                <div className="item-card__price">{l.price}</div>
                <div className="item-card__meta">{l.block} · {l.section}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

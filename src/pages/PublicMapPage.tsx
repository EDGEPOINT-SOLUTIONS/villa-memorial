import { useState } from "react";
import { MapView, MapLegend } from "../components/MapView";
import { Badge, Button } from "../components/ui";
import { useToast } from "../components/toast";
import { LOTS, type Lot, type LotStatus } from "../lib/data";
import { pic } from "../lib/media";

const tone: Record<LotStatus, "available" | "reserved" | "sold" | "occupied" | "maintenance" | "transferred"> = {
  Available: "available",
  Reserved: "reserved",
  Sold: "sold",
  Occupied: "occupied",
  Maintenance: "maintenance",
  Transferred: "transferred",
};

const TYPE: Record<string, string> = {
  "Garden of Roses": "Premium Lawn",
  "Garden of Remembrance": "Standard Lawn",
  "Evergreen Hill": "Family Mausoleum",
};

const SECTIONS = [
  { name: "Garden of Roses", lots: LOTS.filter((l) => l.section === "Garden of Roses").length, acres: "2.4 ha" },
  { name: "Garden of Remembrance", lots: LOTS.filter((l) => l.section === "Garden of Remembrance").length, acres: "3.1 ha" },
  { name: "Evergreen Hill", lots: LOTS.filter((l) => l.section === "Evergreen Hill").length, acres: "4.0 ha" },
];

export function PublicMapPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"interactive" | "master">("interactive");
  const [selected, setSelected] = useState<Lot | null>(null);

  function inquire() {
    toast(`Inquiry sent for ${selected?.code}`, "success");
    setSelected(null);
  }

  return (
    <>
      <section className="hero">
        <div className="hero__inner" style={{ textAlign: "center" }}>
          <p className="eyebrow-label">Sanctuario Memorial Park</p>
          <h1 className="hero__title" style={{ maxWidth: "40rem", margin: "var(--space-3) auto 0" }}>
            Explore the park, find the place
          </h1>
          <div style={{ marginTop: "var(--space-4)", display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
            <button
              className={`pill-toggle${mode === "interactive" ? " pill-toggle--active" : ""}`}
              onClick={() => setMode("interactive")}
            >
              Interactive map
            </button>
            <button
              className={`pill-toggle${mode === "master" ? " pill-toggle--active" : ""}`}
              onClick={() => setMode("master")}
            >
              Master plan
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        {mode === "interactive" ? (
          <div className="map-layout">
            <aside className="info-panel">
              <div className="info-panel__title">Sanctuario Memorial Park</div>
              <p className="small muted">Interactive memorial map</p>

              <div style={{ marginTop: "var(--space-4)" }}>
                <input
                  className="input"
                  placeholder="Search Lot ID, Section, Block…"
                  aria-label="Search lots"
                />
              </div>

              <div style={{ marginTop: "var(--space-4)" }}>
                <div className="field__label" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Availability
                </div>
                <div className="stack" style={{ marginTop: "var(--space-2)" }}>
                  {(["Available", "Reserved", "Occupied"] as LotStatus[]).map((s) => (
                    <label key={s} className="checkbox">
                      <input type="checkbox" defaultChecked />
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: `var(--color-status-${s.toLowerCase()})`,
                          display: "inline-block",
                        }}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
                {selected ? (
                  <div className="stack">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="info-panel__title" style={{ margin: 0 }}>{selected.code}</div>
                      <Badge tone={tone[selected.status]}>{selected.status}</Badge>
                    </div>
                    <div className="info-panel__grid">
                      <div>
                        <div className="info-panel__k">Section</div>
                        <div className="info-panel__v">{selected.section}</div>
                      </div>
                      <div>
                        <div className="info-panel__k">Block</div>
                        <div className="info-panel__v">{selected.block}</div>
                      </div>
                      <div>
                        <div className="info-panel__k">Type</div>
                        <div className="info-panel__v">{TYPE[selected.section] ?? "Lawn"}</div>
                      </div>
                      <div>
                        <div className="info-panel__k">Price</div>
                        <div className="info-panel__v" style={{ color: "var(--color-primary)", fontSize: "var(--text-lg)" }}>
                          {selected.price}
                        </div>
                      </div>
                    </div>
                    <Button variant="accent" block onClick={inquire}>
                      Inquire about this lot
                    </Button>
                    <Button variant="secondary" block onClick={() => setSelected(null)}>
                      Close
                    </Button>
                  </div>
                ) : (
                  <p className="small muted">
                    Select a dot on the map to see its details and enquire.
                  </p>
                )}
              </div>
            </aside>

            <div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <MapLegend />
              </div>
              <MapView lots={LOTS} selectedId={selected?.id ?? null} onSelect={setSelected} />
            </div>
          </div>
        ) : (
          <div className="catalog-grid">
            {SECTIONS.map((s) => (
              <div className="item-card" key={s.name}>
                <div className="item-card__media">
                  <img src={pic(`section-${s.name}`, 640, 360)} alt={s.name} />
                </div>
                <div className="item-card__body">
                  <div className="item-card__title">{s.name}</div>
                  <div className="item-card__meta">{s.lots} lots shown · {s.acres}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

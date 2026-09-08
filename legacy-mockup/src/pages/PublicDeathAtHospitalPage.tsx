import { Button } from "../components/ui";

const STEPS = [
  { t: "We coordinate with the hospital", d: "Our staff liaises directly with hospital administration and records." },
  { t: "Documents prepared", d: "We handle the required documentation for release and transport." },
  { t: "Transfer to our facility", d: "A dignified transfer by our professional team and fleet." },
  { t: "Arrangement begins", d: "A funeral director meets your family to plan the service." },
];

export function PublicDeathAtHospitalPage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <div>
            <p className="eyebrow-label">At-need · Death at hospital</p>
            <h1 className="hero__title">We handle the hospital, you focus on family</h1>
            <p className="hero__lead">
              From paperwork to transfer, our team works with the hospital on your behalf so your
              family can grieve without the burden of logistics.
            </p>
            <div className="hero__actions">
              <Button variant="accent" size="lg">Call our 24/7 care line</Button>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="timeline">
          {STEPS.map((s, i) => (
            <div className="timeline__item" key={s.t}>
              <div className="timeline__label">Step {i + 1} — {s.t}</div>
              <p className="small muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

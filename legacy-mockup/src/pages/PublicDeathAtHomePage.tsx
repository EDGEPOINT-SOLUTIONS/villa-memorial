import { Button } from "../components/ui";

const STEPS = [
  { t: "Call our care line", d: "Speak with a coordinator who will listen first, then guide you." },
  { t: "We send our team", d: "Our care team arrives at your residence with everything needed." },
  { t: "Transport with dignity", d: "Your loved one is transferred to our facility with care and respect." },
  { t: "Arrange with support", d: "A funeral director helps you plan services, chapel, and documents." },
];

export function PublicDeathAtHomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <div>
            <p className="eyebrow-label">At-need · Death at home</p>
            <h1 className="hero__title">We come to you</h1>
            <p className="hero__lead">
              Losing a loved one at home is overwhelming. Our team will come to your residence,
              handle everything with dignity, and guide your family step by step.
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

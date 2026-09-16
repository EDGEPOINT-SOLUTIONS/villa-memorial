import Link from "next/link";
import { TRANSPORT_IMAGE } from "@/lib/media";

export const metadata = { title: "Transport — Villa Memorial" };

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Services · Transport</p>
            <h1 className="hero-premium__title">Transport</h1>
            <p className="hero-premium__lead">
              Dignified transport for your loved one — from home or hospital to the
              service venue, and onward when the time comes. Coordinated by our team
              as part of your arrangement.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>
              Retrieval and delivery are covered within the first 25 km of every
              Villa Memorial Plan.
            </p>
            <div className="row" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
              <Link href="/contact" className="btn btn--accent">
                Immediate assistance
              </Link>
              <Link href="/plans/villa-memorial-plan" className="btn btn--secondary">
                Villa Memorial Plan
              </Link>
            </div>
            <nav aria-label="Back to Funeraria Memorial Services" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/services" className="back-link">
                ← Back to Funeraria Memorial Services
              </Link>
            </nav>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded transport photo */}
            <img src={TRANSPORT_IMAGE} alt="Villa transport service" />
            <figcaption>Dignified transport, day or night.</figcaption>
          </figure>
        </div>
      </section>
    </div>
  );
}

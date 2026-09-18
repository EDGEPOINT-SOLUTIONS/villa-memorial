import type { Metadata } from "next";
import Link from "next/link";
import { DEATH_AT_HOSPITAL_IMAGE } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Death at hospital — Villa Memorial",
  description:
    "When a death happens at the hospital, one call covers the coordination, the documents and the transport — day or night, with a coordinator beside you.",
  path: "/services/death-at-hospital",
});

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Services · In care</p>
            <h1 className="hero-premium__title">Death at hospital</h1>
            <p className="hero-premium__lead">
              When a loved one passes in a hospital or care facility, we liaise directly with the facility so you can focus on family. We handle the logistics of transfer, preparation, and coordination with the service venue.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>Speak with a coordinator any time, day or night.</p>
            <div className="row" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
              <Link href="/immediate-assistance" className="btn btn--accent">Immediate assistance</Link>
              <Link href="/plans" className="btn btn--secondary">Memorial plans</Link>
            </div>
            <nav aria-label="Back to Funeraria Memorial Services" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/services" className="back-link">← Back to Funeraria Memorial Services</Link>
            </nav>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
            <img src={DEATH_AT_HOSPITAL_IMAGE} alt="Death at hospital" />
            <figcaption>Liaising with facilities, so you can focus on family.</figcaption>
          </figure>
        </div>
      </section>
      
      

    </div>
  );
}

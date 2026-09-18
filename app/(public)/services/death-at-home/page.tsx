import type { Metadata } from "next";
import Link from "next/link";
import { DEATH_AT_HOME_IMAGE } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Death at home — Villa Memorial",
  description:
    "When a death happens at home, one call starts everything: our 24/7 line, the retrieval and the first steps, taken with you and at your pace.",
  path: "/services/death-at-home",
});

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Services · At home</p>
            <h1 className="hero-premium__title">Death at home</h1>
            <p className="hero-premium__lead">
              When a loved one passes at home, you should not have to manage the next steps alone. Our coordinators arrange transport, dignified preparation, and guide you through the service options that fit your family — at your pace, with no pressure.
            </p>
            <p className="text-sm text-muted" style={{ margin: "var(--space-2) 0 0" }}>Speak with a coordinator any time, day or night.</p>
            <div className="row" style={{ gap: "var(--space-3)", marginTop: "var(--space-5)" }}>
              <Link href="/contact" className="btn btn--accent">Immediate assistance</Link>
              <Link href="/plans" className="btn btn--secondary">Memorial plans</Link>
            </div>
            <nav aria-label="Back to Funeraria Memorial Services" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/services" className="back-link">← Back to Funeraria Memorial Services</Link>
            </nav>
          </div>
          <figure className="hero-premium__media">
            {/* eslint-disable-next-line @next/next/no-img-element -- uploaded service photo */}
            <img src={DEATH_AT_HOME_IMAGE} alt="Death at home" />
            <figcaption>Caring coordination when it happens at home.</figcaption>
          </figure>
        </div>
      </section>
      
      

    </div>
  );
}

import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Contact us — Villa Memorial" };

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Reach us</p>
            <h1 className="hero-premium__title">Contact us</h1>
            <p className="hero-premium__lead">Coordinated, caring support for every step — reach out and a coordinator will guide you.</p>
            <nav aria-label="Back" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/" className="back-link">← Back to home</Link>
            </nav>
          </div>
        </div>
      </section>
      <EmptyState
        title="Contact us — coming soon"
        hint="the public inquiry form arrives with the crm-families backend — nothing is fake-wired in the meantime"
      />
      <nav className="page-links" aria-label="While you wait">
        <span className="text-sm text-muted">While you wait:</span> <Link href="/services">browse our services</Link>,{" "}
        <Link href="/plans">view plans</Link>, or <Link href="/map">explore the park map</Link> · <Link href="/quote">Request a quote</Link> · <Link href="/appointments">Book an appointment</Link></nav>
    </div>
  );
}

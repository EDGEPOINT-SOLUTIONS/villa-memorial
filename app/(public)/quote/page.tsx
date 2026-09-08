import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Request a quote — In Memoriam" };

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Reach us</p>
            <h1 className="hero-premium__title">Request a quote</h1>
            <p className="hero-premium__lead">Tell us what you have in mind and receive a clear, written quotation from the park office.</p>
            <nav aria-label="Back" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/" className="back-link">← Back to home</Link>
            </nav>
          </div>
        </div>
      </section>
      <EmptyState
        title="Request a quote — coming soon"
        hint="quotes arrive with the crm/ordering contracts — meanwhile coordinators can assist directly"
      />
      <nav className="page-links" aria-label="While you wait">
        <span className="text-sm text-muted">While you wait:</span> <Link href="/services">browse our services</Link>,{" "}
        <Link href="/plans">view plans</Link>, or <Link href="/map">explore the park map</Link> · <Link href="/contact">Contact us</Link> · <Link href="/appointments">Book an appointment</Link></nav>
    </div>
  );
}

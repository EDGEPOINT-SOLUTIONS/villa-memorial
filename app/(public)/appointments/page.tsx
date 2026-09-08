import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Book an appointment — In Memoriam" };

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Reach us</p>
            <h1 className="hero-premium__title">Book an appointment</h1>
            <p className="hero-premium__lead">Sit down with a coordinator at the park office — at a time that suits your family.</p>
            <nav aria-label="Back" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/" className="back-link">← Back to home</Link>
            </nav>
          </div>
        </div>
      </section>
      <EmptyState
        title="Book an appointment — coming soon"
        hint="online appointment booking arrives with the scheduling/family contracts"
      />
      <nav className="page-links" aria-label="While you wait">
        <span className="text-sm text-muted">While you wait:</span> <Link href="/services">browse our services</Link>,{" "}
        <Link href="/plans">view plans</Link>, or <Link href="/map">explore the park map</Link> · <Link href="/contact">Contact us</Link> · <Link href="/quote">Request a quote</Link></nav>
    </div>
  );
}

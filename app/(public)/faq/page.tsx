import Link from "next/link";

export const metadata = { title: "Frequently asked questions — In Memoriam" };

export default function Page() {
  return (
    <div className="stack-4">
      <section className="hero-premium">
        <div className="hero-premium__grid">
          <div>
            <p className="eyebrow-label">Help</p>
            <h1 className="hero-premium__title">Frequently asked questions</h1>
            <p className="hero-premium__lead">Straight answers about our services, plans and the memorial park.</p>
            <nav aria-label="Back" style={{ marginTop: "var(--space-4)" }}>
              <Link href="/" className="back-link">← Back to home</Link>
            </nav>
          </div>
        </div>
      </section>
      
      <div className="landing__grid">
        <article className="card"><div className="card__body"><h3>What happens when I call?</h3>
          <p className="text-sm text-muted">A coordinator answers day or night, takes the details, and starts the arrangement with you.</p></div></article>
        <article className="card"><div className="card__body"><h3>Can I plan ahead?</h3>
          <p className="text-sm text-muted">Yes — browse memorial plans and park lots online, and speak with a coordinator to formalise them.</p></div></article>
        <article className="card"><div className="card__body"><h3>Where can I see available lots?</h3>
          <p className="text-sm text-muted">The park map shows sections and availability. Staff can assist with reservations.</p></div></article>
      </div>
      
      <nav className="page-links" aria-label="Next steps"><Link href="/plans">Browse plans &amp; services</Link><Link href="/map">Park map</Link><Link href="/contact">Contact us</Link></nav>
    </div>
  );
}

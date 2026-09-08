import { Link } from "react-router-dom";
import { Badge, Card, Button, KeyValue } from "../components/ui";

const ARRANGEMENT = [
  { step: "Death certificate received", done: true },
  { step: "Chapel booked", done: true },
  { step: "Embalming scheduled", done: true },
  { step: "Viewing — Sep 3, 9:00 AM", done: false },
  { step: "Interment — Sep 6, 2:00 PM", done: false },
];

export function ClientDashboardPage() {
  return (
    <div className="public-shell">
      <nav className="public-nav">
        <span className="public-nav__brand">Villa Memorial · Family</span>
        <div className="public-nav__links">
          <Link to="/login" className="btn btn--ghost btn--sm">
            Sign out
          </Link>
        </div>
      </nav>

      <main className="public-main">
        <section className="section" style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div className="card card--memorial" style={{ textAlign: "center", padding: "var(--space-6)" }}>
            <p className="eyebrow-label">In loving memory</p>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-3xl)" }}>
              Ernesto Dela Cruz
            </h1>
            <div className="life-dates">1948 – 2026</div>
            <hr className="ornament-rule" />
            <p className="small muted" style={{ maxWidth: "34rem", margin: "0 auto" }}>
              We are here with your family through every step. Below is your arrangement, your
              family's plans and lots, and your documents — all in one place.
            </p>
          </div>

          <div className="split" style={{ marginTop: "var(--space-6)" }}>
            <Card title="Your arrangement">
              <div className="stack">
                {ARRANGEMENT.map((a) => (
                  <div key={a.step} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Badge tone={a.done ? "success" : "reserved"}>{a.done ? "Done" : "Upcoming"}</Badge>
                    <span>{a.step}</span>
                  </div>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: "var(--space-4)" }}>
                Need to change a time? Call your funeral director — no urgency needed.
              </p>
            </Card>

            <Card title="Balance">
              <KeyValue
                items={[
                  ["Total", "₱ 42,000"],
                  ["Paid", "₱ 20,000"],
                  ["Balance", <strong key="b">₱ 22,000</strong>],
                  ["Next due", "Sep 15 · ₱ 12,000"],
                ]}
              />
              <Button variant="accent" block style={{ marginTop: "var(--space-4)" }}>
                Make a payment
              </Button>
            </Card>
          </div>

          <div className="grid grid--3" style={{ marginTop: "var(--space-6)" }}>
            <Card title="My plans">
                <KeyValue items={[["Plan", "Premium Lots · L-01"], ["Status", "Active"], ["Term", "5 years"]]} />
            </Card>
            <Card title="My lots">
              <KeyValue items={[["Lots", "2"], ["Sections", "Premium Lots · Lawn A"]]} />
            </Card>
            <Card title="My documents">
              <div className="stack">
                <span>Service contract · <Badge tone="info">Generated</Badge></span>
                <span>Official receipt · <Badge tone="info">Sent</Badge></span>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className="public-footer">
        <div className="public-footer__brand">Villa Memorial</div>
        <div className="small muted">Family portal · Powered by In-Memoriam</div>
      </footer>
    </div>
  );
}

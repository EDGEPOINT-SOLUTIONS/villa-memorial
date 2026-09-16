import Link from "next/link";
import { Card } from "@/components/ui/card";
import { php, SENIOR_PAYMENTS, SENIOR_TERMS } from "@/lib/villa-pricing";

export const metadata = { title: "Senior citizen plan — Villa Memorial" };

const TIERS = ["Bronze 1", "Bronze 2", "Silver 1", "Silver 2", "Gold"] as const;

/** Villa Memorial senior citizen plan — real terms & payment schedule. */
export default function SeniorBenefitsPage() {
  return (
    <div className="stack-4">
      <section className="page-hero">
        <p className="eyebrow-label">Senior citizens</p>
        <h1 className="page-hero__title">Senior citizen plan</h1>
        <p className="page-hero__lead">
          A complete memorial plan for our elders — with free flowers and a complete
          memorial package.
        </p>
        <nav aria-label="Back to Villa Memorial Plan" style={{ marginTop: "var(--space-3)" }}>
  <Link href="/plans" className="back-link">
    ← Back to Villa Memorial Plan (All · Packages · Services · Add-ons)
  </Link>
</nav>
      </section>

      <Card header={<h3>Eligibility &amp; terms</h3>}>
        <ul className="stack-3">
          {SENIOR_TERMS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Card>

      <Card header={<h3>Payment schedule (PHP)</h3>}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Payment mode</th>
                {TIERS.map((t) => (
                  <th key={t} scope="col">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SENIOR_PAYMENTS.map((r) => (
                <tr key={r.mode}>
                  <td>{r.mode}</td>
                  <td>{php(r.bronze1)}</td>
                  <td>{php(r.bronze2)}</td>
                  <td>{php(r.silver1)}</td>
                  <td>{php(r.silver2)}</td>
                  <td>{php(r.gold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-sm text-muted">
        Compare with the <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>{" "}
        (ages 1–60) or browse <Link href="/products">coffin options</Link>.
      </p>
    </div>
  );
}

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { SENIOR_PAYMENTS, SENIOR_TERMS } from "@/lib/villa-pricing";

export const metadata = { title: "Senior citizen plan — Villa Memorial" };

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
        <PlanPaymentTable rows={SENIOR_PAYMENTS} label="Senior citizen payment schedule" />
      </Card>

      <p className="text-sm text-muted">
        Compare with the <Link href="/plans/villa-memorial-plan">Villa Memorial Plan</Link>{" "}
        (ages 1–60) or browse <Link href="/products">coffin models with prices</Link>. The
        full five-tier × four-term schedule is on{" "}
        <Link href="/plans">Villa Memorial Plan</Link>.
      </p>
    </div>
  );
}

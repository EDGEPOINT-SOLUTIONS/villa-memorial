import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PlanPaymentTable } from "@/components/villa/plan-payment-table";
import { loadPricingDocument } from "@/lib/api-client/pricing";
import { SENIOR_TERMS } from "@/lib/villa-pricing";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Senior citizen plan — Villa Memorial",
  description:
    "The Villa Memorial Plan for senior citizens: the client's senior-citizen payment tables, free flowers and the complete memorial package inclusions.",
  path: "/plans/senior-benefits",
});

// Reads the pricing store per request — an office edit must be visible here.
export const dynamic = "force-dynamic";

/** Villa Memorial senior citizen plan — real terms & payment schedule. */
export default async function SeniorBenefitsPage() {
  const pricing = await loadPricingDocument();
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
        <PlanPaymentTable
          rows={pricing.plans.senior}
          senior
          label="Senior citizen payment schedule"
        />
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

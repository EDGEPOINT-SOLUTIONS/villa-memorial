import type { Metadata } from "next";
import Link from "next/link";
import { QuoteForm } from "@/components/public-forms/quote-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Request a quote — Villa Memorial",
  description:
    "Tell us what you have in mind and the park office prepares a written quotation — a request for the office, never a reservation.",
  path: "/quote",
});

/**
 * Public quote request (forms-UI report row 5 · D2 short measure). The form is
 * a client component on the shared capture shell. No quotation service exists
 * and none is invented: a passed submission is confirmed as NOT sent.
 */
export default function Page() {
  return (
    <div className="plan-flow--reading stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Reach us</p>
          <h1>Request a quote</h1>
          <p className="text-sm text-muted">
            Tell us what you have in mind and the park office prepares a written
            quotation.
          </p>
          <nav aria-label="Back" style={{ marginTop: "var(--space-3)" }}>
            <Link href="/" className="back-link">← Back to home</Link>
          </nav>
        </div>
      </div>
      <div className="page-section" style={{ maxWidth: "46rem" }}>
        <QuoteForm />
      </div>
    </div>
  );
}

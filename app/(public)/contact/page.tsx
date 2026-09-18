import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/public-forms/contact-form";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact us — Villa Memorial",
  description:
    "Reach Villa Memorial Park day or night — the 24/7 assistance line, the park office, and a message a coordinator answers.",
  path: "/contact",
});

/**
 * Public contact capture (forms-UI report row 4 · D2 short measure). The form
 * is a client component on the shared capture shell; no records service exists,
 * so a submission is kept demo-locally and the confirmation says plainly that
 * nothing was sent. The inquiries board on the staff side reads the same store.
 *
 * This is also the storefront's "Request order" landing: a link carrying
 * `?item=&sku=&price=` (lib/public-forms/request-prefill.ts) is parsed HERE and
 * handed to the form as a prop, so the banner and the pre-written message echo
 * exactly what the visitor clicked — an enquiry, never a reservation.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const prefill = parseRequestPrefill(await searchParams);

  return (
    <div className="stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Reach us</p>
          <h1>{prefill ? "Request an order" : "Contact us"}</h1>
          <p className="text-sm text-muted">
            {prefill
              ? "Tell us how to reach you; the office confirms availability, the final price and the next steps."
              : "Coordinated, caring support for every step — reach out and a coordinator will guide you."}
          </p>
          <nav aria-label="Back" style={{ marginTop: "var(--space-3)" }}>
            <Link href="/" className="back-link">← Back to home</Link>
          </nav>
        </div>
      </div>
      <div className="page-section" style={{ maxWidth: "46rem" }}>
        <ContactForm prefill={prefill} />
      </div>
    </div>
  );
}

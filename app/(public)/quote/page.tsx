import type { Metadata } from "next";
import { QuoteForm } from "@/components/public-forms/quote-form";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Request a quote — Villa Memorial",
  description:
    "Funeral services are quoted for your family, not priced on a page. Tell us what you need and the park office prepares a written quotation — a request for the office, never a reservation.",
  path: "/quote",
});

/**
 * Public Request-for-Quote (the funeral-service capture).
 *
 * The service pages no longer publish prices: each service sends the visitor
 * here with the service they clicked. The form records the client's name and
 * contact details, the requested service, a preferred date when one applies and
 * any additional requirements, then lands in the demo-local inquiry store the
 * staff board reads (no crm-families contract exists, so nothing is sent to a
 * server and the confirmation says so).
 *
 * `?item=` (and `?note=`) arrive from a service page's Request-for-Quote action
 * through lib/public-forms/request-prefill.ts, so the form opens on exactly the
 * service the visitor asked about.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const prefill = parseRequestPrefill(await searchParams);

  return (
    <div className="plan-flow--reading stack-4">
      <div className="page-header">
        <div>
          <p className="page-header__eyebrow">Reach us</p>
          <h1>Request a quote</h1>
          <p className="text-sm text-muted">
            Tell us what you need and the park office prepares a written
            quotation — services are quoted, not priced on a page.
          </p>
        </div>
      </div>
      <div className="page-section" style={{ maxWidth: "46rem" }}>
        <QuoteForm prefill={prefill} />
      </div>
    </div>
  );
}

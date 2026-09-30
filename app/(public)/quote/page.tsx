import { QuoteBasketPage } from "@/components/public-forms/quote-basket-page";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Your quote — Villa Funeraria",
  description:
    "Review the services, lots and chapel stays your family is asking about and send the whole list to the office, which answers with one written quotation. A request for the office, never a reservation.",
  path: "/quote",
});

/**
 * The public QUOTE PAGE (/quote) — the quote basket the office asked for
 * (2026-09-29), revised 2026-09-30 (captain answers D1-B–D6-A).
 *
 * The page is REVIEW + SEND: it holds what the basket contains and asks for the
 * family's details once. Items are added on the surface that knows them (the
 * Add-to-Quote control on /services, /lots and the chapel booking step); a
 * small link opens a light request dialog for anything not listed. Caskets and
 * plans are the SEPARATE priced cart path (D1-B), which checks out to the admin
 * Order page — /quote never promises them. `?item=` seeds the request dialog.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const prefill = parseRequestPrefill(await searchParams);

  return (
    <div className="plan-flow--reading">
      <QuoteBasketPage prefill={prefill} />
    </div>
  );
}

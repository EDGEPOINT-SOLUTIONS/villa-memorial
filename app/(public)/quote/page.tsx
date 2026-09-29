import { QuoteBasketPage } from "@/components/public-forms/quote-basket-page";
import { parseRequestPrefill } from "@/lib/public-forms/request-prefill";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Your quote — Villa Funeraria",
  description:
    "Ask about a service, a plan, a casket or a lot — add each one to your quote and the office sends one written quotation back. A request for the office, never a reservation.",
  path: "/quote",
});

/**
 * The public QUOTE PAGE (/quote) — the quote basket the office asked for
 * (2026-09-29): the cart stopped being a cart, because the office takes
 * inquiries, not orders.
 *
 * The page owns the basket; the per-item quote form is the step that adds a line
 * to it. `?item=` (and `?note=`) arrive from a service page's Request-for-Quote
 * action through lib/public-forms/request-prefill.ts, so the form opens on
 * exactly the item the visitor clicked and adds it in one submit.
 *
 * The OLD /cart and /checkout URLs redirect here (their route files are stubs).
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

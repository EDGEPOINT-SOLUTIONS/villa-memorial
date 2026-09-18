import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import {
  listInvoices,
  listPaymentsForInvoice,
  type Invoice,
} from "@/lib/api-client/finance";
import { getCase } from "@/lib/api-client/operations";
import {
  businessToday,
  findInvoiceByReference,
  normaliseReference,
} from "@/lib/billing-payments";
import { RecordPaymentScreen } from "./record-payment-screen";

export const metadata = { title: "Record payment — Staff Portal" };

/**
 * Record payment — the counter's money screen, anchored on ONE invoice.
 *
 * WHY ANCHORED (and why the free-text "case or invoice" box is gone)
 * The frozen `billing-list-api-v1` contract records payments against an INVOICE
 * (`POST /invoices/:number/payments`), and a payment is only meaningful against the balance
 * it settles. So the screen resolves the link that opened it — `?invoice=`, `?order=` (the
 * Orders admin's link) or `?case=` — to the invoice it names, shows what that invoice still
 * owes, and records against it. A reference that names no invoice is said plainly, with the
 * unpaid invoices to choose from, rather than typed into a box nobody validates.
 *
 * RBAC uses the FROZEN scopes: viewing needs `billing:read` (the billing list's gate) and
 * recording needs `billing:write` — the scope the payments endpoint itself names. No new
 * scope is invented, and the graceful 403 below is the same one the billing page renders.
 * Authorization still lives at the service boundary; this gate is UX.
 *
 * Everything the screen shows about money comes from the server's own read: the invoice and
 * the recorded payments are loaded here, per request, and the balance after a recording comes
 * back from the write's response — never from the browser's arithmetic.
 */
export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; invoice?: string; order?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Record payment" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }
  if (!hasAnyScope(session.scopes, ["billing:write"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Record payment" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:write"]} />
        </PageSection>
      </>
    );
  }

  const params = await searchParams;
  const reference = normaliseReference(params.invoice ?? params.order ?? params.case);

  let invoices: Invoice[];
  try {
    invoices = await listInvoices();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Record payment" />
        <PageSection>
          <ErrorState message="Unable to load billing records." />
        </PageSection>
      </>
    );
  }

  let invoice = findInvoiceByReference(invoices, reference);

  // A case reference reaches its invoice through the order the case is linked to — the same
  // two hops the case screen shows. A case whose order has no invoice yet is a real state:
  // there is nothing on the books to settle, and the screen says so.
  if (!invoice && reference.startsWith("CASE-") && hasAnyScope(session.scopes, ["cases:read"])) {
    try {
      const kase = await getCase(reference);
      if (kase.linked_order_number) {
        invoice = findInvoiceByReference(invoices, normaliseReference(kase.linked_order_number));
      }
    } catch {
      // An unreadable case costs the resolution, not the screen: the picker below stands in.
    }
  }

  const { payments, listed } = invoice
    ? await listPaymentsForInvoice(invoice.invoice_number)
    : { payments: [], listed: true };

  return (
    <>
      <PageHeader
        eyebrow="Finance · Billing"
        title="Record payment"
        actions={
          <Link href="/staff/billing" className="btn btn--secondary btn--sm">
            Back to billing
          </Link>
        }
      />
      <PageSection>
        <RecordPaymentScreen
          invoice={invoice}
          reference={reference}
          choices={invoices.filter((i) => i.status !== "paid")}
          payments={payments}
          paymentsListed={listed}
          today={businessToday()}
        />
      </PageSection>
    </>
  );
}

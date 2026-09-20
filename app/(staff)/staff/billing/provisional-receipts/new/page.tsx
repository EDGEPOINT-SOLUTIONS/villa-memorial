import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listInvoices, type Invoice } from "@/lib/api-client/finance";
import { getCase, listCases } from "@/lib/api-client/operations";
import { businessToday, findInvoiceByReference, normaliseReference } from "@/lib/billing-payments";
import { ProvisionalReceiptForm } from "./provisional-receipt-form";

export const metadata = { title: "Issue a provisional receipt — Admin Portal" };

/**
 * Issue a provisional receipt — the counter's paper, captured in the folio language.
 *
 * WHY IT IS ITS OWN CAPTURE (and not the billing payment screen)
 * The billing screen records a real payment and the official receipt it issues; this screen
 * records the paper the counter hands over when that official receipt does not exist yet
 * (FORMS_PLAN gap 3). It writes the counter's slip journal only — it never posts, never
 * numbers a receipt, and never touches the merged payment flow.
 *
 * WHAT IS READ, NOT TYPED
 * The invoice (and therefore the payer, the order, the balance and the case/contract link)
 * comes from the recorded billing data; §01 shows exactly what was read. A reference that
 * names no invoice is said plainly and the picker stands in.
 *
 * RBAC uses the frozen scopes: viewing needs `billing:read`, issuing needs `billing:write`
 * (the scope the counter's money writes already use). No new scope is invented, and the
 * graceful 403 is the same one the billing page renders.
 */
export default async function NewProvisionalReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; invoice?: string; order?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["billing:read"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Issue a provisional receipt" />
        <PageSection>
          <ForbiddenState requiredScopes={["billing:read"]} />
        </PageSection>
      </>
    );
  }
  if (!hasAnyScope(session.scopes, ["billing:write"])) {
    return (
      <>
        <PageHeader eyebrow="Finance" title="Issue a provisional receipt" />
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
        <PageHeader eyebrow="Finance" title="Issue a provisional receipt" />
        <PageSection>
          <ErrorState message="Unable to load billing records." />
        </PageSection>
      </>
    );
  }

  let invoice = findInvoiceByReference(invoices, reference);
  let caseNumber: string | null = null;

  // A case reference reaches its invoice through the order the case is linked to — the same
  // two hops the billing screen shows — and is the one recorded case/contract link the paper
  // may print.
  if (reference.startsWith("CASE-") && hasAnyScope(session.scopes, ["cases:read"])) {
    try {
      const kase = await getCase(reference);
      caseNumber = kase.case_number;
      if (!invoice && kase.linked_order_number) {
        invoice = findInvoiceByReference(invoices, normaliseReference(kase.linked_order_number));
      }
    } catch {
      // An unreadable case costs the resolution, not the screen: the picker below stands in.
    }
  }

  // The reverse hop — the case a chosen invoice's order belongs to — when the session may
  // read cases. Fixture data often links neither, which is a real state: the paper prints the
  // invoice and order it has, never a guessed case reference.
  if (!caseNumber && invoice?.order_number && hasAnyScope(session.scopes, ["cases:read"])) {
    try {
      const linked = (await listCases()).find(
        (kase) => kase.linked_order_number === invoice?.order_number,
      );
      caseNumber = linked?.case_number ?? null;
    } catch {
      caseNumber = null;
    }
  }

  const options = invoices.filter((i) => i.status !== "paid");
  if (invoice && !options.some((i) => i.id === invoice.id)) options.unshift(invoice);

  return (
    <>
      <PageHeader
        eyebrow="Finance · Billing"
        title="Issue a provisional receipt"
        actions={
          <Link href="/staff/billing/provisional-receipts" className="btn btn--secondary btn--sm">
            Provisional receipts
          </Link>
        }
      />
      <PageSection>
        <ProvisionalReceiptForm
          invoices={options}
          initialInvoiceNumber={invoice?.invoice_number ?? ""}
          caseNumber={caseNumber}
          receivedBy={session.displayName}
          today={businessToday()}
        />
      </PageSection>
    </>
  );
}

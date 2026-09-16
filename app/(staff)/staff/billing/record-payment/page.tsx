import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listInvoices } from "@/lib/api-client/finance";
import { listCases } from "@/lib/api-client/operations";
import { RecordPaymentScreen, type PaymentTarget } from "./record-payment-screen";

export const metadata = { title: "Record payment — Staff Portal" };

/**
 * Record payment — the entry point for the provisional-receipt capture (FORMS_PLAN gap 3).
 *
 * RBAC uses the FROZEN scopes, not a borrowed read scope: viewing needs `billing:read`
 * (the same gate the billing list uses) and recording needs `billing:write` — the frozen
 * scope the payments endpoint itself names (`docs/08-delivery/contracts/billing-list-api-v1.md`:
 * `POST /api/v1/invoices/:number/payments` → `billing:write`; `rbac-scopes-v1.md`: "Invoices,
 * installments, payments"). No new scope is invented, and the graceful 403 below is the
 * same one the billing page renders. Authorization still lives at the service boundary.
 *
 * The `Case or invoice` picker is built from the records this session may already read —
 * invoices always (billing:read), cases only when `cases:read` is held, so the screen
 * never asks a service for something the session could not open itself. A records list
 * that fails costs the picker, not the capture: the slip can be typed from paper.
 */
export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; invoice?: string }>;
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
  const prefill = (params.case ?? params.invoice ?? "").trim();

  const targets: PaymentTarget[] = [];
  let recordsUnavailable = false;

  try {
    const invoices = await listInvoices();
    targets.push(
      ...invoices.map((invoice) => ({
        reference: invoice.invoice_number,
        label: `${invoice.invoice_number} — ${invoice.customer_name}`,
        kind: "invoice" as const,
      })),
    );
  } catch {
    recordsUnavailable = true;
  }

  if (hasAnyScope(session.scopes, ["cases:read"])) {
    try {
      const cases = await listCases();
      targets.push(
        ...cases.map((kase) => ({
          reference: kase.case_number,
          label: `${kase.case_number} — ${
            kase.deceased_name === "Pending intake" ? "intake pending" : kase.deceased_name
          }`,
          kind: "case" as const,
        })),
      );
    } catch {
      recordsUnavailable = true;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="Record payment"
        actions={
          <Link href="/staff/billing" className="btn btn--secondary btn--sm">
            Back to billing
          </Link>
        }
      />
      <PageSection>
        <RecordPaymentScreen
          targets={targets}
          prefill={prefill}
          recordsUnavailable={recordsUnavailable}
        />
      </PageSection>
    </>
  );
}

import Link from "next/link";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";
import { getCase } from "@/lib/api-client/operations";
import { getOrderByNumber } from "@/lib/api-client/commerce";
import { resolveTerms } from "@/lib/contracts/villa-terms";
import { ServiceContractScreen } from "./service-contract-screen";

export const metadata = { title: "Service contract — Staff Portal" };

/**
 * The Funeral Service Contract paper form as a capture screen, for one case.
 *
 * Viewing needs `cases:read`; editing the working draft needs `cases:write` (the screen
 * disables itself otherwise). The header comes from the case's intake; the screen below
 * the header is a working draft that prints — nothing here is filed. The terms revision
 * is resolved for the contract date so the print carries the version in force, never
 * today's by accident.
 */
export default async function ServiceContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  const canWrite = hasAnyScope(session.scopes, ["cases:write"]);
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations · Case" title="Service contract" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const { id } = await params;

  let kase;
  try {
    kase = await getCase(id);
  } catch (err) {
    return (
      <>
        <PageHeader eyebrow="Operations · Case" title="Service contract" />
        <PageSection>
          <ErrorState
            message={
              err instanceof ApiError && err.status === 404
                ? "We couldn't find that case record."
                : "The case record is unavailable right now."
            }
          />
        </PageSection>
      </>
    );
  }

  // The linked order prices the contract when one exists; a case at the counter often
  // has none yet (intake precedes checkout), which is a real state, not an error.
  let order = null;
  if (kase.linked_order_number) {
    try {
      order = await getOrderByNumber(kase.linked_order_number);
    } catch {
      order = null;
    }
  }

  const signedOn = kase.intake?.contract_date ?? new Date().toISOString();
  let terms = null;
  try {
    terms = resolveTerms("service_contract", signedOn);
  } catch {
    terms = null; // surfaced honestly on the print view rather than guessed
  }

  return (
    <>
      <PageHeader
        eyebrow={`Operations · Case ${kase.case_number}`}
        title="Service contract (paper form)"
        actions={
          <Link href={`/staff/cases/${kase.id}`} className="btn btn--secondary btn--sm">
            Back to case
          </Link>
        }
      />
      <PageSection>
        <ServiceContractScreen kase={kase} order={order} terms={terms} canWrite={canWrite} />
      </PageSection>
    </>
  );
}

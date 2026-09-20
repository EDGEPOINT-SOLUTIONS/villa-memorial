import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { GuaranteeInstrumentsTracker } from "@/components/guarantee-instruments";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ApiError } from "@/lib/api-client/api-error";
import { getCase } from "@/lib/api-client/operations";
import {
  loadCaseInstruments,
  type CaseInstrumentsRead,
} from "@/lib/api-client/guarantee-instruments";
import { businessToday } from "@/lib/contracts/payment-capture";

export const metadata = { title: "Guarantee instruments — Admin Portal" };

/**
 * The guarantee-instrument tracker for one case (F-18 / FORMS_PLAN gap 5).
 *
 * A family's LGU / DSWD / SSS / GSIS / life-plan deduction is written down on the service
 * contract; this route follows the paperwork afterwards — the office's filing state, the
 * agency's response, the paper's three-day deadline and the supporting-document checklist.
 *
 * STATUS ONLY: no sub-ledger, no deduction arithmetic and no posting (both dev-owned), so
 * the screen says so once and derives nothing but the deadline date. Reading needs
 * `cases:read` — the same scope as the case and its service contract; writing is not part
 * of this screen. The deadline runs from the case's own recorded contract date, so an
 * uncaptured date is an honest "no contract date recorded", never a guessed one.
 */
export default async function GuaranteeInstrumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations · Case" title="Guarantee instruments" />
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
        <PageHeader eyebrow="Operations · Case" title="Guarantee instruments" />
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

  let read: CaseInstrumentsRead;
  try {
    read = await loadCaseInstruments(kase.case_number);
  } catch {
    read = { state: "unavailable" };
  }

  return (
    <GuaranteeInstrumentsTracker
      caseId={kase.id}
      caseNumber={kase.case_number}
      deceasedName={kase.deceased_name}
      contractDate={kase.intake?.contract_date ?? null}
      today={businessToday()}
      read={read}
    />
  );
}

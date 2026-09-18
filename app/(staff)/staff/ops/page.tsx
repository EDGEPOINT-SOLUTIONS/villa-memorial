import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCases, type Case } from "@/lib/api-client/operations";
import { loadCaseInstruments } from "@/lib/api-client/guarantee-instruments";
import {
  INSTRUMENT_FILING_DAYS,
  type GuaranteeInstrument,
} from "@/lib/guarantee-instruments";
import { parkToday } from "@/lib/schedule-board";
import { buildOpsBoard, daysLabel } from "@/lib/operations/ops-board";
import { OpsBoardView } from "./ops-board-view";

export const metadata = { title: "Operations board — Staff Portal" };

/**
 * Staff Operations board (`/staff/ops`) — the morning screen: every case in the lane
 * of the stage it is in, ordered longest wait first, with the recorded flags that make
 * the urgent visible and the two writes (task tick, stage move) the case screen already
 * proved, through the same BFF routes.
 *
 * The board derives nothing invented (see lib/operations/ops-board.ts):
 *  · ages are whole park days since each case's recorded `updated_at`;
 *  · "overdue" is the service contract's own three-day guarantee-paper term, read from
 *    the case's tracker when it has one;
 *  · a lane with no cases says so, and a case the fixtures do not fully record shows
 *    what is recorded — never a guessed name, family or date.
 */

async function loadInstrumentsByCase(
  cases: Case[],
): Promise<Record<string, GuaranteeInstrument[]>> {
  const byCase: Record<string, GuaranteeInstrument[]> = {};
  await Promise.all(
    cases.map(async (kase) => {
      try {
        const read = await loadCaseInstruments(kase.case_number);
        if (read.state === "recorded") byCase[kase.case_number] = read.instruments;
      } catch {
        // A tracker that cannot be read never fails the board: the case shows its
        // recorded state with no paper flag — absence is not a claim.
      }
    }),
  );
  return byCase;
}

function SummaryItem({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "danger";
}) {
  return (
    <div className={`ops-summary__item${tone ? ` ops-summary__item--${tone}` : ""}`}>
      <span className="ops-summary__label">{label}</span>
      <span className="ops-summary__value">{value}</span>
      {sub ? <span className="ops-summary__sub">{sub}</span> : null}
    </div>
  );
}

export default async function OpsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Operations board" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }
  const canWrite = hasAnyScope(session.scopes, ["cases:write"]);

  let cases: Case[];
  try {
    cases = await listCases();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Operations board" />
        <PageSection>
          <ErrorState message="Unable to load case records." />
        </PageSection>
      </>
    );
  }

  const instrumentsByCase = await loadInstrumentsByCase(cases);
  const today = parkToday();
  const { lanes, summary, hasCases } = buildOpsBoard(cases, instrumentsByCase, today);

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Operations board"
        actions={
          <>
            <Link href="/staff/schedule" className="btn btn--secondary btn--sm">
              Today&rsquo;s schedule
            </Link>
            <Link href="/staff/cases" className="btn btn--secondary btn--sm">
              All cases
            </Link>
          </>
        }
      />

      {hasCases ? (
        <>
          <div className="ops-summary" role="group" aria-label="Board summary">
            <SummaryItem
              label="In service"
              value={summary.inService}
              sub={summary.completed > 0 ? `${summary.completed} completed` : "not completed"}
            />
            <SummaryItem
              label="Papers overdue"
              value={summary.papersOverdue}
              sub={`${INSTRUMENT_FILING_DAYS}-day filing term`}
              tone={summary.papersOverdue > 0 ? "danger" : undefined}
            />
            <SummaryItem
              label="Awaiting intake"
              value={summary.awaitingIntake}
              sub="deceased not recorded"
            />
            <SummaryItem
              label="Longest wait"
              value={summary.oldest ? daysLabel(summary.oldest.days) : "—"}
              sub={summary.oldest ? summary.oldest.caseNumber : "no recorded age"}
            />
          </div>

          {canWrite ? null : (
            <p className="ops-board__readonly text-sm text-muted">
              Ticking a task or moving a case needs <code>cases:write</code>.
            </p>
          )}

          <OpsBoardView lanes={lanes} canWrite={canWrite} />

          <p className="ops-board__basis text-sm text-muted">
            Age — days since each case&rsquo;s last recorded change. Overdue — guarantee
            papers past the service contract&rsquo;s {INSTRUMENT_FILING_DAYS}-day filing
            term. Lanes order longest wait first; no stage-staleness threshold is agreed.
          </p>
        </>
      ) : (
        <EmptyState
          title="No cases on the board"
          hint="Cases appear here as the office records them."
        />
      )}
    </>
  );
}

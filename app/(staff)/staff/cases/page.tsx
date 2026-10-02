import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCases, type Case } from "@/lib/api-client/operations";
import { loadCaseInstruments } from "@/lib/api-client/guarantee-instruments";
import { INSTRUMENT_FILING_DAYS, type GuaranteeInstrument } from "@/lib/guarantee-instruments";
import { CASE_STAGES, STAGE_LABEL, STAGE_TONE, isCaseStage } from "@/lib/operations/case-board";
import { buildOpsBoard, daysLabel } from "@/lib/operations/ops-board";
import { parkToday } from "@/lib/schedule-board";
import { PipelineDots } from "@/components/case-pipeline";
import { OpsBoardView } from "../ops/ops-board-view";

export const metadata = { title: "Cases — Admin Portal" };

function CaseCard({ kase }: { kase: Case }) {
  const pendingIntake = kase.deceased_name === "Pending intake";
  const doneTasks = kase.tasks.filter((t) => t.status === "done").length;
  return (
    <Link href={`/staff/cases/${kase.id}`} className="card case-card">
      <div className="case-card__main">
        <div className="case-card__topline">
          <h2 className="case-card__name">
            {pendingIntake ? "Awaiting intake" : kase.deceased_name}
          </h2>
          <Badge tone={STAGE_TONE[kase.stage] ?? "neutral"}>
            {STAGE_LABEL[kase.stage] ?? kase.stage}
          </Badge>
        </div>
        <div className="case-card__ref">{kase.case_number}</div>
        <div className="case-card__meta">
          <span>
            Coordinator: <strong>{kase.assigned_coordinator || "Unassigned"}</strong>
          </span>
          {kase.linked_order_number ? <span>Order {kase.linked_order_number}</span> : null}
          {kase.services.length > 0 ? <span>{kase.services.join(" · ")}</span> : null}
        </div>
      </div>
      <div className="case-card__aside">
        <PipelineDots stage={kase.stage} />
        {kase.tasks.length > 0 ? (
          <span className="case-card__tasks">
            {doneTasks}/{kase.tasks.length} tasks done
          </span>
        ) : null}
      </div>
      <ArrowUpRight size={18} className="case-card__arrow" aria-hidden="true" />
    </Link>
  );
}

/**
 * The guarantee-instrument read per case, exactly as the (now folded) Operations board
 * did it: a tracker that cannot be read never fails the board — absence is not a claim.
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
        // A record that cannot be read contributes no paper flag.
      }
    }),
  );
  return byCase;
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Cases" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const canWriteCases = hasAnyScope(session.scopes, ["cases:write"]);

  let cases: Case[];
  try {
    cases = await listCases();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Operations" title="Cases" />
        <PageSection>
          <ErrorState message="Unable to load case records." />
        </PageSection>
      </>
    );
  }

  const { stage, view } = await searchParams;
  const boardView = (view ?? "") === "board";
  const stageFilter = (stage ?? "").trim();
  const validStage = isCaseStage(stageFilter) ? stageFilter : "";

  const active = cases.filter((c) => c.stage !== "completed").length;
  const completed = cases.length - active;
  const pendingIntake = cases.filter((c) => c.deceased_name === "Pending intake").length;

  let filtered = validStage ? cases.filter((c) => c.stage === validStage) : cases;
  if (!validStage && pendingIntake > 0) {
    // Show pending-intake cases first; most urgent at the top.
    filtered = [...filtered].sort((a, b) => {
      const ap = a.deceased_name === "Pending intake" ? 0 : 1;
      const bp = b.deceased_name === "Pending intake" ? 0 : 1;
      return ap - bp || new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
    });
  }

  const presentStages = CASE_STAGES.filter((s) => cases.some((c) => c.stage === s));
  const viewToggle = (
    <nav className="row row--wrap" aria-label="View">
      <Link href="/staff/cases" className={`pill-toggle${!boardView ? " pill-toggle--active" : ""}`}>
        List
      </Link>
      <Link
        href="/staff/cases?view=board"
        className={`pill-toggle${boardView ? " pill-toggle--active" : ""}`}
      >
        Board
      </Link>
    </nav>
  );

  if (boardView) {
    // The board is the Operations board folded in (captain, 2026-10-02): it shows the
    // same cases in the lane of their stage — the one job it did that the list did not.
    const { lanes, summary, hasCases } = buildOpsBoard(
      cases,
      await loadInstrumentsByCase(cases),
      parkToday(),
    );
    return (
      <>
        <PageHeader
          eyebrow="Orders & commerce"
          title="Cases"
          lead="Every case in the stage it has reached today."
          actions={
            <span className="row row--wrap" style={{ gap: "var(--space-3)" }}>
              <Link href="/staff/schedule" className="btn btn--secondary btn--sm">
                Today&rsquo;s schedule
              </Link>
              {viewToggle}
            </span>
          }
        />
        {hasCases ? (
          <>
            <div className="ops-summary" role="group" aria-label="Board summary">
              <div className="ops-summary__item">
                <span className="ops-summary__label">In service</span>
                <span className="ops-summary__value">{summary.inService}</span>
                <span className="ops-summary__sub">
                  {summary.completed > 0 ? `${summary.completed} completed` : "not completed"}
                </span>
              </div>
              <div
                className={`ops-summary__item${summary.papersOverdue > 0 ? " ops-summary__item--danger" : ""}`}
              >
                <span className="ops-summary__label">Papers overdue</span>
                <span className="ops-summary__value">{summary.papersOverdue}</span>
                <span className="ops-summary__sub">{INSTRUMENT_FILING_DAYS}-day filing term</span>
              </div>
              <div className="ops-summary__item">
                <span className="ops-summary__label">Awaiting intake</span>
                <span className="ops-summary__value">{summary.awaitingIntake}</span>
                <span className="ops-summary__sub">deceased not recorded</span>
              </div>
              <div className="ops-summary__item">
                <span className="ops-summary__label">Longest wait</span>
                <span className="ops-summary__value">
                  {summary.oldest ? daysLabel(summary.oldest.days) : "—"}
                </span>
                <span className="ops-summary__sub">
                  {summary.oldest ? summary.oldest.caseNumber : "no recorded age"}
                </span>
              </div>
            </div>
            {canWriteCases ? null : (
              <p className="ops-board__readonly text-sm text-muted">
                Ticking a task or moving a case needs <code>cases:write</code>.
              </p>
            )}
            <PageSection>
              <OpsBoardView lanes={lanes} canWrite={canWriteCases} />
            </PageSection>
            <p className="ops-board__basis text-sm text-muted">
              Age — days since each case&rsquo;s last recorded change. Overdue — guarantee
              papers past the service contract&rsquo;s {INSTRUMENT_FILING_DAYS}-day filing
              term. Lanes order longest wait first; no stage-staleness threshold is agreed.
            </p>
          </>
        ) : (
          <PageSection>
            <EmptyState
              title="No cases on the board"
              hint="Cases appear here as the office records them."
            />
          </PageSection>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Orders & commerce"
        title="Cases"
        lead="Every funeral case the office is handling."
        actions={
          <span className="row row--wrap" style={{ gap: "var(--space-3)" }}>
            {viewToggle}
            {canWriteCases ? (
              <Link href="/staff/cases/new" className="btn btn--primary btn--sm">
                Open a case
              </Link>
            ) : null}
          </span>
        }
      />

      <div className="kpi-grid">
        <Link href="/staff/cases" className="card kpi-card">
          <div className="kpi-card__body">
            <span className="kpi-card__label">Active cases</span>
            <span className="kpi-card__value">{active}</span>
            <span className="kpi-card__sub">in service right now</span>
          </div>
          <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
        </Link>
        <Link href="/staff/cases?stage=completed" className="card kpi-card">
          <div className="kpi-card__body">
            <span className="kpi-card__label">Completed</span>
            <span className="kpi-card__value">{completed}</span>
            <span className="kpi-card__sub">closed cases</span>
          </div>
          <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
        </Link>
        <Link href="/staff/cases" className="card kpi-card">
          <div className="kpi-card__body">
            <span className="kpi-card__label">Awaiting intake</span>
            <span className="kpi-card__value">{pendingIntake}</span>
            <span className="kpi-card__sub">need deceased details</span>
          </div>
          <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
        </Link>
        <Link href="/staff/cases/new" className="card kpi-card kpi-card--action">
          <div className="kpi-card__body">
            <span className="kpi-card__label">Open a case</span>
            <span className="kpi-card__value kpi-card__value--sm">+ New</span>
            <span className="kpi-card__sub">start an arrangement</span>
          </div>
          <ArrowUpRight size={18} className="kpi-card__arrow" aria-hidden="true" />
        </Link>
      </div>

      <PageSection>
        <nav className="row row--wrap" aria-label="Filter by stage" style={{ marginBottom: "var(--space-4)" }}>
          <Link href="/staff/cases" className={`pill-toggle${!validStage ? " pill-toggle--active" : ""}`}>
            All ({cases.length})
          </Link>
          {presentStages.map((s) => (
            <Link
              key={s}
              href={`/staff/cases?stage=${s}`}
              className={`pill-toggle${validStage === s ? " pill-toggle--active" : ""}`}
            >
              {STAGE_LABEL[s]} ({cases.filter((c) => c.stage === s).length})
            </Link>
          ))}
        </nav>

        {filtered.length === 0 ? (
          <EmptyState
            title={validStage ? "No cases in this stage" : "No cases found"}
            hint={
              validStage
                ? "Cases will appear here when they reach this stage."
                : "Case records will appear here once the funeral-cases service is connected."
            }
          />
        ) : (
          <div className="stack-4">
            {filtered.map((c) => (
              <CaseCard key={c.id} kase={c} />
            ))}
          </div>
        )}
      </PageSection>
    </>
  );
}

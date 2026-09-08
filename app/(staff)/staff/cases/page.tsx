import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCases, type Case, type CaseStage } from "@/lib/api-client/operations";
import { PipelineDots } from "@/components/case-pipeline";

export const metadata = { title: "Cases — Staff Portal" };

const STAGE_TONE: Record<string, "info" | "warning" | "success" | "neutral" | "danger"> = {
  inquiry: "info",
  retrieval: "warning",
  preparation: "warning",
  viewing: "info",
  ceremony: "info",
  interment: "warning",
  completed: "success",
};

const STAGE_LABEL: Record<CaseStage, string> = {
  inquiry: "Inquiry",
  retrieval: "Retrieval",
  preparation: "Preparation",
  viewing: "Viewing",
  ceremony: "Ceremony",
  interment: "Interment",
  completed: "Completed",
};

function CaseCard({ kase }: { kase: Case }) {
  const pendingIntake = kase.deceased_name === "Pending intake";
  const doneTasks = kase.tasks.filter((t) => t.status === "done").length;
  return (
    <Link href={`/staff/cases/${kase.id}`} className="card case-card">
      <div className="case-card__main">
        <div className="case-card__topline">
          <h3 className="case-card__name">
            {pendingIntake ? "Awaiting intake" : kase.deceased_name}
          </h3>
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

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
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

  const { stage } = await searchParams;
  const stageFilter = (stage ?? "").trim() as CaseStage | "";
  const validStage = stageFilter && stageFilter in STAGE_LABEL ? stageFilter : "";

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

  const presentStages = (
    Object.keys(STAGE_LABEL) as CaseStage[]
  ).filter((s) => cases.some((c) => c.stage === s));

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Cases"
        actions={
          <span className="row" style={{ gap: "var(--space-3)" }}>
            <span className="text-sm text-muted">{cases.length} total</span>
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

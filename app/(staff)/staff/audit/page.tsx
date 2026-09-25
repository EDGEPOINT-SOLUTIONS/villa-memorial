import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listAuditEvents, type AuditOutcome } from "@/lib/api-client/audit";

export const metadata = { title: "Audit trail — Admin Portal" };

const OUTCOME_TONE: Record<AuditOutcome, "success" | "danger" | "neutral"> = {
  succeeded: "success",
  denied: "danger",
  failed: "danger",
};

const VALID_OUTCOMES: AuditOutcome[] = ["succeeded", "denied", "failed"];

function shortActor(userId: string): string {
  if (!userId) return "system";
  return userId.length > 12 ? `${userId.slice(0, 8)}…` : userId;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ outcome?: string }>;
}) {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["audit:events:read"])) {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Audit trail" />
        <PageSection>
          <ForbiddenState requiredScopes={["audit:events:read"]} />
        </PageSection>
      </>
    );
  }

  const { outcome } = await searchParams;
  const outcomeFilter = VALID_OUTCOMES.includes(outcome as AuditOutcome)
    ? (outcome as AuditOutcome)
    : undefined;

  let events;
  try {
    events = await listAuditEvents({ outcome: outcomeFilter, limit: 200 });
  } catch {
    return (
      <>
        <PageHeader eyebrow="Administration" title="Audit trail" />
        <PageSection>
          <ErrorState message="Unable to load the audit trail." />
        </PageSection>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit trail"
        lead="The recorded, append-only trail of who changed what."
        actions={
          <span className="text-sm text-muted">
            {events.length} entries · append-only
          </span>
        }
      />

      <PageSection>
        <form className="filter-bar" role="search">
          <select
            className="select"
            name="outcome"
            defaultValue={outcomeFilter ?? ""}
            aria-label="Filter by outcome"
          >
            <option value="">All outcomes</option>
            <option value="succeeded">Succeeded</option>
            <option value="denied">Denied</option>
            <option value="failed">Failed</option>
          </select>
          <button className="btn btn--primary btn--sm" type="submit">
            Filter
          </button>
          {outcomeFilter ? (
            <Link className="btn btn--ghost btn--sm" href="/staff/audit">
              Clear
            </Link>
          ) : null}
        </form>

        {events.length === 0 ? (
          <EmptyState
            title="No audit entries"
            hint="Actions that change records are written here as they happen."
          />
        ) : (
          <div className="table-wrapper" tabIndex={0}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Resource</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Correlation ID</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="text-sm">{timeLabel(e.occurred_at)}</td>
                    <td className="text-sm">{shortActor(e.actor_user_id)}</td>
                    <td>
                      <code>{e.action}</code>
                    </td>
                    <td className="text-sm">
                      {e.resource_type}
                      {e.resource_id ? (
                        <>
                          {" "}
                          <span className="text-muted">· {e.resource_id.slice(0, 8)}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <Badge tone={OUTCOME_TONE[e.outcome] ?? "neutral"}>{e.outcome}</Badge>
                    </td>
                    <td className="text-sm text-muted">
                      {e.correlation_id ? e.correlation_id.slice(0, 8) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </>
  );
}

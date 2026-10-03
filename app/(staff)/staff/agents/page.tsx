import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listAgentProspects, type Prospect } from "@/lib/api-client/agent";
import { interestLabel, manilaDay, stageMeta } from "@/lib/agent/agent-view";

export const metadata = { title: "Agents — Admin Portal" };

type Tone = "info" | "warning" | "success" | "neutral" | "danger";

function stageTone(stage: string): Tone {
  const tone = stageMeta(stage).tone;
  if (tone === "won") return "success";
  if (tone === "warm") return "warning";
  return "neutral";
}

/**
 * Staff Agents (`/staff/agents`) — the people working Villa's leads, and each
 * one's book.
 *
 * 2026-10-03 (flow audit): this screen used to read the recorded
 * `lead-records.json` file, a SECOND pipeline that the office's own convert
 * action never wrote. It now reads the same durable agent journal the Prospects
 * board and the agent portal fold (`lib/api-client/agent`), so an agent's book
 * here is the one record everyone else sees. It invents no agent, target or
 * amount; a prospect with no owner shows once as "Unassigned".
 */
export default async function AgentsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Agents" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  let prospects: Prospect[];
  try {
    prospects = await listAgentProspects();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Agents" />
        <PageSection>
          <ErrorState message="Unable to load the shared lead journal." />
        </PageSection>
      </>
    );
  }

  const byOwner = new Map<string, Prospect[]>();
  for (const prospect of prospects) {
    const owner = prospect.owner.trim() || "Unassigned";
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), prospect]);
  }
  const agents = [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b));
  const openProspects = prospects.filter(
    (p) => p.stage !== "sold" && p.stage !== "reserved",
  ).length;

  return (
    <>
      <PageHeader
        eyebrow="Messages & inquiries"
        title="Agents"
        lead="The people working Villa's leads, and each one's book."
        actions={
          <Link href="/staff/prospects" className="btn btn--secondary btn--sm">
            Open the sales pipeline
          </Link>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <StatCard label="Agents" value={agents.length} sub="recorded prospect owners" />
        <StatCard label="Prospects" value={prospects.length} sub="in the shared journal" />
        <StatCard label="Open" value={openProspects} sub="not yet reserved or sold" />
      </div>

      {agents.length === 0 ? (
        <PageSection>
          <EmptyState
            title="No agents on record"
            hint="A prospect's owner appears here once one is assigned on the pipeline."
          />
        </PageSection>
      ) : (
        agents.map(([owner, book]) => (
          <PageSection key={owner}>
            <div className="card">
              <div className="card__header row row--space row--wrap">
                <div>
                  <h2>{owner}</h2>
                  <span className="text-sm text-muted">
                    {book.length} prospect{book.length === 1 ? "" : "s"} on record
                  </span>
                </div>
                <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
                  {[...new Set(book.map((p) => p.stage))].map((stage) => (
                    <Badge key={stage} tone={stageTone(stage)}>
                      {stageMeta(stage).label} · {book.filter((p) => p.stage === stage).length}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="card__body">
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Prospect</th>
                        <th scope="col">Interested in</th>
                        <th scope="col">Stage</th>
                        <th scope="col">Last contact</th>
                        <th scope="col">Next step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {book.map((prospect) => (
                        <tr key={prospect.id}>
                          <td>
                            <Link href="/staff/prospects">
                              <strong>{prospect.name}</strong>
                            </Link>
                            <div className="text-sm text-muted">{prospect.want}</div>
                          </td>
                          <td className="text-sm">{interestLabel(prospect.interest)}</td>
                          <td>
                            <Badge tone={stageTone(prospect.stage)}>
                              {stageMeta(prospect.stage).label}
                            </Badge>
                          </td>
                          <td className="text-sm">{manilaDay(prospect.last_contact_at)}</td>
                          <td className="text-sm">{prospect.next_action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </PageSection>
        ))
      )}
    </>
  );
}

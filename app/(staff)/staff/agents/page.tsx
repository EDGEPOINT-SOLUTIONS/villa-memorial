import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, PageSection } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { StatCard } from "@/components/kit";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCrmLeads, type CrmLead } from "@/lib/api-client/crm-leads";
import { manilaDay, stageMeta } from "@/lib/agent/agent-view";

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
 * WHY IT IS READ FROM THE LEAD FILE. crm-families (agents, lead assignment,
 * customer sync) is unbuilt, so there is no agent register to read. What the
 * product genuinely records is the lead's `owner` — the agent working it — in
 * `lib/fixtures/crm/lead-records.json`. This screen groups that recorded file by
 * owner, so an administrator sees each agent's open book and where each lead
 * stands without a second copy of the data. It invents no agent, no target and no
 * amount; a lead with no owner is shown once as "Unassigned". The full lead list
 * is one link away (the Sales pipeline keeps its own route).
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

  let leads: CrmLead[];
  try {
    leads = await listCrmLeads();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Agents" />
        <PageSection>
          <ErrorState message="Unable to load the recorded lead file." />
        </PageSection>
      </>
    );
  }

  const byOwner = new Map<string, CrmLead[]>();
  for (const lead of leads) {
    const owner = lead.owner.trim() || "Unassigned";
    byOwner.set(owner, [...(byOwner.get(owner) ?? []), lead]);
  }
  const agents = [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b));
  const openLeads = leads.filter((l) => l.stage !== "sold" && l.stage !== "reserved").length;

  return (
    <>
      <PageHeader
        eyebrow="Messages & inquiries"
        title="Agents"
        lead="The people working Villa's leads, and each one's book."
        actions={
          <Link href="/staff/pipeline" className="btn btn--secondary btn--sm">
            Open the sales pipeline
          </Link>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <StatCard label="Agents" value={agents.length} sub="recorded lead owners" />
        <StatCard label="Leads" value={leads.length} sub="in the recorded file" />
        <StatCard label="Open" value={openLeads} sub="not yet reserved or sold" />
      </div>

      {agents.length === 0 ? (
        <PageSection>
          <EmptyState
            title="No agents on record"
            hint="A lead's owner appears here once a lead is recorded with one."
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
                    {book.length} lead{book.length === 1 ? "" : "s"} on record
                  </span>
                </div>
                <div className="row row--wrap" style={{ gap: "var(--space-2)" }}>
                  {[...new Set(book.map((l) => l.stage))].map((stage) => (
                    <Badge key={stage} tone={stageTone(stage)}>
                      {stageMeta(stage).label} · {book.filter((l) => l.stage === stage).length}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="card__body">
                <div className="table-wrapper" tabIndex={0}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Lead</th>
                        <th scope="col">Interested in</th>
                        <th scope="col">Stage</th>
                        <th scope="col">Last contact</th>
                        <th scope="col">Next step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {book.map((lead) => (
                        <tr key={lead.id}>
                          <td>
                            <Link href={`/staff/pipeline/${lead.id}`}>
                              <strong>{lead.name}</strong>
                            </Link>
                            <div className="text-sm text-muted">{lead.topic}</div>
                          </td>
                          <td className="text-sm">{lead.interest}</td>
                          <td>
                            <Badge tone={stageTone(lead.stage)}>
                              {stageMeta(lead.stage).label}
                            </Badge>
                          </td>
                          <td className="text-sm">{manilaDay(lead.last_contact_at)}</td>
                          <td className="text-sm">{lead.next_action}</td>
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

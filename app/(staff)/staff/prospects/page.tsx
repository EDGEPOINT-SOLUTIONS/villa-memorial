import Link from "next/link";
import { StatCard } from "@/components/kit";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ForbiddenState } from "@/components/ui/states";
import {
  listAgentProspects,
  listProspectAssignments,
  listProspectBlasts,
} from "@/lib/api-client/agent";
import { listOfficeAgents } from "@/lib/api-client/agent-roster";
import { prospectCounts } from "@/lib/crm/prospect-actions";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { ProspectsBoard } from "./prospects-board";

export const metadata = { title: "Prospects — Admin Portal" };

/**
 * Prospects — the office's client lifecycle screen (Messages & inquiries).
 *
 * The captain (2026-10-02): every enquiry becomes a prospect; the office works it
 * (call · email · email-blast · assign), the state moves New → Contacted →
 * Converted, and an assigned agent is notified in their portal. The screen reads
 * the SAME journal the agent portal folds (`lib/api-client/agent.ts`) — a prospect
 * captured by an agent appears here on the next read, and the office's state move
 * or assignment appears in the agent's pipeline — so the two sides cannot
 * disagree. Every figure is a count of that one record; no amount is invented.
 *
 * Gating is the inquiries area's own (`cases:read` lists, `cases:write` writes),
 * the same provisional reuse as Inquiries and the Sales pipeline.
 */
export default async function ProspectsPage() {
  const session = await requireSessionOrRedirect();
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Messages & inquiries" title="Prospects" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const [prospects, assignments, blasts, agents] = await Promise.all([
    listAgentProspects(),
    listProspectAssignments(),
    listProspectBlasts(),
    listOfficeAgents(),
  ]);
  const counts = prospectCounts(prospects);
  const canWrite = hasAnyScope(session.scopes, ["cases:write"]);

  return (
    <>
      <PageHeader
        eyebrow="Messages & inquiries"
        title="Prospects"
        lead="Everyone in play, and the office's next move on each one."
        actions={
          <Link href="/staff/inquiries" className="btn btn--ghost btn--sm">
            Inquiries
          </Link>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: "var(--space-5)" }}>
        <StatCard label="Prospects" value={counts.total} sub="everyone in play" />
        <StatCard label="New" value={counts.new} sub="no first contact yet" />
        <StatCard label="Contacted" value={counts.contacted} sub="being worked" />
        <StatCard label="Converted" value={counts.converted} sub="became clients" />
      </div>

      <PageSection>
        <ProspectsBoard
          prospects={prospects}
          assignments={assignments}
          blasts={blasts}
          agents={agents}
          canWrite={canWrite}
        />
      </PageSection>
    </>
  );
}

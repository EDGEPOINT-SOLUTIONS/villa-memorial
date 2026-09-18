import Link from "next/link";
import { AgentHero, AgentSection, Chip, StageChip } from "@/components/agent/agent-ui";
import { listAgentApplications } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

export const metadata = { title: "Applications — Villa Memorial agent portal" };

/** Chip tone per application stage — word plus tone, never colour alone. */
const STAGE_TONE: Record<string, string> = {
  waiting_you: "qualified",
  approved: "reserved",
  office: "contacted",
  waiting_family: "contacted",
};

/**
 * Applications (approved design page 09): where each plan or lot application is
 * stuck, whose move it is, and what was promised. Agent-scoped application
 * reads wait on the property/plan contracts — the page renders the designed
 * shape from the provisional fixture and says which parts are real.
 */
export default async function AgentApplicationsPage() {
  await requirePortalSessionOrRedirect("agent");
  const applications = await listAgentApplications();
  const needsYou = applications.filter((a) => a.stage === "waiting_you");
  const first = needsYou[0] ?? null;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Applications · plans &amp; lots"
        title={`${applications.length} in flight. ${needsYou.length} need${needsYou.length === 1 ? "s" : ""} something from you.`}
        lead="Each card says who it waits on — you, the office, or the family — so you can tell the family the truth when they call."
        chips={
          <>
            <Chip>{applications.length} applications</Chip>
            <Chip>{needsYou.length} waiting on you</Chip>
          </>
        }
      >
        {first ? (
          <div className="ag-action">
            <div className="ag-action__body">
              <p className="ag-action__title">{first.client_name} — {first.waits_on}</p>
              <p className="ag-action__detail">One missing item and the office can move it forward.</p>
            </div>
            <div className="ag-action__buttons">
              <button className="btn btn--primary ag-btn-xl" type="button" disabled title="Document upload waits on the documents object store">
                {first.action}
              </button>
              <Link className="btn btn--secondary ag-btn-xl" href={`/agent/prospects/${first.client_id}`}>
                Open the record
              </Link>
            </div>
          </div>
        ) : null}
      </AgentHero>

      <AgentSection
        title="In flight"
        sub="Stages in the client's own process: filed → papers checked → with the office → approved → signed → active (or cancelled)."
      >
        <div className="ag-list">
          {applications.map((a) => (
            <article className="ag-card" key={a.id}>
              <div className="ag-card__head">
                <div>
                  <h2 className="ag-card__title">
                    {a.client_name} — {a.product}
                  </h2>
                  <p className="ag-card__sub">{a.detail}</p>
                </div>
                <StageChip stage={STAGE_TONE[a.stage] ?? "contacted"} label={a.stage_label} />
              </div>
              <div className="ag-card__body">
                <dl className="ag-kv">
                  <dt>What it waits on</dt>
                  <dd>{a.waits_on}</dd>
                </dl>
                <dl className="ag-kv">
                  <dt>Who owns it</dt>
                  <dd>{a.owner}</dd>
                </dl>
                {a.promised_by ? (
                  <dl className="ag-kv">
                    <dt>Promised by</dt>
                    <dd>{a.promised_by}</dd>
                  </dl>
                ) : null}
                <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                  <button className="btn btn--primary btn--sm" type="button" disabled title="Application writes wait on the crm/property contracts">
                    {a.action}
                  </button>
                  <button className="btn btn--secondary btn--sm" type="button" disabled title="Notifications wait on the notifications contract">
                    {a.secondary}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="ag-note">
          Application records are agent-scoped in this design but not yet wired: purchase applications exist
          staff-side, plan applications wait on the plan module, and document status waits on the documents
          contract. Amounts shown come from the 2026 sheet; the office confirms every one before a family
          pays.
        </p>
        <button className="btn btn--primary ag-btn-xl" type="button" disabled title="Starting an application waits on the crm/property contracts" style={{ alignSelf: "flex-start" }}>
          Start a new application
        </button>
      </AgentSection>
    </div>
  );
}

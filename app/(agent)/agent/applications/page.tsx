import Link from "next/link";
import { listAgentApplications, type Application } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { StageChip } from "@/components/agent/agent-ui";
import { WorkbenchPanel } from "@/components/agent/workbench";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Applications — Villa Funeraria agent portal" };

/**
 * Application stage → the PRD stage whose chip tone it wears. The words stay the
 * record's own (`stage_label`); only the tone is borrowed, so a stage never
 * carries meaning by colour alone.
 */
const STAGE_TONE: Record<Application["stage"], string> = {
  waiting_you: "qualified",
  approved: "reserved",
  office: "contacted",
  waiting_family: "contacted",
};

/**
 * The record a row opens. A recorded application points at either a client id
 * (`client-…`) or a prospect id (`prospect-…`), and the two live at different
 * routes — opening the wrong one is a 404.
 */
function recordHref(clientId: string): string {
  return clientId.startsWith("prospect-") ? `/agent/prospects/${clientId}` : `/agent/clients/${clientId}`;
}

/**
 * Applications — every filed plan or lot as one table (approved plan §5.6/§15
 * PR 4: family · product · stage · waits-on · promise · action).
 *
 * WHY THIS SHAPE. The page it replaces was four wordy cards; the recorded facts
 * are seven fields a row, and a table is the shape that compares them. The
 * action is real wherever a real action exists — the record it opens, or the
 * office on the line — and an honestly disabled control, naming the contract it
 * waits on, everywhere a service does not exist yet. No amount is typed here;
 * the recorded amounts live in the product detail line, from the 2026 sheet.
 */
export default async function AgentApplicationsPage() {
  await requirePortalSessionOrRedirect("agent");
  const applications = await listAgentApplications();
  const needsYou = applications.filter((a) => a.stage === "waiting_you");

  return (
    <div className="workbench">
      {/* ── the compact header: the answer, then one action ──────────────── */}
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Applications · plans &amp; lots</p>
          <h1 className="wb-head__title">
            {applications.length} in flight. {needsYou.length}{" "}
            {needsYou.length === 1 ? "needs" : "need"} you.
          </h1>
          <p className="wb-head__lead">Every row says whose move it is.</p>
        </div>
        <div className="wb-head__actions">
          <button
            className="btn btn--primary"
            type="button"
            disabled
            title="Starting an application waits on the crm/property contracts"
          >
            Start a new application
          </button>
        </div>
      </header>

      {/* ── action first: the files that wait on the agent ───────────────── */}
      {needsYou.length > 0 ? (
        <section className="wb-alerts" aria-label="Waiting on you">
          {needsYou.map((a) => (
            <article className="wb-alert" data-tone="warning" key={a.id}>
              <span className="wb-alert__dot" aria-hidden="true" />
              <div className="wb-alert__body">
                <p className="wb-alert__label">
                  {a.client_name} — {a.waits_on}
                </p>
              </div>
              {a.promised_by ? <span className="wb-alert__state">Promised by {a.promised_by}</span> : null}
              <Link className="btn btn--secondary btn--sm" href={recordHref(a.client_id)}>
                Open the record
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      {/* ── the table: the facts, one row per application ────────────────── */}
      <WorkbenchPanel
        role="needs"
        label="In flight"
        title="Every application, and what it waits on"
        count={`${applications.length}`}
      >
        {applications.length === 0 ? (
          <p className="wb-empty">No applications in flight. A filed plan or lot appears here.</p>
        ) : (
          <div
            className="table-wrapper wb-table-wrapper"
            tabIndex={0}
            role="region"
            aria-label="Applications in flight"
          >
            <table className="table wb-table">
              <caption>Amounts come from the 2026 sheet; the office confirms every one.</caption>
              <thead>
                <tr>
                  <th scope="col">Family</th>
                  <th scope="col">Product</th>
                  <th scope="col">Stage</th>
                  <th scope="col">Waits on</th>
                  <th scope="col">Promise</th>
                  <th scope="col">
                    <span className="visually-hidden">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {applications.map((a) => (
                  <tr className="wb-clickable" key={a.id}>
                    <th scope="row">
                      <Link href={recordHref(a.client_id)}>{a.client_name}</Link>
                      <span className="wb-table__sub">{a.owner}</span>
                    </th>
                    <td className="wb-table__wrap" data-label="Product">
                      {a.product}
                      <span className="wb-table__sub">{a.detail}</span>
                    </td>
                    <td data-label="Stage">
                      <StageChip stage={STAGE_TONE[a.stage]} label={a.stage_label} />
                    </td>
                    <td className="wb-table__wrap" data-label="Waits on">
                      {a.waits_on}
                    </td>
                    <td data-label="Promise">{a.promised_by ?? "—"}</td>
                    <td className="wb-table__actions" data-label="Action">
                      {a.stage === "approved" ? (
                        <Link className="btn btn--secondary btn--sm" href={recordHref(a.client_id)}>
                          {a.action}
                        </Link>
                      ) : a.stage === "office" ? (
                        <a className="btn btn--secondary btn--sm" href={FAMILY_HELP.phoneHref}>
                          {a.action}
                        </a>
                      ) : (
                        <button
                          className="btn btn--secondary btn--sm"
                          type="button"
                          disabled
                          title={
                            a.stage === "waiting_you"
                              ? "Document upload waits on the documents object store"
                              : "Helping the family finish the papers waits on the crm-families write contract"
                          }
                        >
                          {a.action}
                        </button>
                      )}
                      {a.secondary ? (
                        a.stage === "waiting_family" ? (
                          <Link className="btn btn--ghost btn--sm" href={recordHref(a.client_id)}>
                            {a.secondary}
                          </Link>
                        ) : (
                          <button
                            className="btn btn--ghost btn--sm"
                            type="button"
                            disabled
                            title="Waits on the crm-families write contract"
                          >
                            {a.secondary}
                          </button>
                        )
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </WorkbenchPanel>

      <p className="wb-foot">
        Application records are agent-scoped but not wired: purchase files exist staff-side, plan
        files wait on the plan module, document status waits on the documents contract.
      </p>
    </div>
  );
}

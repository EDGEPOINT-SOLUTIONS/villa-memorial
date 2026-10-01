import { money } from "@/components/agent/agent-ui";
import { WorkbenchPanel } from "@/components/agent/workbench";
import { getAgentCommission } from "@/lib/api-client/agent";
import type { CommissionLine } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { COMMISSION_REVERSAL, COMMISSION_STATES } from "@/lib/commission";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Sales & commissions — Villa Funeraria agent portal" };

/** The recorded statement states → the table's status tone. */
const LINE_BADGE: Record<CommissionLine["state"], string> = {
  pending_approval: "badge--warning",
  approved: "badge--info",
  reversed: "badge--danger",
};

/** The four forward states the legend names (the reversal is its own line). */
const STATE_BADGE: Record<string, string> = {
  pending_approval: "badge--warning",
  approved: "badge--info",
  scheduled: "badge--neutral",
  paid: "badge--success",
};

/**
 * Sales & commissions — the statement as a table (approved plan §5.5/§15 PR 4:
 * "the statement as a table: line · basis · credited · state · amount").
 *
 * The client has not fixed commission rates (07-client-villa/open-questions.md),
 * so every amount is honestly blank and the table says so once. Nothing is
 * invented and no zero is printed.
 *
 * WHY THIS SHAPE. The page it replaces was the portal's wordiest screen
 * (484 content words) and the wrong shape for money: paragraphs explained what
 * one table states. The facts now live in the table (line · basis · credited ·
 * state · amount); the words below it name only the vocabulary the table cannot
 * — the path a line walks and the seven bases the office can choose. The engine
 * itself (finance-billing.md §Commissions) is deferred scope; this page reads
 * the recorded statement and invents nothing.
 *
 * VOCABULARY. The four line states and the reversal come from `lib/commission.ts`
 * (the ONE home the staff engine and this page share); the statement lines come
 * from `lib/api-client/agent.ts`. The office number is read from
 * `lib/family/contact.ts`, never typed.
 */
export default async function AgentSalesPage() {
  await requirePortalSessionOrRedirect("agent");
  const commission = await getAgentCommission();

  return (
    <div className="workbench">
      {/* ── the compact header: the answer, then one action ──────────────── */}
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Sales &amp; commissions · this month</p>
          <h1 className="wb-head__title">Every sale, and what it will pay.</h1>
          <p className="wb-head__lead">This month, one statement line per sale.</p>
        </div>
        <div className="wb-head__actions">
          <a className="btn btn--primary" href={FAMILY_HELP.phoneHref}>
            Ask the office · {FAMILY_HELP.phone}
          </a>
        </div>
      </header>

      {/* ── the statement table: the facts, one line per sale ─────────────── */}
      <WorkbenchPanel
        role="money"
        label="Money"
        title="Statement — this month"
        count={`${commission.statement.length} lines`}
      >
        <div
          className="table-wrapper"
          tabIndex={0}
          role="region"
          aria-label="Commission statement"
        >
          <table className="table wb-table">
            <caption>Rates are not configured, so every amount reads {money(null)}.</caption>
            <thead>
              <tr>
                <th scope="col">Line</th>
                <th scope="col">Basis</th>
                <th scope="col">Credited</th>
                <th scope="col">State</th>
                <th scope="col" className="table__numeric">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {commission.statement.map((line) => (
                <tr key={line.id}>
                  <th scope="row">
                    {line.title}
                    <span className="wb-table__sub">{line.detail}</span>
                  </th>
                  <td data-label="Basis">{line.basis_label ?? "—"}</td>
                  <td data-label="Credited">{line.credited ?? "—"}</td>
                  <td data-label="State">
                    <span className={`badge ${LINE_BADGE[line.state]}`}>{line.state_label}</span>
                  </td>
                  <td className="table__numeric" data-label="Amount">
                    {money(line.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WorkbenchPanel>

      {/* ── the supporting legends: the path, and the bases ──────────────── */}
      <div className="wb-grid">
        <WorkbenchPanel
          role="neutral"
          className="wb-span-6"
          label="States"
          title="The path every line walks"
        >
          <ol className="wb-path" aria-label="The path every commission line walks">
            {COMMISSION_STATES.map((state, index) => (
              <li className="wb-path__item" key={state.key}>
                {index > 0 ? (
                  <span className="wb-path__arrow" aria-hidden="true">
                    →
                  </span>
                ) : null}
                <span className={`badge ${STATE_BADGE[state.key] ?? "badge--neutral"}`}>
                  {state.label}
                </span>
              </li>
            ))}
            <li className="wb-path__item">
              <span className="wb-path__arrow" aria-hidden="true">
                ·
              </span>
              <span className="badge badge--danger">{COMMISSION_REVERSAL.label} — its own line</span>
            </li>
          </ol>
        </WorkbenchPanel>

        <WorkbenchPanel
          role="neutral"
          className="wb-span-6"
          label="Bases"
          title="The seven bases the office can choose"
        >
          <ul className="wb-path" aria-label="The seven configurable commission bases">
            {commission.bases.map((basis) => (
              <li className="wb-path__item" key={basis.key}>
                <span className="badge badge--neutral">{basis.label}</span>
              </li>
            ))}
          </ul>
        </WorkbenchPanel>
      </div>
    </div>
  );
}

import { AgentHero, AgentSection, Chip, MoneyCard, money } from "@/components/agent/agent-ui";
import { getAgentCommission } from "@/lib/api-client/agent";
import type { CommissionLine } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Sales & commissions — Villa Memorial agent portal" };

const LINE_BADGE: Record<CommissionLine["state"], string> = {
  pending_approval: "badge--warning",
  approved: "badge--info",
  reversed: "badge--danger",
};

/**
 * Sales & commissions (approved design page 08) — the honest shape. The client
 * has not fixed commission rates (07-client-villa/open-questions.md:26), so
 * every amount is a placeholder and the page explains the four states, the
 * seven configurable bases, splits, reversals and targets without inventing a
 * single peso. The engine itself (finance-billing.md:17) is deferred scope.
 */
export default async function AgentSalesPage() {
  await requirePortalSessionOrRedirect("agent");
  const commission = await getAgentCommission();
  const configured = commission.configured;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Sales &amp; commissions · this month"
        title="What you sold, and what the work pays."
        lead="The commission shape is below. The rates are placeholders until Villa configures them, so we will not print a number you cannot trust."
        chips={
          <>
            <Chip>{commission.statement.length} statement lines</Chip>
            <Chip>Rates: {configured ? "configured" : "not configured"}</Chip>
            <Chip>Reversals shown</Chip>
          </>
        }
      />

      <AgentSection
        title="Your commission, in its four states"
        sub="Every line follows this path: pending approval → approved → scheduled → paid. Nothing skips a step, and a cancellation is shown as its own line — never hidden."
        more={<span className="ag-pill">{configured ? "configured" : "amounts to be configured"}</span>}
      >
        <div className="ag-money-grid">
          <MoneyCard
            label="Pending approval"
            value={money(commission.pending_approval_cents)}
            note="Waiting on the office to verify the papers."
          />
          <MoneyCard
            label="Approved"
            value={money(commission.approved_cents)}
            note="Ready for the payout cycle once rates are configured."
          />
          <MoneyCard
            label="Paid this year"
            value={money(commission.paid_this_year_cents)}
            note="Statements will show the payment date, method and reference."
          />
        </div>

        <div className="ag-commission">
          <div className="ag-commission__head">
            <h3 className="ag-card__title">Statement — this month</h3>
            <p className="ag-card__sub">
              One line per sale, with the basis the office will configure.
            </p>
          </div>
          <div className="ag-commission__rows">
            {commission.statement.map((line) => (
              <div className="ag-commission__row" key={line.id}>
                <div>
                  <p className="ag-commission__row-title">{line.title}</p>
                  <p className="ag-commission__row-note">
                    {line.detail}
                    {line.basis_label ? (
                      <>
                        {" "}· basis: <strong>{line.basis_label}</strong> (placeholder)
                      </>
                    ) : null}
                    {line.credited ? (
                      <>
                        {" "}· credited {line.credited}
                      </>
                    ) : null}
                  </p>
                  <p style={{ margin: "var(--space-2) 0 0" }}>
                    <span className={`badge ${LINE_BADGE[line.state]}`}>{line.state_label}</span>
                  </p>
                </div>
                <div className="ag-commission__amount">
                  {money(line.amount_cents)}
                  <small>{line.amount_cents === null ? "rate to be configured" : "confirmed"}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AgentSection>

      <AgentSection
        title="How commission works here"
        sub="The PRD's engine is rules-based and fully configurable by Villa. These are the shapes it supports — the office will switch on the ones it uses."
      >
        <div className="ag-card">
          <div className="ag-card__body">
            {commission.bases.map((b) => (
              <div className="ag-rule" key={b.key}>
                <span className="ag-rule__key">{b.label}</span>
                <span className="ag-rule__val">
                  {b.detail} <em>{configured ? "" : "Not configured yet."}</em>
                </span>
              </div>
            ))}
            <p className="ag-note" style={{ marginTop: "var(--space-3)" }}>
              Source: finance-billing.md:17 (blueprint §34) — agent registration/types · internal &amp;
              external agents · territory · attribution · rates · approval · statements · payment tracking ·
              clawbacks/reversals · cancelled-service handling. Rates are an open client question
              (07-client-villa/open-questions.md:26).
            </p>
          </div>
        </div>
      </AgentSection>

      <AgentSection
        title="Targets and conversion"
        sub="The office sets the target; you see where you are against it, and how your people are moving."
      >
        <div className="ag-card">
          <div className="ag-card__body">
            <div className="ag-target">
              <div className="ag-target__legend">
                <span>
                  <strong>Monthly target</strong>
                </span>
                <span>{commission.target.amount_cents === null ? "—" : money(commission.target.amount_cents)}</span>
              </div>
              <div className="ag-target__bar">
                <div className="ag-target__fill" style={{ width: "0%" }} />
              </div>
              <p className="ag-note">
                {commission.target.amount_cents === null
                  ? "No target has been set for you yet. When the office sets one, this bar fills against sales value — and collection, if Villa wants it included."
                  : "Progress against the target the office set."}
              </p>
            </div>
            <hr className="ag-divider" />
            <dl className="ag-kv">
              <dt>People contacted this month</dt>
              <dd>{commission.conversion.contacted}</dd>
            </dl>
            <dl className="ag-kv">
              <dt>Presentations made</dt>
              <dd>{commission.conversion.presentations}</dd>
            </dl>
            <dl className="ag-kv">
              <dt>Sales closed</dt>
              <dd>{commission.conversion.sales}</dd>
            </dl>
            <dl className="ag-kv">
              <dt>Conversion, contacted → sold</dt>
              <dd>
                {commission.conversion.contacted > 0
                  ? `${Math.round((commission.conversion.sales / commission.conversion.contacted) * 100)}%`
                  : "—"}
              </dd>
            </dl>
            <p className="ag-note">
              Conversion will be calculated from the office&apos;s record, not from a self-reported list.{" "}
              {commission.conversion.example ? <span className="ag-pill">example figures</span> : null}
            </p>
          </div>
        </div>
        <div className="ag-actions">
          <a className="btn btn--primary" href={FAMILY_HELP.phoneHref}>
            Ask the office a commission question
          </a>
          <button
            className="btn btn--secondary"
            type="button"
            disabled
            title="The rule sheet publishes when the commission engine is configured"
          >
            Read the full rule sheet (when configured)
          </button>
        </div>
        <p className="ag-note">{commission.placeholder_note}</p>
      </AgentSection>
    </div>
  );
}

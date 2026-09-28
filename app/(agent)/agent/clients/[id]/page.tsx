import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentHero, Chip, money } from "@/components/agent/agent-ui";
import { getAgentClient } from "@/lib/api-client/agent";
import { manilaDay } from "@/lib/agent/agent-view";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Client — Villa Funeraria agent portal" };

/**
 * Client record — what the agent may see (approved design page 06). The record
 * is deliberately shallower than the staff record: holdings, the next amount
 * and its date, and the dates that matter. The full ledger stays with the
 * office — the PRD's sensitive-data principle made visible.
 */
export default async function AgentClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePortalSessionOrRedirect("agent");
  const { id } = await params;
  const client = await getAgentClient(id);
  if (!client) notFound();

  const tel = `tel:${client.phone.replace(/\s/g, "")}`;
  const sms = `sms:${client.phone.replace(/\s/g, "")}`;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Client · your family"
        title={client.name}
        lead={`${client.household} · your client since ${client.since}`}
        chips={
          <>
            <Chip>{client.phone}</Chip>
            {client.holdings[0] ? <Chip>{client.holdings[0].label}</Chip> : null}
          </>
        }
      >
        <div className="ag-action">
          <div className="ag-action__body">
            <p className="ag-action__title">{client.ask ?? "Keep the relationship warm"}</p>
            <p className="ag-action__detail">
              {client.holdings.map((h) => h.detail).join(" · ")}
            </p>
          </div>
          <div className="ag-action__buttons">
            <a className="btn btn--primary ag-btn-xl" href={tel}>
              Call {client.name.split(" ")[0]}
            </a>
            <a className="btn btn--secondary ag-btn-xl" href={sms}>
              Text
            </a>
            <button className="btn btn--ghost" type="button" disabled title="Waits on the crm-families write contract">
              Log a visit
            </button>
          </div>
        </div>
      </AgentHero>

      <div className="ag-grid-2">
        <div className="ag-card">
          <div className="ag-card__head">
            <div>
              <h2 className="ag-card__title">What the family holds</h2>
              <p className="ag-card__sub">One place, so you never guess at the door.</p>
            </div>
          </div>
          <div className="ag-card__body">
            {client.holdings.map((h) => (
              <div className="ag-person" key={`${h.kind}-${h.label}`}>
                <span className="ag-person__av" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 7 8h3v4H6l-2 5h6v3h4v-3h6l-2-5h-4V8h3z" /></svg>
                </span>
                <div>
                  <p className="ag-person__name">{h.label}</p>
                  <p className="ag-person__role">{h.detail}</p>
                </div>
              </div>
            ))}
            {client.co_decider ? (
              <div className="ag-person">
                <span className="ag-person__av" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 4.5a3.5 3.5 0 0 1 0 6.9M21 20v-1a4 4 0 0 0-3-3.9" /></svg>
                </span>
                <div>
                  <p className="ag-person__name">{client.co_decider.name} — co-decider</p>
                  <p className="ag-person__role">{client.co_decider.note}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ag-card">
          <div className="ag-card__head">
            <div>
              <h2 className="ag-card__title">Money, plainly</h2>
              <p className="ag-card__sub">Only what your login may see.</p>
            </div>
          </div>
          <div className="ag-card__body">
            {client.next_amount ? (
              <div className="ag-money ag-money--due">
                <p className="ag-money__label">Next amount due</p>
                <p className="ag-money__value">{money(client.next_amount.amount_cents)}</p>
                <p className="ag-money__note">
                  {manilaDay(client.next_amount.due_at)} · per the office&apos;s record. Confirm the exact
                  figure with the office.
                </p>
              </div>
            ) : (
              <p className="ag-note">Nothing due that your login shows. The office holds the full record.</p>
            )}
            <p className="ag-note">
              Your login shows the next amount and its date — not the full payment history. That stays with
              the office, where the receipts and the official record live.
            </p>
            <div className="ag-actions">
              <a className="btn btn--secondary btn--sm" href={FAMILY_HELP.phoneHref}>
                Ask the office about this balance
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="ag-sec">
        <div className="ag-sec__head">
          <div>
            <h2 className="ag-h2">What happens next</h2>
            <p className="ag-sub">The dates a good agent remembers for the family.</p>
          </div>
        </div>
        <div className="ag-card">
          <div className="ag-card__body">
            {client.next_events.map((e) => (
              <dl className="ag-kv" key={e.label}>
                <dt>{e.label}</dt>
                <dd>{e.value}</dd>
              </dl>
            ))}
          </div>
        </div>
      </section>

      <section className="ag-sec">
        <div className="ag-sec__head">
          <div>
            <h2 className="ag-h2">Papers you can hand over</h2>
            <p className="ag-sub">Only the copies the office has released for agents.</p>
          </div>
        </div>
        {client.papers.length === 0 ? (
          <p className="ag-note">No agent-released copies for this family yet — the office can prepare one.</p>
        ) : (
          <div className="ag-list">
            {client.papers.map((p) => (
              <article className="ag-work" key={p}>
                <span className="ag-work__icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" /></svg>
                </span>
                <div className="ag-work__body">
                  <p className="ag-work__title">{p}</p>
                  <p className="ag-work__detail">Released by the office · bring it on your next visit</p>
                </div>
                <div className="ag-work__action">
                  <Link className="btn btn--secondary btn--sm" href="/agent/marketing">
                    Share
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        <div className="ag-card">
          <div className="ag-card__body">
            <p className="ag-note">
              <strong>The privacy line:</strong> you see what your work needs — the family&apos;s holdings, the
              next amount, and the dates. The full record, the payment history and the legal papers stay with
              the office (the PRD&apos;s sensitive-data principle, roles-permissions.md:13). If the family asks
              for something you cannot see, request it from the office in one tap and the family hears back
              from a person.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

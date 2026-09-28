import Link from "next/link";
import { AgentHero, AgentSection, Chip } from "@/components/agent/agent-ui";
import { listAgentClients } from "@/lib/api-client/agent";
import { findClients } from "@/lib/agent/agent-view";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

export const metadata = { title: "Clients — Villa Funeraria agent portal" };

/**
 * Clients — the book of business (approved design page 05). The list shows the
 * families the office assigned to this agent, what each holds, and the next
 * thing that matters. Money is only ever the next amount the agent may see.
 */
export default async function AgentClientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; filter?: string }>;
}) {
  await requirePortalSessionOrRedirect("agent");
  const params = (await searchParams) ?? {};
  const query = params.q?.trim() ?? "";
  const filter = params.filter ?? "all";

  const all = await listAgentClients();
  let clients = findClients(all, query);
  if (filter === "plans") clients = clients.filter((c) => c.holdings.some((h) => h.kind === "plan"));
  if (filter === "lots") clients = clients.filter((c) => c.holdings.some((h) => h.kind === "lot"));
  if (filter === "visits") clients = clients.filter((c) => c.check_in === "Check-in this month");

  const checkIns = all.filter((c) => c.check_in === "Check-in this month").length;

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Clients · your book of business"
        title={`${all.length} families call you theirs.`}
        lead={`${checkIns} need a check-in this month. Everyone else is fine — and when we know something, we say so here rather than leaving you guessing.`}
        chips={
          <>
            <Chip>{checkIns} check-ins this month</Chip>
            <Chip>Assigned to you only</Chip>
          </>
        }
      />

      <AgentSection
        title="Your clients"
        sub="Name, what they hold, and the next thing that matters. Search by name, lot number, plan number or phone."
      >
        <form className="ag-field" action="/agent/clients" method="get" role="search">
          <label className="ag-field__label" htmlFor="agent-client-search">
            Find a client
          </label>
          <input
            id="agent-client-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Name, lot number, plan number, or phone"
          />
          <div className="ag-actions">
            <button className="btn btn--primary" type="submit">
              Search
            </button>
            {query ? (
              <Link className="btn btn--ghost" href="/agent/clients">
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <div className="ag-filters" role="group" aria-label="Filter clients">
          <Link className={`ag-filter${filter === "all" ? " ag-filter--on" : ""}`} href="/agent/clients">
            All {all.length}
          </Link>
          <Link className={`ag-filter${filter === "plans" ? " ag-filter--on" : ""}`} href="/agent/clients?filter=plans">
            Plans
          </Link>
          <Link className={`ag-filter${filter === "lots" ? " ag-filter--on" : ""}`} href="/agent/clients?filter=lots">
            Lots
          </Link>
          <Link className={`ag-filter${filter === "visits" ? " ag-filter--on" : ""}`} href="/agent/clients?filter=visits">
            Due a visit
          </Link>
        </div>

        {clients.length === 0 ? (
          <div className="ag-state">
            <span className="ag-state__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM17 4.5a3.5 3.5 0 0 1 0 6.9M21 20v-1a4 4 0 0 0-3-3.9" /></svg>
            </span>
            <p className="ag-state__title">{query ? "No client matches that search" : "No clients yet"}</p>
            <p className="ag-state__body">
              {query
                ? "Check the spelling, or search for the lot or plan number. A new person starts as a prospect."
                : "Your first sale creates the client record — until then, build the pipeline."}
            </p>
            <div className="ag-actions ag-actions--center">
              {query ? (
                <Link className="btn btn--secondary" href="/agent/clients">
                  See all clients
                </Link>
              ) : null}
              <Link className="btn btn--primary" href="/agent/prospects">
                Open the pipeline
              </Link>
            </div>
          </div>
        ) : (
          <div className="ag-list">
            {clients.map((c) => {
              const kind =
                c.check_in === "Check-in this month" ? "today" : c.check_in === "Being served now" ? "done" : "";
              const cls = kind ? `ag-work ag-work--${kind}` : "ag-work";
              const holding = c.holdings[0];
              return (
                <article className={cls} key={c.id}>
                  <span className="ag-work__icon" aria-hidden="true">
                    {holding?.kind === "plan" ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-1 2V5a2 2 0 0 1 2-2zM9 8h6M9 12h4" /></svg>
                    ) : holding?.kind === "lot" ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 7 8h3v4H6l-2 5h6v3h4v-3h6l-2-5h-4V8h3z" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" /></svg>
                    )}
                  </span>
                  <div className="ag-work__body">
                    <p className="ag-work__kind">{c.check_in}</p>
                    <p className="ag-work__title">{c.name}</p>
                    <p className="ag-work__detail">
                      {c.holdings.map((h) => `${h.label} · ${h.detail}`).join(" · ")}
                    </p>
                    <p className="ag-work__meta">
                      <span>{c.household}</span>
                      {c.ask ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{c.ask}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="ag-work__action">
                    <Link className="btn btn--primary" href={`/agent/clients/${c.id}`}>
                      Open
                    </Link>
                    <a className="btn btn--secondary" href={`tel:${c.phone.replace(/\s/g, "")}`}>
                      Call
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="ag-note">
          Clients come from the office&apos;s customer record. Your list shows only the families the office
          assigned to you — never the whole database. Money shown is only what your login allows.
        </p>
      </AgentSection>
    </div>
  );
}

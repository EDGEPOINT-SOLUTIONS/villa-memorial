import Link from "next/link";
import { listAgentClients } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { findClients, manilaDay } from "@/lib/agent/agent-view";
import { money } from "@/components/agent/agent-ui";
import { StatusChip, type StatusTone } from "@/components/kit";
import { FAMILY_HELP } from "@/lib/family/contact";

export const metadata = { title: "Clients — Villa Funeraria agent portal" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "plans", label: "Plans" },
  { key: "lots", label: "Lots" },
  { key: "visits", label: "Due a visit" },
] as const;

/** The check-in word → the status chip tone. The word always carries the meaning. */
function checkInTone(checkIn: string): StatusTone {
  if (checkIn === "Check-in this month") return "warning";
  if (checkIn === "Being served now") return "info";
  if (checkIn === "Referral") return "accent";
  return "neutral";
}

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Clients — the book of business as one table (approved plan §5.5/§15 PR 4:
 * family · holds · next amount · check-in · action), with search by name, lot,
 * plan number or phone.
 *
 * WHY THIS SHAPE. The page it replaces was a stack of word rows; the recorded
 * facts are a family, what they hold, the next amount the agent may see and
 * whether they are due. Money is only ever the next amount and its date — the
 * full ledger stays with the office (roles-permissions.md:13), stated once.
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

  const makeHref = (patch: Record<string, string | undefined>) =>
    `/agent/clients${queryString({ q: query, filter, ...patch })}`;

  return (
    <div className="workbench">
      {/* ── the compact header: the answer, then one action ──────────────── */}
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Clients · your book of business</p>
          <h1 className="wb-head__title">{all.length} families call you theirs.</h1>
          <p className="wb-head__lead">{checkIns} need a check-in this month.</p>
        </div>
        <div className="wb-head__actions">
          <a className="btn btn--secondary" href={FAMILY_HELP.phoneHref}>
            Ask the office · {FAMILY_HELP.phone}
          </a>
        </div>
      </header>

      {/* ── search and filters ───────────────────────────────────────────── */}
      <section className="wb-panel" aria-label="Find a client">
        <div className="wb-panel__body">
          <form className="wb-search" action="/agent/clients" method="get" role="search">
            {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
            <label className="visually-hidden" htmlFor="agent-client-search">
              Search clients
            </label>
            <input
              id="agent-client-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Name, lot, plan or phone"
            />
            <button className="btn btn--primary" type="submit">
              Search
            </button>
            {query ? (
              <Link className="btn btn--ghost" href={makeHref({ q: undefined })}>
                Clear
              </Link>
            ) : null}
          </form>

          <div className="wb-chips" role="group" aria-label="Filter clients">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                className="ag-filter wb-clickable"
                data-on={f.key === filter ? "yes" : "no"}
                aria-current={f.key === filter ? "true" : undefined}
                href={makeHref({ filter: f.key === "all" ? undefined : f.key })}
              >
                {f.label === "All" ? `All ${all.length}` : f.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── the table: the book of business ──────────────────────────────── */}
      <section className="wb-panel" aria-label="Your clients">
        {clients.length === 0 ? (
          <div className="wb-panel__body">
            <p className="wb-empty">
              {query ? "No client matches that search. " : "No clients yet. "}
              {query ? (
                <Link href={makeHref({ q: undefined })}>See all clients</Link>
              ) : (
                <Link href="/agent/prospects">Open the pipeline</Link>
              )}
              .
            </p>
          </div>
        ) : (
          <div
            className="table-wrapper wb-table-wrapper"
            tabIndex={0}
            role="region"
            aria-label="Your clients"
          >
            <table className="table wb-table">
              <caption className="visually-hidden">The families assigned to you</caption>
              <thead>
                <tr>
                  <th scope="col">Family</th>
                  <th scope="col">Holds</th>
                  <th scope="col" className="table__numeric">
                    Next amount
                  </th>
                  <th scope="col">Check-in</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const tel = `tel:${c.phone.replace(/\s/g, "")}`;
                  return (
                    <tr className="wb-clickable" key={c.id}>
                      <th scope="row">
                        <Link href={`/agent/clients/${c.id}`}>{c.name}</Link>
                        <span className="wb-table__sub">{c.household}</span>
                      </th>
                      <td data-label="Holds">
                        <ul className="wb-holds">
                          {c.holdings.map((h) => (
                            <li key={`${h.kind}-${h.label}`}>
                              <span className="wb-holds__label">{h.label}</span>
                              <span className="wb-table__sub">{h.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="table__numeric" data-label="Next amount">
                        {c.next_amount ? (
                          <>
                            {money(c.next_amount.amount_cents)}
                            <span className="wb-table__sub">{manilaDay(c.next_amount.due_at)}</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td data-label="Check-in">
                        <StatusChip tone={checkInTone(c.check_in)}>{c.check_in}</StatusChip>
                        {c.ask ? <span className="wb-table__sub">{c.ask}</span> : null}
                      </td>
                      <td className="wb-table__actions" data-label="Actions">
                        <Link className="btn btn--primary btn--sm" href={`/agent/clients/${c.id}`}>
                          Open
                        </Link>
                        <a className="btn btn--secondary btn--sm" href={tel}>
                          Call
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="wb-foot">
        Only the families the office assigned to you. Money shown is the next amount your login may
        see — the full record, history and legal papers stay with the office.
      </p>
    </div>
  );
}

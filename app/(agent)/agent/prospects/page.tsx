import Link from "next/link";
import { listAgentProspects, type Prospect } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { orderProspects, WORKBENCH_HELP } from "@/lib/agent/agent-dashboard";
import {
  interestLabel,
  leadSourceLabel,
  manilaDay,
  needsYou,
  PIPELINE_STAGES,
  prospectUrgency,
  stageMeta,
} from "@/lib/agent/agent-view";
import { pipelineValueCents } from "@/lib/agent/acquisition";
import { money, StageChip } from "@/components/agent/agent-ui";
import { ProspectBoard } from "@/components/agent/prospect-board";
import { StatusChip } from "@/components/kit";

export const metadata = { title: "Prospects — Villa Funeraria agent portal" };

type Search = {
  filter?: string;
  stage?: string;
  source?: string;
  q?: string;
  show?: string;
  view?: string;
};

function applyFilters(prospects: Prospect[], params: Search): Prospect[] {
  const filter = params.filter ?? "all";
  const query = (params.q ?? "").trim().toLowerCase();
  return prospects.filter((p) => {
    if (filter === "needs" && needsYou([p]).length === 0) return false;
    if (filter === "plan" && p.interest !== "plan") return false;
    if (filter === "lot" && p.interest !== "lot") return false;
    if (filter === "services" && p.interest !== "services") return false;
    if (params.stage && p.stage !== params.stage) return false;
    if (params.source && p.source !== params.source) return false;
    if (query) {
      const haystack = [p.name, p.phone, p.want, p.next_action, p.notes].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "needs", label: "Needs me today" },
  { key: "plan", label: "Plans" },
  { key: "lot", label: "Lots" },
  { key: "services", label: "Services" },
] as const;

const SOURCES = [
  { key: "walk_in", label: "Walk-in" },
  { key: "referral", label: "Referral" },
  { key: "facebook", label: "Facebook" },
  { key: "event", label: "Event" },
] as const;

function queryString(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * The working list's table, unchanged (the captain's accepted plan, 2026-10-01).
 * It is rendered in list mode AND under the board on a phone, so the list markup
 * has one home; board placement never removes the list a narrow screen can read.
 */
function ProspectTable({ rows }: { rows: Prospect[] }) {
  return (
    <div className="table-wrapper wb-table-wrapper" tabIndex={0} role="region" aria-label="Prospects">
      <table className="table wb-table wb-table--sticky">
        <caption className="visually-hidden">Your prospects, needs-you first</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Stage</th>
            <th scope="col">Next action</th>
            <th scope="col">Best time</th>
            <th scope="col">Last contact</th>
            <th scope="col">Source</th>
            <th scope="col" className="table__numeric">
              Value
            </th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const urgency = prospectUrgency(p);
            const tel = `tel:${p.phone.replace(/\s/g, "")}`;
            // The row is not a link — the name and the three actions are — but it
            // carries them, so it takes the shared clickable-box affordance.
            return (
              <tr className="wb-clickable" key={p.id}>
                <th scope="row">
                  <Link href={`/agent/prospects/${p.id}`}>{p.name}</Link>
                  <span className="wb-table__sub">
                    {interestLabel(p.interest)} · {p.phone}
                  </span>
                </th>
                <td data-label="Stage">
                  <StageChip stage={p.stage} />
                </td>
                <td className="wb-table__wrap" data-label="Next">
                  {p.next_action}
                  <span className="wb-table__state">
                    <StatusChip tone={urgency.tone}>{urgency.label}</StatusChip>
                  </span>
                </td>
                <td data-label="Best time">{p.best_time}</td>
                <td data-label="Last contact">{manilaDay(p.last_contact_at)}</td>
                <td data-label="Source">{leadSourceLabel(p.source)}</td>
                <td className="table__numeric" data-label="Value">
                  {money(p.possible_value_cents)}
                </td>
                <td className="wb-table__actions" data-label="Actions">
                  <a className="btn btn--primary btn--sm" href={tel}>
                    Call
                  </a>
                  <a className="btn btn--secondary btn--sm" href={`sms:${p.phone.replace(/\s/g, "")}`}>
                    Text
                  </a>
                  <Link className="btn btn--ghost btn--sm" href={`/agent/prospects/${p.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Prospects — the working list, with the board as a mode beside it (captain,
 * 2026-10-02). The list stays the default and unchanged: a board spends the
 * widest screen and cannot hold forty rows, but stage placement is a real write
 * now, so the board earns its place as the placement surface.
 *
 * `?view=board` swaps the table for one column per PRD stage
 * (`lib/agent/agent-view.ts`) and lets a card be dragged — or moved with the
 * keyboard — to a later stage. The move records through the lead record's own
 * route and store, so the list, the dashboard stage-flow and the funnel follow.
 * On a narrow screen the board yields to the list and says where it lives; the
 * page still works at 390 with no sideways scroll.
 */
export default async function AgentProspectsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requirePortalSessionOrRedirect("agent");
  const params = (await searchParams) ?? {};
  const filter = params.filter ?? "all";
  const view: "list" | "board" = params.view === "board" ? "board" : "list";

  const all = await listAgentProspects();
  const filtered = orderProspects(applyFilters(all, params));
  const shown = params.show === "all" ? filtered : filtered.slice(0, 12);
  const needs = needsYou(all);

  const makeHref = (patch: Record<string, string | undefined>) =>
    `/agent/prospects${queryString({
      filter,
      stage: params.stage,
      source: params.source,
      q: params.q,
      view: params.view,
      ...patch,
    })}`;

  return (
    <div className="workbench">
      <header className="wb-head">
        <div className="wb-head__text">
          <p className="wb-head__eyebrow">Prospects · your pipeline</p>
          <h1 className="wb-head__title">
            {needs.length > 0 ? `${needs.length} need a move this week.` : "Your pipeline."}
          </h1>
          <p className="wb-head__lead">
            {filtered.length} {filtered.length === 1 ? "person" : "people"} in this view ·{" "}
            {money(pipelineValueCents(filtered))} possible together
            {filter === "all" ? "" : " · filtered"}
          </p>
        </div>
        <div className="wb-head__actions">
          <Link className="btn btn--primary" href="/agent/new">
            New lead
          </Link>
          <a className="btn btn--secondary" href={WORKBENCH_HELP.phoneHref}>
            Call the office
          </a>
        </div>
      </header>

      <section className="wb-panel" aria-label="Prospect filters">
        <div className="wb-panel__body">
          <form className="wb-search" action="/agent/prospects" method="get" role="search">
            {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
            {params.stage ? <input type="hidden" name="stage" value={params.stage} /> : null}
            {params.source ? <input type="hidden" name="source" value={params.source} /> : null}
            {params.view ? <input type="hidden" name="view" value={params.view} /> : null}
            <label className="visually-hidden" htmlFor="prospect-search">
              Search prospects
            </label>
            <input
              id="prospect-search"
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Name, phone, lot or plan number"
            />
            <button className="btn btn--primary" type="submit">
              Search
            </button>
            {params.q ? (
              <Link className="btn btn--ghost" href={makeHref({ q: undefined })}>
                Clear
              </Link>
            ) : null}
          </form>

          <div className="wb-viewswitch" role="group" aria-label="View">
            <Link
              className="ag-filter wb-clickable"
              data-on={view === "list" ? "yes" : "no"}
              aria-current={view === "list" ? "true" : undefined}
              href={makeHref({ view: undefined })}
            >
              List
            </Link>
            <Link
              className="ag-filter wb-clickable"
              data-on={view === "board" ? "yes" : "no"}
              aria-current={view === "board" ? "true" : undefined}
              href={makeHref({ view: "board" })}
            >
              Board
            </Link>
          </div>

          <div className="wb-chips" role="group" aria-label="Filter prospects">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                className="ag-filter wb-clickable"
                data-on={f.key === filter ? "yes" : "no"}
                aria-current={f.key === filter ? "true" : undefined}
                href={`/agent/prospects${queryString({
                  filter: f.key === "all" ? undefined : f.key,
                  stage: params.stage,
                  source: params.source,
                  q: params.q,
                  view: params.view,
                })}`}
              >
                {f.label}
              </Link>
            ))}
            {PIPELINE_STAGES.map((stage) => (
              <Link
                key={stage}
                className="ag-filter wb-clickable"
                data-on={params.stage === stage ? "yes" : "no"}
                aria-current={params.stage === stage ? "true" : undefined}
                href={makeHref({ stage: params.stage === stage ? undefined : stage, show: undefined })}
              >
                {stageMeta(stage).label}
              </Link>
            ))}
            {SOURCES.map((source) => (
              <Link
                key={source.key}
                className="ag-filter wb-clickable"
                data-on={params.source === source.key ? "yes" : "no"}
                aria-current={params.source === source.key ? "true" : undefined}
                href={makeHref({ source: params.source === source.key ? undefined : source.key, show: undefined })}
              >
                {source.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wb-panel" aria-label="Your prospects">
        {filtered.length === 0 ? (
          <div className="wb-panel__body">
            <p className="wb-empty">
              Nothing matches this view.{" "}
              <Link href="/agent/prospects">Clear the filters</Link> or capture the first lead.
            </p>
          </div>
        ) : view === "board" ? (
          <>
            <div className="pb-wide">
              <ProspectBoard prospects={filtered} />
            </div>
            <div className="pb-narrow">
              <p className="wb-empty pb-narrow__note">
                The board is a wide-screen view. Here is the same pipeline as a list — open it on a
                desktop to place cards between stages.
              </p>
              <ProspectTable rows={shown} />
              {filtered.length > 12 && params.show !== "all" ? (
                <div className="wb-panel__body">
                  <Link className="btn btn--secondary" href={makeHref({ show: "all" })}>
                    Show all {filtered.length}
                  </Link>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <ProspectTable rows={shown} />
            {filtered.length > 12 && params.show !== "all" ? (
              <div className="wb-panel__body">
                <Link className="btn btn--secondary" href={makeHref({ show: "all" })}>
                  Show all {filtered.length}
                </Link>
              </div>
            ) : null}
          </>
        )}
      </section>

      <p className="wb-foot">
        Values are what each person is considering together — the whole contract, from the demo record.
        The stage trail follows the PRD (commerce-catalog.md:33). A move is recorded in the demo
        pipeline journal with your name, the day and your note; the list, the dashboard and the funnel
        all read that one move.
      </p>
    </div>
  );
}

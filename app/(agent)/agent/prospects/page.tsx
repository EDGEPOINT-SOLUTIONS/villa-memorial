import Link from "next/link";
import { listAgentProspects, type Prospect } from "@/lib/api-client/agent";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";
import { orderProspects, WORKBENCH_HELP } from "@/lib/agent/agent-dashboard";
import { interestLabel, leadSourceLabel, manilaDay, needsYou, PIPELINE_STAGES, stageMeta } from "@/lib/agent/agent-view";
import { pipelineValueCents } from "@/lib/agent/acquisition";
import { money, StageChip } from "@/components/agent/agent-ui";
import { StatusChip } from "@/components/kit";

export const metadata = { title: "Prospects — Villa Funeraria agent portal" };

/** The honest label for a prospect's urgency, in the agent's own words. */
function urgencyLabel(prospect: Prospect): { label: string; tone: "danger" | "warning" | "info" | "neutral" } {
  if (prospect.urgency === "hot") return { label: "Needs you today", tone: "danger" };
  if (prospect.urgency === "today") return { label: "Due today", tone: "warning" };
  if (prospect.urgency === "waiting") return { label: "Waiting on them", tone: "info" };
  if (prospect.urgency === "warm") return { label: "Warming up", tone: "neutral" };
  return { label: "New", tone: "neutral" };
}

type Search = {
  filter?: string;
  stage?: string;
  source?: string;
  q?: string;
  show?: string;
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
 * Prospects — the working list (the captain's accepted plan, 2026-10-01).
 *
 * The four-lane kanban became a FILTER PRESET, not the default layout: a board
 * spends the widest screen on whitespace and cannot hold forty rows. This is the
 * list the agent actually works from — needs-you first, then the person whose
 * last contact is oldest. Every field is recorded: the stage chip, the one next
 * action, the whole contract value (never a monthly figure), the best time to
 * call and the source the lead came from. Twelve rows show, then “Show all”.
 */
export default async function AgentProspectsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requirePortalSessionOrRedirect("agent");
  const params = (await searchParams) ?? {};
  const filter = params.filter ?? "all";

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

          <div className="wb-chips" role="group" aria-label="Filter prospects">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                className="ag-filter"
                data-on={f.key === filter ? "yes" : "no"}
                aria-current={f.key === filter ? "true" : undefined}
                href={`/agent/prospects${queryString({
                  filter: f.key === "all" ? undefined : f.key,
                  stage: params.stage,
                  source: params.source,
                  q: params.q,
                })}`}
              >
                {f.label}
              </Link>
            ))}
            {PIPELINE_STAGES.map((stage) => (
              <Link
                key={stage}
                className="ag-filter"
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
                className="ag-filter"
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
        ) : (
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
                {shown.map((p) => {
                  const urgency = urgencyLabel(p);
                  const tel = `tel:${p.phone.replace(/\s/g, "")}`;
                  return (
                    <tr key={p.id}>
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
        )}
        {filtered.length > 12 && params.show !== "all" ? (
          <div className="wb-panel__body">
            <Link className="btn btn--secondary" href={makeHref({ show: "all" })}>
              Show all {filtered.length}
            </Link>
          </div>
        ) : null}
      </section>

      <p className="wb-foot">
        Values are what each person is considering together — the whole contract, from the demo record.
        The stage trail follows the PRD (commerce-catalog.md:33). A stage move waits on the CRM write
        contract, so nothing here is written from this page.
      </p>
    </div>
  );
}

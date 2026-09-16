import Link from "next/link";
import { AgentHero, AgentSection, Chip, StageChip, money } from "@/components/agent/agent-ui";
import { listAgentProspects } from "@/lib/api-client/agent";
import type { Prospect } from "@/lib/api-client/agent";
import { needsYou, prospectValueTotal, stageMeta } from "@/lib/agent/agent-view";
import { requirePortalSessionOrRedirect } from "@/lib/auth/portal-guard";

export const metadata = { title: "Prospects — Villa Memorial agent portal" };

const URGENCY_ORDER: Record<string, number> = { hot: 0, today: 1, waiting: 2, warm: 3, new: 4 };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "services", label: "Funeral services" },
  { key: "plan", label: "Plans" },
  { key: "lot", label: "Lots" },
  { key: "needs", label: "Needs me today" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function filterProspects(prospects: Prospect[], filter: FilterKey): Prospect[] {
  if (filter === "needs") return needsYou(prospects);
  if (filter === "all") return prospects;
  return prospects.filter((p) => p.interest === filter);
}

function CardActions({ p }: { p: Prospect }) {
  const tel = `tel:${p.phone.replace(/\s/g, "")}`;
  return (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <a className="btn btn--primary btn--sm" href={tel}>
        Call
      </a>
      <Link className="btn btn--secondary btn--sm" href={`/agent/prospects/${p.id}`}>
        Open
      </Link>
    </div>
  );
}

function DealCard({ p }: { p: Prospect }) {
  return (
    <div className="ag-deal">
      <p className="ag-deal__name">{p.name}</p>
      <p className="ag-deal__want">{p.want}</p>
      <div className="ag-deal__meta">
        <StageChip stage={p.stage} label={p.urgency === "hot" ? "Needs you today" : undefined} />
        <span>·</span>
        <span>{p.next_action}</span>
      </div>
      <CardActions p={p} />
    </div>
  );
}

/**
 * Prospects — the pipeline (approved design page 03). Lanes on desktop; the
 * sorted urgency list on phones, because the research is explicit that a kanban
 * does not work on a handset. Stage names come from the PRD vector
 * (commerce-catalog.md:33).
 */
export default async function AgentProspectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  await requirePortalSessionOrRedirect("agent");
  const params = (await searchParams) ?? {};
  const requested = params.filter as FilterKey | undefined;
  const active: FilterKey = FILTERS.some((f) => f.key === requested) ? (requested as FilterKey) : "all";

  const prospects = filterProspects(await listAgentProspects(), active);
  const total = prospectValueTotal(prospects);
  const needs = needsYou(prospects);
  const lanes = ["new", "contacted", "qualified", "presentation"] as const;
  const closing = prospects.filter((p) => p.stage === "proposal" || p.stage === "reserved");
  const mobileOrder = [...prospects].sort(
    (a, b) => (URGENCY_ORDER[a.urgency] ?? 9) - (URGENCY_ORDER[b.urgency] ?? 9),
  );

  return (
    <div className="ag-page">
      <AgentHero
        eyebrow="Prospects · your pipeline"
        title={needs.length > 0 ? `${needs.length} people need a move this week.` : "Your pipeline."}
        lead={
          needs.length > 0
            ? `${needs
                .map((p) => p.name.split(" ")[0])
                .join(" and ")} are waiting on you. Everything else can wait until next week.`
            : "Nobody is waiting on you today. A good moment to check who is getting warm."
        }
        chips={
          <>
            <Chip>{prospects.length} people in this view</Chip>
            <Chip>{money(total)} possible together</Chip>
            {closing.length > 0 ? <Chip>{closing.length} ready to close</Chip> : null}
          </>
        }
      />

      <AgentSection
        title="Your pipeline"
        sub="Filter by what they need. The board compresses the PRD's later stages into “Ready to close” so four lanes still read at a glance."
      >
        <div className="ag-filters" role="group" aria-label="Filter prospects">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              className={`ag-filter${f.key === active ? " ag-filter--on" : ""}`}
              href={f.key === "all" ? "/agent/prospects" : `/agent/prospects?filter=${f.key}`}
              aria-current={f.key === active ? "true" : undefined}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {prospects.length === 0 ? (
          <div className="ag-state">
            <span className="ag-state__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6" /></svg>
            </span>
            <p className="ag-state__title">No prospects in this view</p>
            <p className="ag-state__body">Capture the first one while you are with them — it takes under a minute, even with no signal.</p>
            <Link className="btn btn--primary" href="/agent/new">
              New lead
            </Link>
          </div>
        ) : null}

        {closing.length > 0 ? (
          <div className="ag-card">
            <div className="ag-card__head">
              <div>
                <h3 className="ag-card__title">Ready to close this week</h3>
                <p className="ag-card__sub">They have everything they need — the decision is theirs.</p>
              </div>
            </div>
            <div className="ag-card__body">
              {closing.map((p) => (
                <div className="ag-deal" key={p.id} style={{ borderLeft: "4px solid var(--sage-500)" }}>
                  <p className="ag-deal__name">
                    {p.name} — {p.want.split("·")[0]?.trim()}
                  </p>
                  <p className="ag-deal__want">{p.next_action}</p>
                  <div className="ag-deal__meta">
                    <StageChip stage={p.stage} />
                  </div>
                  <CardActions p={p} />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Desktop: the four lanes. */}
        <div className="ag-desktop-only ag-board">
          {lanes.map((lane) => {
            const items = prospects.filter((p) => p.stage === lane);
            return (
              <div className="ag-lane" key={lane}>
                <div className="ag-lane__head">
                  <p className="ag-lane__title">{stageMeta(lane).label}</p>
                  <span className="ag-lane__count">{items.length}</span>
                </div>
                {items.length === 0 ? (
                  <p className="ag-note">Nothing in this stage — good week.</p>
                ) : (
                  items.map((p) => <DealCard key={p.id} p={p} />)
                )}
              </div>
            );
          })}
        </div>

        {/* Phone: one sorted list, most urgent first. */}
        <div className="ag-mobile-only" style={{ flexDirection: "column", gap: "var(--space-3)" }}>
          {mobileOrder.map((p) => (
            <article className="ag-work" key={p.id}>
              <span className="ag-work__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 8v6M22 11h-6" /></svg>
              </span>
              <div className="ag-work__body">
                <p className="ag-work__kind">
                  {p.urgency === "hot" ? "Needs you today" : p.urgency === "waiting" ? "Waiting" : "In your pipeline"}
                </p>
                <p className="ag-work__title">{p.name}</p>
                <p className="ag-work__detail">{p.want}</p>
              </div>
              <div className="ag-work__action">
                <CardActions p={p} />
              </div>
            </article>
          ))}
        </div>

        <Link className="btn btn--primary ag-btn-xl" href="/agent/new" style={{ alignSelf: "flex-start" }}>
          New lead
        </Link>
        <p className="ag-note">
          Stages follow the PRD: New → Contacted → Qualified → Presentation → Proposal → Reserved → Sold
          (commerce-catalog.md:33). Values shown are what each prospect is considering — examples from the
          demo record, replaced by the office&apos;s own figures when the agent contract lands.
        </p>
      </AgentSection>
    </div>
  );
}

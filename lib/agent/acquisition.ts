/**
 * The prospect→client acquisition, in pure functions.
 *
 * WHY THIS MODULE EXISTS. The pipeline was read-only: the lead record drew the
 * recorded `stage_history` and the move controls were designed but disabled,
 * because no crm-families write contract names a stage endpoint. The captain
 * asked (2026-10-01) to run the step-by-step acquisition in the demo: take a
 * prospect through the seven PRD stages and turn them into a client. This module
 * is the fold — an append-only journal of stage moves (persisted by
 * `lib/api-client/agent-store.ts`) applied to the recorded workspaces, so every
 * agent surface reads one effective record and no two can disagree.
 *
 * THE VOCABULARY IS NOT RE-INVENTED. The seven stages and their words come from
 * `lib/agent/agent-view.ts` (`PIPELINE_STAGES` / `stageIndex`), the same list the
 * trail, the board and the status chips render. A move is forward-only on that
 * line; the store's intake refuses anything else.
 *
 * THE CONVERSION POINT IS `sold`. The shipped Clients empty state says it in the
 * portal's own words — "Your first sale creates the client record" — and the
 * conversion funnel the design carries is contacted → presentations → sold. A
 * reserved prospect is still in the pipeline; a sold one is a client. That choice
 * is pinned by `tests/unit/agent-acquisition-flow.test.tsx`.
 *
 * HONESTY. The folded prospects are the recorded demo record; this module adds
 * only the moves a signed-in agent actually makes in the demo. It never invents a
 * stage, a value or a client that no move created.
 */
import type { Client, Prospect, ProspectStageEvent } from "@/lib/api-client/agent";
import {
  interestLabel,
  manilaDay,
  manilaYear,
  PIPELINE_STAGES,
  stageIndex,
} from "@/lib/agent/agent-view";
import { formatMinorUnits } from "@/lib/money";

/** One journalled move of a lead through the pipeline. */
export type StageMoveEvent = {
  prospect_id: string;
  stage: string;
  at: string;
  by: string;
  note: string;
};

/** Stable client id for a prospect converted by a sale. */
export function convertedClientId(prospectId: string): string {
  return `client-${prospectId}`;
}

/**
 * Apply the journal to the recorded prospects, oldest event first per prospect.
 * The seed itself is never mutated: each move appends to the record's own
 * `stage_history` (the shape the office timeline already renders) and moves the
 * standing stage and last-contact stamp forward.
 */
export function applyStageMoves(prospects: Prospect[], events: StageMoveEvent[]): Prospect[] {
  const byProspect = new Map<string, StageMoveEvent[]>();
  for (const event of events) {
    const list = byProspect.get(event.prospect_id);
    if (list) list.push(event);
    else byProspect.set(event.prospect_id, [event]);
  }

  return prospects.map((prospect) => {
    const moves = byProspect.get(prospect.id);
    if (!moves || moves.length === 0) {
      return { ...prospect, stage_history: prospect.stage_history.map((e) => ({ ...e })) };
    }
    const ordered = [...moves].sort((a, b) => a.at.localeCompare(b.at));
    const history: ProspectStageEvent[] = prospect.stage_history.map((e) => ({ ...e }));
    let stage = prospect.stage;
    let lastContact = prospect.last_contact_at;
    for (const move of ordered) {
      history.push({ stage: move.stage, at: move.at, by: move.by, note: move.note });
      stage = move.stage;
      if (move.at > lastContact) lastContact = move.at;
    }
    return { ...prospect, stage, stage_history: history, last_contact_at: lastContact };
  });
}

/**
 * The clients a set of effective prospects has produced. A prospect at `sold`
 * becomes a client record the day of the sale; the recorded book is never
 * duplicated (a client id is minted once and then it is the record).
 */
export function convertedClients(prospects: Prospect[], existing: Client[]): Client[] {
  const known = new Set(existing.map((c) => c.id));
  const created: Client[] = [];
  for (const prospect of prospects) {
    if (prospect.stage !== "sold") continue;
    const id = convertedClientId(prospect.id);
    if (known.has(id)) continue;
    const soldAt =
      [...prospect.stage_history].reverse().find((e) => e.stage === "sold")?.at ??
      prospect.last_contact_at;
    const kind = prospect.interest === "plan" ? "plan" : prospect.interest === "lot" ? "lot" : "service";
    created.push({
      id,
      customer_id: null,
      name: prospect.name,
      household: `${prospect.name} household`,
      phone: prospect.phone,
      email: prospect.email,
      since: manilaYear(soldAt),
      holdings: [
        {
          kind,
          label: prospect.want,
          detail: `${interestLabel(prospect.interest)} · sold ${manilaDay(soldAt)} · ${formatMinorUnits(
            prospect.possible_value_cents,
          )}`,
        },
      ],
      co_decider: null,
      next_amount: null,
      next_events: [],
      check_in: "New client",
      ask: null,
      papers: [],
    });
  }
  return created;
}

/**
 * The open pipeline's value: what the people still considering are worth
 * together. A sold prospect has left the pipeline, so a sale lowers this figure
 * rather than double-counting money that is already on the books. This is the ONE
 * definition of "pipeline value" — the dashboard hero, the performance page and
 * the prospect list's total all read it, so a sale lowers every one of them by the
 * same amount.
 */
export function pipelineValueCents(prospects: Prospect[]): number {
  return prospects
    .filter((p) => p.stage !== "sold")
    .reduce((sum, p) => sum + p.possible_value_cents, 0);
}

/**
 * The conversion funnel, read from the effective pipeline rather than a fixture
 * snapshot: everyone at or past Contacted, at or past Presentation, and Sold.
 * `soldTotals` below is the ONE sold count and value, so the dashboard's "Sold
 * this month" vital and this funnel can never disagree.
 */
export function conversionFromProspects(prospects: Prospect[]): {
  contacted: number;
  presentations: number;
  sales: number;
  example: boolean;
} {
  const contacted = stageIndex("contacted");
  const presentation = stageIndex("presentation");
  return {
    contacted: prospects.filter((p) => stageIndex(p.stage) >= contacted).length,
    presentations: prospects.filter((p) => stageIndex(p.stage) >= presentation).length,
    sales: soldTotals(prospects).count,
    example: false,
  };
}

/** The sales the pipeline has produced: the count and the contract value sold. */
export function soldTotals(prospects: Prospect[]): { count: number; totalCents: number } {
  const sold = prospects.filter((p) => p.stage === "sold");
  return {
    count: sold.length,
    totalCents: sold.reduce((sum, p) => sum + p.possible_value_cents, 0),
  };
}

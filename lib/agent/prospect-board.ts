/**
 * The prospect board's pure model — the columns, the card's forward targets and
 * the one legality read, all in one testable place.
 *
 * WHY IT LIVES HERE. `/agent/prospects` gained a BOARD mode (captain, 2026-10-02)
 * beside the working list, so a stage placement is a drag (or a keyboard move)
 * instead of a text step. The board must not invent a pipeline: the seven
 * columns are `PIPELINE_STAGES` from `lib/agent/agent-view.ts` — the ONE stage
 * vocabulary the trail, the chips and the stage-move route already read — and an
 * empty stage still gets its column, because a hidden column is how a pipeline
 * starts lying about where people stand.
 *
 * A move is FORWARD on that line. The write path's own rule is
 * `lib/agent/stage-move.ts`; this module only decides what the board can offer
 * (the forward targets) and what a drop may mean, so the UI and the server agree
 * on the same line without a second read of the rules.
 */
import type { Prospect } from "@/lib/api-client/agent";
import { PIPELINE_STAGES, stageIndex, stageMeta } from "@/lib/agent/agent-view";

export type BoardColumn = {
  stage: string;
  label: string;
  count: number;
  /** The prospects standing in this stage, in the order the caller supplied. */
  prospects: Prospect[];
};

/**
 * One column per PRD stage, in PRD order. Every stage is present, including the
 * empty ones — the board never hides a rung of the pipeline.
 */
export function boardColumns(prospects: readonly Prospect[]): BoardColumn[] {
  return PIPELINE_STAGES.map((stage) => {
    const inStage = prospects.filter((p) => p.stage === stage);
    return { stage, label: stageMeta(stage).label, count: inStage.length, prospects: inStage };
  });
}

/**
 * A move only goes forward on the PRD line. A drop on the card's own stage (or
 * an earlier one) is not a move; the board says so rather than writing.
 */
export function canMoveTo(fromStage: string, toStage: string): boolean {
  const from = stageIndex(fromStage);
  const to = stageIndex(toStage);
  return from !== -1 && to > from;
}

/** The stages the move control offers: the forward ones, never the card's own. */
export function moveTargets(fromStage: string): Array<{ stage: string; label: string }> {
  const from = stageIndex(fromStage);
  if (from === -1) return [];
  return PIPELINE_STAGES.slice(from + 1).map((stage) => ({ stage, label: stageMeta(stage).label }));
}

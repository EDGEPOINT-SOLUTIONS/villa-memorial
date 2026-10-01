/**
 * The one reading of a stage-move request, shared by the BFF route and the demo.
 *
 * WHY IT LIVES HERE. `web/AGENTS.md` rule 1 keeps route handlers dumb: a BFF
 * route may read a body, ask a pure function for a verdict, and persist through
 * the owning store. The rules a move must satisfy are therefore here, not in the
 * handler — the same pattern as `lib/inquiry-intake.ts`.
 *
 * THE RULES.
 *   1. The target is one of the seven PRD stages (`lib/agent/agent-view.ts`) —
 *      the pipeline has one vocabulary and no move may name a word outside it.
 *   2. A move is FORWARD on that line. The acquisition is step by step; leaving
 *      the captain's flow to correct a record is a different job (and a different
 *      contract) and is deliberately not offered here.
 *   3. A note is required and bounded. The recorded `stage_history` promises
 *      every move a note (`tests/fixture-contract/agent.test.ts`), so an empty
 *      note is refused rather than folded into an empty timeline row.
 */
import { PIPELINE_STAGES, stageIndex } from "@/lib/agent/agent-view";

export const STAGE_NOTE_MAX = 500;

export type StageMoveIntake =
  | { ok: true; stage: string; note: string }
  | { ok: false; errors: Record<string, string> };

/** The pure verdict for one requested move. Never throws, never persists. */
export function readStageMove(input: {
  currentStage: string;
  stage: unknown;
  note: unknown;
}): StageMoveIntake {
  const errors: Record<string, string> = {};

  const stage = typeof input.stage === "string" ? input.stage : "";
  if (!PIPELINE_STAGES.includes(stage as (typeof PIPELINE_STAGES)[number])) {
    errors.stage = "That is not one of the pipeline stages.";
  } else {
    const current = stageIndex(input.currentStage);
    const target = stageIndex(stage);
    if (current !== -1 && target <= current) {
      errors.stage = "The pipeline only moves forward — choose a later step.";
    }
  }

  const rawNote = typeof input.note === "string" ? input.note.trim() : "";
  if (rawNote.length === 0) {
    errors.note = "Add a short note so the record says what happened.";
  } else if (rawNote.length > STAGE_NOTE_MAX) {
    errors.note = `Keep the note under ${STAGE_NOTE_MAX} characters.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, stage, note: rawNote };
}

import { CASE_STAGES, STAGE_LABEL, stageIndex, type CaseStage } from "@/lib/operations/case-board";

/**
 * Arrangement pipeline dots — shared by the cases list and detail screens.
 * Shows how far a case is through the arrangement (generic stages).
 *
 * The stage vocabulary and its order live in `lib/operations/case-board.ts` beside the
 * rest of the ops board's frozen rules, so this row cannot drift from the stage select
 * and the case record it is drawn from.
 */
const PIPELINE = CASE_STAGES.filter((stage) => stage !== "completed");

export function PipelineDots({ stage }: { stage: CaseStage }) {
  const current = stageIndex(stage);
  return (
    <span className="pipeline" aria-label={`Pipeline position: ${STAGE_LABEL[stage] ?? stage}`}>
      {PIPELINE.map((s, i) => {
        const reached = i <= current;
        return (
          <i
            key={s}
            className={`pipeline__dot${reached ? " pipeline__dot--done" : ""}${
              i === current && stage !== "completed" ? " pipeline__dot--current" : ""
            }`}
            title={STAGE_LABEL[s]}
          />
        );
      })}
    </span>
  );
}

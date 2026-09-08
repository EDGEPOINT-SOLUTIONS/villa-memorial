import type { CaseStage } from "@/lib/api-client/operations";

/**
 * Arrangement pipeline dots — shared by the cases list and detail screens.
 * Shows how far a case is through the arrangement (generic stages).
 */
const PIPELINE: CaseStage[] = [
  "inquiry",
  "retrieval",
  "preparation",
  "viewing",
  "ceremony",
  "interment",
];

const STAGE_LABEL: Record<CaseStage, string> = {
  inquiry: "Inquiry",
  retrieval: "Retrieval",
  preparation: "Preparation",
  viewing: "Viewing",
  ceremony: "Ceremony",
  interment: "Interment",
  completed: "Completed",
};

export function PipelineDots({ stage }: { stage: CaseStage }) {
  const current = stage === "completed" ? PIPELINE.length : PIPELINE.indexOf(stage);
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

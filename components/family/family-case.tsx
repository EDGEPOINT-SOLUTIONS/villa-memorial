import { StatusChip } from "@/components/kit/status-chip";
import { Chain } from "@/components/family/family-ui";
import { caseChainCurrent, familyCaseRows } from "@/lib/family/family-case";
import { countWord } from "@/lib/family/family-view";
import type { FamilyCase } from "@/lib/api-client/family";

/**
 * The arrangement — the ONE renderer for the office's recorded case.
 *
 * The dashboard's arrangement panel and the funeral page behind it both render
 * this component from the same `FamilyCase`, so the chain, the step chips and
 * the schedule can never disagree (one reader, one view module, one renderer).
 * Presentation only: the case's values are passed resolved and nothing is
 * invented. A step the record does not carry renders “Not recorded yet”, the
 * few words the brief asks for instead of a guessed time.
 *
 * Server-renderable; the chain reuses the shared five-word `Chain` the portal
 * has always used.
 */
export function CaseChain({ familyCase }: { familyCase: FamilyCase }) {
  return <Chain current={caseChainCurrent(familyCase)} />;
}

/** “Three of five done” — the panel's real count. */
export function caseDoneWords(familyCase: FamilyCase): string {
  const done = familyCase.steps.filter((step) => step.status === "done").length;
  return `${countWord(done)} of five done`;
}

export function CaseSchedule({
  familyCase,
  caption = "The arrangement, as our office recorded it",
}: {
  familyCase: FamilyCase;
  caption?: string;
}) {
  const rows = familyCaseRows(familyCase);
  return (
    <table className="table dash-table">
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Step</th>
          <th scope="col">When</th>
          <th scope="col">Where</th>
          <th scope="col">State</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            <td data-label="When">
              {row.when ? (
                row.when
              ) : (
                <span className="dash-muted">Not recorded yet</span>
              )}
            </td>
            <td data-label="Where">
              {row.place ?? <span className="dash-muted">—</span>}
              {row.person ? <span className="dash-table__sub">{row.person}</span> : null}
              {row.note ? <span className="dash-table__sub">{row.note}</span> : null}
            </td>
            <td data-label="State">
              <StatusChip tone={row.tone}>{row.stateLabel}</StatusChip>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

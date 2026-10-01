import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CaseChain, CaseSchedule, caseDoneWords } from "@/components/family/family-case";
import { caseChainCurrent, familyCaseDoneCount, familyCaseRows } from "@/lib/family/family-case";
import type { FamilyCase } from "@/lib/api-client/family";

/**
 * The arrangement renderer's own states.
 *
 * The demo fixture records a finished arrangement, so these tests use a
 * test-only case to pin the two states the fixture cannot show: a step the
 * record does not carry (“Not recorded yet”, never a guessed time) and a case
 * with a step in progress (the chain's “you are here”). No fixture is
 * fabricated here — the module only turns a resolved `FamilyCase` into view
 * values.
 */
const inProgress: FamilyCase = {
  loved_one: "Ernesto Dela Cruz",
  steps: [
    { key: "arrangement", starts_at: "2026-09-12T05:00:00Z", place: "The office", status: "done" },
    { key: "viewing", starts_at: "2026-09-16T01:00:00Z", place: "St. Joseph Chapel", status: "now" },
    { key: "funeral", starts_at: "2026-09-19T02:00:00Z", place: "The park", status: "next" },
    { key: "burial", status: "not_recorded" },
    { key: "papers", on: "2026-09-19", status: "not_recorded" },
  ],
};

const finished: FamilyCase = {
  loved_one: "Ernesto Dela Cruz",
  steps: [
    { key: "arrangement", starts_at: "2026-09-12T05:00:00Z", place: "The office", status: "done" },
    { key: "viewing", starts_at: "2026-09-16T01:00:00Z", place: "St. Joseph Chapel", status: "done" },
    { key: "funeral", starts_at: "2026-09-19T02:00:00Z", place: "The park", status: "done" },
    { key: "burial", starts_at: "2026-09-19T03:30:00Z", place: "Lawn A-01", status: "done" },
    { key: "papers", on: "2026-09-19", status: "done" },
  ],
};

describe("the arrangement schedule", () => {
  it("marks a step the record does not carry as not recorded, never a guessed time", () => {
    const html = renderToStaticMarkup(<CaseSchedule familyCase={inProgress} />);
    // The two unrecorded steps say so in the time cell, and the state chip
    // repeats it for the burial step (papers carries a recorded day).
    expect(html.match(/Not recorded yet/g)).toHaveLength(3);
    // The recorded steps print their instant through the one day helper.
    expect(html).toContain("Saturday 12 September · 1:00 PM");
    expect(html).toContain("Wednesday 16 September · 9:00 AM");
    expect(html).toContain("Happening now");
    expect(html).toContain("Next");
  });

  it("always renders the five moments, in the chain's order", () => {
    const rows = familyCaseRows(inProgress);
    expect(rows.map((row) => row.key)).toEqual([
      "arrangement",
      "viewing",
      "funeral",
      "burial",
      "papers",
    ]);
    expect(rows.map((row) => row.label)).toEqual([
      "Arrangement",
      "Viewing",
      "Funeral",
      "Burial",
      "Papers",
    ]);
  });
});

describe("the arrangement chain", () => {
  it("marks the step the office records as happening now", () => {
    const html = renderToStaticMarkup(<CaseChain familyCase={inProgress} />);
    expect(html).toContain("· you are here");
    expect(html).toContain("fv-chain__now");
    expect(caseChainCurrent(inProgress)).toBe(2);
  });

  it("ticks all five and marks no current step on a finished arrangement", () => {
    const html = renderToStaticMarkup(<CaseChain familyCase={finished} />);
    expect(html).not.toContain("you are here");
    expect(html.match(/fv-chain__done/g) ?? []).toHaveLength(5);
    expect(caseChainCurrent(finished)).toBe(6);
  });

  it("says how many moments are done from the recorded state", () => {
    expect(familyCaseDoneCount(finished)).toBe(5);
    expect(caseDoneWords(finished)).toBe("Five of five done");
    expect(caseDoneWords(inProgress)).toBe("One of five done");
  });
});

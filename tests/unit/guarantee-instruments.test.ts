import { describe, expect, it } from "vitest";
import { termsByVersion } from "@/lib/contracts/villa-terms";
import {
  FILING_DEADLINE_TONE,
  INSTRUMENT_DOCUMENT_STATES,
  INSTRUMENT_FILING_DAYS,
  INSTRUMENT_KIND_LABEL,
  INSTRUMENT_KINDS,
  INSTRUMENT_STATUSES,
  INSTRUMENT_STATUS_LABEL,
  INSTRUMENT_STATUS_TONE,
  instrumentDateLabel,
  instrumentFilingDeadline,
  instrumentNeedsFiling,
  outstandingDocuments,
  summariseCaseInstruments,
  type GuaranteeInstrument,
} from "@/lib/guarantee-instruments";

/**
 * The guarantee-instrument tracker's rules (F-18 / FORMS_PLAN gap 5).
 *
 * What is pinned here: the paper's three-day filing rule is the contract's own clause, the
 * deadline is DERIVED from a recorded contract date (never a countdown typed into a view),
 * the office vocabulary is complete, and the case summary counts overdue work from the same
 * derivation. Nothing here touches money — the sub-ledger is dev-owned and out of scope.
 */

function instrument(overrides: Partial<GuaranteeInstrument> = {}): GuaranteeInstrument {
  return {
    id: "i1",
    kind: "lgu",
    coverage: "LGU guarantee — coffin",
    claimed_from: "Isabela City LGU",
    amount_cents: null,
    reference: null,
    status: "not_filed",
    filed_on: null,
    response_on: null,
    note: null,
    documents: [],
    ...overrides,
  };
}

describe("the paper's three-day filing clock", () => {
  it("is the contract's own clause, not a number typed into the app", () => {
    const clause = termsByVersion("service-contract-2025")?.clauses[1] ?? "";
    expect(clause).toContain("within three (3) days from the date of this contract");
    expect(INSTRUMENT_FILING_DAYS).toBe(3);
  });

  it("derives the deadline from the recorded contract date", () => {
    const deadline = instrumentFilingDeadline("2026-08-28", "2026-08-29");
    expect(deadline).toMatchObject({ state: "upcoming", date: "2026-08-31", daysLeft: 2 });
    expect(deadline.label).toBe("2 days left");
  });

  it("reads the last day and the deadline day as imminent", () => {
    expect(instrumentFilingDeadline("2026-08-28", "2026-08-30")).toMatchObject({
      state: "due_soon",
      daysLeft: 1,
      label: "1 day left",
    });
    expect(instrumentFilingDeadline("2026-08-28", "2026-08-31")).toMatchObject({
      state: "due_today",
      daysLeft: 0,
      label: "Due today",
    });
  });

  it("reads a passed deadline with how long it has been late", () => {
    const deadline = instrumentFilingDeadline("2026-08-28", "2026-09-18");
    expect(deadline).toMatchObject({ state: "passed", date: "2026-08-31", daysLeft: -18 });
    expect(deadline.label).toBe("Passed 18 days ago");
    expect(instrumentFilingDeadline("2026-08-28", "2026-09-01").label).toBe(
      "Passed 1 day ago",
    );
  });

  it("answers unknown when no recorded date can run the clock — never a guessed date", () => {
    for (const contractDate of [null, "", "not-a-date"] as const) {
      expect(instrumentFilingDeadline(contractDate, "2026-09-18")).toEqual({
        state: "unknown",
        date: null,
        daysLeft: null,
        label: "No contract date recorded",
      });
    }
  });

  it("tones every deadline state so imminent reads warning and passed reads danger", () => {
    for (const state of ["unknown", "upcoming", "due_soon", "due_today", "passed"] as const) {
      expect(FILING_DEADLINE_TONE[state]).toBeTruthy();
    }
    expect(FILING_DEADLINE_TONE.due_soon).toBe("warning");
    expect(FILING_DEADLINE_TONE.passed).toBe("danger");
  });
});

describe("the tracker's office vocabulary", () => {
  it("names the five instruments the contract's deductions block records", () => {
    expect(INSTRUMENT_KINDS).toEqual(["lgu", "dswd", "sss", "gsis", "life_plan"]);
    for (const kind of INSTRUMENT_KINDS) {
      expect(INSTRUMENT_KIND_LABEL[kind].length).toBeGreaterThan(0);
    }
  });

  it("labels and tones every filing state in the office's words", () => {
    expect(INSTRUMENT_STATUSES).toEqual([
      "not_filed",
      "filed",
      "awaiting_agency",
      "confirmed",
      "rejected",
    ]);
    for (const status of INSTRUMENT_STATUSES) {
      expect(INSTRUMENT_STATUS_LABEL[status].length).toBeGreaterThan(0);
      expect(INSTRUMENT_STATUS_TONE[status]).toBeTruthy();
    }
    expect(INSTRUMENT_STATUS_TONE.confirmed).toBe("success");
    expect(INSTRUMENT_STATUS_TONE.rejected).toBe("danger");
  });

  it("keeps the document checklist to its two states", () => {
    expect(INSTRUMENT_DOCUMENT_STATES).toEqual(["received", "needed"]);
  });
});

describe("one instrument's paperwork", () => {
  it("counts only the papers the office still needs", () => {
    const row = instrument({
      documents: [
        { label: "Signed funeral service contract", state: "received" },
        { label: "Barangay certificate of indigency", state: "needed" },
        { label: "Claimant's valid ID", state: "needed" },
      ],
    });
    expect(outstandingDocuments(row).map((doc) => doc.label)).toEqual([
      "Barangay certificate of indigency",
      "Claimant's valid ID",
    ]);
  });

  it("puts only a not-yet-filed instrument under the paper's clock", () => {
    expect(instrumentNeedsFiling(instrument())).toBe(true);
    for (const status of ["filed", "awaiting_agency", "confirmed", "rejected"] as const) {
      expect(instrumentNeedsFiling(instrument({ status }))).toBe(false);
    }
  });

  it("prints recorded dates through the one calendar printer, and nothing for rubbish", () => {
    expect(instrumentDateLabel("2026-08-31")).toBe("Aug 31, 2026");
    expect(instrumentDateLabel(null)).toBeNull();
    expect(instrumentDateLabel("31/08/2026")).toBeNull();
  });
});

describe("the case summary", () => {
  it("counts filed, unfiled and overdue against the derived deadline", () => {
    const summary = summariseCaseInstruments(
      [
        instrument({ id: "a", status: "not_filed" }),
        instrument({ id: "b", status: "not_filed" }),
        instrument({ id: "c", status: "confirmed", filed_on: "2026-08-30" }),
      ],
      "2026-08-28",
      "2026-09-18",
    );
    expect(summary).toMatchObject({ total: 3, filed: 1, unfiled: 2, overdue: 2, dueSoon: 0 });
    expect(summary.deadline.state).toBe("passed");
  });

  it("counts an unfiled instrument due today or tomorrow as due soon, not overdue", () => {
    const summary = summariseCaseInstruments(
      [instrument({ status: "not_filed" }), instrument({ id: "b", status: "filed" })],
      "2026-08-28",
      "2026-08-30",
    );
    expect(summary).toMatchObject({ total: 2, filed: 1, unfiled: 1, overdue: 0, dueSoon: 1 });
  });

  it("never calls an unfiled instrument overdue when the clock has no recorded date", () => {
    const summary = summariseCaseInstruments(
      [instrument({ status: "not_filed" })],
      null,
      "2026-09-18",
    );
    expect(summary).toMatchObject({ total: 1, unfiled: 1, overdue: 0, dueSoon: 0 });
    expect(summary.deadline.state).toBe("unknown");
  });
});

import { describe, expect, it } from "vitest";
import {
  EXHUMATION_STATE_LABEL,
  INTERMENT_STATE_LABEL,
  TRANSFER_STATES,
  attentionSteps,
  exhumationSummary,
  formatRecordDay,
  intermentSummary,
  isTransferState,
  nextStep,
  officeStepLabel,
  officeStepTone,
  outstandingSteps,
  ownershipSummary,
  stepProgress,
  transferSummary,
  type LotExhumation,
  type LotInterment,
  type LotTransfer,
} from "@/lib/lot-lifecycle";
import type { Lot } from "@/lib/api-client/property";

/**
 * The pure lot-lifecycle vocabulary and the one-line summaries the lot record
 * uses. Nothing here reads a fixture: these are the rules the pages and the
 * fixture-contract suite both stand on.
 */

function lot(overrides: Partial<Lot> = {}): Lot {
  return {
    id: "00000000-0000-4000-8000-000000000D03",
    lot_number: "A-003",
    section: "A",
    block: "1",
    type: "family",
    status: "sold",
    area_sqm: 2.5,
    price_cents: 12800000,
    currency: "PHP",
    owner_name: "Roberto Santos",
    reserved_at: "2026-03-15T10:00:00Z",
    sold_at: "2026-04-01T14:30:00Z",
    ...overrides,
  };
}

function transfer(overrides: Partial<LotTransfer> = {}): LotTransfer {
  return {
    id: "trf-1",
    lot_id: "lot",
    lot_number: "A-003",
    from: "Roberto Santos",
    to: "Luz Santos",
    asked_on: "2026-09-02",
    state: "verified",
    steps: [
      { key: "submitted", label: "Submitted", state: "done", on: "2026-09-02" },
      { key: "verified", label: "Verified", state: "done", on: "2026-09-05" },
      { key: "approved", label: "Approved", state: "waiting" },
      { key: "completed", label: "Completed", state: "waiting" },
    ],
    still_needed: ["The office's written consent"],
    requirements: ["The transfer fee follows the office's schedule."],
    ...overrides,
  };
}

const interment = (overrides: Partial<LotInterment> = {}): LotInterment => ({
  id: "imm-1",
  lot_id: "lot",
  lot_number: "C-001",
  deceased_name: "Antonio Reyes",
  case_id: "case",
  case_number: "CASE-2026-0003",
  state: "interred",
  interred_on: "2026-08-18",
  checks: [
    { key: "identity", label: "Deceased identity", state: "done" },
    { key: "ownership", label: "Ownership", state: "done" },
    { key: "payment", label: "Payment standing", state: "waiting" },
    { key: "permits", label: "Permits", state: "waiting" },
  ],
  papers: [],
  ...overrides,
});

const exhumation = (overrides: Partial<LotExhumation> = {}): LotExhumation => ({
  id: "exh-1",
  lot_id: "lot",
  lot_number: "C-001",
  interment_id: "imm-1",
  deceased_name: "Antonio Reyes",
  asked_by: "Danilo Reyes",
  asked_on: "2026-09-05",
  reason: "Nearer their home.",
  destination: "Loyola Gardens",
  state: "open",
  steps: [
    { key: "request", label: "The request and the reason", state: "done", on: "2026-09-05" },
    { key: "permit", label: "The permit to exhume", state: "waiting" },
  ],
  record: "Nothing has been done — the grave has not been touched.",
  ...overrides,
});

describe("the office's step vocabulary", () => {
  it("keeps the four transfer words, and only them, valid", () => {
    expect(TRANSFER_STATES).toEqual(["submitted", "verified", "approved", "completed"]);
    for (const state of TRANSFER_STATES) expect(isTransferState(state)).toBe(true);
    expect(isTransferState("done")).toBe(false);
    expect(isTransferState(undefined)).toBe(false);
  });

  it("gives every step state a badge tone and a plain word", () => {
    expect(officeStepTone("done")).toBe("success");
    expect(officeStepTone("waiting")).toBe("warning");
    expect(officeStepTone("attention")).toBe("danger");
    expect(officeStepLabel("done")).toBe("Done");
    expect(officeStepLabel("waiting")).toBe("Waiting");
    expect(officeStepLabel("attention")).toBe("Needs attention");
  });

  it("counts what is open and finds the next move", () => {
    const steps = transfer().steps;
    expect(stepProgress(steps)).toEqual({ done: 2, total: 4 });
    expect(outstandingSteps(steps).map((step) => step.key)).toEqual(["approved", "completed"]);
    expect(attentionSteps(steps)).toEqual([]);
    expect(nextStep(steps)?.key).toBe("approved");
    expect(nextStep([{ key: "x", label: "X", state: "done" }])).toBeUndefined();
  });

  it("leaves missing dates as missing, never as today", () => {
    expect(formatRecordDay("2026-08-18")).toBe("Aug 18, 2026");
    expect(formatRecordDay("2026-08-18T16:00:00Z")).toBe("Aug 18, 2026");
    expect(formatRecordDay(undefined)).toBe("No date recorded");
    expect(formatRecordDay("not-a-day")).toBe("not-a-day");
  });
});

describe("the one-line entry summaries", () => {
  it("says what the transfer record holds, in the office's words", () => {
    expect(transferSummary([])).toEqual({
      lead: "No request recorded",
      detail: "No one has asked to change hands.",
    });
    const summary = transferSummary([transfer()]);
    expect(summary.lead).toBe("1 request");
    expect(summary.detail).toBe("Verified · Roberto Santos → Luz Santos");
    expect(transferSummary([transfer(), transfer({ id: "trf-2" })]).lead).toBe("2 requests");
  });

  it("says whether the ground has been opened", () => {
    expect(intermentSummary([])).toEqual({
      lead: "No interment recorded",
      detail: "The ground has not been opened here.",
    });
    const preparing = interment({
      id: "imm-2",
      state: "preparing",
      interred_on: undefined,
    });
    const summary = intermentSummary([interment(), preparing]);
    expect(summary.lead).toBe("2 records");
    expect(summary.detail).toBe("Last opened Aug 18, 2026 · 1 not opened — checks pending");
    expect(INTERMENT_STATE_LABEL.interred).toBe("Ground opened");
    expect(INTERMENT_STATE_LABEL.preparing).toBe("Not opened");
  });

  it("says how much of an exhumation is recorded", () => {
    expect(exhumationSummary([])).toEqual({
      lead: "No request recorded",
      detail: "No one has asked to move a remains.",
    });
    const summary = exhumationSummary([exhumation()]);
    expect(summary.lead).toBe("1 request");
    expect(summary.detail).toBe("Requirements open · 1 of 2 steps recorded");
    expect(EXHUMATION_STATE_LABEL.open).toBe("Requirements open");
  });

  it("names the owner and the day the lot was acquired — or says there is neither", () => {
    expect(ownershipSummary(lot())).toEqual({
      lead: "Roberto Santos",
      detail: "Sold · Apr 1, 2026",
    });
    expect(
      ownershipSummary(lot({ status: "reserved", owner_name: "Marites Santos", sold_at: null })),
    ).toEqual({ lead: "Marites Santos", detail: "Reserved · Mar 15, 2026" });
    expect(ownershipSummary(lot({ status: "available", owner_name: null, sold_at: null, reserved_at: null }))).toEqual({
      lead: "No owner recorded",
      detail: "The lot stands available — reserve it first.",
    });
    expect(
      ownershipSummary(lot({ status: "maintenance_hold", owner_name: null, sold_at: null, reserved_at: null })),
    ).toEqual({ lead: "No owner recorded", detail: "The lot reads maintenance hold with no owner named." });
  });
});

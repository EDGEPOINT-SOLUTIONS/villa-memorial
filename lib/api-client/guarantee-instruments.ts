/**
 * Typed read for the guarantee-instrument tracker (F-18 / FORMS_PLAN gap 5).
 *
 * ⚠ PROVISIONAL — nothing under `docs/08-delivery/contracts/` names a guarantee-instrument
 * record. The sub-ledger, the deduction math and posting are dev-owned (FORMS_PLAN gap 5 /
 * issue #54), so live persistence is honestly UNIMPLEMENTED: when `OPERATIONS_BASE_URL` is
 * set the tracker answers `not_wired` rather than showing demo rows against real cases. In
 * fixture mode (the default) the recorded tracker in
 * `lib/fixtures/operations/guarantee-instruments.json` is served — the deductions block the
 * case's Funeral Service Contract records, with the office's filing state.
 *
 * The reader is a tolerant reader (repo rule): field by field, extra keys ignored, a
 * malformed required field is a 502, never a cast. A case with no tracker record — or one
 * that records no instrument — is `absent`, which the screens render as an honest empty
 * state, not an error.
 *
 * This module only READS. The tracker never writes, never computes an amount and never
 * mints a reference: the office records the paperwork, the paper's three-day clock is
 * derived by `lib/guarantee-instruments.ts`, and the money stays with finance.
 */
import instrumentsFile from "@/lib/fixtures/operations/guarantee-instruments.json";
import { ApiError } from "@/lib/api-client/api-error";
import { operationsLiveModeEnabled } from "@/lib/api-client/operations";
import {
  isInstrumentDocumentState,
  isInstrumentKind,
  isInstrumentStatus,
  type GuaranteeInstrument,
  type InstrumentDocument,
} from "@/lib/guarantee-instruments";

export const TRACKER_NOT_WIRED =
  "live guarantee-instrument tracking is not wired: no contract names a guarantee-instrument " +
  "record (the sub-ledger and posting behind a deduction are dev-owned — FORMS_PLAN gap 5). " +
  "Fixture mode serves the case's recorded instruments.";

export type CaseInstrumentsRead =
  | { state: "recorded"; instruments: GuaranteeInstrument[] }
  /** No tracker record (or no instrument on it) for this case — a real, honest state. */
  | { state: "absent" }
  /** Live mode: the tracker is not wired to any service. */
  | { state: "not_wired" }
  /** The caller's read threw; screens render this instead of crashing (never from here). */
  | { state: "unavailable" };

function toDocument(raw: unknown): InstrumentDocument {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed guarantee-instrument document", 502);
  }
  const r = raw as Record<string, unknown>;
  const label = typeof r.label === "string" ? r.label.trim() : "";
  if (!label || !isInstrumentDocumentState(r.state)) {
    throw new ApiError("malformed guarantee-instrument document", 502);
  }
  return { label, state: r.state };
}

function toInstrument(raw: unknown): GuaranteeInstrument {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed guarantee instrument", 502);
  }
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const coverage = typeof r.coverage === "string" ? r.coverage.trim() : "";
  if (!id || !coverage || !isInstrumentKind(r.kind) || !isInstrumentStatus(r.status)) {
    throw new ApiError("malformed guarantee instrument", 502);
  }
  const amount = r.amount_cents;
  if (
    amount !== null &&
    amount !== undefined &&
    (typeof amount !== "number" || !Number.isInteger(amount) || amount < 0)
  ) {
    throw new ApiError("malformed guarantee-instrument amount", 502);
  }
  const text = (key: string): string | null => {
    const value = r[key];
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };
  return {
    id,
    kind: r.kind,
    coverage,
    claimed_from: text("claimed_from") ?? "",
    amount_cents: typeof amount === "number" ? amount : null,
    reference: text("reference"),
    status: r.status,
    filed_on: text("filed_on"),
    response_on: text("response_on"),
    note: text("note"),
    documents: Array.isArray(r.documents) ? r.documents.map(toDocument) : [],
  };
}

type TrackersFile = {
  trackers?: Array<{ case_number?: unknown; instruments?: unknown }>;
};

/**
 * The recorded instruments for one case, by `case_number` (the contract's own key, the same
 * one `case-events-v1` addresses). Synchronous and service-free; `loadCaseInstruments` is
 * the seam the screens use so a future store/live read can replace it without touching them.
 */
export function caseInstrumentsFor(caseNumber: string): CaseInstrumentsRead {
  const store = instrumentsFile as unknown as TrackersFile;
  const trackers = Array.isArray(store.trackers) ? store.trackers : [];
  const tracker = trackers.find((entry) => entry.case_number === caseNumber);
  if (!tracker) {
    return { state: "absent" };
  }
  const rows = Array.isArray(tracker.instruments) ? tracker.instruments : [];
  const instruments = rows.map(toInstrument);
  if (instruments.length === 0) {
    return { state: "absent" };
  }
  return { state: "recorded", instruments };
}

/** What the screens call: live mode says plainly that nothing is wired. */
export async function loadCaseInstruments(caseNumber: string): Promise<CaseInstrumentsRead> {
  if (operationsLiveModeEnabled()) {
    return { state: "not_wired" };
  }
  return caseInstrumentsFor(caseNumber);
}

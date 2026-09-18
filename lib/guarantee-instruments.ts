/**
 * The guarantee-instrument tracker's vocabulary and rules — PURE (client + server).
 *
 * F-18 / FORMS_PLAN gap 5. A family's LGU / DSWD / SSS / GSIS / life-plan deduction is
 * written down on the Funeral Service Contract's deductions block
 * (`lib/contracts/service-contract-capture.ts` `DeductionsCapture`, captured on the case's
 * service-contract screen). This module is the one home for what happens to that paperwork
 * afterwards: the instrument kinds, the office's filing states, the supporting-document
 * states, and the paper's filing deadline.
 *
 * Authority:
 *  - the paper's clause 2 (`lib/contracts/villa-terms.ts`, `service-contract-2025`):
 *    "the CLIENT undertakes to submit the payment guarantee instruments within three (3)
 *    days from the date of this contract" → `INSTRUMENT_FILING_DAYS`.
 *  - the paper's own deduction vocabulary (LGU coffin/embalming/others, DSWD / Senior
 *    Citizen, SSS/GSIS ID#s, life plan / insurance plan #) as the capture model records it.
 *
 * WHAT THIS MODULE IS NOT (the dev boundary, FORMS_PLAN gap 5 / issue #54): there is no
 * sub-ledger here and no money math — no deduction arithmetic, no balance, no posting. It
 * derives a filing DATE from recorded dates and labels it; the guarantee sub-ledger and the
 * money behind it are finance's (dev-owned). The screen says so once, where a reader would
 * otherwise expect the money to move.
 */
import { formatCalendarDate, isCalendarDate } from "@/lib/chapel-booking";
import { addDays } from "@/lib/contracts/service-contract";

/* ------------------------------------------------------------------ */
/* Which instrument it is                                              */
/* ------------------------------------------------------------------ */

export const INSTRUMENT_KINDS = ["lgu", "dswd", "sss", "gsis", "life_plan"] as const;

export type InstrumentKind = (typeof INSTRUMENT_KINDS)[number];

/** The kind as the office names it — the contract's own deduction words stay in `coverage`. */
export const INSTRUMENT_KIND_LABEL: Record<InstrumentKind, string> = {
  lgu: "LGU",
  dswd: "DSWD",
  sss: "SSS",
  gsis: "GSIS",
  life_plan: "Life plan",
};

/* ------------------------------------------------------------------ */
/* Where it stands                                                     */
/* ------------------------------------------------------------------ */

export const INSTRUMENT_STATUSES = [
  "not_filed",
  "filed",
  "awaiting_agency",
  "confirmed",
  "rejected",
] as const;

export type InstrumentStatus = (typeof INSTRUMENT_STATUSES)[number];

/** The office's own words for each step — never a ledger code (there is no ledger yet). */
export const INSTRUMENT_STATUS_LABEL: Record<InstrumentStatus, string> = {
  not_filed: "Not yet filed",
  filed: "Filed",
  awaiting_agency: "Awaiting agency",
  confirmed: "Confirmed",
  rejected: "Rejected",
};

export type InstrumentTone = "neutral" | "info" | "warning" | "success" | "danger";

export const INSTRUMENT_STATUS_TONE: Record<InstrumentStatus, InstrumentTone> = {
  not_filed: "neutral",
  filed: "info",
  awaiting_agency: "warning",
  confirmed: "success",
  rejected: "danger",
};

/* ------------------------------------------------------------------ */
/* What it waits on                                                    */
/* ------------------------------------------------------------------ */

export const INSTRUMENT_DOCUMENT_STATES = ["received", "needed"] as const;

export type InstrumentDocumentState = (typeof INSTRUMENT_DOCUMENT_STATES)[number];

export const INSTRUMENT_DOCUMENT_STATE_LABEL: Record<InstrumentDocumentState, string> = {
  received: "Received",
  needed: "Still needed",
};

export type InstrumentDocument = {
  label: string;
  state: InstrumentDocumentState;
};

/* ------------------------------------------------------------------ */
/* One instrument, as the recorded tracker carries it                  */
/* ------------------------------------------------------------------ */

export type GuaranteeInstrument = {
  id: string;
  kind: InstrumentKind;
  /** The contract's own words for the deduction row, e.g. "LGU guarantee — coffin". */
  coverage: string;
  /** Who the claim is against, in the record's own words (LGU, DSWD, SSS, GSIS, plan). */
  claimed_from: string;
  /**
   * The amount the contract records, in integer minor units — the repo money rule. Null
   * when the paper's amount blank was left empty; the screen prints an em dash, never a
   * guess and never a computed figure.
   */
  amount_cents: number | null;
  /** The contract's own reference blank (SSS/GSIS ID#, plan #) when it carries one. */
  reference: string | null;
  status: InstrumentStatus;
  /** The day the office filed it (yyyy-mm-dd), when the record carries one. */
  filed_on: string | null;
  /** The day the agency answered (confirmed/rejected), when the record carries one. */
  response_on: string | null;
  /** One line of the office's own remark; never an invented agency response. */
  note: string | null;
  documents: InstrumentDocument[];
};

/* ------------------------------------------------------------------ */
/* The paper's three-day filing clock                                  */
/* ------------------------------------------------------------------ */

/**
 * Villa's service-contract clause 2: guarantee instruments are submitted within THREE (3)
 * days from the date of the contract. Display only — the app derives the date the office
 * works to; it never charges the interest or forfeits a discount the contract names for
 * missing it.
 */
export const INSTRUMENT_FILING_DAYS = 3;

export type FilingDeadlineState =
  /** No recorded contract date to run the clock from — the honest unknown, not a guess. */
  | "unknown"
  | "upcoming"
  | "due_soon"
  | "due_today"
  | "passed";

export type FilingDeadline = {
  state: FilingDeadlineState;
  /** The derived deadline (yyyy-mm-dd); null when no contract date is recorded. */
  date: string | null;
  /** Whole days from today to the deadline; negative once passed; null when unknown. */
  daysLeft: number | null;
  /** One short line for the screen, in the office's words. */
  label: string;
};

/** Whole days between two UTC calendar days. */
function calendarDaysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/**
 * The contract's three-day filing deadline, derived from the recorded contract date —
 * never a fixed countdown and never a date the record does not support.
 */
export function instrumentFilingDeadline(
  contractDate: string | null | undefined,
  today: string,
): FilingDeadline {
  if (!contractDate || !isCalendarDate(contractDate) || !isCalendarDate(today)) {
    return {
      state: "unknown",
      date: null,
      daysLeft: null,
      label: "No contract date recorded",
    };
  }
  const date = addDays(contractDate, INSTRUMENT_FILING_DAYS);
  const daysLeft = calendarDaysBetween(today, date);
  if (daysLeft < 0) {
    const late = Math.abs(daysLeft);
    return {
      state: "passed",
      date,
      daysLeft,
      label: `Passed ${late} day${late === 1 ? "" : "s"} ago`,
    };
  }
  if (daysLeft === 0) {
    return { state: "due_today", date, daysLeft, label: "Due today" };
  }
  if (daysLeft === 1) {
    return { state: "due_soon", date, daysLeft, label: "1 day left" };
  }
  return { state: "upcoming", date, daysLeft, label: `${daysLeft} days left` };
}

/** The badge tone a deadline state gets: imminent reads warning, passed reads danger. */
export const FILING_DEADLINE_TONE: Record<FilingDeadlineState, InstrumentTone> = {
  unknown: "neutral",
  upcoming: "info",
  due_soon: "warning",
  due_today: "warning",
  passed: "danger",
};

/* ------------------------------------------------------------------ */
/* Small readers over one instrument                                   */
/* ------------------------------------------------------------------ */

export function isInstrumentKind(value: unknown): value is InstrumentKind {
  return typeof value === "string" && (INSTRUMENT_KINDS as readonly string[]).includes(value);
}

export function isInstrumentStatus(value: unknown): value is InstrumentStatus {
  return typeof value === "string" && (INSTRUMENT_STATUSES as readonly string[]).includes(value);
}

export function isInstrumentDocumentState(
  value: unknown,
): value is InstrumentDocumentState {
  return (
    typeof value === "string" &&
    (INSTRUMENT_DOCUMENT_STATES as readonly string[]).includes(value)
  );
}

/** Only a not-yet-filed instrument is still under the paper's three-day clock. */
export function instrumentNeedsFiling(instrument: GuaranteeInstrument): boolean {
  return instrument.status === "not_filed";
}

/** The supporting papers the office still needs for one instrument. */
export function outstandingDocuments(
  instrument: GuaranteeInstrument,
): InstrumentDocument[] {
  return instrument.documents.filter((doc) => doc.state === "needed");
}

/* ------------------------------------------------------------------ */
/* The case at a glance                                                */
/* ------------------------------------------------------------------ */

export type CaseInstrumentsSummary = {
  total: number;
  /** Instruments past "not yet filed" (filed, awaiting agency, confirmed or rejected). */
  filed: number;
  unfiled: number;
  /** Unfiled instruments whose three-day deadline has passed. */
  overdue: number;
  /** Unfiled instruments due today or tomorrow — the ones to act on now. */
  dueSoon: number;
  deadline: FilingDeadline;
};

export function summariseCaseInstruments(
  instruments: readonly GuaranteeInstrument[],
  contractDate: string | null | undefined,
  today: string,
): CaseInstrumentsSummary {
  const deadline = instrumentFilingDeadline(contractDate, today);
  let filed = 0;
  let unfiled = 0;
  let overdue = 0;
  let dueSoon = 0;
  for (const instrument of instruments) {
    if (!instrumentNeedsFiling(instrument)) {
      filed += 1;
      continue;
    }
    unfiled += 1;
    if (deadline.state === "passed") overdue += 1;
    else if (deadline.state === "due_today" || deadline.state === "due_soon") dueSoon += 1;
  }
  return { total: instruments.length, filed, unfiled, overdue, dueSoon, deadline };
}

/** "31 Aug 2026" — one shared printer for the tracker's recorded calendar dates. */
export function instrumentDateLabel(date: string | null): string | null {
  return date && isCalendarDate(date) ? formatCalendarDate(date) : null;
}

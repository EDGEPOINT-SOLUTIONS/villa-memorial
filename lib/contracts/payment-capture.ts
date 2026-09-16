/**
 * Provisional-receipt capture — the counter's record of money received (FORMS_PLAN.md
 * gap 3, forms-report inventory row 23).
 *
 * WHAT THIS IS
 * The six fields the counter writes on the paper slip — amount received; instrument;
 * reference no.; date received; case or invoice; notes — as a typed, validated draft,
 * plus the record a capture produces and the honesty line every provisional receipt
 * carries. The rendered reference is the shared capture shell
 * (`.capture-section` / `.field-grid` / `.peso-input` / `.capture-actions`), the same
 * grammar the other staff capture screens use.
 *
 * WHAT THIS IS NOT (the finance boundary, per FORMS_PLAN.md non-negotiables)
 * - NO official-receipt numbering, allocation or posting rules. Nothing here numbers a
 *   receipt, decides which invoice line a payment applies to, moves a balance or posts
 *   to the sub-ledger — all finance/dev-owned. The record carries exactly the six
 *   captured fields plus the moment of capture; it computes no figure and derives none.
 * - NO persistence shape: no service contract names a payment or a provisional receipt
 *   (finance-billing arrives via events only — `tests/fixture-contract/finance.test.ts`),
 *   so captures live on the screen that made them for the session and the confirmation
 *   says so plainly. Compare the inquiries board's demo captures (`inquiry-board.tsx`).
 * - Money is captured AS ENTERED: the amount is parsed to integer minor units (the repo's
 *   money discipline) and printed back verbatim; a partial payment is a full capture, not
 *   a remainder computed anywhere.
 */
import { pesosInputToCents } from "@/lib/contracts/purchase-application";

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */

/** The instruments the slip offers, in the rendered prototype's order (report row 23; the
 * prototype adds GCash, which the frozen payment event also names — payment-completed-v1). */
export const PAYMENT_INSTRUMENTS = [
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "gcash", label: "GCash" },
] as const;

export type PaymentInstrument = (typeof PAYMENT_INSTRUMENTS)[number]["value"];

export const INSTRUMENT_LABEL: Record<PaymentInstrument, string> = {
  cash: "Cash",
  check: "Check",
  bank_transfer: "Bank transfer",
  gcash: "GCash",
};

/**
 * Whether the slip's Reference no. blank is required. Cash arrives without one; the
 * other instruments print a check / transfer reference the family may need to trace.
 */
export function instrumentNeedsReference(instrument: PaymentInstrument): boolean {
  return instrument !== "cash";
}

/* ------------------------------------------------------------------ */
/* The draft the counter fills in                                      */
/* ------------------------------------------------------------------ */

export type PaymentCaptureDraft = {
  /** Pesos as typed ("12,500.00") — never a computed figure. */
  amount_text: string;
  instrument: PaymentInstrument | "";
  reference: string;
  /** yyyy-mm-dd, as the date input supplies it. */
  received_on: string;
  /** The case or invoice this payment is captured against, as written on the slip. */
  against: string;
  notes: string;
};

export function emptyPaymentCaptureDraft(): PaymentCaptureDraft {
  return {
    amount_text: "",
    instrument: "",
    reference: "",
    received_on: "",
    against: "",
    notes: "",
  };
}

export type PaymentCaptureField = keyof PaymentCaptureDraft;

export type PaymentCaptureErrors = Partial<Record<PaymentCaptureField, string>>;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/** The park's calendar/time zone — the day counters actually write on slips. */
export const BUSINESS_TIME_ZONE = "Asia/Manila";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in yyyy-mm-dd (rejects 2026-02-30 and loose text). */
export function isCalendarDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Today at the park, yyyy-mm-dd — compared in the business zone, not the browser's. */
export function businessToday(now: Date = new Date()): string {
  // en-CA formats as yyyy-mm-dd; the zone is fixed so SSR and the browser agree.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
  }).format(now);
}

/** The amount as typed → integer minor units; null when it is not pesos at all. */
export function paymentAmountCents(amount: string): number | null {
  try {
    return pesosInputToCents(amount);
  } catch {
    return null;
  }
}

/**
 * Field-level capture validation. It checks that the slip was filled in — a written
 * amount, an instrument, a date that exists, the record it pays against, and the
 * reference for instruments that carry one. It validates nothing about the money's
 * meaning: whether the amount is right, how it is allocated, and what it does to a
 * balance are finance's.
 */
export function validatePaymentCapture(
  draft: PaymentCaptureDraft,
  now: Date = new Date(),
): PaymentCaptureErrors {
  const errors: PaymentCaptureErrors = {};

  const cents = paymentAmountCents(draft.amount_text);
  if (cents === null) {
    errors.amount_text =
      draft.amount_text.trim() === ""
        ? "Enter the amount received."
        : "Enter pesos and centavos only, e.g. 12,500.00.";
  } else if (cents <= 0) {
    errors.amount_text = "The amount received must be more than zero.";
  }

  if (draft.instrument === "") {
    errors.instrument = "Choose how the payment arrived.";
  } else if (instrumentNeedsReference(draft.instrument) && draft.reference.trim() === "") {
    errors.reference = `A ${INSTRUMENT_LABEL[
      draft.instrument
    ].toLowerCase()} payment needs the reference printed on the slip.`;
  }

  const receivedOn = draft.received_on.trim();
  if (receivedOn === "") {
    errors.received_on = "Enter the date the payment was received.";
  } else if (!isCalendarDate(receivedOn)) {
    errors.received_on = "Enter a real date.";
  } else if (receivedOn > businessToday(now)) {
    errors.received_on = "The date received cannot be in the future.";
  }

  if (draft.against.trim() === "") {
    errors.against = "Name the case or invoice this payment is captured against.";
  }

  return errors;
}

/* ------------------------------------------------------------------ */
/* The record a capture produces                                       */
/* ------------------------------------------------------------------ */

/**
 * What was captured — the six fields plus the moment of capture. Deliberately nothing
 * else: no receipt number (finance numbers official receipts), no running balance, no
 * allocation. The receipt view and the printed slip render THIS record.
 */
export type PaymentCapture = {
  id: string;
  amount_cents: number;
  instrument: PaymentInstrument;
  reference: string;
  received_on: string;
  against: string;
  notes: string;
  /** ISO timestamp the counter recorded it — an app stamp, not a document number. */
  recorded_at: string;
};

/**
 * Draft → record. The screen validates first, so the throws here are the defensive
 * contract: a capture can never carry a blank instrument, a junk amount or a future
 * date past a bypassed form.
 */
export function paymentCaptureFromDraft(
  draft: PaymentCaptureDraft,
  id: string,
  recordedAt: string,
): PaymentCapture {
  const cents = paymentAmountCents(draft.amount_text);
  if (cents === null || cents <= 0) {
    throw new Error("payment amount is not a positive peso amount");
  }
  if (draft.instrument === "") {
    throw new Error("payment instrument is required");
  }
  if (instrumentNeedsReference(draft.instrument) && draft.reference.trim() === "") {
    throw new Error("a reference is required for this instrument");
  }
  if (draft.against.trim() === "") {
    throw new Error("a case or invoice reference is required");
  }
  const receivedOn = draft.received_on.trim();
  if (!isCalendarDate(receivedOn)) {
    throw new Error("date received is not a calendar date");
  }
  return {
    id,
    amount_cents: cents,
    instrument: draft.instrument,
    reference: draft.reference.trim(),
    received_on: receivedOn,
    against: draft.against.trim(),
    notes: draft.notes.trim(),
    recorded_at: recordedAt,
  };
}

/** The capture's app stamp, shown at the park's local time. */
export function formatRecordedAt(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(at);
}

/* ------------------------------------------------------------------ */
/* The honesty line                                                    */
/* ------------------------------------------------------------------ */

/**
 * The validity note every provisional receipt carries — the capture screen's warning,
 * the printed slip's footer, and the receipt view all print THIS constant, so the three
 * cannot drift. App-authored copy, not a legal clause: the official receipt, its number,
 * the allocation and the posting rules are finance-owned, and the slip says so plainly
 * rather than looking like an official receipt.
 */
export const PROVISIONAL_RECEIPT_NOTE =
  "This provisional receipt is valid only when confirmed by an official receipt. " +
  "It records what was received at the counter — it is not an official receipt, it " +
  "carries no official receipt number, and it posts nothing to the ledger.";

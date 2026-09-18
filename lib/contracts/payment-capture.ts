/**
 * The counter's slip vocabulary — what a payment IS, in the words the client's forms use.
 *
 * WHAT THIS MODULE IS NOW (and what it used to be)
 * It began as the whole of "gap 3" in `FORMS_PLAN.md`: a provisional-receipt capture that
 * lived in the browser tab because no payment endpoint existed. The frozen
 * `billing-list-api-v1` contract has since named that endpoint
 * (`POST /invoices/:number/payments`, scope `billing:write`), and the counter now records real
 * payments through `lib/billing-payments.ts` — which owns the draft, the rules and the record.
 *
 * What survives here is the vocabulary and the honest fallback, both still needed:
 *  - the instruments the slip offers and the one rule about them (a non-cash payment carries
 *    the reference printed on the slip);
 *  - the shared date/amount helpers the rules are built from (one parser, one calendar rule,
 *    one business time zone);
 *  - the provisional slip's record (`PaymentCapture`) and its validity note, used for the ONE
 *    case the rules still allow: a recorded payment for which finance issued no official
 *    receipt. It states on its face that it is not an official receipt and carries no receipt
 *    number — see `lib/contracts/provisional-receipt.ts`.
 *
 * An official receipt is numbered by finance, never here: nothing in this module mints a
 * receipt number, allocates a payment or posts anything.
 */
import { pesosInputToCents } from "@/lib/contracts/purchase-application";

/* ------------------------------------------------------------------ */
/* Instruments                                                         */
/* ------------------------------------------------------------------ */

/** The instruments the slip offers, in the client's own form order. (The blueprint also
 * names card and Maya; the counter slip does not, and adding one is a client-vocabulary
 * decision rather than an app invention — `lib/billing-payments.ts` flags the same point.) */
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
/* Dates and amounts — the helpers the money rules are built from      */
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
/* The provisional slip                                                */
/* ------------------------------------------------------------------ */

/**
 * What the counter wrote on the slip — the six fields of the client's form. This is the
 * FALLBACK record, printed only when a recorded payment has no official receipt: the money
 * was taken and must be accounted for, and the slip says plainly what it is not.
 */
export type PaymentCapture = {
  id: string;
  amount_cents: number;
  instrument: PaymentInstrument;
  reference: string;
  received_on: string;
  /** The invoice (or case) the payment was captured against. */
  against: string;
  notes: string;
  /** ISO timestamp the counter recorded it — an app stamp, not a document number. */
  recorded_at: string;
};

/**
 * The validity note every provisional slip carries — the screen's warning and the printed
 * slip's footer both print THIS constant, so the two cannot drift. App-authored copy, not a
 * legal clause: the official receipt, its number, the allocation and the posting rules are
 * finance-owned, and the slip says so plainly rather than looking like an official receipt.
 */
export const PROVISIONAL_RECEIPT_NOTE =
  "This provisional receipt is valid only when confirmed by an official receipt. " +
  "It records what was received at the counter — it is not an official receipt, it " +
  "carries no official receipt number, and it posts nothing to the ledger.";

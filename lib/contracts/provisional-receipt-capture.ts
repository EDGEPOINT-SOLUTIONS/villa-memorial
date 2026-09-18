/**
 * Provisional receipt capture — what the counter records when it hands a family a paper
 * before any official receipt exists.
 *
 * WHY THIS RECORD EXISTS
 * Villa's counter takes money long before finance issues an official receipt: the product
 * generates one only when a payment completes through the service (`payment.completed` →
 * documents ⓡ receipt), which is not the counter's day. So the office needs its own record
 * of the paper it handed over — payer, amount, instrument, the invoice/case it settles and
 * who received it — and a list where a clerk finds it again. That record is app-authored
 * (no frozen contract names a provisional-receipt shape), carries NO receipt number, and
 * posts nothing: `lib/api-client/provisional-receipts-store.ts` persists it in fixture mode
 * only, and live mode answers 503 with the reason.
 *
 * THE MONEY RULES ARE NOT RE-INVENTED HERE
 * Amount, instrument, reference and date run through the SAME rule set the merged billing
 * capture runs (`validatePaymentInput` in `lib/billing-payments.ts`): a positive whole
 * centavo amount the invoice can still absorb, an instrument from the counter slip, the
 * reference that instrument needs, a real past calendar day. The provisional receipt is a
 * second record of the same counter reality, so it may never be one the billing rules would
 * refuse. What this module adds is the payer name and the person who received it.
 *
 * THE SHAPE IS PROVISIONAL: header of `lib/contracts/provisional-receipt.ts` carries the
 * paper side and the official-receipt display match.
 */
import {
  paymentAmountCents,
  type PaymentInstrument,
} from "@/lib/contracts/payment-capture";
import {
  outstandingCents,
  validatePaymentInput,
  type InvoiceForPayment,
} from "@/lib/billing-payments";

/** How long a payer name may be; the paper table wraps at this length on a Letter sheet. */
export const PAYER_MAX_LENGTH = 120;
/** Notes are the counter's one-liner, not a case history. */
export const RECEIPT_NOTES_MAX_LENGTH = 200;

/* ------------------------------------------------------------------ */
/* The record                                                          */
/* ------------------------------------------------------------------ */

/**
 * The provisional receipt as the office holds it. `id` is an opaque app address for the
 * screen URL — never printed and never a receipt number (receipt numbering is finance's).
 * `case_number` is present only when the recorded data names one; the paper prints the
 * invoice and order otherwise, and never a guessed reference.
 */
export type ProvisionalReceiptRecord = {
  id: string;
  /** The invoice this receipt settles — read from the recorded billing data. */
  invoice_number: string;
  /** The order the invoice names, when it names one. */
  order_number: string | null;
  /** The funeral case/contract the payment is against, when the recorded data links one. */
  case_number: string | null;
  payer: string;
  amount_cents: number;
  instrument: PaymentInstrument;
  reference: string;
  /** yyyy-mm-dd the counter received it. */
  received_on: string;
  /** Who handed the paper over — the signed-in staff member, recorded from the session. */
  received_by: string;
  notes: string;
  /** ISO instant the app stamped the record. Not a document number. */
  issued_at: string;
};

/* ------------------------------------------------------------------ */
/* The capture                                                         */
/* ------------------------------------------------------------------ */

/** The form's draft: the amount is the text the counter typed, nothing parsed yet. */
export type ProvisionalReceiptDraft = {
  /** The chosen invoice, as its capability number (`INV-…`). */
  invoice_number: string;
  /** The case/contract the payment is against, resolved from recorded data; null when none. */
  case_number: string | null;
  payer: string;
  amount_text: string;
  instrument: PaymentInstrument | "";
  reference: string;
  /** yyyy-mm-dd, as the date input supplies it. */
  received_on: string;
  notes: string;
};

/** The wire body the form posts and the store re-validates under its lock. */
export type ProvisionalReceiptInput = {
  invoice_number: string;
  /** The case/contract the payment is against, resolved from recorded data; null when none. */
  case_number: string | null;
  payer: string;
  amount_cents: number;
  instrument: PaymentInstrument;
  reference: string;
  received_on: string;
  notes: string;
};

/** One message per control, keyed by the control it belongs to. */
export type ProvisionalReceiptErrors = Partial<
  Record<"invoice" | "payer" | "amount" | "method" | "reference" | "received_on" | "notes", string>
>;

export function emptyProvisionalReceiptDraft(args: {
  invoiceNumber?: string;
  caseNumber?: string | null;
  payer?: string;
  receivedOn: string;
}): ProvisionalReceiptDraft {
  return {
    invoice_number: args.invoiceNumber ?? "",
    case_number: args.caseNumber ?? null,
    payer: args.payer ?? "",
    amount_text: "",
    instrument: "",
    reference: "",
    received_on: args.receivedOn,
    notes: "",
  };
}

/**
 * The one rule set for a provisional receipt capture. `raw` is the wire body (or anything
 * shaped like it). The amount, instrument, reference and date are validated by the shared
 * billing rules against the invoice the receipt settles; the payer name is this record's
 * own requirement.
 */
export function validateProvisionalReceiptInput(
  raw: unknown,
  invoice: InvoiceForPayment | null,
  now: Date = new Date(),
): { ok: true; input: ProvisionalReceiptInput } | { ok: false; errors: ProvisionalReceiptErrors } {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const errors: ProvisionalReceiptErrors = {};

  const invoiceNumber = typeof r.invoice_number === "string" ? r.invoice_number.trim().toUpperCase() : "";
  if (invoiceNumber === "") {
    errors.invoice = "Choose the invoice this receipt settles.";
  } else if (!invoice) {
    errors.invoice = "That invoice is not in the recorded billing data — nothing to record against.";
  }

  const payer = typeof r.payer === "string" ? r.payer.trim() : "";
  if (payer === "") {
    errors.payer = "Name the person who handed the money over.";
  } else if (payer.length > PAYER_MAX_LENGTH) {
    errors.payer = `Keep the payer's name to ${PAYER_MAX_LENGTH} characters.`;
  }

  const notes = typeof r.notes === "string" ? r.notes.trim() : "";
  if (notes.length > RECEIPT_NOTES_MAX_LENGTH) {
    errors.notes = `Keep the note to ${RECEIPT_NOTES_MAX_LENGTH} characters.`;
  }

  // The case/contract reference is resolved from recorded data by the screen; it is carried
  // through untouched (normalised) and never invented here.
  const caseNumber =
    typeof r.case_number === "string" && r.case_number.trim() !== ""
      ? r.case_number.trim().toUpperCase()
      : null;

  if (invoice) {
    // The shared billing rules own amount/instrument/reference/date — never duplicated here.
    const checked = validatePaymentInput(
      {
        amount_cents: r.amount_cents,
        method: r.instrument,
        reference: r.reference,
        received_on: r.received_on,
        notes,
      },
      invoice,
      now,
    );
    if (!checked.ok) Object.assign(errors, checked.errors);
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const amountCents =
    typeof r.amount_cents === "number" && Number.isFinite(r.amount_cents)
      ? Math.trunc(r.amount_cents)
      : 0;
  const instrument = r.instrument as PaymentInstrument;
  return {
    ok: true,
    input: {
      invoice_number: invoiceNumber,
      case_number: caseNumber,
      payer,
      amount_cents: amountCents,
      instrument,
      reference: typeof r.reference === "string" ? r.reference.trim() : "",
      received_on: typeof r.received_on === "string" ? r.received_on.trim() : "",
      notes,
    },
  };
}

/**
 * The form adapter: parse the typed pesos first (so "12,50" is reported on the amount
 * control as text), then run the SAME rule set the server runs.
 */
export function validateProvisionalReceiptDraft(
  draft: ProvisionalReceiptDraft,
  invoice: InvoiceForPayment | null,
  now: Date = new Date(),
): { ok: true; input: ProvisionalReceiptInput } | { ok: false; errors: ProvisionalReceiptErrors } {
  const parsed = paymentAmountCents(draft.amount_text);
  if (parsed === null) {
    return {
      ok: false,
      errors: {
        amount:
          draft.amount_text.trim() === ""
            ? "Enter the amount received."
            : "Enter pesos and centavos only, e.g. 12,500.00.",
      },
    };
  }
  return validateProvisionalReceiptInput(
    {
      invoice_number: draft.invoice_number,
      case_number: draft.case_number,
      payer: draft.payer,
      amount_cents: parsed,
      instrument: draft.instrument,
      reference: draft.reference,
      received_on: draft.received_on,
      notes: draft.notes,
    },
    invoice,
    now,
  );
}

/** The first message, for the one-sentence banner above the field errors. */
export function firstProvisionalReceiptError(errors: ProvisionalReceiptErrors): string {
  for (const key of [
    "invoice",
    "payer",
    "amount",
    "method",
    "reference",
    "received_on",
    "notes",
  ] as const) {
    if (errors[key]) return errors[key] as string;
  }
  return "The provisional receipt could not be recorded.";
}

/* ------------------------------------------------------------------ */
/* Display helpers the screens share                                   */
/* ------------------------------------------------------------------ */

/** What the receipt settles, in the paper's own reading order: invoice · order · case. */
export function provisionalReceiptAgainst(record: Pick<
  ProvisionalReceiptRecord,
  "invoice_number" | "order_number" | "case_number"
>): string {
  return [record.invoice_number, record.order_number, record.case_number]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" · ");
}

/** Whether the chosen invoice can still absorb this record (the shared billing rule). */
export function canReceiveProvisionalPayment(
  invoice: Pick<InvoiceForPayment, "total_cents" | "paid_cents"> | null,
): boolean {
  return invoice !== null && outstandingCents(invoice) > 0;
}

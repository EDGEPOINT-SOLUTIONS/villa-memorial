/**
 * Durable fixture-mode store for provisional receipts — the counter's own slip journal.
 *
 * WHY A FILE STORE
 * The paper the counter hands over is a fact that must survive a restart: a clerk has to find
 * a slip they issued last week, and the official-receipt display state has to keep matching
 * it. So each issue appends ONE event to an append-only journal on disk, and every read folds
 * the journal (oldest first):
 *
 *   - The store is APP-AUTHORED. No frozen contract names a provisional-receipt shape, so
 *     there is no live service to write to — `lib/api-client/provisional-receipts.ts` refuses
 *     live mode with a named 503 and this store serves fixture mode only.
 *   - The whole journal is rewritten to a temp file, fsync'd, then `rename(2)`d over the store
 *     path — an atomic replace, so a crash or a concurrent reader never sees a half file.
 *   - Mutations run through ONE in-process promise chain, so two counters issuing at once
 *     cannot interleave a read-modify-write in the server process that owns the store.
 *   - Path: `PROVISIONAL_RECEIPTS_STORE_PATH` when set (tests), otherwise
 *     `.data/billing-provisional-receipts.json` under the app's cwd (gitignored).
 *
 * VALIDATION IS NOT DUPLICATED
 * `validateProvisionalReceiptInput` (the same function the form and the BFF route run) is
 * re-run here against the CURRENT invoice inside the lock — never against the copy the caller
 * held — and the amount/instrument/date rules it applies are the shared billing rules. A
 * store refusal therefore says exactly what the screen would have said.
 *
 * The id is an opaque address (`prov-<uuid>`), never a receipt number: numbering, allocation
 * and posting belong to finance, and this journal mints none of them.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-client/api-error";
import { listFixtureInvoices } from "@/lib/api-client/billing-store";
import {
  validateProvisionalReceiptInput,
  type ProvisionalReceiptRecord,
} from "@/lib/contracts/provisional-receipt-capture";
import type { Invoice } from "@/lib/api-client/finance";

type PersistedEvent = { kind: "provisional_receipt_issued"; at: string; receipt: ProvisionalReceiptRecord };

export function provisionalReceiptsStorePath(): string {
  return journalPath("PROVISIONAL_RECEIPTS_STORE_PATH", "billing-provisional-receipts.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed provisional-receipts fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string") malformed(what);
  return value;
}

function requiredInteger(value: unknown, what: string, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) malformed(what);
  return value;
}

/** Field-by-field reader for a persisted receipt; extras are ignored. */
function toProvisionalReceipt(raw: unknown): ProvisionalReceiptRecord {
  if (typeof raw !== "object" || raw === null) malformed("receipt row");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "receipt id"),
    invoice_number: requiredString(r.invoice_number, "receipt invoice"),
    order_number: typeof r.order_number === "string" ? r.order_number : null,
    case_number: typeof r.case_number === "string" ? r.case_number : null,
    payer: requiredString(r.payer, "receipt payer"),
    amount_cents: requiredInteger(r.amount_cents, "receipt amount", 1),
    instrument: requiredString(r.instrument, "receipt instrument") as ProvisionalReceiptRecord["instrument"],
    reference: typeof r.reference === "string" ? r.reference : "",
    received_on: requiredString(r.received_on, "receipt date received"),
    received_by: requiredString(r.received_by, "receipt received by"),
    notes: typeof r.notes === "string" ? r.notes : "",
    issued_at: requiredString(r.issued_at, "receipt issued_at"),
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "provisional_receipt_issued") {
    malformed(`store event kind ${String(r.kind)}`);
  }
  return {
    kind: "provisional_receipt_issued",
    at: requiredString(r.at, "event timestamp"),
    receipt: toProvisionalReceipt(r.receipt),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(provisionalReceiptsStorePath(), "provisional-receipts");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(provisionalReceiptsStorePath(), "provisional-receipts", events);
}

const withStoreLock = createJournalLock();

/* ------------------------------ store API ------------------------------- */

/** Every provisional receipt the counter has issued, oldest first. */
export async function listFixtureProvisionalReceipts(): Promise<ProvisionalReceiptRecord[]> {
  const events = await readPersistedEvents();
  return events.map((event) => structuredClone(event.receipt));
}

/** One provisional receipt by its opaque id, or null. */
export async function getFixtureProvisionalReceipt(
  id: string,
): Promise<ProvisionalReceiptRecord | null> {
  const wanted = id.trim();
  const events = await readPersistedEvents();
  const found = events.find((event) => event.receipt.id === wanted);
  return found ? structuredClone(found.receipt) : null;
}

/** Find the invoice the receipt settles, as the CURRENT billing fold reports it. */
async function currentInvoice(invoiceNumber: string, now: Date): Promise<Invoice> {
  const wanted = invoiceNumber.trim().toUpperCase();
  const invoices = await listFixtureInvoices(now);
  const invoice = invoices.find((i) => i.invoice_number.toUpperCase() === wanted);
  if (!invoice) throw new ApiError("not_found", 404);
  return invoice;
}

/**
 * Issues one provisional receipt under the store lock: re-reads the current invoice, re-runs
 * the shared rules against it, stamps the actor and appends one event.
 *
 * Throws `ApiError` with `fieldErrors` on a refusal (422), `not_found` for an unknown invoice
 * (404) and 500 for a store that cannot be read or written.
 */
export function issueFixtureProvisionalReceipt(args: {
  input: unknown;
  actor: string;
  now?: Date;
}): Promise<ProvisionalReceiptRecord> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    const rawInvoice =
      typeof args.input === "object" && args.input !== null
        ? (args.input as { invoice_number?: unknown }).invoice_number
        : undefined;
    const invoiceNumber = typeof rawInvoice === "string" ? rawInvoice : "";
    if (invoiceNumber.trim() === "") {
      throw new ApiError("Choose the invoice this receipt settles.", 422, {
        invoice: "Choose the invoice this receipt settles.",
      });
    }

    const invoice = await currentInvoice(invoiceNumber, now);
    const validated = validateProvisionalReceiptInput(args.input, invoice, now);
    if (!validated.ok) {
      const first = Object.values(validated.errors)[0] ?? "The provisional receipt could not be recorded.";
      throw new ApiError(first, 422, validated.errors);
    }

    const at = now.toISOString();
    const receipt: ProvisionalReceiptRecord = {
      id: `prov-${randomUUID()}`,
      invoice_number: invoice.invoice_number,
      order_number: invoice.order_number,
      case_number: validated.input.case_number,
      payer: validated.input.payer,
      amount_cents: validated.input.amount_cents,
      instrument: validated.input.instrument,
      reference: validated.input.reference,
      received_on: validated.input.received_on,
      received_by: args.actor,
      notes: validated.input.notes,
      issued_at: at,
    };

    await persistEvents([
      ...events,
      { kind: "provisional_receipt_issued", at, receipt },
    ]);

    return structuredClone(receipt);
  });
}

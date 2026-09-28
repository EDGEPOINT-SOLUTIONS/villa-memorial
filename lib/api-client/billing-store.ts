/**
 * Durable fixture-mode billing store — recorded payments AND the invoices they settle.
 *
 * WHY A FILE STORE (same reasoning as lib/api-client/order-store.ts)
 * A payment the counter took is a fact that must survive a restart: the invoice's balance
 * and status step down on the next read, and the official receipt stays printable. The store
 * is a small append-only event journal on disk:
 *
 *   - The recorded seed (`lib/fixtures/finance/invoices.json`) is read-only and folded with
 *     the journal on every read, so updating the seed never has to migrate old state.
 *   - Each mutation appends one `payment_recorded` event carrying the payment AND the
 *     official-receipt document row it issued. One event, one atomic write: a payment can
 *     never exist without the receipt the counter handed over, or the other way round.
 *   - The whole journal is rewritten to a temp file, fsync'd, then `rename(2)`d over the
 *     store path — an atomic replace, so a crash or a concurrent reader never observes a
 *     half-written file.
 *   - Mutations run through ONE in-process promise chain, so two counters recording at once
 *     cannot interleave a read-modify-write (no lost payment, no duplicate receipt number
 *     in the server process that owns the store). Last-writer-wins if two server processes
 *     share one path; the file itself is still never corrupt.
 *   - Path: `PAYMENTS_STORE_PATH` when set (tests), otherwise `.data/finance-payments.json`
 *     under the app's cwd (gitignored).
 *
 * WHAT IS REAL AND WHAT IS STAND-IN (web/AGENTS.md traps — read before editing)
 * - READ + THE PAYMENTS WRITE are a real BFF proxy in live mode: the frozen
 *   `billing-list-api-v1` contract names `POST /billing/api/v1/invoices/:number/payments`
 *   under `billing:write`, and `lib/api-client/finance.ts` calls it. THIS store is what
 *   serves fixture mode, exactly as `order-store.ts` stands in for commerce-ordering.
 * - THE OFFICIAL RECEIPT here is app-authored: in live mode the receipt is the documents
 *   service's own artifact, generated from the payment event, and the app only ever prints a
 *   receipt the service named. In fixture mode no service exists, so the store forges the
 *   documents-api-v1 row that the printed sheet and the repository both read — one row, one
 *   number, one receipt. Its `file_size_bytes` is 0 because fixture mode stores no rendered
 *   artifact, and a decorative byte count would be a lie (documents-api-v1: "a row with no
 *   artifact reports 0").
 * - NUMBERING: the receipt's number is the documents contract's own `DOC-YYYY-NNNNN`,
 *   continuing above the recorded seed's highest. The demo year is fixed so a clock rollover
 *   cannot split the sequence namespace (the same reasoning `order-store.ts` uses for
 *   `ORD-2026-…`). No `OR-` namespace is invented here.
 * - VALIDATION IS NOT DUPLICATED: a recorded payment runs the same
 *   `validatePaymentInput` the form and the BFF route run, re-read against the CURRENT
 *   invoice inside the lock (never against the copy the caller held).
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import invoicesFile from "@/lib/fixtures/finance/invoices.json";
import documentsFile from "@/lib/fixtures/documents/documents.json";
import {
  foldPaymentsIntoInvoice,
  validatePaymentInput,
  type RecordedPayment,
  type ReceiptDocumentRow,
} from "@/lib/billing-payments";
import { PAYMENT_INSTRUMENTS } from "@/lib/contracts/payment-capture";
import type { Invoice, InvoiceStatus, AgingBucket } from "@/lib/api-client/finance";

/** The demo year every app-authored number stays in (see the header). */
const FIXTURE_YEAR = "2026";

/**
 * The out-of-band id band app-authored document rows use. The recorded seed's deterministic
 * uuids end in `…0000000F0n`, so a `9…` band can never collide with one, and the documents
 * contract's own note expects demo rows to sit outside what number generation would issue.
 */
const APP_DOCUMENT_ID_BAND = 900_000_000_000;

type PersistedEvent = { kind: "payment_recorded"; at: string; payment: RecordedPayment };

export function billingStorePath(): string {
  return journalPath("PAYMENTS_STORE_PATH", "finance-payments.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed billing fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string") malformed(what);
  return value;
}

function requiredInteger(value: unknown, what: string, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) malformed(what);
  return value;
}

const INVOICE_STATUSES: InvoiceStatus[] = ["pending", "paid", "overdue", "partial"];
const AGING_BUCKETS: AgingBucket[] = ["current", "1-30", "31-60", "61-90", "91-120", "120+"];

/** Field-by-field reader for the recorded invoice seed; extras are ignored. */
function toSeedInvoice(raw: unknown): Invoice {
  if (typeof raw !== "object" || raw === null) malformed("invoice row");
  const r = raw as Record<string, unknown>;
  const status = requiredString(r.status, "invoice status") as InvoiceStatus;
  if (!INVOICE_STATUSES.includes(status)) malformed(`invoice status ${status}`);
  const bucket = requiredString(r.aging_bucket, "invoice aging bucket") as AgingBucket;
  if (!AGING_BUCKETS.includes(bucket)) malformed(`invoice aging bucket ${bucket}`);
  return {
    id: requiredString(r.id, "invoice id"),
    invoice_number: requiredString(r.invoice_number, "invoice number"),
    customer_name: requiredString(r.customer_name, "invoice customer"),
    order_number: typeof r.order_number === "string" ? r.order_number : null,
    total_cents: requiredInteger(r.total_cents, "invoice total"),
    paid_cents: requiredInteger(r.paid_cents, "invoice paid"),
    currency: requiredString(r.currency, "invoice currency"),
    status,
    issued_at: requiredString(r.issued_at, "invoice issued_at"),
    due_at: requiredString(r.due_at, "invoice due_at"),
    aging_bucket: bucket,
  };
}

/** The frozen documents-api-v1 row shape a payment's official receipt is. */
function toReceiptDocumentRow(raw: unknown): ReceiptDocumentRow {
  if (typeof raw !== "object" || raw === null) malformed("receipt document");
  const r = raw as Record<string, unknown>;
  if (r.document_type !== "receipt") malformed("receipt document type");
  if (r.status !== "approved") malformed("receipt document status");
  return {
    id: requiredString(r.id, "receipt document id"),
    document_number: requiredString(r.document_number, "receipt document number"),
    title: requiredString(r.title, "receipt document title"),
    document_type: "receipt",
    related_case_number: typeof r.related_case_number === "string" ? r.related_case_number : null,
    related_order_number: typeof r.related_order_number === "string" ? r.related_order_number : null,
    status: "approved",
    uploaded_by: requiredString(r.uploaded_by, "receipt document uploader"),
    uploaded_at: requiredString(r.uploaded_at, "receipt document timestamp"),
    file_size_bytes: requiredInteger(r.file_size_bytes, "receipt document size"),
  };
}

/** Field-by-field reader for a recorded payment; extras are ignored. */
export function toRecordedPayment(raw: unknown): RecordedPayment {
  if (typeof raw !== "object" || raw === null) malformed("payment record");
  const r = raw as Record<string, unknown>;
  const method = requiredString(r.method, "payment method");
  if (!PAYMENT_INSTRUMENTS.some((option) => option.value === method)) {
    malformed(`payment method ${method}`);
  }
  return {
    id: requiredString(r.id, "payment id"),
    invoice_number: requiredString(r.invoice_number, "payment invoice number"),
    amount_cents: requiredInteger(r.amount_cents, "payment amount", 1),
    method: method as RecordedPayment["method"],
    reference: typeof r.reference === "string" ? r.reference : "",
    received_on: requiredString(r.received_on, "payment date received"),
    notes: typeof r.notes === "string" ? r.notes : "",
    recorded_at: requiredString(r.recorded_at, "payment recorded_at"),
    recorded_by: requiredString(r.recorded_by, "payment recorded_by"),
    receipt_document: r.receipt_document == null ? null : toReceiptDocumentRow(r.receipt_document),
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "payment_recorded") malformed(`store event kind ${String(r.kind)}`);
  return {
    kind: "payment_recorded",
    at: requiredString(r.at, "event timestamp"),
    payment: toRecordedPayment(r.payment),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(billingStorePath(), "payment");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(billingStorePath(), "payment", events);
}

const withStoreLock = createJournalLock();

/* ------------------------------ store API ------------------------------- */

type StoreState = { events: PersistedEvent[]; payments: RecordedPayment[] };

async function loadPayments(): Promise<StoreState> {
  const events = await readPersistedEvents();
  return { events, payments: events.map((event) => event.payment) };
}

/** Every payment recorded at the counter, oldest first. */
export async function listFixturePayments(): Promise<RecordedPayment[]> {
  return (await loadPayments()).payments.map((p) => structuredClone(p));
}

/**
 * The invoices as the counter sees them: the recorded seed with every payment folded in.
 * An invoice no payment touches is returned exactly as recorded (see
 * `foldPaymentsIntoInvoice`), so the demo set does not shift under a derivation its rows
 * were never authored for.
 */
export async function listFixtureInvoices(now: Date = new Date()): Promise<Invoice[]> {
  const { payments } = await loadPayments();
  const seed = (invoicesFile as unknown as { invoices: unknown[] }).invoices.map(toSeedInvoice);
  return seed.map((invoice) =>
    foldPaymentsIntoInvoice(
      invoice,
      payments.filter((p) => p.invoice_number === invoice.invoice_number),
      now,
    ),
  );
}

/** One invoice by its capability number (`INV-…`), or null. */
export async function getFixtureInvoiceByNumber(
  number: string,
  now: Date = new Date(),
): Promise<Invoice | null> {
  const wanted = number.trim().toUpperCase();
  const invoices = await listFixtureInvoices(now);
  return invoices.find((i) => i.invoice_number.toUpperCase() === wanted) ?? null;
}

/** One invoice by its recorded id (the fixture seed's uuid), or null. */
export async function getFixtureInvoiceById(
  id: string,
  now: Date = new Date(),
): Promise<Invoice | null> {
  const invoices = await listFixtureInvoices(now);
  return invoices.find((i) => i.id === id) ?? null;
}

/**
 * The official-receipt rows every recorded payment issued — the documents repository reads
 * these beside its recorded seed, so a receipt printed at the counter is the same row the
 * repository lists.
 */
export async function listIssuedReceiptDocuments(): Promise<ReceiptDocumentRow[]> {
  const { payments } = await loadPayments();
  return payments
    .map((payment) => payment.receipt_document)
    .filter((row): row is ReceiptDocumentRow => row !== null)
    .map((row) => structuredClone(row));
}

/* --------------------------- numbering ---------------------------------- */

function sequenceOf(value: string, pattern: RegExp): number {
  const match = pattern.exec(value);
  return match ? Number(match[1]) : 0;
}

/** Continue the documents contract's `DOC-YYYY-NNNNN` sequence above every known row. */
function nextDocumentNumber(issued: readonly ReceiptDocumentRow[]): string {
  const seedNumbers = (documentsFile as unknown as { documents: unknown[] }).documents.map((doc) =>
    typeof (doc as { document_number?: unknown }).document_number === "string"
      ? (doc as { document_number: string }).document_number
      : "",
  );
  const highest = [...seedNumbers, ...issued.map((row) => row.document_number)].reduce(
    (max, number) => Math.max(max, sequenceOf(number, /^DOC-\d{4}-(\d+)$/)),
    0,
  );
  return `DOC-${FIXTURE_YEAR}-${String(highest + 1).padStart(5, "0")}`;
}

/** Continue the app-authored `PAY-YYYY-NNNNN` sequence above every recorded payment. */
function nextPaymentId(payments: readonly RecordedPayment[]): string {
  const highest = payments.reduce(
    (max, payment) => Math.max(max, sequenceOf(payment.id, /^PAY-\d{4}-(\d+)$/)),
    0,
  );
  return `PAY-${FIXTURE_YEAR}-${String(highest + 1).padStart(5, "0")}`;
}

/** An out-of-band id for an app-authored document row (never a seed uuid). */
function nextDocumentId(issued: readonly ReceiptDocumentRow[]): string {
  const highest = issued.reduce(
    (max, row) => Math.max(max, sequenceOf(row.id, /-(\d+)$/)),
    APP_DOCUMENT_ID_BAND - 1,
  );
  return `00000000-0000-4000-8000-${String(highest + 1).padStart(12, "0")}`;
}

/* ------------------------------ the write ------------------------------- */

/**
 * Records a payment against one invoice, under the store lock:
 * re-reads the current state, re-runs the shared rules against the invoice as it stands
 * NOW, allocates the receipt that goes with the payment, and persists both in one event.
 *
 * Throws `ApiError` with `fieldErrors` on a refusal (422), `not_found` for an unknown
 * invoice (404) and 500 for a store that cannot be read or written.
 */
export function recordFixturePayment(args: {
  invoiceNumber: string;
  input: unknown;
  actor: string;
  now?: Date;
}): Promise<{ invoice: Invoice; payment: RecordedPayment }> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const { events, payments } = await loadPayments();
    const wanted = args.invoiceNumber.trim().toUpperCase();
    const seed = (invoicesFile as unknown as { invoices: unknown[] }).invoices.map(toSeedInvoice);
    const seedInvoice = seed.find((i) => i.invoice_number.toUpperCase() === wanted);
    if (!seedInvoice) {
      throw new ApiError("not_found", 404);
    }

    const stored = payments.filter((p) => p.invoice_number === seedInvoice.invoice_number);
    const current = foldPaymentsIntoInvoice(seedInvoice, stored, now);

    const validated = validatePaymentInput(args.input, current, now);
    if (!validated.ok) {
      const first = Object.values(validated.errors)[0] ?? "The payment could not be recorded.";
      throw new ApiError(first, 422, validated.errors);
    }

    const issued = payments
      .map((payment) => payment.receipt_document)
      .filter((row): row is ReceiptDocumentRow => row !== null);
    const at = now.toISOString();
    const receipt: ReceiptDocumentRow = {
      id: nextDocumentId(issued),
      document_number: nextDocumentNumber(issued),
      title: `Official Receipt — ${current.invoice_number}`,
      document_type: "receipt",
      related_case_number: null,
      related_order_number: current.order_number,
      status: "approved",
      uploaded_by: `Admin portal (${args.actor})`,
      uploaded_at: at,
      file_size_bytes: 0,
    };

    const payment: RecordedPayment = {
      id: nextPaymentId(payments),
      invoice_number: current.invoice_number,
      amount_cents: validated.input.amount_cents,
      method: validated.input.method,
      reference: validated.input.reference,
      received_on: validated.input.received_on,
      notes: validated.input.notes,
      recorded_at: at,
      recorded_by: args.actor,
      receipt_document: receipt,
    };

    await persistEvents([...events, { kind: "payment_recorded", at, payment }]);

    return {
      invoice: foldPaymentsIntoInvoice(current, [payment], now),
      payment: structuredClone(payment),
    };
  });
}

/**
 * Durable fixture-mode store for enquiries — the office's inbox journal.
 *
 * WHY A FILE STORE, AND WHY NOW
 * An enquiry is the one thing on this site that cannot be reconstructed: a family asked
 * for a quotation and the office either has it or has lost a customer. Until
 * 2026-09-27 both public forms (`/quote`, `/contact`) wrote their submission to the
 * VISITOR'S OWN BROWSER (`lib/demo-inquiry-captures.ts`, localStorage), and the staff
 * board — which reads on the server — could only ever see rows from the browser that
 * typed them. The measured consequence: a submitted Request-for-Quote never reached the
 * office at all, and the two facts the client's minutes single out (the preferred date
 * and the additional requirements) were captured and then rendered on no staff screen.
 *
 * THE PATTERN IS THE REPO'S, NOT A NEW ONE
 * Identical in shape to `provisional-receipts-store.ts` and `catalog-store.ts`:
 *   - append-only journal on disk; every read folds it, oldest first;
 *   - the whole journal is rewritten to a temp file, fsync'd, then `rename(2)`d over the
 *     store path, so a crash or a concurrent reader never sees a half file;
 *   - mutations run through ONE in-process promise chain, so two submissions at once
 *     cannot interleave a read-modify-write in the process that owns the store;
 *   - path: `INQUIRIES_STORE_PATH` when set (tests), else `.data/crm-inquiries.json`
 *     under the app's cwd (gitignored).
 *
 * THE RECORD SHAPE IS NOT INVENTED
 * Rows are the existing `Inquiry` type from `lib/api-client/crm.ts` — the shape the staff
 * board and its fixture already use. The seed is the recorded
 * `lib/fixtures/crm/inquiries.json`. This store adds NO contract field: the preferred
 * date and the requirements travel inside the row's own `message`, which the board now
 * renders. Making them structured columns is a contract question for the crm-families
 * service, and it is recorded as an open item rather than assumed here.
 *
 * LIVE MODE. No frozen contract names an inquiry-write endpoint (crm-families is
 * unbuilt), so `lib/api-client/crm.ts` refuses live mode with a named 503 and this store
 * serves fixture mode only. Setting `CRM_BASE_URL` cannot silently route an enquiry into
 * a local file.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-client/api-error";
import type { Inquiry } from "@/lib/api-client/crm";
import type { InquiryIntake } from "@/lib/inquiry-intake";
import seedFile from "@/lib/fixtures/crm/inquiries.json";

type PersistedEvent = { kind: "inquiry_received"; at: string; inquiry: Inquiry };

export function inquiriesStorePath(): string {
  return journalPath("INQUIRIES_STORE_PATH", "crm-inquiries.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed inquiries fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string") malformed(what);
  return value;
}

/** Field-by-field reader for one persisted row; extra keys are ignored. */
function toInquiry(raw: unknown): Inquiry {
  if (typeof raw !== "object" || raw === null) malformed("inquiry row");
  const r = raw as Record<string, unknown>;
  if (typeof r.person !== "object" || r.person === null) malformed("inquiry person");
  const p = r.person as Record<string, unknown>;
  return {
    id: requiredString(r.id, "inquiry id"),
    reference: requiredString(r.reference, "inquiry reference"),
    person: {
      full_name: requiredString(p.full_name, "inquiry person name"),
      email: typeof p.email === "string" ? p.email : "",
      phone: typeof p.phone === "string" ? p.phone : "",
    },
    source: requiredString(r.source, "inquiry source") as Inquiry["source"],
    topic: requiredString(r.topic, "inquiry topic"),
    message: typeof r.message === "string" ? r.message : "",
    assigned_to: typeof r.assigned_to === "string" ? r.assigned_to : "Unassigned",
    status: requiredString(r.status, "inquiry status") as Inquiry["status"],
    received_at: requiredString(r.received_at, "inquiry received_at"),
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "inquiry_received") malformed(`store event kind ${String(r.kind)}`);
  return {
    kind: "inquiry_received",
    at: requiredString(r.at, "event timestamp"),
    inquiry: toInquiry(r.inquiry),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(inquiriesStorePath(), "enquiries");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(inquiriesStorePath(), "enquiries", events);
}

const withStoreLock = createJournalLock();

/* ------------------------------ the seed -------------------------------- */

const SEED: Inquiry[] = ((seedFile as { inquiries?: unknown[] }).inquiries ?? []).map((row) =>
  toInquiry(row),
);

export function seedInquiries(): Inquiry[] {
  return SEED.map((row) => structuredClone(row));
}

/* ------------------------------ store API ------------------------------- */

/**
 * Every enquiry the office has: what the office logged and what the website sent,
 * newest first.
 *
 * The recorded seed is the office's own past front-desk entries; the journal holds what
 * has arrived since. Sorting is by `received_at` descending so a new submission appears
 * at the top of the board where a coordinator will look for it — the same order the
 * board's own prepend produced before, but now from the server rather than a browser.
 */
export async function listFixtureInquiries(): Promise<Inquiry[]> {
  const events = await readPersistedEvents();
  const rows = [...events.map((event) => structuredClone(event.inquiry)), ...seedInquiries()];
  return rows.sort((a, b) => b.received_at.localeCompare(a.received_at));
}

/** Allocate the next reference above both the seed and the journal. */
function nextReference(existing: ReadonlyArray<Inquiry>, year: number): string {
  const prefix = `INQ-${year}-`;
  let highest = 0;
  for (const row of existing) {
    if (!row.reference.startsWith(prefix)) continue;
    const n = Number.parseInt(row.reference.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return `${prefix}${String(highest + 1).padStart(5, "0")}`;
}

/**
 * Records one enquiry under the store lock.
 *
 * The caller has already validated the submission (`readInquirySubmission` in
 * `lib/inquiry-intake.ts`), which is the SAME reading the browser ran — so a store
 * refusal and a field-level refusal say the same thing. This function owns only what the
 * store owns: the id, the reference and the timestamp.
 */
export function receiveInquiry(args: {
  intake: InquiryIntake;
  now?: Date;
}): Promise<Inquiry> {
  const now = args.now ?? new Date();
  return withStoreLock(async () => {
    const events = await readPersistedEvents();
    const known: Inquiry[] = [...events.map((e) => e.inquiry), ...seedInquiries()];
    const at = now.toISOString();
    const inquiry: Inquiry = {
      id: `inq-${randomUUID()}`,
      reference: nextReference(known, now.getUTCFullYear()),
      person: {
        full_name: args.intake.full_name,
        email: args.intake.email,
        phone: args.intake.phone,
      },
      source: args.intake.source,
      topic: args.intake.topic,
      // Clamped so one pasted essay cannot make the board unusable; the full text is the
      // office's to keep, and 4000 characters is far beyond anything a form sends.
      message: args.intake.message.slice(0, 4000),
      assigned_to: args.intake.assigned_to,
      status: "new",
      received_at: at,
    };
    await persistEvents([...events, { kind: "inquiry_received", at, inquiry }]);
    return structuredClone(inquiry);
  });
}

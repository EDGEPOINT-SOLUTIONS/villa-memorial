/**
 * Durable fixture-mode document store — the seam behind the Documents repository
 * (`lib/api-client/documents.ts`) when `DOCUMENTS_BASE_URL` is unset.
 *
 * WHY A FILE STORE. The office files papers against a case or an order, and staff
 * expect a filed row to survive a restart while the demo runs without the platform.
 * The same append-only journal mechanics as every other fixture store
 * (`lib/api-client/journal.ts`): the recorded seed is read-only and folded with the
 * journal on every read; each upload appends one event; mutations run through one
 * in-process promise chain.
 *
 * WHAT IS *NOT* HERE — and the screen says so. `documents-api-v1` has no object
 * store: it can list a row and render a GENERATED document, but it cannot keep an
 * uploaded binary. So an upload here records the document's METADATA (what it is,
 * which case or order it belongs to, who filed it) and sets `file_size_bytes` to 0,
 * which the screen already renders as "not stored". No byte of a file is invented or
 * kept; the object store is a dev-authored item named on the page.
 */
import { randomUUID } from "node:crypto";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import type { Document, DocumentStatus, DocumentType } from "@/lib/api-client/documents";

const DOCUMENT_TYPES: ReadonlyArray<DocumentType> = [
  "receipt",
  "contract",
  "certificate",
  "permit",
  "authorization",
  "other",
];

const DOCUMENT_STATUSES: ReadonlyArray<DocumentStatus> = [
  "uploaded",
  "pending_review",
  "verified",
  "approved",
  "rejected",
];

type PersistedUpload = { kind: "document_uploaded"; at: string; document: Document };

export function documentsStorePath(): string {
  return journalPath("DOCUMENTS_STORE_PATH", "documents.json");
}

function malformed(what: string): never {
  throw new ApiError(`malformed document store: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(what);
  return value;
}

/** Field-by-field reader for one filed row; extra keys are ignored. */
function toDocument(raw: unknown): Document {
  if (typeof raw !== "object" || raw === null) malformed("document row");
  const r = raw as Record<string, unknown>;
  const type = r.document_type;
  const status = r.status;
  if (!DOCUMENT_TYPES.includes(type as DocumentType)) malformed("document_type");
  if (!DOCUMENT_STATUSES.includes(status as DocumentStatus)) malformed("status");
  return {
    id: requiredString(r.id, "document id"),
    document_number: requiredString(r.document_number, "document number"),
    title: requiredString(r.title, "document title"),
    document_type: type as DocumentType,
    related_case_number:
      typeof r.related_case_number === "string" ? r.related_case_number : null,
    related_order_number:
      typeof r.related_order_number === "string" ? r.related_order_number : null,
    status: status as DocumentStatus,
    uploaded_by: typeof r.uploaded_by === "string" ? r.uploaded_by : "",
    uploaded_at: requiredString(r.uploaded_at, "document uploaded_at"),
    file_size_bytes: Number(r.file_size_bytes ?? 0),
    ...(typeof r.invoice_number === "string" && r.invoice_number.trim() !== ""
      ? { invoice_number: r.invoice_number }
      : {}),
  };
}

function toPersistedUpload(raw: unknown): PersistedUpload {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "document_uploaded") malformed(`store event kind ${String(r.kind)}`);
  return {
    kind: "document_uploaded",
    at: requiredString(r.at, "event timestamp"),
    document: toDocument(r.document),
  };
}

async function readUploads(): Promise<PersistedUpload[]> {
  const events = await readJournalEvents(documentsStorePath(), "document");
  return events.map(toPersistedUpload);
}

const withStoreLock = createJournalLock();

/** The filed documents, newest first. */
export async function listUploadedDocuments(): Promise<Document[]> {
  const events = await readUploads();
  return events
    .map((event) => structuredClone(event.document))
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

/** One filed document by id, or null. */
export async function findUploadedDocument(id: string): Promise<Document | null> {
  const found = (await readUploads()).find((event) => event.document.id === id);
  return found ? structuredClone(found.document) : null;
}

export type NewDocumentInput = {
  title: string;
  document_type: DocumentType;
  related_case_number?: string | null;
  related_order_number?: string | null;
  uploaded_by: string;
  /**
   * The number the office filed under. `null` asks the store to allocate the next
   * one, which is what a real upload does.
   */
  document_number?: string | null;
};

/** Next free `DOC-<year>-<nnnnn>` above the seed and the journal. */
function nextDocumentNumber(existing: ReadonlyArray<{ document_number: string }>): string {
  const year = new Date().getUTCFullYear();
  const prefix = `DOC-${year}-`;
  let highest = 0;
  for (const row of existing) {
    if (!row.document_number.startsWith(prefix)) continue;
    const n = Number.parseInt(row.document_number.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return `${prefix}${String(highest + 1).padStart(5, "0")}`;
}

/**
 * Files one document under the store lock. `seedNumbers` are the recorded rows'
 * numbers so the allocation does not collide with the seed.
 */
export function fileDocumentRecord(
  input: NewDocumentInput,
  seedNumbers: ReadonlyArray<{ document_number: string }>,
  at = new Date().toISOString(),
): Promise<Document> {
  return withStoreLock(async () => {
    const uploads = await readUploads();
    const known = [...seedNumbers, ...uploads.map((event) => event.document)];
    const document: Document = {
      id: `doc-${randomUUID()}`,
      document_number: input.document_number?.trim() || nextDocumentNumber(known),
      title: input.title.trim(),
      document_type: input.document_type,
      related_case_number: input.related_case_number?.trim() || null,
      related_order_number: input.related_order_number?.trim() || null,
      status: "uploaded",
      uploaded_by: input.uploaded_by,
      uploaded_at: at,
      // No object store: the row is filed, the binary is not kept. The screen says so.
      file_size_bytes: 0,
    };
    await writeJournalEvents(documentsStorePath(), "document", [
      ...uploads,
      { kind: "document_uploaded", at, document },
    ]);
    return structuredClone(document);
  });
}

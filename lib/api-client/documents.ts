/**
 * Typed data access for Module J document repository screens.
 *
 * Contract: docs/08-delivery/contracts/documents-api-v1.md (KEB-D4-02). The `Document`
 * type below IS the response shape — the documents service ratified what was already
 * shipped here rather than forcing a rewrite. Keep them byte-identical.
 *
 * Live mode: DOCUMENTS_BASE_URL set → requests hit `${DOCUMENTS_BASE_URL}/documents/api/v1/...`
 * through the edge gateway. Unset → recorded fixtures, so the app still demos standalone.
 *
 * Known difference between the two modes, deliberately not hidden: fixtures show a
 * repository of UPLOADED documents (permits, certificates), which v1 of the service cannot
 * store — it has no object store. Live mode shows what the service can genuinely produce:
 * its seeded rows plus every receipt generated from a real payment.
 *
 * THE RECEIPTS RECORDED AT THE COUNTER
 * A payment recorded on the billing screen issues an official receipt
 * (`lib/api-client/billing-store.ts`), and that row is listed here beside the recorded seed —
 * the repository, the printed sheet and the family's copy all name the SAME `document_number`,
 * which is what keeps them from drifting. Fixture mode is the only mode that forges the row:
 * live receipts are the documents service's own, and both modes read them the same way.
 */
import documentsFile from "@/lib/fixtures/documents/documents.json";
import { ApiError } from "@/lib/api-client/api-error";
import { listIssuedReceiptDocuments } from "@/lib/api-client/billing-store";
import {
  getAuthedJson,
  getAuthedText,
  itemsOf,
  postAuthedJson,
} from "@/lib/api-client/staff-fetch";

const BASE_URL = process.env.DOCUMENTS_BASE_URL ?? "";

export function documentsLiveModeEnabled(): boolean {
  return BASE_URL.length > 0;
}

export type DocumentType =
  | "receipt"
  | "contract"
  | "certificate"
  | "permit"
  | "authorization"
  | "other";

export type DocumentStatus =
  | "uploaded"
  | "pending_review"
  | "verified"
  | "approved"
  | "rejected";

export type Document = {
  id: string;
  document_number: string;
  title: string;
  document_type: DocumentType;
  related_case_number: string | null;
  related_order_number: string | null;
  status: DocumentStatus;
  uploaded_by: string;
  uploaded_at: string;
  file_size_bytes: number;
  /**
   * The invoice a generated receipt settles. PROPOSED additive field (platform-
   * contracts plan C0c): documents-api-v1 has no invoice field, so a live row that
   * names one is read here and an absent one is omitted — never defaulted.
   */
  invoice_number?: string | null;
};

type DocumentStore = {
  tenant_id: string;
  documents: Document[];
};

/** Tolerant reader: extra upstream fields are ignored, missing ones surface as a 502. */
function toDocument(raw: unknown): Document {
  if (typeof raw !== "object" || raw === null) {
    throw new ApiError("malformed document", 502);
  }
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.document_number !== "string") {
    throw new ApiError("malformed document", 502);
  }
  return {
    id: r.id,
    document_number: r.document_number,
    title: String(r.title ?? ""),
    document_type: r.document_type as DocumentType,
    related_case_number:
      typeof r.related_case_number === "string" ? r.related_case_number : null,
    related_order_number:
      typeof r.related_order_number === "string" ? r.related_order_number : null,
    status: r.status as DocumentStatus,
    uploaded_by: String(r.uploaded_by ?? ""),
    uploaded_at: String(r.uploaded_at ?? ""),
    file_size_bytes: Number(r.file_size_bytes ?? 0),
    // Optional additive field: present only when the service named one.
    ...(typeof r.invoice_number === "string" && r.invoice_number.trim() !== ""
      ? { invoice_number: r.invoice_number }
      : {}),
  };
}

/**
 * The repository listing, optionally narrowed to one record's documents.
 *
 * The service supports the same filters (contract KEB-D4-02); fixture mode applies them
 * locally so a screen behaves identically in both modes rather than silently showing
 * every document when the service is unset.
 */
export async function listDocuments(filter?: {
  case_number?: string;
  order_number?: string;
  document_type?: DocumentType;
}): Promise<Document[]> {
  if (documentsLiveModeEnabled()) {
    const query = new URLSearchParams();
    if (filter?.case_number) query.set("case_number", filter.case_number);
    if (filter?.order_number) query.set("order_number", filter.order_number);
    if (filter?.document_type) query.set("document_type", filter.document_type);
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    const payload = await getAuthedJson(BASE_URL, `/documents/api/v1/documents${suffix}`);
    return itemsOf(payload).map(toDocument);
  }
  // Receipts the counter issued are newest, so they lead the repository listing.
  const rows: Document[] = [
    ...(await listIssuedReceiptDocuments()),
    ...(documentsFile as unknown as DocumentStore).documents,
  ];
  return rows
    .filter(
      (d) =>
        (!filter?.case_number || d.related_case_number === filter.case_number) &&
        (!filter?.order_number || d.related_order_number === filter.order_number) &&
        (!filter?.document_type || d.document_type === filter.document_type),
    )
    .map((d) => ({ ...d }));
}

export async function getDocument(id: string): Promise<Document> {
  if (documentsLiveModeEnabled()) {
    return toDocument(
      await getAuthedJson(BASE_URL, `/documents/api/v1/documents/${encodeURIComponent(id)}`),
    );
  }
  const issued = (await listIssuedReceiptDocuments()).find((d) => d.id === id);
  if (issued) return { ...issued };
  const store = documentsFile as unknown as DocumentStore;
  const doc = store.documents.find((d) => d.id === id);
  if (!doc) {
    throw new ApiError("not_found", 404);
  }
  return { ...doc };
}

/**
 * The rendered artifact for a generated document (HTML in v1 — there is no PDF pipeline).
 * Fixture mode has no artifacts to render: the fixture repository stands in for uploaded
 * files, which this service cannot store, so it answers 404 rather than inventing a page.
 */
export async function renderDocument(id: string): Promise<string> {
  if (!documentsLiveModeEnabled()) {
    throw new ApiError("not_found", 404);
  }
  const { body } = await getAuthedText(
    BASE_URL,
    `/documents/api/v1/documents/${encodeURIComponent(id)}/render`,
  );
  return body;
}

/**
 * Generate a document from a template (contract KEB-D4-02, scope `documents:write`).
 *
 * Fixture mode cannot generate: generation is the service's own composition step, and a
 * fabricated row in the fixture store would claim an artifact that does not exist. The
 * screens surface the 503 as "connect the documents service", which is the truth.
 */
export async function generateDocument(input: {
  template: string;
  variables: Record<string, unknown>;
  related_case_number?: string;
  related_order_number?: string;
}): Promise<Document> {
  if (!documentsLiveModeEnabled()) {
    throw new ApiError("documents service not configured", 503);
  }
  return toDocument(
    await postAuthedJson(BASE_URL, "/documents/api/v1/documents/generate", input),
  );
}

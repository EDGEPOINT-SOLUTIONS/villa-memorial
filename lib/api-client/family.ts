/**
 * Typed data access for the FAMILY portal (customer/family surfaces).
 *
 * ⚠ PROVISIONAL SHAPE — flagged loudly per web/AGENTS.md: there is NO frozen family/
 * customer API contract yet (the family-facing endpoints are dev-authored). This client
 * therefore reads a recorded FAMILY SNAPSHOT fixture only, and NEVER claims a live mode.
 * The snapshot mirrors what the customer persona could legitimately see once the family
 * API lands (their plan, balance, their documents). Nothing here is wired to a live URL
 * and no cross-service shape is invented beyond display-level strings.
 *
 * THE FAMILY DOCUMENT PROJECTION (what a family record may carry, and nothing else):
 * `toFamilyDocument` reads ONLY a paper's title, status, kind, its own number, the date
 * on the paper, the amount as recorded and what it covers. Everything else a document
 * record may hold — uploader, file size, storage ids, review notes, internal state
 * codes, links to records that are not the family's own — is dropped at this seam and
 * can therefore never reach a family screen (tests pin the exclusion). An unknown kind
 * stays `other`, which is the REQUESTABLE bucket: a paper the app cannot classify never
 * silently gains the ownership wording the family's own contract and receipts carry.
 *
 * When the family contract freezes, this file gains a live branch behind a FAMILY_BASE_URL
 * env var and the snapshot's provenance comment is replaced by the contract reference.
 */
import snapshotFile from "@/lib/fixtures/family/snapshot.json";

/**
 * Which paper a document is, as the family sees it.
 *   service_contract · official_receipt — the family OWNS these: the portal always shows
 *   them and never asks the family to request a copy.
 *   other — certificates, permits, applications: these keep the request path.
 */
export type FamilyDocumentKind = "service_contract" | "official_receipt" | "other";

export type FamilyDocument = {
  title: string;
  status: string;
  kind: FamilyDocumentKind;
  /** The document's own number (receipt no., contract no.), when the record carries it. */
  reference?: string;
  /** The date on the paper (yyyy-mm-dd), when the record carries it. */
  issued_on?: string;
  /** The amount exactly as recorded, display text — never parsed (repo money rule). */
  amount?: string;
  /** What the paper is for / what it covers, in the record's own words. */
  covers?: string;
};

export type FamilySnapshot = {
  tenant_id: string;
  family: { display_name: string; email: string; primary_contact: string };
  loved_one: { name: string; life_dates: string };
  plan_summary: { plan_name: string; status: string; term: string; next_due: string };
  balance: { total: string; paid: string; remaining: string };
  /**
   * Integer minor units for the same amounts as `balance` (display strings are
   * never parsed — repo money rule). Absent on older recordings; views must fall
   * back to the display strings without a progress figure when it is missing.
   */
  balance_cents?: { total: number; paid: number; remaining: number };
  recent_documents: FamilyDocument[];
};

function stringField(raw: Record<string, unknown>, key: string): string | undefined {
  const value = raw[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * The family-safe projection of one document record. Reads only the allowed fields
 * (see the file header); every other key is ignored. A record with no usable title is
 * dropped rather than rendered as a blank row.
 */
export function toFamilyDocument(raw: unknown): FamilyDocument | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const title = stringField(r, "title");
  if (!title) return null;
  const kind: FamilyDocumentKind =
    r.kind === "service_contract" || r.kind === "official_receipt" ? r.kind : "other";
  return {
    title,
    status: stringField(r, "status") ?? "",
    kind,
    reference: stringField(r, "reference"),
    issued_on: stringField(r, "issued_on"),
    amount: stringField(r, "amount"),
    covers: stringField(r, "covers"),
  };
}

export function familyLiveModeEnabled(): boolean {
  return false; // no family API contract yet — fixture only until the dev freeze
}

export async function getFamilySnapshot(): Promise<FamilySnapshot> {
  // Tolerant reader in the same style as the staff clients: defensive against shape
  // drift, since this fixture is provisional by definition. Documents always pass
  // through the family projection, so a richer raw record cannot leak staff fields.
  const raw = snapshotFile as unknown;
  if (typeof raw !== "object" || raw === null || !("family" in (raw as object))) {
    throw new Error("family snapshot fixture is malformed");
  }
  const snapshot = raw as unknown as FamilySnapshot;
  return {
    ...snapshot,
    recent_documents: (Array.isArray(snapshot.recent_documents) ? snapshot.recent_documents : [])
      .map(toFamilyDocument)
      .filter((doc): doc is FamilyDocument => doc !== null),
  };
}

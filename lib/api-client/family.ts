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
 * THE FAMILY WORKSPACE (requests · appointments · the lot record): the same discipline,
 * one seam further out. `lib/fixtures/family/workspace.json` carries the records the four
 * screens that wait on a family-facing service show — a request log (crm-cases ticket
 * service), the family's appointments (facilities-scheduling) and the lot/ownership
 * record (memorial-property-gis). It is APP-AUTHORED example data with provenance, exactly
 * like `lib/fixtures/agent/workspace.json`: no ticket number is issued, no chapel is named,
 * no amount lives there and nothing is published. Every reader below is a tolerant reader
 * (malformed shape → 500, never a cast) and every screen that reads one names the missing
 * contract and keeps the office phone as the action that reaches a person.
 *
 * When the family contract freezes, this file gains a live branch behind a FAMILY_BASE_URL
 * env var and the fixtures' provenance comments are replaced by contract references.
 */
import snapshotFile from "@/lib/fixtures/family/snapshot.json";
import workspaceFile from "@/lib/fixtures/family/workspace.json";
import { ApiError } from "@/lib/api-client/api-error";

/**
 * Which paper a document is, as the family sees it.
 *   service_contract · official_receipt — the family OWNS these: the portal always shows
 *   them and never asks the family to request a copy.
 *   other — certificates, permits, applications: these keep the request path.
 */
import { liveModeEnabled } from "@/lib/live-mode";

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

/* --------------------------------------------------------------- the workspace --- */

/**
 * One request the family made. `state` is the family's own word for where it stands —
 * never a service-desk code and never a ticket number: the office writes a request down,
 * the app does not issue one. `next` is one line of what happens now, in plain words.
 */
export type FamilyRequestState =
  | "with_office"
  | "waiting_on_you"
  | "done";

export type FamilyRequest = {
  id: string;
  title: string;
  detail: string;
  /** Calendar date (yyyy-mm-dd) the office wrote the request down. */
  asked_on: string;
  state: FamilyRequestState;
  /** What happens now — one plain sentence. */
  next: string;
  /** The visible word on the row's one action (distinct per row, so links never repeat). */
  action_label: string;
};

/**
 * One appointment in the family's record. A time is only real once the office confirms
 * it (`state`), and `where` never names a chapel — the park's chapel list is still a
 * PLACEHOLDER in staff scheduling.
 */
export type FamilyAppointmentState = "confirmed" | "waiting" | "past";

export type FamilyAppointment = {
  id: string;
  kind: "home_visit" | "park_visit" | "office_visit";
  /** A true instant; the day/time labels are rendered from it (Asia/Manila). */
  starts_at: string;
  day_label: string;
  time_label: string;
  title: string;
  /** The reason vocabulary the PRD fixes (facilities-scheduling.md:35). */
  reason: string;
  where: string;
  bring: string[];
  state: FamilyAppointmentState;
  /** The visible word on the card's one action (distinct per card, so links never repeat). */
  action_label: string;
  /** What happens now — or, for a past appointment, what was discussed. */
  next?: string;
  discussed?: string;
};

/** One kind of thing a family can ask the office for (crm-cases.md:44). */
export type FamilyAskFor = {
  key: string;
  label: string;
  detail: string;
};

/**
 * The family's lot as the portal may show it: what the office's record carries, plus the
 * fields the office holds but this page does not project yet (`with_office`). No amount
 * is carried here — the plan's money stays in the snapshot where it is recorded.
 */
export type FamilyLotRecord = {
  plan_name: string;
  park: string;
  section: string;
  lot_number: string;
  /** The name on the family's account — never asserted as legal ownership. */
  owner_name: string;
  owner_note: string;
  kept_by: string;
  record_note: string;
  /** The parts of the ownership record this page cannot show yet, in the office's words. */
  with_office: string[];
};

export type FamilyWorkspace = {
  tenant_id: string;
  requests: FamilyRequest[];
  appointments: FamilyAppointment[];
  ask_for: FamilyAskFor[];
  lot: FamilyLotRecord;
};

export function familyLiveModeEnabled(): boolean {
  // A family API contract is not frozen: the switch is declared in lib/live-mode.ts
  // but cannot enter live mode until the branch exists.
  return liveModeEnabled("family");
}

/**
 * Tolerant reader in the staff-client style (see `lib/api-client/property.ts`): a
 * malformed shape fails loudly with a 502-class error at the seam instead of being cast
 * to the domain type. Extra fields are ignored; a missing collection is empty, never a
 * crash — a family page must never white-screen because a demo record changed.
 */
function readFamilyWorkspace(): FamilyWorkspace {
  const raw = workspaceFile as unknown;
  if (typeof raw !== "object" || raw === null || !("lot" in (raw as object))) {
    throw new ApiError("family workspace fixture is malformed", 500);
  }
  const workspace = raw as unknown as FamilyWorkspace;
  return {
    tenant_id: workspace.tenant_id,
    requests: Array.isArray(workspace.requests) ? workspace.requests : [],
    appointments: Array.isArray(workspace.appointments) ? workspace.appointments : [],
    ask_for: Array.isArray(workspace.ask_for) ? workspace.ask_for : [],
    lot: workspace.lot,
  };
}

/** The family's own requests, in the order the office wrote them down. */
export async function listFamilyRequests(): Promise<FamilyRequest[]> {
  return readFamilyWorkspace().requests.map((request) => ({ ...request }));
}

/** The family's appointments: what is coming, what waits for the office, what happened. */
export async function listFamilyAppointments(): Promise<FamilyAppointment[]> {
  return readFamilyWorkspace().appointments.map((appointment) => ({
    ...appointment,
    bring: Array.isArray(appointment.bring) ? [...appointment.bring] : [],
  }));
}

/** The kinds of request the office accepts, in the family's own words. */
export async function listFamilyAskFor(): Promise<FamilyAskFor[]> {
  return readFamilyWorkspace().ask_for.map((item) => ({ ...item }));
}

/** The family's lot record — what the office holds and what this page cannot show yet. */
export async function getFamilyLotRecord(): Promise<FamilyLotRecord> {
  const lot = readFamilyWorkspace().lot;
  return { ...lot, with_office: Array.isArray(lot.with_office) ? [...lot.with_office] : [] };
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

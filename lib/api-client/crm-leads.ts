/**
 * Typed data access for the STAFF CRM lead records (Relationships → Sales pipeline).
 *
 * ⚠ PROVISIONAL — NO crm-families contract exists. The leads/pipeline service
 * (docs/02-architecture/microservices.md:49) is unbuilt, so this client reads the
 * office's own recorded file `lib/fixtures/crm/lead-records.json` (APP-AUTHORED
 * example data with provenance — the same pattern as `lib/api-client/lot-lifecycle.ts`)
 * and never claims a live mode: there is no endpoint to proxy, so setting
 * `CRM_BASE_URL` cannot make this file live.
 *
 * The person and enquiry fields of a record with an `inquiry_reference` are that
 * recorded row of `lib/fixtures/crm/inquiries.json`; a record whose person is also
 * an agent-portal prospect mirrors the recorded movement, contact history, owner
 * and next step of `lib/fixtures/agent/workspace.json`, so the office's record and
 * the agent's record cannot tell different stories about the same lead. Both
 * cross-references are pinned by `tests/fixture-contract/crm-leads.test.ts`.
 *
 * The reader is strict rather than tolerant: this file records a shape the app
 * owns, so a malformed seed fails loudly with a 500 (naming the record) instead
 * of surfacing a half-shaped lead on the screen. Enquiry persistence, customer
 * sync and lead assignment wait on the customer-records service; the screen says
 * so once — never dress local files up as a service.
 */
import leadRecordsFile from "@/lib/fixtures/crm/lead-records.json";
import type { Inquiry } from "@/lib/api-client/crm";
import { ApiError } from "@/lib/api-client/api-error";

/** The recorded lead-source vocabulary (crm inquiries/lead sources, §33). */
export const LEAD_SOURCES: ReadonlyArray<Inquiry["source"]> = [
  "website",
  "facebook",
  "messenger",
  "walk_in",
  "referral",
  "phone",
  "agent",
  "event",
  "ads",
];

export const LEAD_INTERESTS = ["plan", "lot", "services"] as const;
export type LeadInterest = (typeof LEAD_INTERESTS)[number];

/** The kinds of contact the record carries — the agent record's contact vocabulary. */
export const LEAD_CONTACT_KINDS = ["call", "visit", "link", "message", "note"] as const;
export type LeadContactKind = (typeof LEAD_CONTACT_KINDS)[number];

/** One recorded move of a lead through the PRD pipeline (commerce-catalog §33). */
export type LeadStageMove = {
  stage: string;
  at: string;
  by: string;
  note: string;
};

/** One recorded contact entry (a call, a visit, a note, a message, a link opened). */
export type LeadContactEntry = {
  id: string;
  kind: LeadContactKind;
  at: string;
  title: string;
  detail: string;
};

export type CrmLead = {
  id: string;
  /** The recorded enquiry this lead came from; null when the enquiry has no reference. */
  inquiry_reference: string | null;
  name: string;
  phone: string;
  email: string;
  source: Inquiry["source"];
  /** What they asked about, in the enquiry's own words. */
  topic: string;
  message: string;
  interest: LeadInterest;
  stage: string;
  /** The person working the lead — recorded, never assigned on this screen. */
  owner: string;
  first_contact_at: string;
  last_contact_at: string;
  next_action: string;
  /** Oldest move first; the last move is `stage` at `last_contact_at`. */
  stage_history: LeadStageMove[];
  /** Recorded contact history, newest first; empty when nothing was recorded. */
  activity: LeadContactEntry[];
};

export function crmLeadsLiveModeEnabled(): boolean {
  // No lead/customer-records read or write API exists — this is fixture-only until
  // the contract freezes (the screens state the gap; this flag never pretends one).
  return false;
}

function fail(where: string, detail: string): never {
  throw new ApiError(`crm lead record ${where} is malformed: ${detail}`, 500);
}

function text(row: Record<string, unknown>, key: string, where: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(where, `"${key}" is not a non-empty string`);
  }
  return value;
}

function toStageHistory(raw: unknown, where: string): LeadStageMove[] {
  if (!Array.isArray(raw)) fail(where, "stage_history is not an array");
  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      fail(where, `stage_history[${index}] is not an object`);
    }
    const row = entry as Record<string, unknown>;
    return {
      stage: text(row, "stage", where),
      at: text(row, "at", where),
      by: text(row, "by", where),
      note: text(row, "note", where),
    };
  });
}

function toActivity(raw: unknown, where: string): LeadContactEntry[] {
  if (!Array.isArray(raw)) fail(where, "activity is not an array");
  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      fail(where, `activity[${index}] is not an object`);
    }
    const row = entry as Record<string, unknown>;
    const kind = text(row, "kind", where);
    if (!(LEAD_CONTACT_KINDS as readonly string[]).includes(kind)) {
      fail(where, `activity[${index}].kind "${kind}" is outside the contact vocabulary`);
    }
    return {
      id: text(row, "id", where),
      kind: kind as LeadContactKind,
      at: text(row, "at", where),
      title: text(row, "title", where),
      detail: text(row, "detail", where),
    };
  });
}

function toLead(raw: unknown, index: number): CrmLead {
  const where = `leads[${index}]`;
  if (typeof raw !== "object" || raw === null) fail(where, "is not an object");
  const row = raw as Record<string, unknown>;

  const inquiryReference = row.inquiry_reference;
  if (inquiryReference !== null && typeof inquiryReference !== "string") {
    fail(where, '"inquiry_reference" must be a string or null');
  }
  const source = text(row, "source", where);
  if (!(LEAD_SOURCES as readonly string[]).includes(source)) {
    fail(where, `source "${source}" is outside the recorded lead-source vocabulary`);
  }
  const interest = text(row, "interest", where);
  if (!(LEAD_INTERESTS as readonly string[]).includes(interest)) {
    fail(where, `interest "${interest}" is outside the recorded vocabulary`);
  }

  return {
    id: text(row, "id", where),
    inquiry_reference: inquiryReference,
    name: text(row, "name", where),
    phone: text(row, "phone", where),
    email: text(row, "email", where),
    source: source as Inquiry["source"],
    topic: text(row, "topic", where),
    message: text(row, "message", where),
    interest: interest as LeadInterest,
    stage: text(row, "stage", where),
    owner: text(row, "owner", where),
    first_contact_at: text(row, "first_contact_at", where),
    last_contact_at: text(row, "last_contact_at", where),
    next_action: text(row, "next_action", where),
    stage_history: toStageHistory(row.stage_history, where),
    activity: toActivity(row.activity, where),
  };
}

function readLeads(): CrmLead[] {
  const raw = leadRecordsFile as unknown;
  const leads =
    typeof raw === "object" && raw !== null ? (raw as { leads?: unknown }).leads : undefined;
  if (!Array.isArray(leads)) {
    throw new ApiError("crm lead-records fixture is malformed: no leads array", 500);
  }
  return leads.map(toLead);
}

/** The recorded lead file, in the order the office wrote it. */
export async function listCrmLeads(): Promise<CrmLead[]> {
  return readLeads();
}

/** One lead; an id the record does not carry is a 404, never an invented row. */
export async function getCrmLead(id: string): Promise<CrmLead> {
  const lead = readLeads().find((row) => row.id === id);
  if (!lead) throw new ApiError("not_found", 404);
  return lead;
}

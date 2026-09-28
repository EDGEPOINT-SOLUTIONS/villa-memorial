/**
 * Durable fixture-mode store for membership applications (Villa Memorial Plan — FORMS_PLAN
 * gap 4 / F-18).
 *
 * WHY A FILE STORE (same reasoning as lib/api-client/catalog-store.ts)
 * A membership application is the office's own record of an enrolment: who joined, who the
 * plan protects, which plan and rate. It must survive a restart and be the same record the
 * next request prints. It is persisted as a small append-only event journal on disk:
 *
 *   - The recorded seed (`lib/fixtures/commerce/membership-applications.json`) is read-only
 *     and folded with the journal on every read, so updating the seed never migrates state.
 *   - Each recording appends one event; the whole journal is rewritten to a temp file,
 *     fsync'd, then renamed over the store path — an atomic replace.
 *   - Recordings run through ONE in-process promise chain, so two Next requests cannot
 *     interleave the id allocation (no duplicate id in the process that owns the store).
 *   - Path: `MEMBERSHIP_STORE_PATH` when set (tests), otherwise
 *     `.data/commerce-membership-applications.json` under the app's cwd (gitignored).
 *
 * WHAT IS FROZEN: NOTHING — stated loudly, and that is the point.
 * No contract under `docs/08-delivery/contracts/` names a membership / COC record, the
 * underwriter is a pre-need partner (Eternal Plans, Inc.), and the signed paper is not
 * archived in this project. This store is therefore fixture-mode only; `lib/api-client/
 * membership-applications.ts` answers an honest 503 in live mode (`COMMERCE_BASE_URL` set)
 * instead of inventing a partner integration. The record carries no COC number, no coverage
 * dates and no clause text — see `lib/contracts/membership-application.ts`.
 */
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import { ApiError } from "@/lib/api-client/api-error";
import applicationsFile from "@/lib/fixtures/commerce/membership-applications.json";
import {
  MEMBERSHIP_RELATIONSHIPS,
  type MembershipApplication,
  type MembershipApplicationInput,
  type MembershipRelationship,
} from "@/lib/contracts/membership-application";
import type { PlanTerm, PlanTier } from "@/lib/pricing-model";

type SeedShape = { applications: unknown[] };

type PersistedEvent = {
  kind: "application_recorded";
  at: string;
  application: MembershipApplication;
};

/** What a recording supplies above the form input: the rate read from the pricing store. */
export type MembershipRecordDraft = {
  input: MembershipApplicationInput;
  rate_cents: number;
  pricing_updated_at: string | null;
  recorded_by: string | null;
};

export function membershipStorePath(): string {
  return journalPath("MEMBERSHIP_STORE_PATH", "commerce-membership-applications.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed membership fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string") malformed(what);
  return value;
}

function requiredInteger(value: unknown, what: string, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) malformed(what);
  return value;
}

function requiredBoolean(value: unknown, what: string): boolean {
  if (typeof value !== "boolean") malformed(what);
  return value;
}

function requiredNullableString(value: unknown, what: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") malformed(what);
  return value;
}

const TIERS: readonly string[] = ["bronze1", "bronze2", "silver1", "silver2", "gold"];
const TERMS: readonly string[] = ["monthly", "quarterly", "semi", "annual"];
const RELATIONSHIPS: readonly string[] = MEMBERSHIP_RELATIONSHIPS.map((r) => r.value);

function requiredRelationship(value: unknown, what: string): MembershipRelationship {
  if (typeof value !== "string" || !RELATIONSHIPS.includes(value)) malformed(what);
  return value as MembershipRelationship;
}

/** A record read field by field (never cast): a malformed row is a loud 500, not a half shape. */
function toMembershipApplication(raw: unknown): MembershipApplication {
  if (typeof raw !== "object" || raw === null) malformed("membership application");
  const r = raw as Record<string, unknown>;
  const beneficiaries = Array.isArray(r.beneficiaries)
    ? r.beneficiaries.map((entry) => {
        if (typeof entry !== "object" || entry === null) malformed("beneficiary row");
        const row = entry as Record<string, unknown>;
        return {
          name: requiredString(row.name, "beneficiary name"),
          relationship: requiredRelationship(row.relationship, "beneficiary relationship"),
        };
      })
    : malformed("beneficiaries");
  const tier = r.plan_tier;
  const term = r.plan_term;
  if (typeof tier !== "string" || !TIERS.includes(tier)) malformed("plan tier");
  if (typeof term !== "string" || !TERMS.includes(term)) malformed("plan term");
  return {
    id: requiredInteger(r.id, "application id", 1),
    application_date: requiredString(r.application_date, "application date"),
    last_name: requiredString(r.last_name, "holder last name"),
    first_name: requiredString(r.first_name, "holder first name"),
    middle_name: requiredString(r.middle_name, "holder middle name"),
    date_of_birth: requiredNullableString(r.date_of_birth, "holder date of birth"),
    contact_number: requiredNullableString(r.contact_number, "holder contact"),
    email: requiredNullableString(r.email, "holder email"),
    address: requiredNullableString(r.address, "holder address"),
    beneficiaries,
    branch: requiredString(r.branch, "branch"),
    plan_tier: tier as PlanTier,
    plan_term: term as PlanTerm,
    senior: requiredBoolean(r.senior, "senior flag"),
    rate_cents: requiredInteger(r.rate_cents, "rate"),
    pricing_updated_at: requiredNullableString(r.pricing_updated_at, "pricing updated at"),
    health_declaration: requiredBoolean(r.health_declaration, "health declaration"),
    dpa_consent: requiredBoolean(r.dpa_consent, "data-privacy consent"),
    dpa_consented_at: requiredNullableString(r.dpa_consented_at, "consent timestamp"),
    recorded_by: requiredNullableString(r.recorded_by, "recorded by"),
    created_at: requiredString(r.created_at, "created at"),
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  if (r.kind !== "application_recorded") malformed(`store event kind ${String(r.kind)}`);
  return {
    kind: "application_recorded",
    at: requiredString(r.at, "event timestamp"),
    application: toMembershipApplication(r.application),
  };
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(membershipStorePath(), "membership");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(membershipStorePath(), "membership", events);
}

const withStoreLock = createJournalLock();

/** Seed + journal folded into the current records, in recorded order. */
async function loadState(): Promise<{
  records: MembershipApplication[];
  events: PersistedEvent[];
}> {
  const seed = (applicationsFile as unknown as SeedShape).applications.map(toMembershipApplication);
  const records: MembershipApplication[] = [];
  const indexById = new Map<number, number>();
  for (const record of seed) {
    if (indexById.has(record.id)) malformed(`duplicate application id ${record.id}`);
    indexById.set(record.id, records.length);
    records.push(record);
  }
  const events = await readPersistedEvents();
  for (const event of events) {
    const id = event.application.id;
    if (indexById.has(id)) malformed(`duplicate application id ${id}`);
    indexById.set(id, records.length);
    records.push(event.application);
  }
  return { records, events };
}

/* ------------------------------ store API ------------------------------- */

/** Every recorded application, seed first, then recordings in the order they were made. */
export async function listMembershipApplications(): Promise<MembershipApplication[]> {
  return (await loadState()).records;
}

/** One application by its app-assigned id — unknown → null. */
export async function getMembershipApplication(
  id: number,
): Promise<MembershipApplication | null> {
  if (!Number.isInteger(id) || id < 1) return null;
  return (await loadState()).records.find((record) => record.id === id) ?? null;
}

/**
 * Records one application durably and returns it with its allocated id. The rate and the
 * pricing timestamp arrive already read from the store by the caller (never typed here);
 * this function writes exactly what it is given.
 */
export async function recordMembershipApplication(
  draft: MembershipRecordDraft,
): Promise<MembershipApplication> {
  return withStoreLock(async () => {
    const { records, events } = await loadState();
    const id = records.reduce((max, record) => Math.max(max, record.id), 0) + 1;
    const record: MembershipApplication = {
      ...draft.input,
      beneficiaries: draft.input.beneficiaries.map((b) => ({ ...b })),
      id,
      rate_cents: draft.rate_cents,
      pricing_updated_at: draft.pricing_updated_at,
      recorded_by: draft.recorded_by,
      created_at: new Date().toISOString(),
    };
    await persistEvents([
      ...events,
      { kind: "application_recorded", at: record.created_at, application: record },
    ]);
    return { ...record, beneficiaries: record.beneficiaries.map((b) => ({ ...b })) };
  });
}

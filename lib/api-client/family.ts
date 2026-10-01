/**
 * Typed data access for the FAMILY portal (customer/family surfaces).
 *
 * ⚠ PROVISIONAL SHAPE — flagged loudly per web/AGENTS.md: there is NO frozen family/
 * customer API contract yet (the family-facing endpoints are dev-authored). This client
 * therefore reads recorded FAMILY SNAPSHOT / WORKSPACE / CASE fixtures only, and NEVER
 * claims a live mode. Nothing here is wired to a live URL and no cross-service shape is
 * invented beyond display-level strings.
 *
 * THE HOUSEHOLD (captain, 2026-09-30): the account is a HOUSEHOLD, not a single person.
 * `getFamilyHousehold()` merges each loved one's plan/money/papers (snapshot) with their
 * lot/requests/appointments (workspace) and their recorded arrangement (case), keyed by
 * the same `id`. `getFamilySnapshot(personId?)` returns ONE loved one's records (default:
 * the first, so the single-person case reads exactly as before) together with a
 * `household` summary for the person switcher. Nothing is blended: two loved ones' money
 * never adds together, and a household with one loved one renders no switcher.
 *
 * The plan's `payment_schedule` (client minute 2026-09-21, item 1) is read through the SAME
 * tolerant seam per loved one: `parsePaymentSchedule` (lib/payment-schedule.ts) validates it
 * field by field and returns null on a partial record, and every due date / due-soon state
 * is DERIVED there — the fixture records amounts, never a second copy of a date.
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
 * record (memorial-property-gis) — now one set per loved one. It is APP-AUTHORED example
 * data with provenance, exactly like `lib/fixtures/agent/workspace.json`: no ticket number
 * is issued, no chapel is named, no amount lives there and nothing is published. Every
 * reader below is a tolerant reader (malformed shape → 500, never a cast) and every screen
 * that reads one names the missing contract and keeps the office phone as the action that
 * reaches a person.
 *
 * When the family contract freezes, this file gains a live branch behind a FAMILY_BASE_URL
 * env var and the fixtures' provenance comments are replaced by contract references.
 */
import snapshotFile from "@/lib/fixtures/family/snapshot.json";
import workspaceFile from "@/lib/fixtures/family/workspace.json";
import caseFile from "@/lib/fixtures/family/case.json";
import { ApiError } from "@/lib/api-client/api-error";
import { parsePaymentSchedule, type PaymentSchedule } from "@/lib/payment-schedule";
import { liveModeEnabled } from "@/lib/live-mode";

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

export type FamilyPlanSummary = {
  plan_name: string;
  status: string;
  term: string;
  next_due: string;
};

export type FamilyBalance = { total: string; paid: string; remaining: string };

/**
 * Integer minor units for the same amounts as `balance` (display strings are
 * never parsed — repo money rule). Absent on older recordings; views must fall
 * back to the display strings without a progress figure when it is missing.
 */
export type FamilyBalanceCents = { total: number; paid: number; remaining: number };

/** One loved one's plan, money and papers, as the snapshot records them. */
export type FamilyLovedOne = {
  /** The stable id every record for this person is keyed by. */
  id: string;
  name: string;
  life_dates: string;
  plan_summary: FamilyPlanSummary;
  balance: FamilyBalance;
  balance_cents?: FamilyBalanceCents;
  /**
   * The loved one's own plan instalments (client minute 2026-09-21, item 1). Due dates
   * and the due-soon/overdue state are DERIVED from this by `lib/payment-schedule.ts`;
   * the reader returns null when the recorded shape cannot be trusted, so a partial
   * record renders the honest state instead of a plausible schedule.
   */
  payment_schedule?: PaymentSchedule;
  recent_documents: FamilyDocument[];
};

/** The loved one as the person switcher needs them — id, name, dates, nothing else. */
export type FamilyPersonSummary = {
  id: string;
  name: string;
  life_dates: string;
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
  /**
   * The office's own plot code for this lot, when a family-facing lot/ownership
   * projection carries one. It is deliberately SEPARATE from `lot_number`: the
   * recorded `lot_number` is a display string from the plan name (“Lawn A-01”)
   * while the park's plots use the office code (“A-001”), so the 3D deep link is
   * offered only when this field is present and resolves (lib/family/family-plots).
   */
  plot_code?: string;
  /** The name on the family's account — never asserted as legal ownership. */
  owner_name: string;
  owner_note: string;
  kept_by: string;
  record_note: string;
  /** The parts of the ownership record this page cannot show yet, in the office's words. */
  with_office: string[];
};

/* --------------------------------------------------------------- the case --- */

/**
 * The five family moments the chain names, in order. The KEY is the recorded
 * field; the words come from `lib/family/family-case.ts`, so the fixture never
 * carries a second copy of the label.
 */
export type FamilyCaseStepKey = "arrangement" | "viewing" | "funeral" | "burial" | "papers";

/**
 * Where one moment stands in the office's own record. `done` · `now` · `next`
 * are the office's state; `not_recorded` is the honest state when the record
 * does not carry the time (the view says so in a few words rather than
 * guessing). No value is derived from the clock here.
 */
export type FamilyCaseStepStatus = "done" | "now" | "next" | "not_recorded";

export type FamilyCaseStep = {
  key: FamilyCaseStepKey;
  /** A true instant (ISO, Asia/Manila) when the record carries a time. */
  starts_at?: string;
  /** The end of a window the record carries (the viewing), when there is one. */
  ends_at?: string;
  /** A calendar day (yyyy-mm-dd) when the record carries a day but no time. */
  on?: string;
  place?: string;
  /** A person the record names, where it names one. */
  person?: string;
  note?: string;
  status: FamilyCaseStepStatus;
};

/**
 * The office's recorded arrangement for one loved one, family-safe: the five
 * moments, their recorded times/places and their state. No case number, no
 * coordinator and no amount — those stay with the office. `null` is the honest
 * answer for a loved one whose record carries no case.
 */
export type FamilyCase = {
  /** The loved one's name, as the snapshot records it. */
  loved_one: string;
  steps: FamilyCaseStep[];
};

const CASE_STEP_KEYS: readonly FamilyCaseStepKey[] = [
  "arrangement",
  "viewing",
  "funeral",
  "burial",
  "papers",
];

function toFamilyCaseStep(raw: unknown): FamilyCaseStep | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const key = r.key;
  if (typeof key !== "string" || !CASE_STEP_KEYS.includes(key as FamilyCaseStepKey)) return null;
  const status: FamilyCaseStepStatus =
    r.status === "done" || r.status === "now" || r.status === "next" ? r.status : "not_recorded";
  return {
    key: key as FamilyCaseStepKey,
    starts_at: stringField(r, "starts_at"),
    ends_at: stringField(r, "ends_at"),
    on: stringField(r, "on"),
    place: stringField(r, "place"),
    person: stringField(r, "person"),
    note: stringField(r, "note"),
    status,
  };
}

function toFamilyCase(raw: unknown): FamilyCase | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Record<string, unknown>;
  const steps = (Array.isArray(b.steps) ? b.steps : [])
    .map(toFamilyCaseStep)
    .filter((step): step is FamilyCaseStep => step !== null)
    .sort((a, b2) => CASE_STEP_KEYS.indexOf(a.key) - CASE_STEP_KEYS.indexOf(b2.key));
  if (steps.length === 0) return null;
  return { loved_one: stringField(b, "loved_one") ?? "", steps };
}

/** One loved one with every family-facing record merged (snapshot + workspace + case). */
export type FamilyPerson = FamilyLovedOne & {
  lot: FamilyLotRecord | null;
  requests: FamilyRequest[];
  appointments: FamilyAppointment[];
  familyCase: FamilyCase | null;
};

/** The whole household: the manager plus every loved one and their records. */
export type FamilyHousehold = {
  tenant_id: string;
  family: { display_name: string; email: string; primary_contact: string };
  people: FamilyPerson[];
};

/**
 * The family snapshot as ONE screen sees it: the selected loved one's own records, plus
 * the household summary the person switcher renders. `person_id` is the resolved person,
 * and `household` lists every loved one (one entry for a single-person household, which
 * therefore shows no switcher).
 */
export type FamilySnapshot = {
  tenant_id: string;
  family: { display_name: string; email: string; primary_contact: string };
  loved_one: { name: string; life_dates: string };
  plan_summary: FamilyPlanSummary;
  balance: FamilyBalance;
  balance_cents?: FamilyBalanceCents;
  payment_schedule?: PaymentSchedule;
  recent_documents: FamilyDocument[];
  /** The resolved loved one's stable id (always set by the real reader). */
  person_id?: string;
  /** Every loved one on the account, for the switcher (set by the real reader). */
  household?: FamilyPersonSummary[];
};

export function familyLiveModeEnabled(): boolean {
  // A family API contract is not frozen: the switch is declared in lib/live-mode.ts
  // but cannot enter live mode until the branch exists.
  return liveModeEnabled("family");
}

/* ------------------------------------------------------------- tolerant readers --- */

function readArray(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

function readLot(raw: unknown): FamilyLotRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const lot = raw as unknown as FamilyLotRecord;
  const rawPlotCode = (lot as unknown as Record<string, unknown>).plot_code;
  return {
    ...lot,
    plot_code:
      typeof rawPlotCode === "string" && rawPlotCode.trim() !== "" ? rawPlotCode.trim() : undefined,
    with_office: Array.isArray(lot.with_office) ? [...lot.with_office] : [],
  };
}

function readFamilySnapshot(): {
  tenant_id: string;
  family: FamilySnapshot["family"];
  loved_ones: FamilyLovedOne[];
} {
  const raw = snapshotFile as unknown;
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("family" in (raw as object)) ||
    !("loved_ones" in (raw as object))
  ) {
    throw new ApiError("family snapshot fixture is malformed", 500);
  }
  const record = raw as Record<string, unknown>;
  const lovedOnes = readArray(record.loved_ones).map((entry) => {
    const person = entry as Record<string, unknown>;
    const id = stringField(person, "id");
    const name = stringField(person, "name");
    if (!id || !name) throw new ApiError("family snapshot loved one is malformed", 500);
    const paymentSchedule = parsePaymentSchedule(person.payment_schedule);
    return {
      id,
      name,
      life_dates: stringField(person, "life_dates") ?? "",
      plan_summary: person.plan_summary as FamilyPlanSummary,
      balance: person.balance as FamilyBalance,
      balance_cents: person.balance_cents as FamilyBalanceCents | undefined,
      payment_schedule: paymentSchedule ?? undefined,
      recent_documents: readArray(person.recent_documents)
        .map(toFamilyDocument)
        .filter((doc): doc is FamilyDocument => doc !== null),
    };
  });
  if (lovedOnes.length === 0) throw new ApiError("family snapshot has no loved ones", 500);
  return {
    tenant_id: String(record.tenant_id ?? ""),
    family: record.family as FamilySnapshot["family"],
    loved_ones: lovedOnes,
  };
}

function readFamilyWorkspace(): {
  tenant_id: string;
  ask_for: FamilyAskFor[];
  loved_ones: Array<{
    id: string;
    lot: FamilyLotRecord;
    requests: FamilyRequest[];
    appointments: FamilyAppointment[];
  }>;
} {
  const raw = workspaceFile as unknown;
  if (typeof raw !== "object" || raw === null || !("ask_for" in (raw as object))) {
    throw new ApiError("family workspace fixture is malformed", 500);
  }
  const record = raw as Record<string, unknown>;
  return {
    tenant_id: String(record.tenant_id ?? ""),
    ask_for: readArray(record.ask_for).map((item) => ({ ...(item as FamilyAskFor) })),
    loved_ones: readArray(record.loved_ones).map((entry) => {
      const person = entry as Record<string, unknown>;
      const id = stringField(person, "id");
      if (!id || typeof person.lot !== "object" || person.lot === null) {
        throw new ApiError("family workspace loved one is malformed", 500);
      }
      return {
        id,
        lot: readLot(person.lot) as FamilyLotRecord,
        requests: readArray(person.requests).map((request) => ({ ...(request as FamilyRequest) })),
        appointments: readArray(person.appointments).map((appointment) => {
          const appt = appointment as FamilyAppointment;
          return { ...appt, bring: Array.isArray(appt.bring) ? [...appt.bring] : [] };
        }),
      };
    }),
  };
}

function readFamilyCases(): { tenant_id: string; loved_ones: Array<{ id: string; case: FamilyCase | null }> } {
  const raw = caseFile as unknown;
  if (typeof raw !== "object" || raw === null || !("loved_ones" in (raw as object))) {
    return { tenant_id: "", loved_ones: [] };
  }
  const record = raw as Record<string, unknown>;
  return {
    tenant_id: String(record.tenant_id ?? ""),
    loved_ones: readArray(record.loved_ones).map((entry) => {
      const person = entry as Record<string, unknown>;
      return { id: stringField(person, "id") ?? "", case: toFamilyCase(person.case) };
    }),
  };
}

/* ------------------------------------------------------------- the household --- */

/**
 * The whole household: every loved one's plan/money/papers (snapshot) merged with their
 * lot/requests/appointments (workspace) and their arrangement (case), keyed by the same
 * id. The fixtures must carry the same people — a missing counterpart is a malformed
 * record, not an empty one. A missing lot/case is the honest null (a loved one with no
 * recorded lot or arrangement), never a crash.
 */
export async function getFamilyHousehold(): Promise<FamilyHousehold> {
  const snapshot = readFamilySnapshot();
  const workspace = readFamilyWorkspace();
  const cases = readFamilyCases();
  const workspaceById = new Map(workspace.loved_ones.map((person) => [person.id, person]));
  const caseById = new Map(cases.loved_ones.map((person) => [person.id, person.case]));
  const people: FamilyPerson[] = snapshot.loved_ones.map((lovedOne) => {
    const record = workspaceById.get(lovedOne.id);
    if (!record) throw new ApiError(`family workspace has no record for ${lovedOne.id}`, 500);
    return {
      ...lovedOne,
      lot: record.lot,
      requests: record.requests,
      appointments: record.appointments,
      familyCase: caseById.get(lovedOne.id) ?? null,
    };
  });
  return { tenant_id: snapshot.tenant_id, family: snapshot.family, people };
}

/** The people the switcher shows, in the snapshot's own order. */
export function familyPeople(household: FamilyHousehold): FamilyPersonSummary[] {
  return household.people.map((person) => ({
    id: person.id,
    name: person.name,
    life_dates: person.life_dates,
  }));
}

function selectPerson(people: FamilyPerson[], personId?: string): FamilyPerson {
  if (people.length === 0) throw new ApiError("family household has no loved ones", 500);
  const found = personId ? people.find((person) => person.id === personId) : undefined;
  return found ?? people[0];
}

/**
 * One loved one's records as the page reads them. `personId` is the stable id from the
 * address (`?person=`); an unknown id falls back to the first person rather than 404, so
 * a stale link still shows the family their records. The returned `household` summary is
 * what the switcher renders (a single loved one → no switcher).
 */
export async function getFamilySnapshot(personId?: string): Promise<FamilySnapshot> {
  const household = await getFamilyHousehold();
  const person = selectPerson(household.people, personId);
  return {
    tenant_id: household.tenant_id,
    family: household.family,
    loved_one: { name: person.name, life_dates: person.life_dates },
    plan_summary: person.plan_summary,
    balance: person.balance,
    balance_cents: person.balance_cents,
    payment_schedule: person.payment_schedule,
    recent_documents: person.recent_documents,
    person_id: person.id,
    household: familyPeople(household),
  };
}

/** The selected loved one's lot record — what the office holds and cannot show yet. */
export async function getFamilyLotRecord(personId?: string): Promise<FamilyLotRecord> {
  const household = await getFamilyHousehold();
  const person = selectPerson(household.people, personId);
  if (!person.lot) throw new ApiError(`family lot record is missing for ${person.id}`, 500);
  return { ...person.lot, with_office: [...person.lot.with_office] };
}

/** The selected loved one's own requests, in the order the office wrote them down. */
export async function listFamilyRequests(personId?: string): Promise<FamilyRequest[]> {
  const household = await getFamilyHousehold();
  return selectPerson(household.people, personId).requests.map((request) => ({ ...request }));
}

/** The selected loved one's appointments: what is coming, waits, or has happened. */
export async function listFamilyAppointments(personId?: string): Promise<FamilyAppointment[]> {
  const household = await getFamilyHousehold();
  return selectPerson(household.people, personId).appointments.map((appointment) => ({
    ...appointment,
    bring: Array.isArray(appointment.bring) ? [...appointment.bring] : [],
  }));
}

/** The kinds of request the office accepts, in the family's own words (household-level). */
export async function listFamilyAskFor(): Promise<FamilyAskFor[]> {
  return readFamilyWorkspace().ask_for.map((item) => ({ ...item }));
}

/**
 * The office's recorded arrangement for the selected loved one, or `null` when the
 * record carries no case. Read through the same tolerant, provisional seam as the
 * snapshot (see the file header) — no live branch is claimed.
 */
export async function getFamilyCase(personId?: string): Promise<FamilyCase | null> {
  const household = await getFamilyHousehold();
  return selectPerson(household.people, personId).familyCase;
}

/**
 * Durable fixture-mode store for the post-Prospect lifecycle (captain, 2026-10-03).
 *
 * WHY A FILE STORE. When a prospect decides — a plan, a service, a product or a
 * garden lot — the office records the outcome and then works it for months: who
 * paid, what is outstanding, when the next due date is, which notice fires. That
 * record has to survive a restart and be the same record the next request prints.
 * This is that place, and it is demo-local by construction (the repo's own journal
 * pattern, never a claim of a live lifecycle contract).
 *
 * THE REPO'S PATTERN, NOT A NEW ONE. Identical in shape to `agent-store.ts`,
 * `inquiry-store.ts` and the commerce stores:
 *   - the recorded seed (`lib/fixtures/lifecycle/engagements.json`) is read-only and
 *     folded with an append-only journal on every read, so updating the seed never
 *     migrates state;
 *   - each write appends one event; the whole journal is rewritten to a temp file,
 *     fsync'd, then `rename(2)`d over the store path — an atomic replace;
 *   - writes run through ONE in-process promise chain (`createJournalLock`), so two
 *     Next requests cannot interleave a read-modify-write;
 *   - path: `LIFECYCLE_STORE_PATH` when set (tests), otherwise
 *     `.data/commerce-lifecycle.json` under the app's cwd (gitignored).
 *
 * WHAT IS *NOT* HERE. The record shape, the amortization, the notice rules and the
 * form validation are the pure reading in `lib/lifecycle.ts`; this store owns only
 * persistence, the id/reference allocation and the timestamps. No CRM or billing
 * contract is frozen for this domain, so the app-facing client
 * (`lib/api-client/lifecycle.ts`) serves fixture mode and says so.
 */
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api-client/api-error";
import {
  createJournalLock,
  journalPath,
  readJournalEvents,
  writeJournalEvents,
} from "@/lib/api-client/journal";
import seedFile from "@/lib/fixtures/lifecycle/engagements.json";
import {
  isEngagementKind,
  isPaymentMode,
  nextReference,
  type Engagement,
  type EngagementInput,
  type EngagementKind,
  type EngagementLot,
  type EngagementSchedule,
  type LifecycleClient,
  type NoticeSend,
  type NoticeTemplate,
  type NoticeTemplateInput,
  type Payment,
  type PaymentInput,
} from "@/lib/lifecycle";

type SeedShape = {
  engagements: unknown[];
  payments: unknown[];
  notice_templates: unknown[];
};

type PersistedEvent =
  | { kind: "engagement_recorded"; at: string; engagement: Engagement }
  | { kind: "payment_recorded"; at: string; payment: Payment }
  | { kind: "notice_template_saved"; at: string; template: NoticeTemplate }
  | { kind: "notice_recorded"; at: string; send: NoticeSend };

export function lifecycleStorePath(): string {
  return journalPath("LIFECYCLE_STORE_PATH", "commerce-lifecycle.json");
}

/* ------------------------------ readers --------------------------------- */

function malformed(what: string): never {
  throw new ApiError(`malformed lifecycle fixture: ${what}`, 500);
}

function requiredString(value: unknown, what: string): string {
  if (typeof value !== "string") malformed(what);
  return value;
}

function optionalString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function requiredInteger(value: unknown, what: string, min = 0): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) malformed(what);
  return value;
}

function requiredBoolean(value: unknown, what: string): boolean {
  if (typeof value !== "boolean") malformed(what);
  return value;
}

function nullableString(value: unknown, what: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") malformed(what);
  return value;
}

function toClient(raw: unknown): LifecycleClient {
  if (typeof raw !== "object" || raw === null) malformed("client");
  const r = raw as Record<string, unknown>;
  return {
    name: requiredString(r.name, "client name"),
    phone: optionalString(r.phone),
    email: optionalString(r.email),
  };
}

function toSchedule(raw: unknown): EngagementSchedule | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") malformed("schedule");
  const r = raw as Record<string, unknown>;
  return {
    on: requiredString(r.on, "schedule on"),
    time: optionalString(r.time),
    resource_id: requiredString(r.resource_id, "schedule resource id"),
    resource_name: requiredString(r.resource_name, "schedule resource name"),
    case_number: nullableString(r.case_number, "schedule case number"),
  };
}

function toLot(raw: unknown): EngagementLot | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") malformed("lot");
  const r = raw as Record<string, unknown>;
  return {
    lot_id: nullableString(r.lot_id, "lot id"),
    lot_number: requiredString(r.lot_number, "lot number"),
    section: requiredString(r.section, "lot section"),
  };
}

/** A record read field by field (never cast): a malformed row is a loud 500. */
function toEngagement(raw: unknown): Engagement {
  if (typeof raw !== "object" || raw === null) malformed("engagement");
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  if (!isEngagementKind(kind)) malformed("engagement kind");
  const mode = r.mode;
  if (!isPaymentMode(mode)) malformed("engagement mode");
  const item = r.item;
  if (typeof item !== "object" || item === null) malformed("engagement item");
  const it = item as Record<string, unknown>;
  return {
    id: requiredString(r.id, "engagement id"),
    reference: requiredString(r.reference, "engagement reference"),
    kind: kind as EngagementKind,
    client: toClient(r.client),
    prospect_id: nullableString(r.prospect_id, "engagement prospect"),
    agent: nullableString(r.agent, "engagement agent"),
    item: {
      sku: optionalString(it.sku),
      name: requiredString(it.name, "engagement item name"),
      detail: optionalString(it.detail),
      price_basis: optionalString(it.price_basis),
    },
    amount_cents: requiredInteger(r.amount_cents, "engagement amount"),
    mode,
    installments: requiredInteger(r.installments, "engagement installments", 1),
    first_due_on: requiredString(r.first_due_on, "engagement first due"),
    schedule: toSchedule(r.schedule),
    lot: toLot(r.lot),
    recorded_at: requiredString(r.recorded_at, "engagement recorded_at"),
    recorded_by: nullableString(r.recorded_by, "engagement recorded_by"),
  };
}

function toPayment(raw: unknown): Payment {
  if (typeof raw !== "object" || raw === null) malformed("payment");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "payment id"),
    engagement_id: requiredString(r.engagement_id, "payment engagement"),
    amount_cents: requiredInteger(r.amount_cents, "payment amount", 1),
    paid_on: requiredString(r.paid_on, "payment date"),
    note: optionalString(r.note),
    recorded_by: nullableString(r.recorded_by, "payment recorded_by"),
    recorded_at: requiredString(r.recorded_at, "payment recorded_at"),
  };
}

function toNoticeTemplate(raw: unknown): NoticeTemplate {
  if (typeof raw !== "object" || raw === null) malformed("notice template");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "notice template id"),
    label: requiredString(r.label, "notice template label"),
    days_before: requiredInteger(r.days_before, "notice template days_before"),
    message: requiredString(r.message, "notice template message"),
    active: requiredBoolean(r.active, "notice template active"),
    created_at: requiredString(r.created_at, "notice template created_at"),
  };
}

function toNoticeSend(raw: unknown): NoticeSend {
  if (typeof raw !== "object" || raw === null) malformed("notice send");
  const r = raw as Record<string, unknown>;
  return {
    id: requiredString(r.id, "notice send id"),
    engagement_id: requiredString(r.engagement_id, "notice send engagement"),
    template_id: requiredString(r.template_id, "notice send template"),
    seq: requiredInteger(r.seq, "notice send seq", 1),
    sent_at: requiredString(r.sent_at, "notice send sent_at"),
    sent_by: nullableString(r.sent_by, "notice send sent_by"),
  };
}

function toPersistedEvent(raw: unknown): PersistedEvent {
  if (typeof raw !== "object" || raw === null) malformed("store event");
  const r = raw as Record<string, unknown>;
  const at = requiredString(r.at, "event timestamp");
  if (r.kind === "engagement_recorded") {
    return { kind: "engagement_recorded", at, engagement: toEngagement(r.engagement) };
  }
  if (r.kind === "payment_recorded") {
    return { kind: "payment_recorded", at, payment: toPayment(r.payment) };
  }
  if (r.kind === "notice_template_saved") {
    return { kind: "notice_template_saved", at, template: toNoticeTemplate(r.template) };
  }
  if (r.kind === "notice_recorded") {
    return { kind: "notice_recorded", at, send: toNoticeSend(r.send) };
  }
  malformed(`store event kind ${String(r.kind)}`);
}

async function readPersistedEvents(): Promise<PersistedEvent[]> {
  const events = await readJournalEvents(lifecycleStorePath(), "lifecycle");
  return events.map(toPersistedEvent);
}

function persistEvents(events: PersistedEvent[]): Promise<void> {
  return writeJournalEvents(lifecycleStorePath(), "lifecycle", events);
}

const withStoreLock = createJournalLock();

type StoreState = {
  engagements: Engagement[];
  payments: Payment[];
  templates: NoticeTemplate[];
  sends: NoticeSend[];
  events: PersistedEvent[];
};

/** Seed + journal folded into the current records, in recorded order. */
async function loadState(): Promise<StoreState> {
  const seed = seedFile as unknown as SeedShape;
  const engagements: Engagement[] = [];
  const payments: Payment[] = [];
  const templates: NoticeTemplate[] = [];
  const sends: NoticeSend[] = [];
  const engagementIds = new Set<string>();

  for (const raw of seed.engagements) {
    const record = toEngagement(raw);
    if (engagementIds.has(record.id)) malformed(`duplicate engagement id ${record.id}`);
    engagementIds.add(record.id);
    engagements.push(record);
  }
  for (const raw of seed.payments) payments.push(toPayment(raw));
  for (const raw of seed.notice_templates) templates.push(toNoticeTemplate(raw));

  const events = await readPersistedEvents();
  for (const event of events) {
    if (event.kind === "engagement_recorded") {
      if (engagementIds.has(event.engagement.id)) malformed(`duplicate engagement id ${event.engagement.id}`);
      engagementIds.add(event.engagement.id);
      engagements.push(event.engagement);
    } else if (event.kind === "payment_recorded") {
      payments.push(event.payment);
    } else if (event.kind === "notice_template_saved") {
      const index = templates.findIndex((template) => template.id === event.template.id);
      if (index >= 0) templates[index] = event.template;
      else templates.push(event.template);
    } else {
      sends.push(event.send);
    }
  }
  return { engagements, payments, templates, sends, events };
}

/* ------------------------------ store API ------------------------------- */

export async function listEngagements(): Promise<Engagement[]> {
  return (await loadState()).engagements;
}

export async function getEngagement(id: string): Promise<Engagement | null> {
  return (await loadState()).engagements.find((record) => record.id === id) ?? null;
}

/** Every recorded payment; scoped to one engagement when an id is passed. */
export async function listPayments(engagementId?: string): Promise<Payment[]> {
  const payments = (await loadState()).payments;
  return engagementId
    ? payments.filter((payment) => payment.engagement_id === engagementId)
    : payments;
}

export async function listNoticeTemplates(): Promise<NoticeTemplate[]> {
  return (await loadState()).templates;
}

export async function listNoticeSends(): Promise<NoticeSend[]> {
  return (await loadState()).sends;
}

/**
 * Records one outcome durably and returns it with its allocated id and reference.
 * The reference is allocated per kind from the recorded count, so two recordings
 * can never collide in the process that owns the store.
 */
export async function recordEngagement(
  input: EngagementInput,
  actor: string | null,
  now: Date = new Date(),
): Promise<Engagement> {
  return withStoreLock(async () => {
    const { engagements, events } = await loadState();
    const nowIso = now.toISOString();
    const existing = engagements.filter((record) => record.kind === input.kind).length;
    const engagement: Engagement = {
      ...input,
      client: { ...input.client },
      item: { ...input.item },
      schedule: input.schedule ? { ...input.schedule } : null,
      lot: input.lot ? { ...input.lot } : null,
      id: `eng-${randomUUID()}`,
      reference: nextReference(input.kind, existing, now.getUTCFullYear()),
      recorded_at: nowIso,
      recorded_by: actor,
    };
    await persistEvents([...events, { kind: "engagement_recorded", at: nowIso, engagement }]);
    return { ...engagement };
  });
}

/** Records one payment durably and returns it. */
export async function recordPayment(
  input: PaymentInput,
  actor: string | null,
  now: Date = new Date(),
): Promise<Payment> {
  return withStoreLock(async () => {
    const { events } = await loadState();
    const nowIso = now.toISOString();
    const payment: Payment = {
      id: `pay-${randomUUID()}`,
      engagement_id: input.engagement_id,
      amount_cents: input.amount_cents,
      paid_on: input.paid_on,
      note: input.note,
      recorded_by: actor,
      recorded_at: nowIso,
    };
    await persistEvents([...events, { kind: "payment_recorded", at: nowIso, payment }]);
    return { ...payment };
  });
}

/** Saves one modular notice template; a repeated id edits it in place. */
export async function saveNoticeTemplate(
  input: NoticeTemplateInput & { id?: string },
  now: Date = new Date(),
): Promise<NoticeTemplate> {
  return withStoreLock(async () => {
    const { templates, events } = await loadState();
    const nowIso = now.toISOString();
    const existing = input.id ? templates.find((t) => t.id === input.id) : undefined;
    const template: NoticeTemplate = {
      id: input.id ?? `notice-${randomUUID()}`,
      label: input.label,
      days_before: input.days_before,
      message: input.message,
      active: input.active,
      created_at: existing?.created_at ?? nowIso,
    };
    await persistEvents([
      ...events,
      { kind: "notice_template_saved", at: nowIso, template },
    ]);
    return { ...template };
  });
}

/** Records that the office handed one scheduled notice off. */
export async function recordNoticeSend(
  input: { engagement_id: string; template_id: string; seq: number },
  actor: string | null,
  now: Date = new Date(),
): Promise<NoticeSend> {
  return withStoreLock(async () => {
    const { events } = await loadState();
    const nowIso = now.toISOString();
    const send: NoticeSend = {
      id: `notice-send-${randomUUID()}`,
      engagement_id: input.engagement_id,
      template_id: input.template_id,
      seq: input.seq,
      sent_at: nowIso,
      sent_by: actor,
    };
    await persistEvents([...events, { kind: "notice_recorded", at: nowIso, send }]);
    return { ...send };
  });
}

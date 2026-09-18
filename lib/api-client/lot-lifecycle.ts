/**
 * Typed data access for the lot-record screens (Ownership · Transfers ·
 * Interments · Exhumations — captain checklist F-11, 2026-09-18).
 *
 * ⚠ NO SERVICE OWNS ANY OF THIS YET, and the screens say so once each.
 * lot-events-v1 (KEB-D3-01, FROZEN) names `occupied` and `for_transfer` as
 * statuses only — "Interment and transfer workflows … do not [exist]" — and its
 * Lot resource has no ownership projection at all. So this client reads the
 * office's own recorded file (`lib/fixtures/property/lot-lifecycle.json`,
 * app-authored example data with provenance) — the same pattern as
 * `lib/api-client/family.ts` — and composes the OWNERSHIP card from records the
 * app really has: the frozen Lot (property.ts), the captured purchase
 * application (purchase-applications.ts) and the documents repository
 * (documents.ts).
 *
 * Nothing is invented at this seam. A record the fixture does not carry reads
 * as an absent state the screen prints ("No owner recorded", "No date
 * recorded"); the papers join reports whether the repository could be read at
 * all rather than pretending a paper does not exist. A malformed seed crashes
 * loudly (500) instead of surfacing half-shaped rows.
 *
 * When the deferred workflows land, this module gains a live branch and the
 * fixture's provenance comments are replaced by contract references.
 */
import lifecycleFile from "@/lib/fixtures/property/lot-lifecycle.json";
import { ApiError } from "@/lib/api-client/api-error";
import { listDocuments } from "@/lib/api-client/documents";
import { getPurchaseApplicationForLot } from "@/lib/api-client/purchase-applications";
import { getLot, type Lot } from "@/lib/api-client/property";
import { buyerFullName } from "@/lib/contracts/purchase-application";
import {
  exhumationSummary,
  intermentSummary,
  intermentClauseFor,
  isTransferState,
  ownershipSummary,
  transferSummary,
  type IntermentState,
  type LotExhumation,
  type LotInterment,
  type LotTransfer,
  type OfficeStep,
  type OfficeStepState,
  type ResolvedPaper,
} from "@/lib/lot-lifecycle";

/** The records are app-authored, so there is no live branch to claim. */
export function lotLifecycleLiveModeEnabled(): boolean {
  return false;
}

export const LOT_LIFECYCLE_NOT_WIRED =
  "the lot-record workflows are deferred in lot-events-v1 (occupied and for_transfer " +
  "are status-only); these screens read the office's own recorded file.";

/* ------------------------------ the readers ------------------------------ */

type RawStore = {
  tenant_id: string;
  papers: unknown[];
  transfers: unknown[];
  interments: unknown[];
  exhumations: unknown[];
};

function readStore(): RawStore {
  const raw = lifecycleFile as unknown;
  if (typeof raw !== "object" || raw === null || !("papers" in (raw as object))) {
    throw new ApiError("lot-lifecycle fixture is malformed", 500);
  }
  const store = raw as unknown as Partial<RawStore>;
  return {
    tenant_id: String(store.tenant_id ?? ""),
    papers: Array.isArray(store.papers) ? store.papers : [],
    transfers: Array.isArray(store.transfers) ? store.transfers : [],
    interments: Array.isArray(store.interments) ? store.interments : [],
    exhumations: Array.isArray(store.exhumations) ? store.exhumations : [],
  };
}

function fail(what: string): never {
  throw new ApiError(`lot-lifecycle fixture: malformed ${what}`, 500);
}

function requiredString(row: Record<string, unknown>, key: string, what: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") fail(what);
  return value.trim();
}

function optionalString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function stringList(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
}

const STEP_STATES: ReadonlyArray<OfficeStepState> = ["done", "waiting", "attention"];

function toSteps(raw: unknown, what: string): OfficeStep[] {
  if (!Array.isArray(raw)) fail(what);
  return raw.map((entry) => {
    if (typeof entry !== "object" || entry === null) fail(what);
    const row = entry as Record<string, unknown>;
    const state = row.state;
    if (typeof state !== "string" || !(STEP_STATES as readonly string[]).includes(state)) {
      fail(what);
    }
    return {
      key: requiredString(row, "key", what),
      label: requiredString(row, "label", what),
      state: state as OfficeStepState,
      on: optionalString(row, "on"),
      note: optionalString(row, "note"),
    };
  });
}

function toTransfer(raw: unknown): LotTransfer {
  const what = "transfer record";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  const state = row.state;
  if (!isTransferState(state)) fail(what);
  return {
    id: requiredString(row, "id", what),
    lot_id: requiredString(row, "lot_id", what),
    lot_number: requiredString(row, "lot_number", what),
    from: requiredString(row, "from", what),
    to: requiredString(row, "to", what),
    to_note: optionalString(row, "to_note"),
    asked_on: requiredString(row, "asked_on", what),
    state,
    steps: toSteps(row.steps, what),
    still_needed: stringList(row, "still_needed"),
    requirements: stringList(row, "requirements"),
  };
}

function toInterment(raw: unknown): LotInterment {
  const what = "interment record";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  const state = row.state;
  if (state !== "interred" && state !== "preparing") fail(what);
  const papers = Array.isArray(row.papers)
    ? row.papers.map((entry) => {
        if (typeof entry !== "object" || entry === null) fail(what);
        const paper = entry as Record<string, unknown>;
        return {
          document_number: requiredString(paper, "document_number", what),
          role: requiredString(paper, "role", what),
        };
      })
    : [];
  return {
    id: requiredString(row, "id", what),
    lot_id: requiredString(row, "lot_id", what),
    lot_number: requiredString(row, "lot_number", what),
    deceased_name: requiredString(row, "deceased_name", what),
    case_id: requiredString(row, "case_id", what),
    case_number: requiredString(row, "case_number", what),
    state: state as IntermentState,
    interred_on: optionalString(row, "interred_on"),
    checks: toSteps(row.checks, what),
    papers,
  };
}

function toExhumation(raw: unknown): LotExhumation {
  const what = "exhumation record";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  const state = row.state;
  if (state !== "open" && state !== "completed") fail(what);
  return {
    id: requiredString(row, "id", what),
    lot_id: requiredString(row, "lot_id", what),
    lot_number: requiredString(row, "lot_number", what),
    interment_id: requiredString(row, "interment_id", what),
    deceased_name: requiredString(row, "deceased_name", what),
    asked_by: requiredString(row, "asked_by", what),
    asked_on: requiredString(row, "asked_on", what),
    reason: requiredString(row, "reason", what),
    destination: requiredString(row, "destination", what),
    state,
    steps: toSteps(row.steps, what),
    record: requiredString(row, "record", what),
  };
}

function toPaper(raw: unknown): { lot_id: string; document_number: string; backs: string } {
  const what = "paper record";
  if (typeof raw !== "object" || raw === null) fail(what);
  const row = raw as Record<string, unknown>;
  return {
    lot_id: requiredString(row, "lot_id", what),
    document_number: requiredString(row, "document_number", what),
    backs: requiredString(row, "backs", what),
  };
}

/* ------------------------------- the lists ------------------------------- */

/** The lot's transfer requests, newest first. */
export async function listLotTransfers(lotId: string): Promise<LotTransfer[]> {
  return readStore()
    .transfers.map(toTransfer)
    .filter((record) => record.lot_id === lotId)
    .sort((a, b) => b.asked_on.localeCompare(a.asked_on));
}

/** The lot's interment records, ground-opened first, then preparing. */
export async function listLotInterments(lotId: string): Promise<LotInterment[]> {
  return readStore()
    .interments.map(toInterment)
    .filter((record) => record.lot_id === lotId);
}

/** The lot's exhumation requests, newest first. */
export async function listLotExhumations(lotId: string): Promise<LotExhumation[]> {
  return readStore()
    .exhumations.map(toExhumation)
    .filter((record) => record.lot_id === lotId)
    .sort((a, b) => b.asked_on.localeCompare(a.asked_on));
}

/* ------------------------------ the ownership ---------------------------- */

export type OwnershipPerson = { name: string; relationship: string | null; age: number | null };

export type LotOwnership = {
  /** The name the papers stand in — the lot record's owner, else the application's buyer. */
  owner: string | null;
  acquisition: {
    kind: "reserved" | "sold" | null;
    on: string | null;
  };
  /** The captured purchase application, when this mode can read one. */
  buyer: {
    name: string;
    on: string;
    classification: string | null;
    mode_of_payment: string | null;
  } | null;
  /** False when live mode / a read failure kept the application away. */
  application_available: boolean;
  /** Always empty: no co-owner projection exists upstream (the gap the screen names). */
  co_owners: string[];
  authorised_family: OwnershipPerson[];
  right_of_interment: {
    holder: string | null;
    /** The client's own operative rule on interment, from the governing revision. */
    rule: string;
    /** The revision the rule was read from (printed as the citation). */
    clause_revision: string;
    /** The application's first-interment / funeral-bundle line, when it carries one. */
    first_interment: "included" | "not_included" | null;
  };
  papers: ResolvedPaper[];
  /** False when the documents repository could not be read at all. */
  papers_available: boolean;
};

const MODE_LABEL: Record<string, string> = {
  annual: "Annual",
  semi_annual: "Semi-annual",
  quarterly: "Quarterly",
  monthly: "Monthly",
};

/**
 * The lot's ownership card as the recorded papers stand. `lot` is passed in by
 * the page (it already read the lot to gate the route), so this never re-fetches.
 */
export async function getLotOwnership(lot: Lot): Promise<LotOwnership> {
  // 1. The purchase application (recorded capture; live mode has no contract → unavailable).
  let buyer: LotOwnership["buyer"] = null;
  let applicationAvailable = true;
  let beneficiaries: OwnershipPerson[] = [];
  let firstInterment: LotOwnership["right_of_interment"]["first_interment"] = null;
  let applicationRecord: Awaited<ReturnType<typeof getPurchaseApplicationForLot>> = null;
  try {
    applicationRecord = await getPurchaseApplicationForLot(lot.id);
  } catch {
    applicationAvailable = false;
  }
  if (applicationRecord) {
    const mode = applicationRecord.mode_of_payment
      ? (MODE_LABEL[applicationRecord.mode_of_payment] ?? applicationRecord.mode_of_payment)
      : null;
    buyer = {
      name: buyerFullName(applicationRecord),
      on: applicationRecord.application_date,
      classification: applicationRecord.classification,
      mode_of_payment:
        mode && applicationRecord.amortization_value !== null
          ? `${mode} · ${applicationRecord.amortization_value} ${applicationRecord.amortization_unit ?? ""}`.trim()
          : mode,
    };
    beneficiaries = applicationRecord.beneficiaries.map((person) => ({
      name: person.name,
      relationship: person.relationship || null,
      age: person.age,
    }));
    const inclusion = applicationRecord.interment_funeral_bundle_inclusion;
    firstInterment =
      inclusion === "included" || inclusion === "not_included" ? inclusion : null;
  }

  // 2. The papers the office's file links to this lot, joined to the repository.
  const linked = readStore().papers.map(toPaper).filter((paper) => paper.lot_id === lot.id);
  let papers: ResolvedPaper[] = [];
  let papersAvailable = true;
  try {
    const repository = await listDocuments();
    const byNumber = new Map(repository.map((doc) => [doc.document_number, doc]));
    papers = linked.map((paper) => {
      const doc = byNumber.get(paper.document_number);
      return {
        ...paper,
        title: doc?.title ?? null,
        status: doc?.status ?? null,
        uploaded_on: doc?.uploaded_at ? doc.uploaded_at.slice(0, 10) : null,
        document_id: doc?.id ?? null,
      };
    });
  } catch {
    papersAvailable = false;
    papers = linked.map((paper) => ({
      ...paper,
      title: null,
      status: null,
      uploaded_on: null,
      document_id: null,
    }));
  }

  // 3. The owner as the papers stand: the lot record first, the application's buyer second.
  const owner = lot.owner_name ?? buyer?.name ?? null;
  const acquisition: LotOwnership["acquisition"] =
    lot.sold_at !== null
      ? { kind: "sold", on: lot.sold_at }
      : lot.reserved_at !== null
        ? { kind: "reserved", on: lot.reserved_at }
        : { kind: null, on: null };
  const terms = intermentClauseFor(acquisition.on);

  return {
    owner,
    acquisition,
    buyer,
    application_available: applicationAvailable,
    co_owners: [],
    authorised_family: beneficiaries,
    right_of_interment: {
      holder: owner,
      rule: terms.rule,
      clause_revision: terms.revision,
      first_interment: firstInterment,
    },
    papers,
    papers_available: papersAvailable,
  };
}

/* --------------------------- the entry summaries ------------------------- */

export type LotRecordSummaries = {
  ownership: { lead: string; detail: string };
  transfers: { lead: string; detail: string };
  interments: { lead: string; detail: string };
  exhumations: { lead: string; detail: string };
};

/** The four one-line states the lot detail page lists under "Lot records". */
export async function getLotRecordSummaries(lot: Lot): Promise<LotRecordSummaries> {
  const [transfers, interments, exhumations] = await Promise.all([
    listLotTransfers(lot.id),
    listLotInterments(lot.id),
    listLotExhumations(lot.id),
  ]);
  return {
    ownership: ownershipSummary(lot),
    transfers: transferSummary(transfers),
    interments: intermentSummary(interments),
    exhumations: exhumationSummary(exhumations),
  };
}

/** Re-exported so pages can fetch the lot and its records in one import. */
export { getLot };

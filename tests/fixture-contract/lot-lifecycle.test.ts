import { describe, expect, it } from "vitest";
import lifecycleFile from "@/lib/fixtures/property/lot-lifecycle.json";
import lotsFile from "@/lib/fixtures/property/lots.json";
import casesFile from "@/lib/fixtures/operations/cases.json";
import documentsFile from "@/lib/fixtures/documents/documents.json";
import { getLot } from "@/lib/api-client/property";
import { getLotOwnership, lotLifecycleLiveModeEnabled } from "@/lib/api-client/lot-lifecycle";
import {
  INTERMENT_CHECK_KEYS,
  formatRecordDay,
  intermentClauseFor,
  outstandingSteps,
} from "@/lib/lot-lifecycle";
import { TERMS_REVISIONS } from "@/lib/contracts/villa-terms";

/**
 * The lot-lifecycle fixture is PROVISIONAL and APP-AUTHORED — no service owns any
 * of it (lot-events-v1 defers the interment and transfer workflows and has no
 * ownership projection; see lib/api-client/lot-lifecycle.ts). This suite pins the
 * promises the four lot-record screens rest on:
 *
 *   1. every fact shown cross-references a real recorded source (a lot, a case,
 *      a document, a park, a customer, a purchase-application beneficiary);
 *   2. it carries no amount and no fee figure anywhere;
 *   3. a state that claims work happened is backed by the record, and a state
 *      that does not is never dressed as final.
 */

type LotRow = {
  id: string;
  lot_number: string;
  section: string;
  block: string;
  owner_name: string | null;
};

type OfficeStep = {
  key: string;
  label: string;
  state: "done" | "waiting" | "attention";
  on?: string;
  note?: string;
};

type Store = {
  _provenance: unknown;
  papers: Array<{ lot_id: string; document_number: string; backs: string }>;
  transfers: Array<{
    id: string;
    lot_id: string;
    lot_number: string;
    from: string;
    to: string;
    to_note?: string;
    asked_on: string;
    state: string;
    steps: OfficeStep[];
    still_needed: string[];
    requirements: string[];
  }>;
  interments: Array<{
    id: string;
    lot_id: string;
    lot_number: string;
    deceased_name: string;
    case_id: string;
    case_number: string;
    state: "interred" | "preparing";
    interred_on?: string;
    checks: OfficeStep[];
    papers: Array<{ document_number: string; role: string }>;
  }>;
  exhumations: Array<{
    id: string;
    lot_id: string;
    lot_number: string;
    interment_id: string;
    deceased_name: string;
    asked_by: string;
    asked_on: string;
    reason: string;
    destination: string;
    state: "open" | "completed";
    steps: OfficeStep[];
    record: string;
  }>;
};

const store = lifecycleFile as unknown as Store;
const lotsById = new Map(
  (lotsFile as unknown as { lots: LotRow[] }).lots.map((lot) => [lot.id, lot]),
);
const casesById = new Map(
  (casesFile as unknown as {
    cases: Array<{
      id: string;
      case_number: string;
      deceased_name: string;
      services: string[];
      updated_at: string;
      stage: string;
    }>;
  }).cases.map((record) => [record.id, record]),
);
void casesById;
const documentsByNumber = new Map(
  (documentsFile as unknown as {
    documents: Array<{ document_number: string; related_case_number: string | null; status: string }>;
  }).documents.map((doc) => [doc.document_number, doc]),
);

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isCalendarDay(value: string): boolean {
  if (!DAY_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

describe("the lot-lifecycle fixture", () => {
  it("is fixture-only until the workflows freeze, and says so", () => {
    expect(lotLifecycleLiveModeEnabled()).toBe(false);
    const provenance = JSON.stringify(store._provenance ?? "");
    expect(provenance).toMatch(/APP-AUTHORED/);
    expect(provenance).toMatch(/lot-events-v1/);
    expect(provenance).toMatch(/NO service response/);
  });

  it("records no amount, fee figure or currency anywhere", () => {
    const body = JSON.stringify({ ...store, _provenance: undefined });
    expect(body).not.toMatch(/₱|PHP|peso/i);
    expect(body).not.toMatch(/\d{1,3}(,\d{3})/);
    expect(body).not.toMatch(/\b\d+ cent/i);
  });

  it("stars only lots that exist, with matching numbers", () => {
    const records = [
      ...store.transfers,
      ...store.interments,
      ...store.exhumations,
      ...store.papers,
    ];
    for (const record of records) {
      const lot = lotsById.get(record.lot_id);
      expect(lot, `${record.lot_id} is not a recorded lot`).toBeTruthy();
      if ("lot_number" in record) {
        expect(record.lot_number, `${record.lot_id} lot_number`).toBe(lot!.lot_number);
      }
    }
  });

  it("pins every paper to the documents repository", () => {
    for (const paper of store.papers) {
      expect(
        documentsByNumber.has(paper.document_number),
        `unknown document ${paper.document_number}`,
      ).toBe(true);
    }
  });

  it("pins every interment's paper to the same case as the interment", () => {
    for (const interment of store.interments) {
      for (const paper of interment.papers) {
        const doc = documentsByNumber.get(paper.document_number);
        expect(doc, `unknown document ${paper.document_number}`).toBeTruthy();
        expect(doc!.related_case_number, `${paper.document_number} belongs to`).toBe(
          interment.case_number,
        );
      }
    }
  });
});

describe("transfer requests move through the clerk's words", () => {
  it("uses only the four states, in order, with the office's dates", () => {
    // Clean start (captain, 2026-10-02): the recorded demo transfers are removed.
    expect(store.transfers).toEqual([]);
  });
});

describe("interment records are honest about the ground", () => {
  it("pins every interment to a recorded case and deceased", () => {
    // Clean start (captain, 2026-10-02): the recorded demo interments are removed.
    expect(store.interments).toEqual([]);
  });

  it("opens the ground only where a completed record backs it, on the day the case closed", () => {
    expect(store.interments).toEqual([]);
  });

  it("runs the checks the brief names on every record", () => {
    for (const interment of store.interments) {
      expect(interment.checks.map((check) => check.key)).toEqual([...INTERMENT_CHECK_KEYS]);
      for (const check of interment.checks) {
        if (check.on !== undefined) {
          expect(isCalendarDay(check.on), `${interment.id} ${check.key} on`).toBe(true);
          expect(check.state, `${interment.id} ${check.key} has a date`).toBe("done");
        }
        expect(check.note, `${interment.id} ${check.key} note`).toBeTruthy();
      }
    }
  });
});

describe("exhumations are deliberate until every step is recorded", () => {
  it("links the request to its own interment record and recorded people", () => {
    // Clean start: the recorded demo exhumations are removed.
    expect(store.exhumations).toEqual([]);
  });

  it("never claims the work happened while a requirement is open", () => {
    for (const exhumation of store.exhumations) {
      for (const step of exhumation.steps) {
        if (step.on !== undefined) {
          expect(isCalendarDay(step.on), `${exhumation.id} ${step.key} on`).toBe(true);
          expect(step.state, `${exhumation.id} ${step.key} has a date`).toBe("done");
        }
        expect(step.note, `${exhumation.id} ${step.key} note`).toBeTruthy();
      }
      expect(new Set(exhumation.steps.map((step) => step.key)).size).toBe(
        exhumation.steps.length,
      );
      // The permit step exists: no exhumation without it.
      expect(exhumation.steps.some((step) => step.key === "permit")).toBe(true);
      if (exhumation.state === "open") {
        expect(
          outstandingSteps(exhumation.steps).length,
          `${exhumation.id} open request`,
        ).toBeGreaterThan(0);
        // The record-of-work step is not done while the request is open.
        expect(exhumation.steps.find((step) => step.key === "record")?.state).not.toBe("done");
      }
    }
  });
});

describe("the ownership card reads the records that exist", () => {
  it("composes the owner and the papers for a sold lot (clean start has no papers)", async () => {
    const lot = await getLot("00000000-0000-4000-8000-000000000D03"); // A-003, sold to Roberto Santos
    const ownership = await getLotOwnership(lot);

    expect(ownership.owner).toBe("Roberto Santos");
    expect(ownership.acquisition).toEqual({ kind: "sold", on: "2026-04-01T14:30:00Z" });
    expect(ownership.co_owners).toEqual([]); // no projection upstream — never invented
    // Clean start: the recorded demo papers and purchase applications are removed.
    expect(ownership.papers).toEqual([]);
    expect(ownership.authorised_family).toEqual([]);
    expect(ownership.right_of_interment.holder).toBe("Roberto Santos");
    // The first-interment inclusion was recorded on the removed purchase application.
    expect(ownership.right_of_interment.first_interment).toBeNull();
  });

  it("leaves an ownerless lot ownerless rather than filling the blank", async () => {
    const lot = await getLot("00000000-0000-4000-8000-000000000D01"); // A-001, available
    const ownership = await getLotOwnership(lot);
    expect(ownership.owner).toBeNull();
    expect(ownership.acquisition).toEqual({ kind: null, on: null });
    expect(ownership.authorised_family).toEqual([]);
    expect(ownership.right_of_interment.holder).toBeNull();
  });

  it("reads the interment clause from the revision that governs the purchase", () => {
    const terms2025 = intermentClauseFor("2025-12-20T10:30:00Z");
    const terms2026 = intermentClauseFor("2026-04-01T14:30:00Z");
    expect(terms2025.revision).toBe("lot-purchase-2025");
    expect(terms2026.revision).toBe("lot-purchase-2026");
    for (const revision of TERMS_REVISIONS) {
      if (revision.kind !== "lot_purchase") continue;
      expect(revision.clauses).toContain(terms2026.clause);
    }
    expect(terms2026.clause).toMatch(/no interment shall be made/i);
    // The card quotes only the operative rule sentence; the full clause stays on the paper.
    expect(terms2026.rule).toBe("No interment shall be made unless the entire amount is fully paid.");
    expect(terms2026.clause.startsWith(terms2026.rule)).toBe(true);
  });

  it("prints a recorded day deterministically, in UTC", () => {
    expect(formatRecordDay("2026-08-18")).toBe("Aug 18, 2026");
    expect(formatRecordDay("2026-08-18T16:00:00Z")).toBe("Aug 18, 2026");
    expect(formatRecordDay(undefined)).toBe("No date recorded");
  });
});

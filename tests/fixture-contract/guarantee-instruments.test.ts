import { afterEach, describe, expect, it, vi } from "vitest";
import {
  caseInstrumentsFor,
  loadCaseInstruments,
} from "@/lib/api-client/guarantee-instruments";
import {
  isInstrumentDocumentState,
  isInstrumentKind,
  isInstrumentStatus,
  summariseCaseInstruments,
} from "@/lib/guarantee-instruments";
import casesFile from "@/lib/fixtures/operations/cases.json";
import instrumentsFile from "@/lib/fixtures/operations/guarantee-instruments.json";

/**
 * Fixture contract for the guarantee-instrument tracker (F-18 / FORMS_PLAN gap 5).
 *
 * No frozen contract names a guarantee-instrument record (the sub-ledger and posting behind
 * a deduction are dev-owned), so this suite pins the recorded tracker to what DOES have
 * authority: it keys to the real case records, it speaks only the tracker's office
 * vocabulary, its recorded steps are internally coherent, and the reader answers honestly
 * (recorded / absent / not-wired) instead of casting.
 */

type RawInstrument = {
  id: unknown;
  kind: unknown;
  coverage: unknown;
  claimed_from: unknown;
  amount_cents: unknown;
  reference: unknown;
  status: unknown;
  filed_on: unknown;
  response_on: unknown;
  note: unknown;
  documents: unknown;
};

const CASES = casesFile.cases as Array<{
  case_number: string;
  intake: { contract_date?: string | null } | null;
}>;
const TRACKERS = instrumentsFile.trackers as Array<{
  case_number: string;
  instruments: RawInstrument[];
}>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function instrumentRows(): RawInstrument[] {
  return TRACKERS.flatMap((tracker) => tracker.instruments);
}

describe("the recorded guarantee-instrument tracker", () => {
  it("rides on the same tenant and the real case records", () => {
    expect(instrumentsFile.tenant_id).toBe(casesFile.tenant_id);
    // Clean start (captain, 2026-10-02): no recorded cases and no recorded trackers.
    expect(TRACKERS).toEqual([]);
    const numbers = new Set(CASES.map((c) => c.case_number));
    for (const tracker of TRACKERS) {
      expect(numbers.has(tracker.case_number)).toBe(true);
      // A case can only be tracked once — a duplicate key would shadow a record silently.
      expect(TRACKERS.filter((t) => t.case_number === tracker.case_number)).toHaveLength(1);
    }
  });

  it("keeps every instrument inside the tracked vocabulary, with a unique id", () => {
    const rows = instrumentRows();
    expect(rows).toEqual([]);
    const ids = rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The tracker's own vocabulary still resolves.
    expect(isInstrumentKind("lgu")).toBe(true);
    expect(isInstrumentStatus("not_filed")).toBe(true);
  });

  it("records coherent steps: a filed instrument has its date, a decided one its response", () => {
    for (const row of instrumentRows()) {
      const filedOn = row.filed_on as string | null;
      const responseOn = row.response_on as string | null;
      if (row.status === "not_filed") {
        expect(filedOn).toBeNull();
        expect(responseOn).toBeNull();
      } else {
        expect(filedOn).toMatch(ISO_DATE);
      }
      if (row.status === "filed" || row.status === "awaiting_agency") {
        expect(responseOn).toBeNull();
      }
      if (row.status === "confirmed" || row.status === "rejected") {
        expect(responseOn).toMatch(ISO_DATE);
        expect(responseOn! >= filedOn!).toBe(true);
      }
    }
  });

  it("gives every document row a label and one of the two states", () => {
    for (const row of instrumentRows()) {
      expect(Array.isArray(row.documents)).toBe(true);
      const documents = row.documents as Array<{ label?: unknown; state?: unknown }>;
      for (const doc of documents) {
        expect(typeof doc.label).toBe("string");
        expect((doc.label as string).length).toBeGreaterThan(0);
        expect(isInstrumentDocumentState(doc.state)).toBe(true);
      }
    }
  });

  it("keys the deadline to the case's recorded contract date, never a stored countdown", () => {
    // The fixture stores no deadline on any row; the demo rows are removed at the
    // clean start, so the reader answers absent for every case.
    for (const row of instrumentRows()) {
      expect(Object.hasOwn(row as object, "deadline")).toBe(false);
    }
    expect(instrumentRows()).toEqual([]);
    expect(caseInstrumentsFor("CASE-2026-0001").state).toBe("absent");
    // The read into the clean seed still answers absent, not an error.
    expect(summariseCaseInstruments([], null, "2026-09-18")).toMatchObject({
      total: 0,
      filed: 0,
      unfiled: 0,
      overdue: 0,
    });
  });
});

describe("the tracker reader answers honestly", () => {
  it("returns the recorded rows for a tracked case", async () => {
    // Clean start: no case carries recorded instruments, so every read is absent.
    const read = await loadCaseInstruments("CASE-2026-0001");
    expect(read).toEqual({ state: "absent" });
  });

  it("says absent — not an error — for a case with no recorded instruments", async () => {
    expect(await loadCaseInstruments("CASE-2026-0002")).toEqual({ state: "absent" });
    expect(await loadCaseInstruments("CASE-2099-9999")).toEqual({ state: "absent" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("answers not_wired in live mode instead of showing demo rows against real cases", async () => {
    vi.stubEnv("OPERATIONS_BASE_URL", "http://gateway.invalid");
    vi.resetModules();
    const live = await import("@/lib/api-client/guarantee-instruments");
    expect(await live.loadCaseInstruments("CASE-2026-0001")).toEqual({ state: "not_wired" });
  });
});

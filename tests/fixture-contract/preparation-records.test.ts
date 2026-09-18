import { describe, expect, it } from "vitest";
import preparationFile from "@/lib/fixtures/operations/preparation-records.json";
import casesFile from "@/lib/fixtures/operations/cases.json";
import employeesFile from "@/lib/fixtures/hr/employees.json";
import { getPreparationRecord, PREPARATION_STEP_KEYS } from "@/lib/api-client/preparation";
import { listCases } from "@/lib/api-client/operations";
import { PREPARATION_STEP_ORDER } from "@/lib/preparation-record";

/**
 * The preparation-record fixture is PROVISIONAL — no frozen preparation API exists
 * (funeral-cases is unbuilt; `case-events-v1` names no embalming/preparation endpoint).
 * This suite pins the promises the record screen rests on:
 *
 *   1. every record belongs to a real case the office could have prepared;
 *   2. the people named are the HR directory's own employees, never invented staff;
 *   3. the four steps are present in work order and a step reads "completed" only
 *      with the instant it was recorded — nothing is marked done without a record;
 *   4. the record agrees with the case's own task lines and timeline;
 *   5. it carries no amount and no location.
 */
type RecordStep = {
  key: string;
  state: string;
  at: string | null;
  note: string | null;
};

type PreparationRecordFixture = {
  case_number: string;
  state: string;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  embalmer: string;
  assistant: string | null;
  steps: RecordStep[];
  notes: string | null;
};

const fixture = preparationFile as unknown as {
  _provenance: { status?: string; note?: string[] | string };
  tenant_id: string;
  records: PreparationRecordFixture[];
};

const CASES = casesFile as unknown as {
  tenant_id: string;
  cases: Array<{
    id: string;
    case_number: string;
    stage: string;
    created_at: string;
    updated_at: string;
    deceased_name: string;
    tasks: Array<{ title: string; status: string }>;
  }>;
};

const EMPLOYEE_NAMES = new Set(
  (employeesFile as unknown as { employees: Array<{ first_name: string; last_name: string }> })
    .employees.map((e) => `${e.first_name} ${e.last_name}`),
);

const STAGE_ORDER = [
  "inquiry",
  "retrieval",
  "preparation",
  "viewing",
  "ceremony",
  "interment",
  "completed",
] as const;

const STATE_RANK: Record<string, number> = {
  scheduled: 0,
  in_progress: 1,
  completed: 2,
};

function caseOf(caseNumber: string) {
  return CASES.cases.find((c) => c.case_number === caseNumber);
}

describe("the preparation-record fixture", () => {
  it("is fixture-only until a preparation contract freezes, and says so", async () => {
    const { operationsLiveModeEnabled } = await import("@/lib/api-client/operations");
    expect(operationsLiveModeEnabled()).toBe(false);
    const provenance = JSON.stringify(fixture._provenance);
    expect(provenance).toMatch(/PROVISIONAL/);
    expect(provenance).toMatch(/no preparation API contract/i);
  });

  it("belongs to the same tenant as the cases it extends", () => {
    expect(fixture.tenant_id).toBe(CASES.tenant_id);
  });

  it("only records work on a case that had reached the preparation stage", () => {
    for (const record of fixture.records) {
      const kase = caseOf(record.case_number);
      expect(kase, `record for unknown case ${record.case_number}`).toBeDefined();
      expect(
        STAGE_ORDER.indexOf(kase!.stage as (typeof STAGE_ORDER)[number]),
        `${record.case_number} is at ${kase!.stage}`,
      ).toBeGreaterThanOrEqual(STAGE_ORDER.indexOf("preparation"));
    }
    // …and a case that never reached preparation has no record to read.
    for (const kase of CASES.cases) {
      if (STAGE_ORDER.indexOf(kase.stage as (typeof STAGE_ORDER)[number]) < STAGE_ORDER.indexOf("preparation")) {
        expect(
          fixture.records.some((r) => r.case_number === kase.case_number),
          `${kase.case_number} is at ${kase.stage} but carries a preparation record`,
        ).toBe(false);
      }
    }
  });

  it("names only people who work in the HR directory", () => {
    for (const record of fixture.records) {
      expect(EMPLOYEE_NAMES, `embalmer ${record.embalmer}`).toContain(record.embalmer);
      if (record.assistant !== null) {
        expect(EMPLOYEE_NAMES, `assistant ${record.assistant}`).toContain(record.assistant);
      }
    }
  });

  it("carries the four steps in the order the work happens", () => {
    for (const record of fixture.records) {
      expect(
        record.steps.map((step) => step.key),
        `${record.case_number} steps`,
      ).toEqual([...PREPARATION_STEP_ORDER]);
    }
  });

  it("marks a step done only with the instant recorded, and never past an unfinished step", () => {
    for (const record of fixture.records) {
      // Work is sequential: once a step is unfinished, nothing after it may read completed.
      const firstIncomplete = record.steps.findIndex((step) => step.state !== "completed");
      if (firstIncomplete !== -1) {
        for (const step of record.steps.slice(firstIncomplete)) {
          expect(
            step.state,
            `${record.case_number} marks ${step.key} done past an unfinished step`,
          ).not.toBe("completed");
        }
      }
      for (const step of record.steps) {
        expect(STATE_RANK[step.state], `unknown step state ${step.state}`).toBeDefined();
        if (step.state === "completed") {
          expect(
            step.at,
            `${record.case_number} ${step.key} is completed without a recorded time`,
          ).not.toBeNull();
          expect(Number.isNaN(new Date(step.at as string).getTime())).toBe(false);
        } else {
          expect(step.at, `${record.case_number} ${step.key} has a time but is not completed`).toBeNull();
        }
      }
    }
  });

  it("keeps the record's overall state exactly what its steps show", () => {
    for (const record of fixture.records) {
      const ranks = record.steps.map((step) => STATE_RANK[step.state]);
      if (record.state === "completed") {
        expect(record.completed_at, `${record.case_number} completed without a time`).not.toBeNull();
        expect(ranks, `${record.case_number} says completed but a step does not`).toEqual([
          2, 2, 2, 2,
        ]);
      } else if (record.state === "in_progress") {
        expect(record.completed_at).toBeNull();
        expect(ranks).toContain(1);
        expect(ranks).not.toContain(2);
      } else if (record.state === "scheduled") {
        expect(record.completed_at).toBeNull();
        expect(record.started_at).toBeNull();
        expect(ranks.every((rank) => rank === 0)).toBe(true);
      }
    }
  });

  it("dates the work inside the case's own lifetime", () => {
    for (const record of fixture.records) {
      const kase = caseOf(record.case_number)!;
      const created = new Date(kase.created_at).getTime();
      const updated = new Date(kase.updated_at).getTime();
      for (const value of [record.scheduled_for, record.started_at, record.completed_at]) {
        if (!value) continue;
        const at = new Date(value).getTime();
        expect(at, `${record.case_number} records work before the case opened`).toBeGreaterThanOrEqual(created);
        expect(at, `${record.case_number} records work after the case's last update`).toBeLessThanOrEqual(updated);
      }
      if (record.started_at && record.completed_at) {
        expect(new Date(record.started_at).getTime()).toBeLessThanOrEqual(
          new Date(record.completed_at).getTime(),
        );
      }
    }
  });

  it("agrees with the case's own task line about embalming", () => {
    // The case task is what the office recorded before this record existed: a done
    // "embalming" task means the record's embalming step is completed; an in-progress
    // start means the record's embalming step is in progress.
    for (const record of fixture.records) {
      const kase = caseOf(record.case_number)!;
      const embalmingTask = kase.tasks.find((task) => /embalm/i.test(task.title));
      expect(embalmingTask, `${record.case_number} has no embalming task`).toBeDefined();
      const step = record.steps.find((s) => s.key === "embalming")!;
      if (embalmingTask!.status === "done") {
        expect(step.state, `${record.case_number}: task done but step ${step.state}`).toBe("completed");
      } else if (embalmingTask!.status === "in_progress") {
        expect(step.state, `${record.case_number}: task in progress but step ${step.state}`).toBe(
          "in_progress",
        );
      }
    }
  });

  it("reads back through the client exactly as recorded", async () => {
    for (const record of fixture.records) {
      const parsed = await getPreparationRecord(record.case_number);
      expect(parsed).not.toBeNull();
      expect(parsed!.case_number).toBe(record.case_number);
      expect(parsed!.state).toBe(record.state);
      expect(parsed!.embalmer).toBe(record.embalmer);
      expect(parsed!.steps.map((s) => s.key)).toEqual([...PREPARATION_STEP_KEYS]);
    }
    expect(await getPreparationRecord("CASE-2026-0002")).toBeNull();
  });

  it("keeps every amount and every location out of the record", () => {
    const body = JSON.stringify({ ...fixture, _provenance: undefined });
    expect(body).not.toMatch(/₱|PHP|cent|peso/i);
    expect(body).not.toMatch(/location|address|place of death|cemetery|chapel/i);
  });

  it("keeps the deceased's identity to what the case already carries", () => {
    // The record names the people who did the work; the deceased's name comes from
    // the case, never from this file.
    const body = JSON.stringify(fixture.records);
    for (const kase of CASES.cases) {
      if (kase.deceased_name === "Pending intake") continue;
      expect(body).not.toContain(kase.deceased_name);
    }
  });

  it("keeps the reader and the raw fixture agreeing on the seeded record shape", async () => {
    const cases = await listCases();
    expect(cases.length).toBeGreaterThan(0);
    const first = await getPreparationRecord("CASE-2026-0001");
    expect(first!.notes).toContain("barong");
    expect(first!.steps.find((s) => s.key === "cosmetics")!.state).toBe("completed");
  });
});

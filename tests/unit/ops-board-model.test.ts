import { describe, expect, it } from "vitest";
import { CASE_STAGES } from "@/lib/operations/case-board";
import {
  buildOpsBoard,
  caseFlags,
  daysLabel,
  waitingDays,
  waitingLabel,
  type OpsCaseInput,
} from "@/lib/operations/ops-board";
import type { GuaranteeInstrument } from "@/lib/guarantee-instruments";

/**
 * The Operations board's model (`/staff/ops`) — the pure half.
 *
 * What is pinned here:
 *  · the age is whole PARK days (Asia/Manila) since the recorded `updated_at`, and an
 *    unrecorded timestamp stays the honest null — never 0;
 *  · every lane is a frozen stage, always present even when empty; cards sort longest
 *    wait first and the lane's oldest card is marked;
 *  · "overdue" is the service contract's OWN three-day guarantee-paper term (through
 *    the existing tracker rule), "awaiting intake" is the service's own marker, and a
 *    case with nothing recorded gets no flag;
 *  · the summary counts what the lanes show — in service, completed, awaiting intake,
 *    overdue papers, and the oldest wait with the case it belongs to.
 */

const TODAY = "2026-09-18";

function opsCase(over: Partial<OpsCaseInput> = {}): OpsCaseInput {
  return {
    id: over.case_number ?? `id-${over.case_number ?? "x"}`,
    case_number: "CASE-2026-0001",
    deceased_name: "Pedro Santos",
    stage: "viewing",
    assigned_coordinator: "Elena Villanueva",
    updated_at: "2026-09-16T04:00:00Z",
    tasks: [],
    intake: { client_name: "Ana Santos", client_relationship: "Daughter", contract_date: null },
    ...over,
  };
}

function instrument(over: Partial<GuaranteeInstrument> = {}): GuaranteeInstrument {
  return {
    id: "i1",
    kind: "lgu",
    coverage: "LGU guarantee — coffin",
    claimed_from: "Isabela City LGU",
    amount_cents: null,
    reference: null,
    status: "not_filed",
    filed_on: null,
    response_on: null,
    note: null,
    documents: [],
    ...over,
  };
}

describe("the board's age is the recorded fact, never a guess", () => {
  it("counts whole park days since the last recorded change", () => {
    expect(waitingDays("2026-08-27T14:00:00Z", TODAY)).toBe(22);
    // 20:00Z is already the next day in the park's time (Asia/Manila).
    expect(waitingDays("2026-08-27T20:00:00Z", TODAY)).toBe(21);
    expect(waitingDays("2026-09-18T01:00:00Z", TODAY)).toBe(0);
  });

  it("keeps an unusable or future timestamp honest", () => {
    expect(waitingDays("not-a-date", TODAY)).toBeNull();
    expect(waitingDays("2026-09-16T04:00:00Z", "2026-13-40")).toBeNull();
    expect(waitingDays("2026-09-20T04:00:00Z", TODAY)).toBe(0);
  });

  it("labels the wait without inventing a deadline", () => {
    expect(waitingLabel(0)).toBe("Waiting today");
    expect(waitingLabel(1)).toBe("Waiting 1d");
    expect(waitingLabel(22)).toBe("Waiting 22d");
    expect(waitingLabel(null)).toBe("Age not recorded");
    expect(daysLabel(22)).toBe("22 days");
  });
});

describe("flags come from recorded rules only", () => {
  it("marks the service's own awaiting-intake state", () => {
    const flags = caseFlags(opsCase({ deceased_name: "Pending intake" }), null, TODAY);
    expect(flags).toEqual([{ kind: "intake", label: "Awaiting intake", tone: "warning" }]);
  });

  it("marks guarantee paper past the contract's three-day term", () => {
    const kase = opsCase({
      intake: { client_name: null, client_relationship: null, contract_date: "2026-08-28" },
    });
    const flags = caseFlags(kase, [instrument()], TODAY);
    expect(flags).toEqual([
      { kind: "paper_overdue", label: "1 guarantee paper overdue", tone: "danger", count: 1 },
    ]);
  });

  it("warns, but does not claim overdue, while a paper is still in term", () => {
    const kase = opsCase({
      intake: { client_name: null, client_relationship: null, contract_date: "2026-09-16" },
    });
    const flags = caseFlags(kase, [instrument()], TODAY);
    expect(flags).toEqual([
      { kind: "paper_due", label: "1 guarantee paper due", tone: "warning", count: 1 },
    ]);
  });

  it("does not warn for filed paper or a missing contract date", () => {
    expect(caseFlags(opsCase(), [instrument({ status: "filed" })], TODAY)).toEqual([]);
    expect(caseFlags(opsCase(), [instrument()], TODAY)).toEqual([]);
    expect(caseFlags(opsCase(), null, TODAY)).toEqual([]);
  });
});

describe("the lanes are the frozen stages", () => {
  it("always carries every stage, empty included, in contract order", () => {
    const { lanes, hasCases } = buildOpsBoard([], {}, TODAY);
    expect(hasCases).toBe(false);
    expect(lanes.map((lane) => lane.stage)).toEqual([...CASE_STAGES]);
    expect(lanes.every((lane) => lane.cards.length === 0 && lane.oldestDays === null)).toBe(true);
  });

  it("puts each case in its stage's lane and orders longest wait first", () => {
    const { lanes } = buildOpsBoard(
      [
        opsCase({ case_number: "CASE-2026-0001", stage: "viewing", updated_at: "2026-09-17T04:00:00Z" }),
        opsCase({ case_number: "CASE-2026-0002", stage: "viewing", updated_at: "2026-09-01T04:00:00Z" }),
        opsCase({ case_number: "CASE-2026-0003", stage: "completed", updated_at: "2026-09-10T04:00:00Z" }),
        opsCase({ case_number: "CASE-2026-0004", stage: "viewing", updated_at: "nope" }),
      ],
      {},
      TODAY,
    );

    const viewing = lanes.find((lane) => lane.stage === "viewing")!;
    expect(viewing.cards.map((card) => card.caseNumber)).toEqual([
      "CASE-2026-0002",
      "CASE-2026-0001",
      "CASE-2026-0004",
    ]);
    expect(viewing.cards[0].oldestInLane).toBe(true);
    expect(viewing.cards[1].oldestInLane).toBe(false);
    expect(viewing.oldestDays).toBe(17);
    expect(viewing.cards[2].waitingDays).toBeNull();
    expect(viewing.cards[2].oldestInLane).toBe(false);

    const completed = lanes.find((lane) => lane.stage === "completed")!;
    expect(completed.cards.map((card) => card.caseNumber)).toEqual(["CASE-2026-0003"]);
    // A one-card lane needs no "oldest" marker — it is the lane.
    expect(completed.cards[0].oldestInLane).toBe(false);
  });

  it("summarises the lanes without double counting", () => {
    const { summary } = buildOpsBoard(
      [
        opsCase({
          case_number: "CASE-2026-0001",
          stage: "viewing",
          deceased_name: "Pending intake",
          updated_at: "2026-08-27T14:00:00Z",
          intake: { client_name: null, client_relationship: null, contract_date: "2026-08-28" },
        }),
        opsCase({ case_number: "CASE-2026-0002", stage: "retrieval" }),
        opsCase({ case_number: "CASE-2026-0003", stage: "completed" }),
      ],
      {
        "CASE-2026-0001": [instrument(), instrument({ id: "i2", kind: "sss" })],
      },
      TODAY,
    );

    expect(summary.total).toBe(3);
    expect(summary.inService).toBe(2);
    expect(summary.completed).toBe(1);
    expect(summary.awaitingIntake).toBe(1);
    expect(summary.papersOverdue).toBe(2);
    expect(summary.oldest).toEqual({
      caseNumber: "CASE-2026-0001",
      name: "Awaiting intake",
      days: 22,
    });
  });

  it("shows what the record carries when the family or coordinator is missing", () => {
    const { lanes } = buildOpsBoard(
      [
        opsCase({
          case_number: "CASE-2026-0007",
          assigned_coordinator: "",
          intake: null,
        }),
      ],
      {},
      TODAY,
    );
    const card = lanes.flatMap((lane) => lane.cards)[0];
    expect(card.family).toBeNull();
    expect(card.coordinator).toBe("Unassigned");
    expect(card.nextTask).toBeNull();
    expect(card.tasksTotal).toBe(0);
    expect(card.accent).toBeNull();
  });

  it("carries the next open task and every open task in record order", () => {
    const { lanes } = buildOpsBoard(
      [
        opsCase({
          tasks: [
            { id: "t1", title: "Set up viewing room", status: "done" },
            { id: "t2", title: "Coordinate family arrival", status: "in_progress" },
            { id: "t3", title: "Prepare ceremony program", status: "pending" },
          ],
        }),
      ],
      {},
      TODAY,
    );
    const card = lanes.flatMap((lane) => lane.cards)[0];
    expect(card.tasksDone).toBe(1);
    expect(card.tasksTotal).toBe(3);
    expect(card.nextTask).toEqual({ id: "t2", title: "Coordinate family arrival" });
    expect(card.openTasks.map((task) => task.id)).toEqual(["t2", "t3"]);
  });

  it("gives a danger accent to overdue paper and a warning one to intake", () => {
    const { lanes } = buildOpsBoard(
      [
        opsCase({
          case_number: "CASE-2026-0001",
          intake: { client_name: null, client_relationship: null, contract_date: "2026-08-28" },
        }),
        opsCase({ case_number: "CASE-2026-0002", deceased_name: "Pending intake" }),
      ],
      { "CASE-2026-0001": [instrument()] },
      TODAY,
    );
    const cards = lanes.flatMap((lane) => lane.cards);
    expect(cards.find((card) => card.caseNumber === "CASE-2026-0001")?.accent).toBe("danger");
    expect(cards.find((card) => card.caseNumber === "CASE-2026-0002")?.accent).toBe("warning");
  });
});

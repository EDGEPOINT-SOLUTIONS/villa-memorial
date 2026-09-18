/**
 * The Operations board's model — PURE (client + server).
 *
 * `/staff/ops` shows the office's work as the stages a funeral actually moves through.
 * This module builds every fact a card is allowed to state, so the page and the board
 * view cannot disagree: the lane order, the wait age, the flags, and the summary counts.
 * It holds no figure, invents no rule and reads no store — callers hand it the recorded
 * cases (and, where the guarantee tracker has one, the recorded instruments).
 *
 * URGENCY — what the board counts as "overdue", and what it refuses to:
 *  · `Awaiting intake` — the service's own marker (`deceased_name === "Pending intake"`,
 *    see lib/api-client/operations.ts) for a case born from an order whose deceased is
 *    not recorded yet. It blocks everything downstream.
 *  · `Guarantee paper overdue` — the Funeral Service Contract's clause 2 gives the family
 *    three days from the contract date to submit the guarantee instruments
 *    (`INSTRUMENT_FILING_DAYS` in lib/guarantee-instruments.ts — the SAME rule the case's
 *    instrument tracker reads). An unfiled instrument past that recorded date is overdue
 *    by the client's own signed term; before it, "due" is a warning, not a claim.
 *  · Age — there is NO client-agreed threshold for how long a stage may sit, and this
 *    board does not invent one. It states the recorded fact (whole park days since the
 *    case's `updated_at`, the last recorded change) and orders each lane longest-wait
 *    first; the page says as much beside the board.
 */
import { isCalendarDate } from "@/lib/chapel-booking";
import {
  summariseCaseInstruments,
  type GuaranteeInstrument,
} from "@/lib/guarantee-instruments";
import {
  CASE_STAGES,
  STAGE_LABEL,
  type CaseStage,
  type CaseTaskStatus,
} from "@/lib/operations/case-board";

/* ------------------------------------------------------------------ */
/* What the board is handed                                            */
/* ------------------------------------------------------------------ */

export type OpsTaskRef = {
  id: string;
  title: string;
  status: CaseTaskStatus;
};

/**
 * The fields the board reads off a case. The page's `Case` satisfies this
 * structurally; the narrow shape keeps this module honest about what it uses and
 * keeps it importable from client components (no api-client, no cookies).
 */
export type OpsCaseInput = {
  id: string;
  case_number: string;
  deceased_name: string;
  stage: CaseStage;
  assigned_coordinator: string;
  /** ISO instant of the last recorded change — the age's only source. */
  updated_at: string;
  tasks: readonly OpsTaskRef[];
  intake: {
    client_name: string | null;
    client_relationship: string | null;
    contract_date: string | null;
  } | null;
};

/* ------------------------------------------------------------------ */
/* Age: whole park days since the recorded last change                 */
/* ------------------------------------------------------------------ */

const PARK_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });

/** The park's calendar day (Asia/Manila) of an instant; null when it is not one. */
export function parkDayOf(instant: string): string | null {
  const parsed = Date.parse(instant);
  if (Number.isNaN(parsed)) return null;
  return PARK_DAY.format(parsed);
}

/**
 * Whole park days from the last recorded change to `today` (a park calendar day).
 * Null when the record carries no usable timestamp — the honest unknown, never 0.
 */
export function waitingDays(updatedAt: string, today: string): number | null {
  const changed = parkDayOf(updatedAt);
  if (!changed || !isCalendarDate(today) || !isCalendarDate(changed)) return null;
  const from = Date.parse(`${changed}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** The card's wait chip: "Waiting 3d" / "Waiting today" / "Age not recorded". */
export function waitingLabel(days: number | null): string {
  if (days === null) return "Age not recorded";
  if (days === 0) return "Waiting today";
  return `Waiting ${days}d`;
}

/* ------------------------------------------------------------------ */
/* Flags                                                               */
/* ------------------------------------------------------------------ */

export type OpsFlagKind = "intake" | "paper_overdue" | "paper_due";

export type OpsFlag = {
  kind: OpsFlagKind;
  label: string;
  tone: "warning" | "danger";
  /** How many recorded papers the flag names (paper flags only). */
  count?: number;
};

/**
 * What stands out on a card. Only recorded facts: the service's intake marker and
 * the contract's three-day guarantee-paper term (read through the ONE tracker rule).
 * A case with no tracker record carries no paper flag — absence is not a claim.
 */
export function caseFlags(
  kase: OpsCaseInput,
  instruments: readonly GuaranteeInstrument[] | null,
  today: string,
): OpsFlag[] {
  const flags: OpsFlag[] = [];
  if (kase.deceased_name === "Pending intake") {
    flags.push({ kind: "intake", label: "Awaiting intake", tone: "warning" });
  }
  if (instruments && instruments.length > 0) {
    const tracked = summariseCaseInstruments(
      instruments,
      kase.intake?.contract_date ?? null,
      today,
    );
    if (tracked.overdue > 0) {
      flags.push({
        kind: "paper_overdue",
        label:
          tracked.overdue === 1
            ? "1 guarantee paper overdue"
            : `${tracked.overdue} guarantee papers overdue`,
        tone: "danger",
        count: tracked.overdue,
      });
    } else if (tracked.dueSoon > 0) {
      flags.push({
        kind: "paper_due",
        label: tracked.dueSoon === 1 ? "1 guarantee paper due" : `${tracked.dueSoon} papers due`,
        tone: "warning",
        count: tracked.dueSoon,
      });
    }
  }
  return flags;
}

/* ------------------------------------------------------------------ */
/* One card                                                            */
/* ------------------------------------------------------------------ */

export type OpsCard = {
  id: string;
  caseNumber: string;
  name: string;
  awaitingIntake: boolean;
  family: string | null;
  coordinator: string;
  stage: CaseStage;
  stageLabel: string;
  tasksDone: number;
  tasksTotal: number;
  /** The first task that is not done — the card's "next step", when it has one. */
  nextTask: { id: string; title: string } | null;
  /** Every task that is not done, in record order — what the board can tick. */
  openTasks: OpsTaskRef[];
  waitingDays: number | null;
  waitingLabel: string;
  oldestInLane: boolean;
  flags: OpsFlag[];
  /** The card's left rule: danger beats warning; null when nothing stands out. */
  accent: "danger" | "warning" | null;
};

function familyLabel(kase: OpsCaseInput): string | null {
  const name = kase.intake?.client_name?.trim();
  if (!name) return null;
  const relationship = kase.intake?.client_relationship?.trim();
  return relationship ? `${name} · ${relationship}` : name;
}

export function toOpsCard(
  kase: OpsCaseInput,
  instruments: readonly GuaranteeInstrument[] | null,
  today: string,
): OpsCard {
  const tasks = kase.tasks ?? [];
  const done = tasks.filter((task) => task.status === "done");
  const open = tasks.filter((task) => task.status !== "done");
  const awaitingIntake = kase.deceased_name === "Pending intake";
  const flags = caseFlags(kase, instruments, today);
  const accent = flags.some((flag) => flag.tone === "danger")
    ? "danger"
    : flags.length > 0
      ? "warning"
      : null;
  const days = waitingDays(kase.updated_at, today);

  return {
    id: kase.id,
    caseNumber: kase.case_number,
    name: awaitingIntake ? "Awaiting intake" : kase.deceased_name || "Name not recorded",
    awaitingIntake,
    family: familyLabel(kase),
    coordinator: kase.assigned_coordinator.trim() || "Unassigned",
    stage: kase.stage,
    stageLabel: STAGE_LABEL[kase.stage] ?? kase.stage,
    tasksDone: done.length,
    tasksTotal: tasks.length,
    nextTask: open[0] ? { id: open[0].id, title: open[0].title } : null,
    openTasks: open.map((task) => ({ ...task })),
    waitingDays: days,
    waitingLabel: waitingLabel(days),
    oldestInLane: false,
    flags,
    accent,
  };
}

/* ------------------------------------------------------------------ */
/* The board                                                           */
/* ------------------------------------------------------------------ */

export type OpsLane = {
  stage: CaseStage;
  label: string;
  cards: OpsCard[];
  /** Whole days of the lane's longest wait; null when the lane is empty or its
   *  records carry no usable timestamp. */
  oldestDays: number | null;
};

export type OpsSummary = {
  total: number;
  inService: number;
  completed: number;
  awaitingIntake: number;
  /** Unfiled guarantee instruments past the contract's three-day term. */
  papersOverdue: number;
  /** The oldest in-service wait, with the case it belongs to. */
  oldest: { caseNumber: string; name: string; days: number } | null;
};

export type OpsBoardModel = {
  lanes: OpsLane[];
  summary: OpsSummary;
  hasCases: boolean;
};

/** Longest wait first; an unrecorded age sorts last, then by case number. */
function byLongestWait(a: OpsCard, b: OpsCard): number {
  if (a.waitingDays === null && b.waitingDays === null) {
    return a.caseNumber.localeCompare(b.caseNumber);
  }
  if (a.waitingDays === null) return 1;
  if (b.waitingDays === null) return -1;
  return b.waitingDays - a.waitingDays || a.caseNumber.localeCompare(b.caseNumber);
}

/**
 * Groups the recorded cases into the frozen stage lanes, in contract order.
 * Every stage always has a lane — an empty one says so rather than disappearing.
 */
export function buildOpsBoard(
  cases: readonly OpsCaseInput[],
  instrumentsByCase: Readonly<Record<string, readonly GuaranteeInstrument[]>>,
  today: string,
): OpsBoardModel {
  const lanes: OpsLane[] = CASE_STAGES.map((stage) => {
    const cards = cases
      .filter((kase) => kase.stage === stage)
      .map((kase) => toOpsCard(kase, instrumentsByCase[kase.case_number] ?? null, today))
      .sort(byLongestWait);
    // The lane is ordered longest-first: the marker makes the urgency visible without
    // a threshold ("oldest" is a fact of THIS lane, not an agreed SLA).
    if (cards.length > 1 && cards[0].waitingDays !== null) {
      cards[0] = { ...cards[0], oldestInLane: true };
    }
    return {
      stage,
      label: STAGE_LABEL[stage],
      cards,
      oldestDays: cards.find((card) => card.waitingDays !== null)?.waitingDays ?? null,
    };
  });

  const allCards = lanes.flatMap((lane) => lane.cards);
  const inService = allCards.filter((card) => card.stage !== "completed");
  const oldestCard = inService
    .filter((card) => card.waitingDays !== null)
    .sort(byLongestWait)[0];

  return {
    lanes,
    hasCases: allCards.length > 0,
    summary: {
      total: allCards.length,
      inService: inService.length,
      completed: allCards.length - inService.length,
      awaitingIntake: allCards.filter((card) => card.awaitingIntake).length,
      papersOverdue: allCards
        .flatMap((card) => card.flags)
        .filter((flag) => flag.kind === "paper_overdue")
        .reduce((sum, flag) => sum + (flag.count ?? 1), 0),
      oldest: oldestCard
        ? {
            caseNumber: oldestCard.caseNumber,
            name: oldestCard.name,
            days: oldestCard.waitingDays ?? 0,
          }
        : null,
    },
  };
}

/** "3 days" — the summary strip's age unit, kept beside the label it prints. */
export function daysLabel(days: number): string {
  return days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;
}

/**
 * The AI Copilot's model — PURE (client + server).
 *
 * The PRD's staff AI Copilot (screen inventory S29, `docs/05-ai/ai-capabilities.md`
 * §"AI Operations Copilot") was deferred by the delivery plan, and rightly: an assistant
 * that suggests things about a bereaved family's funeral needs an AI governance contract
 * before it can be designed responsibly — what it may read, what it may never say, who is
 * accountable for its output and how it is audited (`docs/05-ai/ai-governance.md`,
 * `docs/07-client-villa/open-questions.md` §Operations & governance — still unanswered).
 *
 * This module is the screen's whole brain, and it is deliberately a LOOKUP, not a model:
 *
 *  · it answers four recorded questions (below) from records the office already holds —
 *    the case store, the guarantee-instrument tracker and the chapel calendar — through
 *    the SAME derivations the Operations board uses (`buildOpsBoard`), so the copilot and
 *    the board can never disagree about a case's age, stage or open work;
 *  · every finding carries the records it came from, and a finding can never carry none;
 *  · a statement is a fact about a record ("2 of 4 recorded tasks open"), never advice
 *    about a family and never an instruction — the phrasing table is fixed and pinned by
 *    `tests/unit/copilot-model.test.ts`, so a later author cannot slip a recommendation
 *    into the surface without failing a test with a name;
 *  · the questions the records do NOT answer are printed with the answer (`limit`), and a
 *    question with no matching record says so instead of reaching for a guess.
 *
 * WHAT THIS MODULE MUST NEVER GROW (the boundary the screen publishes):
 *  - no model client, no provider name, no API key, no network call, no prompt builder
 *    that could be sent anywhere;
 *  - no free-form input — a question is one of `COPILOT_PROMPTS`, and a case is one of the
 *    recorded cases, selected by id or number;
 *  - no write, no booking, no payment, no message to a family, and no COC-like record.
 *
 * If a governance contract freezes, it governs a BUILD, not this file: the screen's
 * governance block (`COPILOT_GOVERNANCE`) names what it has to settle first.
 */
import {
  INSTRUMENT_FILING_DAYS,
  instrumentFilingDeadline,
  instrumentNeedsFiling,
  type GuaranteeInstrument,
} from "@/lib/guarantee-instruments";
import {
  buildOpsBoard,
  waitingLabel,
  type OpsCard,
  type OpsCaseInput,
} from "@/lib/operations/ops-board";
import { bookingTimeLabel, bookingsOnDay } from "@/lib/schedule-board";
import type { Booking } from "@/lib/api-client/scheduling";

/* ------------------------------------------------------------------ */
/* The questions this office actually asks                             */
/* ------------------------------------------------------------------ */

export const COPILOT_PROMPT_KEYS = ["today", "waiting", "not-moved", "next-step"] as const;

export type CopilotPromptKey = (typeof COPILOT_PROMPT_KEYS)[number];

/** The question the screen opens on — the morning one. */
export const COPILOT_DEFAULT_PROMPT: CopilotPromptKey = "today";

export type CopilotPrompt = {
  key: CopilotPromptKey;
  /** The question, in the office's own words. */
  question: string;
  /** What answering it reads — shown before it is asked, so the source is visible. */
  reads: string;
  /**
   * What this question never covers. Printed with every answer to it: the limit is part
   * of the answer, not a footnote.
   */
  limit: string;
};

/**
 * The four prompts, as recorded on the screen. Each one is answerable from records the
 * portal already holds; none of them asks for an opinion, a prediction or a draft.
 */
export const COPILOT_PROMPTS: readonly CopilotPrompt[] = [
  {
    key: "today",
    question: "What needs doing today?",
    reads: "Open tasks, guarantee papers and the chapel calendar",
    limit: "The office's own diary and any message to a family are not records this portal holds.",
  },
  {
    key: "waiting",
    question: "What is waiting on a family?",
    reads: "Guarantee papers the family owes, and cases whose details are not in",
    limit:
      "Only paperwork this portal records counts here — calls, messages and visits are not recorded, so a wait on a reply is invisible.",
  },
  {
    key: "not-moved",
    question: "Which cases have not moved?",
    reads: "The last recorded change on every case still in service",
    limit: "No agreed limit says how long a stage may sit, so these are recorded ages, not overdue flags.",
  },
  {
    key: "next-step",
    question: "What is this case's next step?",
    reads: "One case's recorded tasks, its stage and its family-side paperwork",
    limit: "A next step the office has not recorded cannot appear here.",
  },
];

/**
 * The prompt a request resolves to. An absent or unknown `ask` falls back to the default
 * prompt — a URL is not a contract, and this screen never errors on bad input. This is also
 * the whole input surface: nothing a caller can pass ever becomes text on the page.
 */
export function copilotPrompt(key: unknown): CopilotPrompt {
  const found = COPILOT_PROMPTS.find((prompt) => prompt.key === key);
  return found ?? COPILOT_PROMPTS[0];
}

/* ------------------------------------------------------------------ */
/* The governance boundary — printed on the screen, pinned here        */
/* ------------------------------------------------------------------ */

/** The one honest state for the disconnected reality: no model provider is configured. */
export const COPILOT_NOT_CONNECTED = "No model is connected";

/**
 * What the screen tells a reader about itself. Every line is a promise the code keeps
 * today: `COPILOT_GOVERNANCE` is why the surface is a lookup, and it is the list the
 * governance contract has to settle before a model may be attached.
 */
export type CopilotGovernancePoint = {
  key: string;
  title: string;
  detail: string;
};

export const COPILOT_GOVERNANCE: readonly CopilotGovernancePoint[] = [
  {
    key: "reads",
    title: "What it may read",
    detail:
      "Which records a model may be given, and only inside the permissions of the person asking — never an access of its own.",
  },
  {
    key: "family",
    title: "It never speaks to a family",
    detail:
      "A model never writes to a family from here: no message, summary, letter or memorial is drafted, sent or published on anyone's behalf.",
  },
  {
    key: "human",
    title: "A person always confirms",
    detail:
      "An answer is a suggestion a staff member acts on. Nothing here writes, books, pays or decides.",
  },
  {
    key: "audit",
    title: "How it is audited",
    detail:
      "What it read, what it said and who saw it has to be traceable afterwards, source by source.",
  },
];

/** The disclosing line: this surface looks like an answer, and is not one. */
export const COPILOT_NOT_A_MODEL_NOTE =
  "Everything on this screen is a lookup over records the office recorded. No text here was generated.";

/**
 * Who has to answer before a model is attached. Owner, on the screen — split into two
 * short lines so the reading budget's paragraph limit holds.
 */
export const COPILOT_OWNER: readonly string[] = [
  "Owner: the office. What a copilot may read and may say is an unanswered client question, in the office's hands.",
  "The later build is the ai-orchestration service: read-only over these records, with a person confirming every output.",
];

/* ------------------------------------------------------------------ */
/* What a question is asked with                                       */
/* ------------------------------------------------------------------ */

export type CopilotInput = {
  /** `?ask=` — absent or unknown resolves to the default prompt. */
  ask?: string | null;
  /** `?case=` — a recorded case id or case number; never free text. */
  caseNumber?: string | null;
  /** Every recorded case, as the case store returns it. */
  cases: readonly OpsCaseInput[];
  /** The recorded guarantee instruments, by `case_number`. */
  instrumentsByCase: Readonly<Record<string, readonly GuaranteeInstrument[]>>;
  /** The chapel calendar, as far as this reader's permissions and the read got. */
  calendar: CopilotCalendar;
  /** The park's calendar day (yyyy-mm-dd) — the day every age is measured to. */
  today: string;
};

/**
 * Three honest states for the calendar, because "nothing on today" and "not read" are
 * different answers and must never be confused.
 */
export type CopilotCalendar =
  | { state: "read"; bookings: readonly Booking[] }
  /** The reader does not hold `scheduling:read`, so it is not part of the answer. */
  | { state: "no_scope" }
  /** The read failed; the answer says so rather than reporting an empty day. */
  | { state: "unavailable" };

/* ------------------------------------------------------------------ */
/* One finding                                                         */
/* ------------------------------------------------------------------ */

export type CopilotTone = "neutral" | "info" | "warning" | "danger";

/** One record a statement came from — the trail a reader can open. */
export type CopilotRecordRef = {
  label: string;
  href: string;
};

export type CopilotFinding = {
  id: string;
  /** The record this is about, in the record's own words (a case number, a resource). */
  subject: string;
  /** What the records state. A fact about a record — never advice, never an instruction. */
  statement: string;
  tone: CopilotTone;
  /**
   * The records behind the statement, nearest first. NEVER empty — the trail is the
   * proof, and its first entry is the record itself (the link a reader follows).
   */
  records: CopilotRecordRef[];
};

/** The cases a `next-step` question can be asked about — a choice, never a text field. */
export type CopilotCaseChoice = {
  /** The case id the URL carries (`?case=`). */
  value: string;
  /** "CASE-2026-0001 · Pedro Santos" — the record's own words. */
  label: string;
};

export type CopilotAnswerState =
  /** The records produced findings. */
  | "answered"
  /** The records were read and nothing matched the question — a real, honest state. */
  | "nothing_recorded"
  /** The question is about one case and no recorded case is selected. */
  | "needs_case";

export type CopilotAnswer = {
  prompt: CopilotPromptKey;
  question: string;
  /** The answer at a glance — one short sentence, never an essay. */
  headline: string;
  state: CopilotAnswerState;
  findings: CopilotFinding[];
  /** What this answer does not cover, printed with it. */
  limit: string;
  /** Record-specific caveats found while answering (an unread calendar, an empty day). */
  gaps: string[];
  /** Every case the `next-step` question can be asked about, in record order. */
  choices: CopilotCaseChoice[];
};

/* ------------------------------------------------------------------ */
/* Routes — every finding opens a record the portal already has        */
/* ------------------------------------------------------------------ */

export function caseHref(caseId: string): string {
  return `/staff/cases/${encodeURIComponent(caseId)}`;
}

export function caseInstrumentsHref(caseId: string): string {
  return `/staff/cases/${encodeURIComponent(caseId)}/instruments`;
}

export const COPILOT_ASK_HREF = "/staff/copilot";

/* ------------------------------------------------------------------ */
/* Small shared shapes over the board                                  */
/* ------------------------------------------------------------------ */

/** Everything a copilot answer reads off one card, derived once by `buildOpsBoard`. */
type BoardContext = {
  cards: OpsCard[];
  inService: OpsCard[];
};

function boardContext(input: CopilotInput): BoardContext {
  const board = buildOpsBoard(input.cases, input.instrumentsByCase, input.today);
  const cards = board.lanes.flatMap((lane) => lane.cards);
  return { cards, inService: cards.filter((card) => card.stage !== "completed") };
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

function caseRecord(card: OpsCard): CopilotRecordRef {
  return { label: card.caseNumber, href: caseHref(card.id) };
}

/** The tone a card's own recorded flags earn — the board's rule, read not re-derived. */
function flagTone(card: OpsCard): CopilotTone {
  if (card.flags.some((flag) => flag.tone === "danger")) return "danger";
  if (card.flags.length > 0) return "warning";
  return "neutral";
}

/** How many distinct records a set of findings names — the headline's unit. */
function subjectCount(
  findings: readonly CopilotFinding[],
  skip: (id: string) => boolean,
): number {
  return new Set(findings.filter((f) => !skip(f.id)).map((f) => f.subject)).size;
}

const TONE_RANK: Record<CopilotTone, number> = { danger: 0, warning: 1, info: 2, neutral: 3 };

/**
 * A day's work in the order a person would take it up: the cases whose OWN recorded
 * flags earned a colour first, then longest wait. The order is derived from the records,
 * never from a rule about what matters.
 */
function byUrgency(a: OpsCard, b: OpsCard): number {
  const tone = TONE_RANK[flagTone(a)] - TONE_RANK[flagTone(b)];
  if (tone !== 0) return tone;
  return (
    (b.waitingDays ?? -1) - (a.waitingDays ?? -1) || a.caseNumber.localeCompare(b.caseNumber)
  );
}

/* ------------------------------------------------------------------ */
/* What needs doing today                                              */
/* ------------------------------------------------------------------ */

function todayFindings(input: CopilotInput, ctx: BoardContext): CopilotFinding[] {
  const findings: CopilotFinding[] = [];

  // Every case, completed ones included: a finished case can still owe a paper or an
  // open task ("Return documents to family"), and hiding that would be a claim.
  for (const card of [...ctx.cards].sort(byUrgency)) {
    // The exceptions first, then the routine: a paper past the contract's term is the
    // row a coordinator needs before the day's task counts.
    for (const flag of card.flags) {
      if (flag.kind === "paper_overdue" || flag.kind === "paper_due") {
        const papers = flag.count ?? 1;
        findings.push({
          id: `${card.caseNumber}-${flag.kind}`,
          subject: card.caseNumber,
          statement:
            flag.kind === "paper_overdue"
              ? `${papers} guarantee ${plural(papers, "paper", "papers")} past the contract's ${INSTRUMENT_FILING_DAYS}-day term`
              : `${papers} guarantee ${plural(papers, "paper", "papers")} due under the contract's ${INSTRUMENT_FILING_DAYS}-day term`,
          tone: flag.tone,
          records: [
            caseRecord(card),
            { label: "Guarantee papers", href: caseInstrumentsHref(card.id) },
          ],
        });
      }
    }
    const open = card.tasksTotal - card.tasksDone;
    if (open > 0) {
      findings.push({
        id: `${card.caseNumber}-tasks`,
        subject: card.caseNumber,
        statement: `${open} of ${card.tasksTotal} recorded tasks open`,
        tone: "neutral",
        records: [caseRecord(card)],
      });
    }
  }

  if (input.calendar.state === "read") {
    const onDay = bookingsOnDay(input.calendar.bookings, input.today).filter(
      (booking) => booking.status === "confirmed",
    );
    for (const booking of onDay) {
      findings.push({
        id: `booking-${booking.id}`,
        subject: booking.resource_name || "Chapel",
        statement: `${booking.title || "Booking"} · ${bookingTimeLabel(booking, input.today)}`,
        tone: booking.conflicting ? "warning" : "info",
        records: [{ label: "Today's schedule", href: "/staff/schedule" }],
      });
    }
  }

  return findings;
}

function todayGaps(input: CopilotInput, ctx: BoardContext): string[] {
  const gaps: string[] = [];
  if (input.calendar.state === "no_scope") {
    gaps.push("The chapel calendar is not read without the scheduling:read scope.");
  } else if (input.calendar.state === "unavailable") {
    gaps.push("The chapel calendar could not be read just now, so it is missing above.");
  } else {
    const onDay = bookingsOnDay(input.calendar.bookings, input.today).filter(
      (booking) => booking.status === "confirmed",
    );
    if (onDay.length === 0) {
      gaps.push("The chapel calendar records nothing for today.");
    }
  }
  if (ctx.inService.length === 0 && ctx.cards.length > 0) {
    gaps.push("Every recorded case is completed.");
  }
  return gaps;
}

/* ------------------------------------------------------------------ */
/* What is waiting on a family                                         */
/* ------------------------------------------------------------------ */

/**
 * One case's family-side items. Only two kinds qualify, because only two are RECORDED as
 * something a family owes: an unfiled guarantee instrument (the service contract's own
 * clause 2 puts the submission on the client) and an intake whose details are not in yet
 * (the service's "Pending intake" marker on a case born from a paid order).
 */
function familyFindings(
  input: CopilotInput,
  card: OpsCard,
  kase: OpsCaseInput,
): CopilotFinding[] {
  const findings: CopilotFinding[] = [];
  const instruments = input.instrumentsByCase[kase.case_number] ?? [];
  const unfiled = instruments.filter(instrumentNeedsFiling).length;

  if (unfiled > 0) {
    const deadline = instrumentFilingDeadline(kase.intake?.contract_date ?? null, input.today);
    const papers = `${unfiled} guarantee ${plural(unfiled, "paper", "papers")} not yet filed`;
    const late = Math.abs(deadline.daysLeft ?? 0);
    const statement =
      deadline.state === "passed"
        ? `${papers} — the contract's ${INSTRUMENT_FILING_DAYS}-day deadline passed ${late} ${plural(late, "day", "days")} ago`
        : deadline.state === "unknown"
          ? `${papers} — no contract date is recorded`
          : `${papers} — ${deadline.label.toLowerCase()}`;
    findings.push({
      id: `${kase.case_number}-family-papers`,
      subject: card.caseNumber,
      statement,
      tone:
        deadline.state === "passed"
          ? "danger"
          : deadline.state === "due_today" || deadline.state === "due_soon"
            ? "warning"
            : "neutral",
      records: [
        caseRecord(card),
        { label: "Guarantee papers", href: caseInstrumentsHref(card.id) },
      ],
    });
  }

  if (card.awaitingIntake) {
    findings.push({
      id: `${kase.case_number}-family-intake`,
      subject: card.caseNumber,
      statement: "The person's details are not recorded yet, so the case cannot move on",
      tone: "warning",
      records: [caseRecord(card)],
    });
  }

  return findings;
}

function familyFindingsForInput(input: CopilotInput, ctx: BoardContext): CopilotFinding[] {
  const byNumber = new Map(input.cases.map((kase) => [kase.case_number, kase]));
  const findings: CopilotFinding[] = [];
  for (const card of ctx.cards) {
    const kase = byNumber.get(card.caseNumber);
    if (kase) findings.push(...familyFindings(input, card, kase));
  }
  const order: Record<CopilotTone, number> = { danger: 0, warning: 1, info: 2, neutral: 3 };
  return findings.sort(
    (a, b) => order[a.tone] - order[b.tone] || a.subject.localeCompare(b.subject),
  );
}

/* ------------------------------------------------------------------ */
/* Which cases have not moved                                          */
/* ------------------------------------------------------------------ */

function notMovedFindings(ctx: BoardContext): CopilotFinding[] {
  return [...ctx.inService]
    .sort(
      (a, b) =>
        (b.waitingDays ?? -1) - (a.waitingDays ?? -1) || a.caseNumber.localeCompare(b.caseNumber),
    )
    .map((card) => ({
      id: `${card.caseNumber}-wait`,
      subject: card.caseNumber,
      statement:
        card.waitingDays === null
          ? "The record carries no usable change date"
          : `No recorded change for ${card.waitingDays} ${plural(card.waitingDays, "day", "days")}`,
      // No agreed staleness threshold exists, so nothing here is coloured overdue.
      tone: "neutral" as CopilotTone,
      records: [caseRecord(card)],
    }));
}

/* ------------------------------------------------------------------ */
/* What is this case's next step                                       */
/* ------------------------------------------------------------------ */

function nextStepAnswer(
  input: CopilotInput,
  ctx: BoardContext,
  prompt: CopilotPrompt,
  choices: CopilotCaseChoice[],
): CopilotAnswer {
  const wanted = input.caseNumber?.trim() ?? "";
  const card = ctx.cards.find((row) => row.id === wanted || row.caseNumber === wanted);
  const kase = input.cases.find((row) => row.id === wanted || row.case_number === wanted);

  if (!card || !kase) {
    return {
      prompt: prompt.key,
      question: prompt.question,
      headline:
        wanted === ""
          ? "Pick a case to read its recorded next step."
          : "No case on record matches that selection.",
      state: "needs_case",
      findings: [],
      limit: prompt.limit,
      gaps: [],
      choices,
    };
  }

  const findings: CopilotFinding[] = [
    {
      id: `${card.caseNumber}-position`,
      subject: card.caseNumber,
      statement: `${card.stageLabel} · ${waitingLabel(card.waitingDays)}`,
      tone: flagTone(card),
      records: [caseRecord(card)],
    },
    {
      id: `${card.caseNumber}-coordinator`,
      subject: card.caseNumber,
      statement: `Coordinator: ${card.coordinator}`,
      tone: "neutral",
      records: [caseRecord(card)],
    },
    ...familyFindings(input, card, kase),
  ];

  if (card.nextTask) {
    findings.push({
      id: `${card.caseNumber}-next`,
      subject: card.caseNumber,
      statement: `Next recorded task: ${card.nextTask.title}`,
      tone: "info",
      records: [caseRecord(card)],
    });
  }

  const headline = card.nextTask
    ? `Next recorded task: ${card.nextTask.title}.`
    : card.tasksTotal === 0
      ? "No task is recorded on this case."
      : "Every recorded task on this case is done.";

  return {
    prompt: prompt.key,
    question: prompt.question,
    headline,
    state: "answered",
    findings,
    limit: prompt.limit,
    gaps: [],
    choices,
  };
}

/* ------------------------------------------------------------------ */
/* The answer                                                          */
/* ------------------------------------------------------------------ */

/**
 * The whole surface, as a pure function of the records and the two URL choices. There is
 * no other way in: no free text, no model, no write.
 */
export function buildCopilotAnswer(input: CopilotInput): CopilotAnswer {
  const prompt = copilotPrompt(input.ask);
  const ctx = boardContext(input);
  const choices: CopilotCaseChoice[] = [...input.cases]
    .sort((a, b) => a.case_number.localeCompare(b.case_number))
    .map((kase) => ({
      value: kase.id,
      label: `${kase.case_number} · ${
        kase.deceased_name === "Pending intake" || kase.deceased_name.trim() === ""
          ? "name not recorded"
          : kase.deceased_name
      }`,
    }));

  if (prompt.key === "next-step") {
    return nextStepAnswer(input, ctx, prompt, choices);
  }

  if (prompt.key === "waiting") {
    const findings = familyFindingsForInput(input, ctx);
    const cases = subjectCount(findings, () => false);
    return {
      prompt: prompt.key,
      question: prompt.question,
      headline:
        findings.length === 0
          ? "No recorded item is waiting on a family."
          : `${cases} ${plural(cases, "case is", "cases are")} waiting on something a family owes.`,
      state: findings.length === 0 ? "nothing_recorded" : "answered",
      findings,
      limit: prompt.limit,
      gaps: [],
      choices,
    };
  }

  if (prompt.key === "not-moved") {
    const findings = notMovedFindings(ctx);
    const longest = ctx.inService.reduce<number | null>(
      (best, card) =>
        card.waitingDays === null ? best : best === null ? card.waitingDays : Math.max(best, card.waitingDays),
      null,
    );
    return {
      prompt: prompt.key,
      question: prompt.question,
      headline:
        findings.length === 0
          ? "No case on record is still in service."
          : `${findings.length} ${plural(findings.length, "case has", "cases have")} not moved — the longest wait is ${longest ?? 0} ${plural(longest ?? 0, "day", "days")}.`,
      state: findings.length === 0 ? "nothing_recorded" : "answered",
      findings,
      limit: prompt.limit,
      gaps: [],
      choices,
    };
  }

  const findings = todayFindings(input, ctx);
  const cases = subjectCount(findings, (id) => id.startsWith("booking-"));
  return {
    prompt: prompt.key,
    question: prompt.question,
    headline:
      findings.length === 0
        ? "No open work is recorded for today."
        : cases === 0
          ? `${findings.length} ${plural(findings.length, "booking is", "bookings are")} on the chapel calendar today.`
          : `${cases} ${plural(cases, "case has", "cases have")} recorded work open today.`,
    state: findings.length === 0 ? "nothing_recorded" : "answered",
    findings,
    limit: prompt.limit,
    gaps: todayGaps(input, ctx),
    choices,
  };
}

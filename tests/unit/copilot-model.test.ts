import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import casesFile from "@/lib/fixtures/operations/cases.json";
import instrumentsFile from "@/lib/fixtures/operations/guarantee-instruments.json";
import {
  buildCopilotAnswer,
  COPILOT_GOVERNANCE,
  COPILOT_NOT_A_MODEL_NOTE,
  COPILOT_NOT_CONNECTED,
  COPILOT_OWNER,
  COPILOT_PROMPTS,
  copilotPrompt,
  type CopilotAnswer,
  type CopilotCalendar,
  type CopilotInput,
} from "@/lib/copilot";
import type { GuaranteeInstrument } from "@/lib/guarantee-instruments";
import type { OpsCaseInput } from "@/lib/operations/ops-board";
import type { Booking } from "@/lib/api-client/scheduling";

/**
 * The AI Copilot's model (`lib/copilot.ts`) — the pure half, and the half that carries
 * the safety promises the screen publishes.
 *
 * What is pinned here, in order of how much it matters:
 *  1. SAFETY BY CONSTRUCTION — every finding carries at least one record, no statement can
 *     read as advice about a family, a hostile `?case=` is never echoed, and the module
 *     holds no model client (no fetch, no provider, no key, no prompt passthrough);
 *  2. THE GOVERNANCE BOUNDARY — the four things the contract has to settle, the
 *     not-connected state and the owner line, all present and pinned;
 *  3. THE ANSWERS ARE THE RECORDS — over the real operations fixture, the four questions
 *     produce the same ages/flags/tasks the Operations board derives, and a question the
 *     records cannot answer says so instead of guessing.
 *
 * TODAY is pinned (2026-09-19, the park's own day) so every age reads the same on every
 * machine — the same discipline the ops-board model test uses.
 */

const TODAY = "2026-09-19";

const CASES = (casesFile as unknown as { cases: OpsCaseInput[] }).cases;

function recordedInstruments(): Record<string, GuaranteeInstrument[]> {
  const store = instrumentsFile as unknown as {
    trackers: Array<{ case_number: string; instruments: GuaranteeInstrument[] }>;
  };
  return Object.fromEntries(store.trackers.map((t) => [t.case_number, t.instruments]));
}

const READ_EMPTY_CALENDAR: CopilotCalendar = { state: "read", bookings: [] };

function input(over: Partial<CopilotInput> = {}): CopilotInput {
  return {
    cases: CASES,
    instrumentsByCase: recordedInstruments(),
    calendar: READ_EMPTY_CALENDAR,
    today: TODAY,
    ...over,
  };
}

function ask(prompt: string, over: Partial<CopilotInput> = {}): CopilotAnswer {
  return buildCopilotAnswer(input({ ask: prompt, ...over }));
}

/** The written source of the module, for the structural safety checks below. */
function source(): string {
  return readFileSync(path.resolve(__dirname, "../../lib/copilot.ts"), "utf8");
}

/* ------------------------------------------------------------------ */
/* 1. Safety by construction                                           */
/* ------------------------------------------------------------------ */

/** Words that turn a record statement into a recommendation or an instruction. */
const ADVICE_WORDS = [
  "should",
  "recommend",
  "suggest",
  "advise",
  "consider",
  "prioritise",
  "prioritize",
  "you must",
  "we think",
  "best to",
  "make sure",
];

describe("a finding can never be an instruction", () => {
  const everyAnswer = (): CopilotAnswer[] => [
    ask("today"),
    ask("waiting"),
    ask("not-moved"),
    ask("next-step", { caseNumber: CASES[0].id }),
    ask("next-step"),
  ];

  it("carries the records it came from — every finding, every answer", () => {
    for (const answer of everyAnswer()) {
      for (const finding of answer.findings) {
        expect(
          finding.records.length,
          `${answer.prompt}/${finding.id} carries no record trail`,
        ).toBeGreaterThan(0);
        for (const record of finding.records) {
          expect(record.label.trim().length).toBeGreaterThan(0);
          expect(record.href, `${finding.id} → ${record.label}`).toMatch(/^\/staff\//);
        }
      }
    }
  });

  it("never phrases a statement as advice about a family", () => {
    for (const answer of everyAnswer()) {
      const sentences = [answer.headline, ...answer.findings.map((f) => f.statement)];
      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        for (const word of ADVICE_WORDS) {
          expect(
            lower.includes(word),
            `"${sentence}" reads as advice ("${word}") — a copilot answer states a record`,
          ).toBe(false);
        }
        // Second person is the other way a record statement turns into an instruction.
        expect(/(^|\s)you(\s|'|’)/i.test(sentence), `"${sentence}" speaks to the reader`).toBe(
          false,
        );
      }
    }
  });

  it("never echoes a case selection it cannot resolve", () => {
    const hostile = "<script>alert('x')</script>";
    const answer = ask("next-step", { caseNumber: hostile });
    expect(answer.state).toBe("needs_case");
    expect(JSON.stringify(answer)).not.toContain("script");
    expect(answer.findings).toEqual([]);
  });

  it("holds no model client, provider, key or network call", () => {
    const text = source();
    for (const forbidden of [
      "fetch(",
      "https://",
      "api.openai",
      "api.anthropic",
      "OPENAI",
      "ANTHROPIC",
      "GEMINI",
      "BEDROCK",
      "_API_KEY",
      "apiKey",
      "PROMPT_TEMPLATE",
    ]) {
      expect(text.includes(forbidden), `lib/copilot.ts mentions ${forbidden}`).toBe(false);
    }
    // The api-client may only be reached for TYPES (erased at build): a runtime import
    // would drag a cookie-reading, service-calling module into the copilot's brain.
    const apiClientImports = [
      ...text.matchAll(/import[^;]*from "@\/lib\/api-client[^"]*";/g),
    ].map((match) => match[0]);
    expect(apiClientImports.length).toBeGreaterThan(0);
    for (const statement of apiClientImports) {
      expect(
        statement.trim().startsWith("import type"),
        `lib/copilot.ts value-imports the api-client: ${statement}`,
      ).toBe(true);
    }
  });

  it("takes no free-form text: a question is one of the four prompts", () => {
    expect(COPILOT_PROMPTS).toHaveLength(4);
    // An unknown or absent `ask` resolves to the default rather than anything generative.
    expect(copilotPrompt("summarise the family").key).toBe(COPILOT_PROMPTS[0].key);
    expect(copilotPrompt(undefined).key).toBe(COPILOT_PROMPTS[0].key);
    expect(copilotPrompt(null).key).toBe(COPILOT_PROMPTS[0].key);
    expect(copilotPrompt(42).key).toBe(COPILOT_PROMPTS[0].key);
  });
});

/* ------------------------------------------------------------------ */
/* 2. The governance boundary                                          */
/* ------------------------------------------------------------------ */

describe("the governance boundary is part of the deliverable", () => {
  it("states the disconnected reality in one line", () => {
    expect(COPILOT_NOT_CONNECTED).toBe("No model is connected");
    expect(COPILOT_NOT_A_MODEL_NOTE).toContain("lookup");
    expect(COPILOT_NOT_A_MODEL_NOTE).toContain("No text here was generated");
  });

  it("names the four things the contract has to settle", () => {
    expect(COPILOT_GOVERNANCE.map((point) => point.key)).toEqual([
      "reads",
      "family",
      "human",
      "audit",
    ]);
    const byKey = Object.fromEntries(COPILOT_GOVERNANCE.map((p) => [p.key, p.detail]));
    expect(byKey.reads).toMatch(/permissions of the person asking/i);
    expect(byKey.family).toMatch(/never/i);
    expect(byKey.human).toMatch(/suggestion/i);
    expect(byKey.audit).toMatch(/traceable/i);
  });

  it("names who owns it — the client question and the later service", () => {
    const owner = COPILOT_OWNER.join(" ");
    expect(owner).toContain("unanswered client question");
    expect(owner).toContain("ai-orchestration");
    expect(owner).toMatch(/read-only/);
    // Two short lines, so the reading budget's paragraph limit holds on the screen.
    expect(COPILOT_OWNER).toHaveLength(2);
    for (const line of COPILOT_OWNER) expect(line.split(/\s+/).length).toBeLessThanOrEqual(20);
  });
});

/* ------------------------------------------------------------------ */
/* 3. The answers are the records                                      */
/* ------------------------------------------------------------------ */

describe("what needs doing today", () => {
  const answer = ask("today");

  it("counts the cases with open work, as the board derives them", () => {
    expect(answer.state).toBe("answered");
    const taskRows = answer.findings.filter((f) => f.id.endsWith("-tasks"));
    expect(taskRows).toHaveLength(6);
    expect(taskRows.map((f) => f.subject).sort()).toEqual([
      "CASE-2026-0001",
      "CASE-2026-0002",
      "CASE-2026-0004",
      "CASE-2026-0005",
      "CASE-2026-0006",
      "CASE-2026-0007",
    ]);
    expect(taskRows.every((f) => /^\d of \d recorded tasks open$/.test(f.statement))).toBe(true);
    expect(answer.headline).toBe("6 cases have recorded work open today.");
  });

  it("flags the recorded guarantee paper past the contract's own term", () => {
    const paper = answer.findings.find((f) => f.id === "CASE-2026-0001-paper_overdue");
    expect(paper, "CASE-2026-0001 carries one unfiled instrument past day 3").toBeTruthy();
    expect(paper!.statement).toBe("1 guarantee paper past the contract's 3-day term");
    expect(paper!.tone).toBe("danger");
    expect(paper!.records.map((r) => r.href)).toEqual([
      `/staff/cases/${CASES[0].id}`,
      `/staff/cases/${CASES[0].id}/instruments`,
    ]);
  });

  it("says the calendar records nothing today rather than staying quiet", () => {
    expect(answer.gaps).toContain("The chapel calendar records nothing for today.");
  });
});

describe("what is waiting on a family", () => {
  const answer = ask("waiting");

  it("lists the family-side paperwork and nothing else", () => {
    expect(answer.state).toBe("answered");
    expect(answer.findings.map((f) => f.id)).toEqual([
      "CASE-2026-0001-family-papers",
      "CASE-2026-0003-family-papers",
    ]);
    expect(answer.headline).toBe("2 cases are waiting on something a family owes.");
  });

  it("runs the paper's own three-day clock from the recorded contract date", () => {
    const late = answer.findings[0];
    // Contract 2026-08-28 + the paper's 3 days = 2026-08-31; today is 2026-09-19.
    expect(late.statement).toBe(
      "1 guarantee paper not yet filed — the contract's 3-day deadline passed 19 days ago",
    );
    expect(late.tone).toBe("danger");
  });

  it("keeps an unrecorded contract date the honest unknown", () => {
    const unknown = answer.findings[1];
    expect(unknown.statement).toBe(
      "1 guarantee paper not yet filed — no contract date is recorded",
    );
    expect(unknown.tone).toBe("neutral");
  });

  it("says plainly when nothing is waiting", () => {
    const empty = ask("waiting", { instrumentsByCase: {} });
    expect(empty.state).toBe("nothing_recorded");
    expect(empty.headline).toBe("No recorded item is waiting on a family.");
    expect(empty.findings).toEqual([]);
  });
});

describe("which cases have not moved", () => {
  const answer = ask("not-moved");

  it("orders the in-service cases longest wait first, with the recorded ages", () => {
    expect(answer.state).toBe("answered");
    expect(answer.findings.map((f) => f.subject)).toEqual([
      "CASE-2026-0001",
      "CASE-2026-0002",
      "CASE-2026-0004",
      "CASE-2026-0005",
      "CASE-2026-0006",
      "CASE-2026-0007",
    ]);
    expect(answer.findings.map((f) => f.statement)).toEqual([
      "No recorded change for 23 days",
      "No recorded change for 23 days",
      "No recorded change for 23 days",
      "No recorded change for 22 days",
      "No recorded change for 22 days",
      "No recorded change for 22 days",
    ]);
    expect(answer.headline).toBe("6 cases have not moved — the longest wait is 23 days.");
  });

  it("never colours a wait: no agreed staleness threshold exists", () => {
    expect(new Set(answer.findings.map((f) => f.tone))).toEqual(new Set(["neutral"]));
    // A completed case is out of service and is not on this list.
    expect(answer.findings.map((f) => f.subject)).not.toContain("CASE-2026-0003");
    expect(answer.limit).toContain("not overdue flags");
  });
});

describe("what is this case's next step", () => {
  it("reads one case's recorded next task, stage and coordinator", () => {
    const answer = ask("next-step", { caseNumber: "CASE-2026-0002" });
    expect(answer.state).toBe("answered");
    expect(answer.headline).toBe("Next recorded task: Dispatch retrieval team.");
    expect(answer.findings.map((f) => f.statement)).toEqual([
      "Retrieval · Waiting 23d",
      "Coordinator: Jose Mendoza",
      "Next recorded task: Dispatch retrieval team",
    ]);
    expect(answer.findings[0].records[0].href).toBe(`/staff/cases/${CASES[1].id}`);
  });

  it("accepts the case number as well as the id", () => {
    const byNumber = ask("next-step", { caseNumber: "CASE-2026-0002" });
    const byId = ask("next-step", { caseNumber: CASES[1].id });
    expect(byNumber).toEqual(byId);
  });

  it("asks for a case instead of presuming one", () => {
    const answer = ask("next-step");
    expect(answer.state).toBe("needs_case");
    expect(answer.headline).toBe("Pick a case to read its recorded next step.");
    expect(answer.findings).toEqual([]);
    expect(answer.choices).toHaveLength(7);
    expect(answer.choices[0].label).toBe("CASE-2026-0001 · Pedro Santos");
  });

  it("carries the case's family-side paperwork into the answer", () => {
    const answer = ask("next-step", { caseNumber: "CASE-2026-0001" });
    const papers = answer.findings.find((f) => f.id === "CASE-2026-0001-family-papers");
    expect(papers?.tone).toBe("danger");
  });

  it("says when every recorded task is done", () => {
    const answer = ask("next-step", { caseNumber: "CASE-2026-0003" });
    expect(answer.headline).toBe("Every recorded task on this case is done.");
    expect(answer.findings.some((f) => f.statement.startsWith("Next recorded task:"))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 4. The states that must stay honest                                 */
/* ------------------------------------------------------------------ */

describe("the answers a reader can trust to be empty", () => {
  it("says a question has no record rather than answering nothing", () => {
    const empty = { cases: [], instrumentsByCase: {} };
    for (const prompt of ["today", "waiting", "not-moved"]) {
      const answer = ask(prompt, empty);
      expect(answer.state, prompt).toBe("nothing_recorded");
      expect(answer.findings, prompt).toEqual([]);
      expect(answer.headline.length, prompt).toBeGreaterThan(0);
    }
  });

  it("tells the three calendar states apart", () => {
    const noScope = ask("today", { calendar: { state: "no_scope" } });
    expect(noScope.gaps).toContain(
      "The chapel calendar is not read without the scheduling:read scope.",
    );

    const unavailable = ask("today", { calendar: { state: "unavailable" } });
    expect(unavailable.gaps).toContain(
      "The chapel calendar could not be read just now, so it is missing above.",
    );
    expect(unavailable.gaps).not.toContain("The chapel calendar records nothing for today.");

    const booked: Booking = {
      id: "b1",
      resource_id: "r1",
      resource_name: "Chapel A",
      case_number: "CASE-2026-0001",
      title: "Wake — Day 3",
      starts_at: `${TODAY}T09:00:00Z`,
      ends_at: `${TODAY}T17:00:00Z`,
      status: "confirmed",
      conflicting: false,
    };
    const withBooking = ask("today", {
      calendar: { state: "read", bookings: [booked] },
    });
    const row = withBooking.findings.find((f) => f.id === "booking-b1");
    expect(row?.subject).toBe("Chapel A");
    expect(row?.records[0].href).toBe("/staff/schedule");
    expect(withBooking.gaps).not.toContain("The chapel calendar records nothing for today.");
  });

  it("prints a limit with every answer", () => {
    for (const prompt of COPILOT_PROMPTS) {
      const answer = ask(prompt.key);
      expect(answer.limit, prompt.key).toBe(prompt.limit);
      expect(answer.limit.trim().length).toBeGreaterThan(0);
    }
  });
});

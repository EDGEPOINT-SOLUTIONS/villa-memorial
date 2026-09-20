import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader, PageSection } from "@/components/ui/page";
import { ErrorState, ForbiddenState } from "@/components/ui/states";
import { requireSessionOrRedirect } from "@/lib/auth/guard";
import { hasAnyScope } from "@/lib/rbac/nav";
import { listCases, type Case } from "@/lib/api-client/operations";
import { loadCaseInstruments } from "@/lib/api-client/guarantee-instruments";
import type { GuaranteeInstrument } from "@/lib/guarantee-instruments";
import { listBookings } from "@/lib/api-client/scheduling";
import { parkToday } from "@/lib/schedule-board";
import {
  buildCopilotAnswer,
  COPILOT_ASK_HREF,
  COPILOT_GOVERNANCE,
  COPILOT_NOT_A_MODEL_NOTE,
  COPILOT_NOT_CONNECTED,
  COPILOT_OWNER,
  COPILOT_PROMPTS,
  type CopilotAnswer,
  type CopilotCalendar,
  type CopilotFinding,
} from "@/lib/copilot";

export const metadata = { title: "AI Copilot — Admin Portal" };

/**
 * Staff AI Copilot (PRD S29, `docs/05-ai/ai-capabilities.md` §"AI Operations Copilot").
 *
 * The screen inventory's last unbuilt product screen. It is built as the DESIGNED
 * surface, not the wired one, because a copilot that suggests things about a bereaved
 * family needs an AI governance contract first — what it may read, what it may never
 * say, who is accountable, how it is audited — and that is still an open client question
 * (`docs/07-client-villa/open-questions.md` §Operations & governance). So:
 *
 *  · every answer is a LOOKUP over records the office already holds, derived by
 *    `lib/copilot.ts` through the same board model the Operations board uses, and every
 *    finding prints the records it came from;
 *  · the governance boundary is a block on the screen, above the answers, not a footnote;
 *  · the disconnected state is stated plainly — no model provider is configured, and
 *    nothing on the page is generated text;
 *  · there is no free-text field and no write: a question is one of four prompts, and a
 *    case is one of the recorded cases.
 *
 * Scope: `cases:read` PROVISIONALLY. rbac-scopes-v1 names no ai:* token, and the
 * capability belongs to the platform's ai-orchestration service (E1) — read-only over
 * other services' APIs. Every answer here is a statement about case records, so the case
 * scope is the honest gate; the calendar needs `scheduling:read` on top and the page says
 * so when the reader does not hold it.
 */

/** The recorded instruments for every case, keyed by `case_number`. */
async function loadInstrumentsByCase(
  cases: Case[],
): Promise<Record<string, GuaranteeInstrument[]>> {
  const byCase: Record<string, GuaranteeInstrument[]> = {};
  await Promise.all(
    cases.map(async (kase) => {
      try {
        const read = await loadCaseInstruments(kase.case_number);
        if (read.state === "recorded") byCase[kase.case_number] = read.instruments;
      } catch {
        // An unreadable tracker never fails the page: the case simply carries no
        // recorded paper, and the answer says nothing about one. Absence is not a claim.
      }
    }),
  );
  return byCase;
}

/**
 * The calendar, in one of three honest states. A reader without `scheduling:read` — or
 * whose read failed — gets an answer that says which, never an empty day they might read
 * as "nothing today".
 */
async function readCalendar(canReadSchedule: boolean): Promise<CopilotCalendar> {
  if (!canReadSchedule) return { state: "no_scope" };
  try {
    return { state: "read", bookings: await listBookings() };
  } catch {
    return { state: "unavailable" };
  }
}

function Finding({ finding }: { finding: CopilotFinding }) {
  return (
    <li className={`copilot-finding copilot-finding--${finding.tone}`}>
      <p className="copilot-finding__statement">
        <strong className="copilot-finding__subject">{finding.subject}</strong>
        <span className="copilot-finding__sep"> · </span>
        {finding.statement}
      </p>
      <p className="copilot-finding__records">
        <span className="copilot-finding__records-label">
          {finding.records.length === 1 ? "Record:" : "Records:"}
        </span>{" "}
        {finding.records.map((record, index) => (
          <span key={`${record.href}-${record.label}`}>
            {index > 0 ? <span className="copilot-finding__sep"> · </span> : null}
            <Link href={record.href}>{record.label}</Link>
          </span>
        ))}
      </p>
    </li>
  );
}

function Answer({
  answer,
  selectedCase,
}: {
  answer: CopilotAnswer;
  selectedCase: string;
}) {
  const askHref = (key: string) =>
    `${COPILOT_ASK_HREF}?ask=${encodeURIComponent(key)}`;

  return (
    <div className="copilot-answer" data-prompt={answer.prompt}>
      <p className="copilot-answer__headline" data-state={answer.state}>
        {answer.headline}
      </p>

      {answer.prompt === "next-step" ? (
        <form className="copilot-picker" action={COPILOT_ASK_HREF} method="get">
          <input type="hidden" name="ask" value="next-step" />
          <label className="copilot-picker__label" htmlFor="copilot-case">
            Case
          </label>
          <select
            className="copilot-picker__select"
            id="copilot-case"
            name="case"
            defaultValue={selectedCase}
          >
            <option value="">Pick a recorded case</option>
            {answer.choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          <button className="btn btn--primary btn--sm" type="submit">
            Read its next step
          </button>
        </form>
      ) : null}

      {answer.findings.length > 0 ? (
        <ul className="copilot-findings">
          {answer.findings.map((finding) => (
            <Finding key={finding.id} finding={finding} />
          ))}
        </ul>
      ) : null}

      <p className="copilot-answer__limit">
        <span className="copilot-answer__limit-label">What this does not cover:</span>{" "}
        {answer.limit}
      </p>
      {answer.gaps.map((gap) => (
        <p className="copilot-answer__gap" key={gap}>
          {gap}
        </p>
      ))}
      <p className="copilot-answer__basis">
        Read on the park&rsquo;s own calendar day. Nothing was inferred, ranked or drafted.
      </p>

      {answer.prompt !== "next-step" ? (
        <p className="copilot-answer__jump">
          <Link className="btn btn--secondary btn--sm" href={askHref("next-step")}>
            Ask about one case
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default async function CopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ ask?: string | string[]; case?: string | string[] }>;
}) {
  const session = await requireSessionOrRedirect();
  // Provisional gate (see the file header): no ai:* scope exists in rbac-scopes-v1 and
  // every answer on this page is a statement about case records.
  if (!hasAnyScope(session.scopes, ["cases:read"])) {
    return (
      <>
        <PageHeader eyebrow="Intelligence" title="AI Copilot" />
        <PageSection>
          <ForbiddenState requiredScopes={["cases:read"]} />
        </PageSection>
      </>
    );
  }

  const query = await searchParams;
  const ask = typeof query.ask === "string" ? query.ask : (query.ask?.[0] ?? null);
  const wantedCase = typeof query.case === "string" ? query.case : (query.case?.[0] ?? "");

  let cases: Case[];
  try {
    cases = await listCases();
  } catch {
    return (
      <>
        <PageHeader eyebrow="Intelligence" title="AI Copilot" />
        <PageSection>
          <ErrorState message="Unable to load the case and paper records." />
        </PageSection>
      </>
    );
  }

  const today = parkToday();
  const instrumentsByCase = await loadInstrumentsByCase(cases);
  const calendar = await readCalendar(hasAnyScope(session.scopes, ["scheduling:read"]));

  const answer = buildCopilotAnswer({
    ask,
    caseNumber: wantedCase,
    cases,
    instrumentsByCase,
    calendar,
    today,
  });

  return (
    <>
      <PageHeader
        eyebrow="Intelligence"
        title="AI Copilot"
        actions={
          <>
            <Badge tone="warning">{COPILOT_NOT_CONNECTED}</Badge>
            <Link className="btn btn--secondary btn--sm" href="/staff/ops">
              Open the operations board
            </Link>
          </>
        }
      />

      <p className="copilot-lead">
        Every answer below is a lookup over recorded facts.
      </p>

      <PageSection>
        <div className="alert alert--warning">
          <div>
            <p>
              <strong>No model is connected to this screen.</strong>
            </p>
            <p className="mb-0">{COPILOT_NOT_A_MODEL_NOTE}</p>
          </div>
        </div>
      </PageSection>

      <PageSection>
        <Card
          header={
            <div className="row row--space">
              <h2>The governance boundary</h2>
              <Badge tone="warning">Not settled</Badge>
            </div>
          }
        >
          <p className="copilot-governance__intro">
            A model may only be attached here once the office settles four things, in
            writing:
          </p>
          <ul className="copilot-governance">
            {COPILOT_GOVERNANCE.map((point) => (
              <li key={point.key}>
                <span className="copilot-governance__title">{point.title}</span>
                <span className="copilot-governance__detail">{point.detail}</span>
              </li>
            ))}
          </ul>
          <div className="copilot-governance__owner">
            {COPILOT_OWNER.map((line) => (
              <p className="copilot-governance__owner-line" key={line}>
                {line}
              </p>
            ))}
          </div>
        </Card>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">What a copilot would be for</h2>
        <p className="text-sm text-muted">
          Four questions this office asks. Each one reads records the portal already holds.
        </p>
        <ul className="copilot-prompts">
          {COPILOT_PROMPTS.map((prompt) => {
            const active = prompt.key === answer.prompt;
            return (
              <li key={prompt.key}>
                <Link
                  className={`copilot-prompt${active ? " copilot-prompt--active" : ""}`}
                  href={`${COPILOT_ASK_HREF}?ask=${prompt.key}`}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="copilot-prompt__question">{prompt.question}</span>
                  <span className="copilot-prompt__reads">Reads {prompt.reads.toLowerCase()}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PageSection>

      <PageSection>
        <h2 className="page-section-title">{answer.question}</h2>
        <Answer answer={answer} selectedCase={wantedCase} />
      </PageSection>
    </>
  );
}

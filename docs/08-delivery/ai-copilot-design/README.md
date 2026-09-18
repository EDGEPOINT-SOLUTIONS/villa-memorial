# AI Copilot — `/staff/copilot` (design record)

The last unbuilt product screen in the inventory (`docs/04-modules/screen-inventory.md`
§Admin/staff, PRD S29; capability `AI Operations Copilot` in `docs/05-ai/ai-capabilities.md`).
It was deferred by the delivery plan for a good reason: an assistant that suggests things about
a bereaved family's funeral needs an **AI governance contract** first — what it may read, what
it may never say, who is accountable for its output, how it is audited. That contract does not
exist, and the client has not answered it (`docs/07-client-villa/open-questions.md` §Operations
& governance — "AI governance and human-approval requirements").

So this screen is the **designed surface**, built on recorded data, with its limits written into
the interface. It demonstrates the shape of the capability without pretending to think.

## What it is

- **Four questions, as prompts.** The office's own questions — *What needs doing today?* ·
  *What is waiting on a family?* · *Which cases have not moved?* · *What is this case's next
  step?* — each a link (`?ask=`), each printing what it reads before it is asked.
- **Answers that are lookups.** `lib/copilot.ts` derives every answer through the **same**
  `buildOpsBoard` model the Operations board uses, so the copilot and the board cannot disagree
  about a case's age, stage or open work. Every answer opens on a one-sentence headline and
  lists short record statements, never paragraphs.
- **The record trail on every finding.** Each row prints the records behind it, linked to the
  real staff routes (`/staff/cases/[id]`, `…/instruments`, `/staff/schedule`). A finding can
  never carry no trail — the type has no state for an orphan claim, and
  `tests/unit/copilot-model.test.ts` asserts every finding of every answer carries at least one
  `/staff/` record.
- **What it does not cover, printed with the answer.** Each prompt carries a fixed `limit`
  ("Only paperwork this portal records counts here — calls, messages and visits are not
  recorded, so a wait on a reply is invisible."), and the answer adds the runtime caveats it
  actually met (an unread calendar, an empty day).
- **One case chooser, never a text box.** *What is this case's next step?* renders a native
  `GET` form: a `<select>` of the recorded cases and a submit. The URL carries the case id, and
  a selection that resolves to no record answers "No case on record matches that selection"
  **without echoing it**.

## The governance boundary — on the screen, above the answers

`COPILOT_GOVERNANCE` (`lib/copilot.ts`) is rendered as a card between the honest state and the
prompts, so a reader meets the boundary *before* the first answer. It names the four things the
contract must settle:

| Point | What it says |
|---|---|
| What it may read | Which records a model may be given, and only inside the permissions of the person asking — never an access of its own. |
| It never speaks to a family | A model never writes to a family from here: no message, summary, letter or memorial is drafted, sent or published on anyone's behalf. |
| A person always confirms | An answer is a suggestion a staff member acts on. Nothing here writes, books, pays or decides. |
| How it is audited | What it read, what it said and who saw it has to be traceable, source by source. |

**Owner**, in two short lines under the four: *the office* — what a copilot may read and may say
is an unanswered client question; the later build is the platform's **ai-orchestration** service
(E1, read-only over these records, a person confirming every output). The platform guardrails the
screen leans on are `docs/05-ai/ai-governance.md` (grounding, permission-awareness, human
approval gates, traceability, model/provider abstraction, labelling).

## The disconnected state

No model provider is configured, and the screen says so four times, in the reader's own path:

1. a **badge** in the page header — "No model is connected";
2. an **alert** in the first screenful — "No model is connected to this screen. Everything on
   this screen is a lookup over records the office recorded. No text here was generated.";
3. the **governance block** — the four unsettled decisions above;
4. a **basis line** under every answer — "Read on the park's own calendar day. Nothing was
   inferred, ranked or drafted."

## Safety, by construction

The boundary is not only prose. `lib/copilot.ts` is a pure function of records and two URL
choices, and the tests check the structure rather than the promise:

- **No model client.** The module source is scanned for `fetch(`, any `https://` URL, provider
  names (`openai`, `anthropic`, `gemini`, `bedrock`), key paths (`_API_KEY`, `apiKey`) and any
  prompt-passthrough (`PROMPT_TEMPLATE`). It also may only reach `lib/api-client` for **types**
  (`import type` — erased at build), never for a runtime import. Live network evidence: with the
  page open, **all 10 requests went to `localhost:4000`; zero external requests**.
- **No free text.** The rendered markup is scanned for `<textarea>`, `type="text"`,
  `type="search"` and `type="email"`; the only `<input>` allowed is the picker's hidden
  `ask` field, and the only `<form>` must be `method="get"` with `action="/staff/copilot"`.
- **No advice.** Every headline and every finding statement is checked against a banned-advice
  word list (`should`, `recommend`, `suggest`, `advise`, `consider`, `prioritise`, `best to`,
  `make sure`) and against second-person address. A copilot answer states a record; it does not
  tell a staff member what to do about a bereaved family.
- **No invented figure.** The screen prints no amount at all — no deduction arithmetic, no
  balance, no estimate. Pinned by a rendered-page assertion that the markup contains no `₱`.
- **No decision.** Every finding is a statement; nothing on the page is an approve/reject/hold.

## What the answers actually read

| Prompt | Recorded source | The rule it reads, not re-derives |
|---|---|---|
| What needs doing today? | Cases + tasks + guarantee instruments + (if scoped) the chapel calendar | Cards ordered by the board's own flag tone and longest wait; paper flags are the service contract's own 3-day term (`INSTRUMENT_FILING_DAYS`). Completed cases are included — a finished case can still owe a paper. |
| What is waiting on a family? | Unfiled guarantee instruments + the service's `"Pending intake"` marker | The filing deadline is derived from the case's **recorded contract date**; a case with no date is the honest `unknown`, never a countdown. |
| Which cases have not moved? | The recorded `updated_at` of every case still in service | Whole park days (Asia/Manila), longest wait first, **never coloured**: no agreed staleness threshold exists, so an age is an age. |
| What is this case's next step? | One case's stage, wait, coordinator, first open task and family-side paper | The next task is `card.nextTask` — the board's own "first task that is not done", so the two screens name the same step. |

## Honest states

- `nothing_recorded` — the records were read and nothing matched the question ("No recorded item
  is waiting on a family."). Distinct from an error and distinct from a failure.
- `needs_case` — the question is about one case and none is chosen; the page offers the recorded
  cases and says nothing about a case it does not have.
- **Three calendar states, never blurred**: `no_scope` ("The chapel calendar is not read without
  the scheduling:read scope."), `unavailable` ("could not be read just now, so it is missing
  above."), and `read` with an empty day ("records nothing for today."). An unreadable calendar
  is never reported as an empty one.

## Scope, gating, navigation

- **`cases:read` provisionally.** `rbac-scopes-v1` names no `ai:*` token, and the capability
  belongs to the platform's `ai-orchestration` service; every answer on the page is a statement
  about case records, so the case scope is the honest gate. The chapel calendar needs
  `scheduling:read` **on top**, and the page says so when the reader lacks it rather than
  silently reporting an empty day.
- One nav entry: **AI Copilot** in *Overview*, after Reports (the same cross-module-intelligence
  row). `tests/unit/staff-scope-vocabulary.test.ts` stays green — the gate is an inline array of
  a frozen token.

## Layout, craft, accessibility

- 1440 px: one column — header, honest state, governance card, four prompt cards in a row
  (`auto-fit minmax(16rem, 1fr)`), then the answer with one ruled row per finding. Left rule only
  for tone (clay = danger, amber = warning, sky = info, hairline = neutral); no fills, no shadows
  on rows, no gradients.
- 390 px: the prompts stack to one column, the picker's select and button go full-width 44 px,
  the answer's padding tightens. `document.documentElement.scrollWidth === 390` — **no
  horizontal page scroll**.
- Keyboard: prompts and record trails are links; the case chooser is a native `GET` form, so it
  works without JavaScript. Tab order walks prompts → records.
- Focus: the one global ring (`styles/base.css`) — measured on a prompt card as
  `2px solid rgb(26, 82, 120)` (sky-800) with a 2 px offset and the marble halo. No per-surface
  override was added.
- One `h1`; no skipped heading level (`h1` → `h2` throughout). Tokens only from
  `styles/tokens.css`.
- **Lighthouse (390 px mobile emulation): Accessibility 100, Best Practices 100, Agentic
  Browsing 100.** The only non-passing audit is `is-crawlable` — the staff portal is
  `Disallow`ed in `app/robots.ts`, which is the correct answer for a private staff screen. No
  console errors.

## Reading budget

The page joined `tests/unit/reading-budget.test.tsx` in the PR that built it (a copilot answer
must be read at a glance too): opening sentence 8 words, longest paragraph 20, paragraph prose
~210 of the 300-word budget, longest list item under the limit. The finding statements are
deliberately templated short facts ("2 of 4 recorded tasks open"), never prose — which is what
keeps a data-driven list inside the budget without gaming it.

## Files

- `lib/copilot.ts` — the pure model: the four prompts, the governance block, the answer
  builders, and the route helpers. No store, no service, no model.
- `app/(staff)/staff/copilot/page.tsx` — the server route: session + `cases:read` gate, loads
  cases, their recorded instruments and (where scoped) the calendar, builds the answer, renders
  it. Route-local presentation only; the page writes nothing.
- `lib/rbac/nav.ts` — the one nav entry.
- `styles/components.css` — the `.copilot-*` block at the end of the file.
- `tests/unit/copilot-model.test.ts` (25) · `tests/unit/copilot-page.test.tsx` (14) ·
  `tests/unit/reading-budget.test.tsx` (the page's row).

## Evidence (shots in `./shots`)

| File | What it shows |
|---|---|
| `copilot-1440-first-screen.png` | The first screenful at 1440: header badge, honest state, and the governance block above the fold. |
| `copilot-1440-today-full.png` | Full page: prompts, the data-backed *today* answer with its trails, the limit and the calendar caveat. |
| `copilot-1440-waiting.png` | *What is waiting on a family?* — the passed 3-day term (clay) beside the honest "no contract date is recorded". |
| `copilot-1440-next-step-picker.png` | The chooser with no case chosen. |
| `copilot-1440-next-step.png` | One case's next step, with its family-side paper carried in. |
| `copilot-390-today-full.png` | The whole screen at 390 px: stacked prompts, ruled findings, no horizontal scroll. |
| `copilot-390-next-step.png` | The chooser and answer at 390 px — full-width 44 px controls. |

Measured on the running build (`npm run dev`, fixtures, signed in as the admin persona,
`DEMO_QUICK_FILL=1`).

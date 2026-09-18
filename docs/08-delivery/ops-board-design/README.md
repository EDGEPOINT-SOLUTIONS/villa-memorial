# Operations board — `/staff/ops` (design record)

The morning screen a supervisor opens to see the whole day's work and move it. The PRD
named an "Operations Board" (blueprint §36, `docs/04-modules/facilities-scheduling.md`);
the work itself already existed — task status and stage moves run from the case screen
(`/staff/cases/[id]`, PR #53), the case list carries stage filters, and the schedule
shows the day's bookings. What was missing was the board.

## What it is

- **Lanes by stage.** One lane per frozen `case-events-v1` stage
  (`lib/operations/case-board.ts`), in contract order. A lane with no cases says
  "No cases"; a board with no cases says so plainly.
- **A card without opening the case.** Case reference, deceased name (or the service's
  own "Awaiting intake"), the family (`intake.client_name` + relationship, or "Family
  not recorded"), coordinator, stage badge, task progress, the open tasks, the wait age,
  and the recorded flags.
- **The same two writes as the case screen.** A stage select + Move opens the board's
  one confirmation modal; every open task has a "Mark … done" tick. Both call
  `lib/operations/board-api.ts` — the same BFF routes under `/api/cases/**` — and both
  follow the case screen's honest-failure contract: a refused write shows the server's
  own words and the board re-reads server truth (never an optimistic success).
- **Links, not duplicates.** Each card opens its case; the header links to
  `/staff/schedule` and `/staff/cases`. No second copy of the schedule or the case list.

## The urgency rules — recorded, never invented

Authority: `lib/operations/ops-board.ts` (pure; the page and the tests read it).

| Flag | Basis |
|---|---|
| `Awaiting intake` | The service's own marker (`deceased_name === "Pending intake"`) — blocks everything downstream. |
| `N guarantee papers overdue` / `N papers due` | The Funeral Service Contract's clause 2, three days from the contract date for the guarantee instruments (`INSTRUMENT_FILING_DAYS`, read through `lib/guarantee-instruments.ts` — the SAME rule the case's tracker screen uses). Only an unfiled instrument past that recorded date is "overdue"; absence of a tracker is not a claim. |
| `Waiting Nd` + `oldest Nd` lane head + longest-wait-first order | Whole park days (Asia/Manila) since the case's recorded `updated_at`. **No client-agreed stage-staleness threshold exists**, so the board states the fact and orders by it; the page prints that basis under the board and never colours a card overdue on an app-invented SLA. |

## Layout & craft

- Summary strip (In service · Papers overdue · Awaiting intake · Longest wait) — counts
  and labels only.
- ≥ 40 rem: lanes are one flex row that shrinks to a 9.5 rem minimum and scrolls
  **inside its own frame** (`overflow-x: auto` on `.ops-board`), never the page. At
  1440 px all seven lanes fit with no scroll. < 40 rem: lanes stack full-width.
- 390 px: `document.scrollWidth === 390` — no horizontal page scroll; selects and Move
  buttons are full-width 44 px touch targets.
- Tokens only (`styles/tokens.css`); one `h1` (page header), lane `h2`s, card `h3`s; the
  move confirmation uses `components/ui/use-modal-focus.ts` (focus in, Tab trapped,
  Escape closes, focus returns); the board frame is `tabIndex={0}` so keyboard users can
  reach its scroll area.
- The lane base block sits **before** its `@media (min-width: 40rem)` override in
  `styles/components.css` (the class-order trap the repo records for
  `.chapel-month` vs `.chapel-grid`), and every card/list is a `minmax(0, 1fr)` grid
  track so a narrow lane shrinks instead of overflowing.

## Files

- `app/(staff)/staff/ops/page.tsx` — server page: session + `cases:read` gate, loads
  cases and (where present) each case's recorded guarantee instruments, builds the
  board model, renders the summary, the board and the basis line.
- `app/(staff)/staff/ops/ops-board-view.tsx` — client lanes/cards, the task tick, the
  board-level stage-move modal.
- `lib/operations/ops-board.ts` — pure model: lanes, wait ages, flags, summary.
- `lib/rbac/nav.ts` — "Operations board" under Operations, `cases:read` (siblings'
  gate; the writes need `cases:write`).
- Tests: `tests/unit/ops-board-model.test.ts` (pure rules),
  `tests/unit/ops-board-page.test.tsx` (rendered page, both writes through the durable
  store, read-only and forbidden states, empty board, reading budget). The write
  endpoints themselves stay pinned by `tests/unit/ops-board.test.ts` +
  `tests/unit/ops-board-rbac.test.tsx`.

## Evidence (`shots/`)

| Shot | Shows |
|---|---|
| `ops-board-1440.png` | The board at 1440: seven lanes, overdue flag, empty Interment lane, summary. |
| `ops-board-1440-moved.png` / `ops-board-1440-moved-card.png` | CASE-2026-0006 moved Inquiry → Preparation through the UI (success banner; Inquiry 1 / Preparation 2), its card in the new lane, and "Confirm embalming completion — done." after the task tick. |
| `ops-board-390.png` / `ops-board-390-cards.png` / `ops-board-390-moved.png` | Phone: stacked lanes, full-width controls, 44 px targets, no page sideways scroll (`scrollWidth === 390`). |
| `ops-board-empty-1440.png` / `ops-board-empty-390.png` | The empty board (live-mode stub returned zero cases). |

Verified with `npm run lint`, `npm run typecheck`, `npm test` (1558 tests),
`npm run build`, and the browser checks above.

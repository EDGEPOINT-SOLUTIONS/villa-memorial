# Guarantee-instrument tracker — implementation record (F-18 / FORMS_PLAN gap 5, 2026-09-18)

**Routes:** the compact card on `/staff/cases/[id]` and the folio
`/staff/cases/[id]/instruments`.
**Brief:** checklist F-18 — the forms scout found the paperwork is already captured on the
Funeral Service Contract (its deductions block), but nothing followed what happens to each
instrument afterwards. Gap 5 was built first of the three remaining forms gaps because it
needs **no new paper authority**: it reads the already-captured FSC deductions and reuses the
case-page kit.

## What the tracker shows, per instrument

1. **Which instrument it is** — LGU · DSWD · SSS · GSIS · life plan, the contract's own words
   for the deduction row (`coverage`), who it is claimed from (`claimed_from`), the amount the
   contract records (`amount_cents`, em dash when the paper's blank was left empty) and the
   paper's own reference blank (`reference`) when it carries one.
2. **Where it stands** — the office's five states in its own words (`not_filed` · `filed` ·
   `awaiting_agency` · `confirmed` · `rejected`) with the recorded `filed_on` / `response_on`
   dates printed through the one calendar printer.
3. **The deadline** — the paper's three-day filing clock, derived from the case's recorded
   contract date, shown only while the instrument is `not_filed` ("File by Aug 31, 2026" +
   `1 day left` / `Due today` / `Passed 18 days ago`).
4. **What it waits on** — the supporting-document checklist, each row with its own state
   (`Received` / `Still needed`) plus the one-line "Still needed: …" roll-up.
5. **On the case page** — a compact card right after the service-contract card: one line per
   instrument with its state, the overdue flag, the deadline when unfiled, and "Open the
   instrument tracker".

## Where every fact comes from (nothing is authored in the view)

| Fact | Source |
|---|---|
| Instrument kinds, office states, document states, tones, labels | `lib/guarantee-instruments.ts` (pure — one vocabulary home) |
| The three-day filing rule (`INSTRUMENT_FILING_DAYS = 3`) | the paper's own clause 2 — `lib/contracts/villa-terms.ts` (`service-contract-2025`: "submit the payment guarantee instruments within three (3) days from the date of this contract"); pinned by test |
| The filing deadline date | DERIVED by `instrumentFilingDeadline()` from the case's recorded `intake.contract_date`; a missing date is the honest `unknown`, never a countdown |
| Amounts | the record's own integer `amount_cents`, printed with `formatMinorUnits`; a null is an em dash, never a zero or a computed figure |
| Recorded steps and references | the fixture's own `filed_on` / `response_on` / `reference` / `note` — the screen never invents an agency response |
| The instruments themselves | `lib/fixtures/operations/guarantee-instruments.json` (recorded demo tracker keyed by `case_number` to `operations/cases.json`), read through `lib/api-client/guarantee-instruments.ts` |
| Case, contract date, deceased | `getCase()` — the same case record the page renders |

The case page's existing order is untouched: Case details → Intake → Service contract →
**Guarantee instruments** → Record a payment → Contract & documents. The card adds one
`PageSection` and displaces nothing.

## The three-day clock

`instrumentFilingDeadline(contractDate, today)` returns one of `unknown · upcoming ·
due_soon · due_today · passed` with the derived date, whole days left and a short label.
`due_soon` and `due_today` carry the warning tone, `passed` carries danger. Only a
`not_filed` instrument is under the clock (`instrumentNeedsFiling`); once filed, the card
prints the recorded filing date instead of a deadline. `businessToday()` (the park's business
zone) supplies "today", and the fixture stores **no** deadline on any row — the date is always
derived.

## Honest states, compressed

- **Status only — no money moves here.** There is no sub-ledger, no deduction arithmetic and
  no posting behind this screen (FORMS_PLAN gap 5 / issue #54, dev-owned). The detail screen
  says it once in one line: *"Tracking the paperwork only — the amounts, balances and posting
  behind a guarantee stay with finance's sub-ledger."* The card repeats the same one line
  under its rows.
- **Live mode is honestly unwired.** No contract under `docs/08-delivery/contracts/` names a
  guarantee-instrument record, so `loadCaseInstruments()` returns `not_wired` when
  `OPERATIONS_BASE_URL` is set and both surfaces say so instead of showing demo rows against
  real cases. Fixture mode (the default) serves the recorded tracker.
- **An untracked case is `absent`, not an error** — the card and the folio render an empty
  state that points back to the service contract's deductions block.
- **Malformed recorded data is a 502** from the tolerant reader (`toInstrument` /
  `toDocument` validate field by field, extra keys ignored) and renders as a calm
  "could not be read" state, never a crash.

## RBAC

Both surfaces gate on `cases:read` (the same scope as the case and its service contract),
declared as an inline array so `tests/unit/staff-scope-vocabulary.test.ts` reads it; the
vocabulary test and the admin-persona resolution pass unchanged. There is no write control —
the tracker only reads.

## Verification

- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` → **97 files / 1057 tests passed** ✓ ·
  `npm run build` ✓ (`/staff/cases/[id]/instruments` builds dynamic, 243 B / 107 kB first
  load).
- **Render checks** (production build, `next start`, chrome-devtools-axi, signed in as the
  admin persona; `businessToday()` = 2026-09-18, so the recorded 2026-08-28 contract's
  deadline has passed). Bounding-rect evidence:

  | Surface | 1440 × 900 | 390 × 844 |
  |---|---|---|
  | Case card (CASE-2026-0001) | 1120 × 361 at x 288, y 1760; 4 rows | 326 × 555; rows 276 wide; stacked badges |
  | Case card, no instruments (CASE-2026-0002) | 1120 × 204; link → service contract | 326 wide; link intact |
  | Tracker hero | 1120 × 278; "Aug 31, 2026" · "1 of 4 not filed · Passed 18 days ago" | 326 × 746; h1 230 wide, 27.2 px |
  | Instrument rows | 4 × 1070 wide (322–363 tall) | first row 276 × 632; facts grid 1 column (242 px) |
  | `h1` per route | 1 | 1 |
  | Horizontal overflow | none (`scrollWidth` = `clientWidth` = 1440) | none (`scrollWidth` = `clientWidth` = 390) |

  The overdue instrument (LGU guarantee — coffin: `Overdue` + `Not yet filed` + `Passed 18 days
  ago`, `File by Aug 31, 2026`) and the empty case are both in the shots. No inline styles in
  the new views; every colour/size/space resolves through `styles/tokens.css` (the `.gi-*`
  block in `styles/components.css`). Headings descend h1 → h2 → h3 → h4 (a Lighthouse
  heading-order failure was found and fixed in this pass).
- **Lighthouse, production build** — tracker route, desktop **Accessibility 96 · Best
  Practices 100**, mobile **Accessibility 96 · Best Practices 100**; SEO 63 is the staff
  noindex (expected). The single remaining audit is `color-contrast` on the shared
  `.badge--success/-warning/-danger` palette (12 px, e.g. 3.03:1 success) — **pre-existing
  staff-kit debt**: `/staff/orders`, untouched by this task, scores the same 96 with the same
  audit, and the tokens already carry darker `--color-status-*-ink` variants a global badge
  pass could adopt (out of this brief's boundary, flagged for the captain).
- **Tests:** `tests/unit/guarantee-instruments.test.ts` (the clause-pinned three-day rule, the
  derived deadline in every state, the office vocabulary, the summary counts), 
  `tests/fixture-contract/guarantee-instruments.test.ts` (case keys, internal coherence, the
  reader's `recorded` / `absent` / live `not_wired`), 
  `tests/unit/guarantee-instruments-screen.test.tsx` (both surfaces, one `h1`, at-a-glance
  states, the em dash, the checklist, the empty case, the honest non-record states, the
  `cases:read` gate, no write control).

## Shots

`shots/case-card-1440.png` · `shots/case-card-390.png` ·
`shots/case-card-empty-1440.png` · `shots/case-card-empty-390.png` ·
`shots/tracker-1440.png` · `shots/tracker-390.png` ·
`shots/tracker-plan-row-1440.png` (amount + em dash + rejected note) ·
`shots/tracker-row-390.png` · `shots/tracker-empty-1440.png` · `shots/tracker-empty-390.png`.

## Open contract ask (recorded, not silently widened)

No frozen contract names a guarantee-instrument record. The fixture shape, the reader and the
live-mode `not_wired` answer are APP-AUTHORED and PROVISIONAL (provenance in
`lib/fixtures/README.md` and the fixture header; the deduction amounts and references are
demo values). When case-events-v1 or a documents/operations contract grows a tracker shape,
the reader swaps to it and the fixture grows its provenance. The sub-ledger and posting behind
a deduction remain dev-owned and out of scope (issue #54).

# Family portal — the other pages, and the arrangement connected

**Task:** `villa-family-portal-pages` · **Repo:** villa-memorial · **Branch:** `fm/villa-family-portal-pages` · **Date:** 2026-10-01
**Brief:** the captain's own 2026-09-30 request — *“Since the dashboard is so amazing, let's do the rest of the page amazing also, not wordy, pages should really be helpful”* — and *“The funeral times aren't connected to this page yet… what does this mean, can we connect it?”*

Two jobs, one record:

1. **The other pages** — every family route reworked onto the dashboard's grammar (2026-09-30 command centre): each screen leads with its answer and the facts a family came for, prose goes down, and the honest “not switched on” states stay but sit shorter beside the facts instead of replacing them.
2. **The arrangement** — the dashboard panel is wired to the office's own recorded case (the five moments, with their times, places and states) through the same provisional family seam the snapshot uses. “Not connected yet” becomes the real arrangement; the phone line stays as the fallback.

---

## 1 · What shipped

| # | The ask | Where it lives |
|---|---|---|
| 1 | The **family case shape** — five steps, each with a time/day, a place, an optional person/note and a state | `lib/api-client/family.ts` (`FamilyCase`, `FamilyCaseStep`, `getFamilyCase`), `lib/family/family-case.ts`, `components/family/family-case.tsx` |
| 2 | The office's **recorded arrangement** for the demo family | `lib/fixtures/family/case.json` (provisional, provenance in-file), pinned by `tests/fixture-contract/family-case.test.ts` |
| 3 | The **dashboard panel** shows the real case; a step with no recording says “Not recorded yet”; a family with no case keeps today's honest state | `app/(family)/client/dashboard/page.tsx` (arrangement panel) |
| 4 | The **funeral page** shows the same case, rendered by the **same component** as the panel | `app/(family)/client/cases/page.tsx` + `components/family/family-case.tsx` |
| 5 | Every other family route on the dashboard's **panel grammar**, with shorter prose | `app/(family)/client/*` and `app/(family)/client/documents/receipts/[reference]`, `.dash` scope + `DashPanel` (`components/family/dash-ui.tsx`) |
| 6 | One place for the chain's five words so the chain and the schedule cannot drift | `FAMILY_CHAIN_STEPS` now derives from `FAMILY_CASE_STEPS` in `lib/family/family-case.ts`; `components/family/family-ui.tsx` re-exports it |

The recorded demo arrangement (the office's own case sheet for the family, as the approved
family-portal design samples record it):

| Step | When | Where | State |
|---|---|---|---|
| Arrangement | Saturday 12 September 2026 · 1:00 PM | The office · Sunrise, Isabela City | Done |
| Viewing | Wednesday 16 September 2026 · 9:00 AM | St. Joseph Chapel · Funeraria Villa, Aguada | Done |
| Funeral | Saturday 19 September 2026 · 10:00 AM | Sanctuario de Mercedes y Gloria, Begang | Done |
| Burial | Saturday 19 September 2026 · 11:30 AM | Your family's lot · Lawn A-01 | Done |
| Papers | 19 September 2026 | — (the burial permit, certificates and receipts) | Done |

The arrangement instant and place are the workspace fixture's own recorded office visit; the loved
one is the snapshot's; the burial place is the lot the plan names at the client's own park. The
viewing and funeral places and days are the approved design sample's recorded demo arrangement. The
fixture carries no amount, no family-facing case number and no coordinator — those stay with the
office (`lib/fixtures/family/case.json` `_provenance`, pinned by the fixture-contract test).

## 2 · Measured — fewer prose words, more facts

Measured on the production build (`next build` + `next start` on :4100, fixture mode, signed in as
`customer@vm.demo`) against the captain's dev server on :4000 at `main` (the before state). Prose
counts every word inside a `<p>` in the page's content column with the disclosure closed; facts
count table cells and label/value pairs.

| Screen | Prose words before → after | Facts before → after | Sections → panels |
|---|---:|---:|---:|
| Home (dashboard) | 109 → **103** | 59 → **83** | 7 → 7 |
| The funeral | 39 → **36** | 0 → **24** | 1 → 2 |
| Papers | 120 → **107** | 0 → 0 | 4 → 4 |
| Ask for a visit | 146 → **138** | 0 → 0 | 3 → 3 |
| Your plan | 59 → **53** | 0 → 0 | 1 → 2 |
| Payments | 112 → **104** | 0 → 0 | 3 → 4 |
| Your lot | 66 → **41** | 10 → 10 | 2 → 2 |
| Remembering | 35 → **30** | 4 → 4 | 1 → 2 |
| Your family | 97 → **87** | 0 → 0 | 2 → 2 |
| Requests | 87 → **80** | 0 → 0 | 1 → 1 |
| Help | 73 → **72** | 0 → 0 | 3 → 3 |
| What we tell you about | 28 → **24** | 0 → 0 | 1 → 1 |
| Privacy Center | 12 → **12** | 0 → 0 | — → — |
| Your details | 149 → **148** | 0 → 0 | 3 → 3 |
| **Portal total** | **1,132 → 1,035** | **73 → 121** | **25 → 36** |

Prose is down on every screen, the funeral page turns 24 new recorded facts on (its whole
schedule), the dashboard carries 24 more arrangement facts, and 25 generic `ag-sec` sections
became 36 role-labelled dashboard panels. The `family-reading-budget` guard keeps the same tight
ceiling (opening sentence ≤ 14 words, paragraph ≤ 25) after the rework.

## 3 · The case seam (why it is honest)

- `getFamilyCase()` is a **tolerant reader** (`lib/api-client/family.ts`): a malformed step is
  dropped, order is normalised to the chain, a record with no case is `null` — and the dashboard
  keeps today's “not connected yet” sentence in that case.
- The **view module is pure** (`lib/family/family-case.ts`): it prints an instant through the ONE
  day helper (`lib/family/family-view.ts`, Asia/Manila) and never derives a state from the clock.
- **One renderer** (`components/family/family-case.tsx`) serves the dashboard panel and
  `/client/cases`, so the chain and the step chips cannot drift from the schedule behind them.
- A step the record does not carry renders **“Not recorded yet”**, not a guessed time.

## 4 · Honest data change (flagged loudly)

- **One provisional family case fixture was added**, `lib/fixtures/family/case.json`, recording the
  demo family's own arrangement (section 1). It is app-recorded demo data with in-file provenance,
  exactly like `snapshot.json` and `workspace.json`; the case service (`case-events-v1`) exposes no
  family read, so **live mode is not claimed anywhere**. When a family-facing case read freezes,
  this fixture is replaced by it. The nested `app/(family)/AGENTS.md` now lists the third fixture.

## 5 · Verification

- `npm test` — **2,856 tests, 255 files, all pass** (including the new
  `tests/fixture-contract/family-case.test.ts` and `tests/unit/family-case.test.tsx`, and the
  updated `family-pages` / `family-prd-coverage` guards).
- `npm run lint` clean (three pre-existing warnings in `gallery-page.test.tsx`), `npx tsc --noEmit`
  clean.
- `npm run build` — production build success.
- Screenshots: `shots/` — `before-<screen>-1440.png`, `before-<screen>-390.png`,
  `after-<screen>-1440.png`, `after-<screen>-390.png` for all 14 routes (full page).
- `/client/cases` and the dashboard arrangement panel were checked visually at 1440 and 390; the
  schedule reads with the recorded times, places and states and no sideways scroll.

## 6 · Review record

| Date | What happened |
|---|---|
| 2026-10-01 | Reworked every family route onto the dashboard's dense grammar; connected the arrangement to the office's recorded case fixture; added the `family-case` fixture-contract guard; measured before/after prose and facts; the full suite, lint, typecheck and production build pass. The layout fix (`.dash-span-12` / `.dash-span-6`) is recorded in `styles/components.css` beside the other span rules. |

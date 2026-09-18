# Lot records — Ownership · Transfers · Interments · Exhumations (F-11, 2026-09-18)

**Routes** (all under the lot, in the property area of the staff panel):

| Screen | Route | File |
|---|---|---|
| Ownership | `/staff/property/[id]/ownership` | `app/(staff)/staff/property/[id]/ownership/page.tsx` |
| Transfers | `/staff/property/[id]/transfers` | `app/(staff)/staff/property/[id]/transfers/page.tsx` |
| Interments | `/staff/property/[id]/interments` | `app/(staff)/staff/property/[id]/interments/page.tsx` |
| Exhumations | `/staff/property/[id]/exhumations` | `app/(staff)/staff/property/[id]/exhumations/page.tsx` |

**Brief:** captain checklist F-11 — "Build the paperwork side of a memorial lot: who owns it, how it
changes hands, who is laid to rest in it, and how someone is moved." The requirement document is
`docs/04-modules/memorial-property-gis.md` (§15 lot record, §19 sales/ownership/transfer, §20–21
interment/exhumation).

## What each screen does, in the order the brief fixed

1. **Ownership** — the lot's record card. The glance card answers with the owner as the papers
   stand, co-owners (none are recorded anywhere — never invented), the authorised family named on
   the purchase application, how the lot was acquired and when, and its platform status. The
   right-of-interment card quotes the operative rule from the purchase agreement
   (`lib/contracts/villa-terms.ts`, the revision that governs the acquisition) and the
   application's first-interment/bundle line. The papers table joins the file's own paper numbers
   to the documents repository (title, status, date, link) and lists the captured application as
   the paper it is. Read-only; no co-owner projection exists upstream.
2. **Transfers** — a request changing hands. The glance card: the state in the clerk's words
   (submitted · verified · approved · completed), who to whom, the day the office wrote it down,
   and the next step with the office's note. The request card then shows the four-step history
   with dates (`Done` steps carry the day; waiting ones print “No date recorded”), what
   verification still needs, and the office's fee/requirement notes (the transfer fee is the
   office's schedule — no amount is printed anywhere).
3. **Interments** — the record of each interment in a lot. The glance card: how many records, when
   the ground was last opened, and every open check. Each record shows who, when, the lot and
   section, the service it belongs to (the case's own number + service lines, linked when the
   session may read cases) and its permit papers — then the checks the office runs before the
   ground is opened: deceased identity, ownership, payment standing, permits. A record marked
   “Ground opened” is backed by a completed case and a verified burial permit; a record that is
   not open names the failing check in a warning and never shows a plausible day.
4. **Exhumations** — the deliberate process. A warning leads the page (“Nothing is moved while a
   requirement is open … A missing step stops the work”), the request card answers with who, asked
   by/on, the reason, the destination and the next open requirement, then every requirement in
   order with its state and what it still needs. The “record of what was done” panel is always
   present — for the recorded request it says plainly that nothing has been done — and is footed
   “Recorded only when the work is complete”.

## Honest states (one short line per screen)

Every workflow here is unbuilt platform-side. lot-events-v1 (KEB-D3-01, FROZEN) makes `occupied`
and `for_transfer` status-only, defers the interment and transfer workflows, and exposes no
ownership projection. Each screen therefore names its own gap once, above the answer card:

- Ownership: “No ownership projection exists yet — lot-events-v1 returns one owner name and the
  dates, not co-owners, family or right of interment. This card reads the recorded lot, application
  and papers.”
- Transfers: “No transfer workflow exists yet — lot-events-v1 freezes for_transfer as a status
  only. What follows is the office's recorded file, in the words a clerk uses.”
- Interments: “Interment workflows are deferred in lot-events-v1 — occupied is a status only. This
  is the office's recorded file: who, when, the service and the checks before the ground opens.”
- Exhumations: “No exhumation workflow exists yet — and nothing in the recorded file confirms one
  being done. This is the office's recorded request, with every requirement it still needs.”

The records themselves are `lib/fixtures/property/lot-lifecycle.json` — APP-AUTHORED example data
with provenance (the same pattern as `lib/fixtures/family/workspace.json`). No amount, fee or
currency appears anywhere; no owner is asserted beyond the lot's recorded `owner_name` and the
purchase application's buyer; the only final record, a completed interment, is backed by a
completed case and a verified burial permit; and no exhumation is presented as done.

## Entry points and navigation

- The lot detail page (`/staff/property/[id]`) lists all four under **Lot records**: one row per
  record, its name linked, with its one-line state (`ownershipSummary` / `transferSummary` /
  `intermentSummary` / `exhumationSummary`). A read failure leaves the rows out with an honest
  note rather than breaking the lot page.
- Every record screen carries the shared tab row (`lot-record-tabs.tsx`, `aria-current="page"`),
  a “Back to lot” action, and cross-links where the records meet: the ownership card links the
  interment records; the interment record links its case (when the session holds `cases:read`)
  and its permit document (when it holds `documents:read`); an open check names an open transfer.
- Gating is the property area's own: every route requires `property:read` (graceful
  `ForbiddenState` otherwise), which `tests/unit/staff-scope-vocabulary.test.ts` picks up
  automatically and resolves for the admin persona.

## Above-the-fold evidence (production build, `node .next/standalone/server.js`, fixture mode)

Measured with the bounding rects of the rendered elements at 1440 × 900 (viewport 900 px): the
answer card is fully in the first screenful on every screen; the gap line sits above it.

| Screen | Honest-state line ends | Answer card ends | Above the fold? |
|---|---|---|---|
| Ownership (A-003) | 286 px | 635 px | yes |
| Transfers (A-003) | 266 px | 582 px | yes |
| Interments (C-001) | 286 px | 522 px | yes |
| Exhumations (C-001) | 266 px | 771 px | yes |

At 390 × 844, the four screens have **no horizontal page scroll** (`window.scrollX` stays 0 after
`scrollTo(200,0)`; `document.documentElement.scrollWidth` = 390); wide tables scroll inside their
own `.table-wrapper`. Note (pre-existing, repo-wide): the staff shell stacks its full sidebar above
the content below 48 rem, so on a phone the page content follows the nav — the 390 shots are taken
with the content scrolled to the screen's `h1` so they show the screen itself; the screens wrap
cleanly and every touch target stays ≥ 40 px. In that scrolled position the gap line ends at
263 px and the first card ends at 713 px (Ownership) / 720 px (Transfers) / 560 px (Interments);
Exhumations' warning and request card begin in the first 844 px with the card's requirement list
continuing below it.

## Shots

- `shots/ownership-1440.png`, `shots/ownership-390.png`, `shots/ownership-papers-1440.png`
- `shots/transfers-1440.png`, `shots/transfers-390.png`
- `shots/interments-1440.png`, `shots/interments-390.png`,
  `shots/interments-blocked-1440.png` (C-004: the ownership check stops the ground),
  `shots/interments-blocked-390.png`
- `shots/exhumations-1440.png`, `shots/exhumations-390.png`
- `shots/lot-record-entry-1440.png`, `shots/lot-record-entry-390.png` (the lot page's entry table)

## Tests

- `tests/unit/lot-lifecycle.test.ts` — the office's vocabulary (four transfer words, step states and
  tones, the entry summaries) and deterministic date printing.
- `tests/unit/lot-lifecycle-pages.test.tsx` — the four real pages over the recorded file: the
  answer survives above the fold (glance order), each gap line, gating (forbidden + unknown lot),
  one `h1`, the tab row and way back, and the reading budget (no paragraph over 30 words, ≤ 150
  paragraph words per page, short list items, no `<p>` nesting).
- `tests/fixture-contract/lot-lifecycle.test.ts` — every cross-reference (lot, case, document,
  park, customer), the transfer state invariants, the interment ground-opened invariants, the
  exhumation “nothing done while open” invariants, the no-amount rule, and the ownership
  composition over the real fixture records.

## Out of scope (recorded, not half-wired)

The write paths do not exist upstream, so these screens record and read only: no create/edit/start
action is offered, no BFF route was added, and no lot status is changed. When the deferred
workflows land, `lib/api-client/lot-lifecycle.ts` gains a live branch and the fixture's provenance
comments are replaced by contract references.

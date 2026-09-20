# Vehicle dispatch · Work orders · Notifications — the three designed admin screens

The captain found three admin pages empty: `/staff/dispatch`, `/staff/work-orders` and
`/staff/notifications` were twelve-line stubs that printed a generic "not wired yet" line.
Each waits on a platform service that still does not exist — a dispatch service, a field-ops
work-order service, a notification service — but that was never a reason to show a blank page.
These three follow the pattern the Commission, lot-record, guarantee-tracker and AI Copilot
screens already ship: **a designed, working screen over the office's own recorded data, with one
honest line naming what the platform service will add.**

## What each screen is

### `/staff/dispatch` — the fleet and its day (PRD S13, blueprint §14/§36)

- **Day board**: the recorded trips in time order — park-time window · trip kind · case (linked
  to the real case record) · vehicle · driver · route · state (Scheduled / En route / Completed).
- **Assignment view**: the fleet's plate, type, capacity, recorded state and each vehicle's
  driver and load, then every driver on duty with their trips and vehicles.
- **Read-only, said on the page.** Dispatch belongs to D5 scheduling-resources
  (`dispatch.completed`, `docs/02-architecture/microservices.md:51`); no dispatch contract
  exists, so there is nothing to write through and no assignment control that could only fail.
  Live mode (`SCHEDULING_BASE_URL`) answers a named 503 instead of dressing demo rows as service
  data.
- A day with nothing recorded gets the honest empty state plus the nearest recorded day.

### `/staff/work-orders` — maintenance and repairs (PRD S20, blueprint §38)

- **The list**: what needs doing · chapel/vehicle/plot/equipment it belongs to (linked where a
  real screen exists) · assignee · priority · due date · state · every recorded movement with the
  date it happened.
- **Overdue is read from the recorded dates only**: an order is overdue when it is not done and
  its recorded due date falls before the recorded day (`as_of`). No wall clock and no invented
  SLA takes part; the page prints that basis under the list. Overdue rows sort first (longest
  first), then open/in-hand by due date, then done.
- Filters above the table: state · asset · search. An empty result says so.
- READ-ONLY: field-ops is unbuilt (`docs/02-architecture/microservices.md`:178); live mode
  answers 503.
- The state is the recorded trail, never a stored field beside it: a completed order without the
  day it was done is refused by the reader, as is a movement dated before the one before it.

### `/staff/notifications` — what the office tells people (PRD S26, blueprint §41)

- **The catalogue**: the four designed messages — booking confirmation · payment reminder ·
  document-ready note · service reminder — each with its trigger, when, audience
  (family · agent · staff) and channel (email · SMS · Messenger · push · in-app).
- **The sent log is EMPTY ON PURPOSE.** The platform's notification service (P4,
  `docs/02-architecture/microservices.md:39`) does not exist, so nothing has been sent, the empty
  state says what will appear when it does, and no placeholder message may be fabricated to make
  the page look alive — the family notifications page takes the same line.
- The page closes on the four things the service must settle: template management · event rules ·
  delivery log · consent.

## Rules homes

| What | Where |
|---|---|
| Dispatch vocabulary, day grouping, derived driver state, fleet summary | `lib/dispatch.ts` (pure) |
| Work-order vocabulary, the trail→state read, the recorded-day overdue rule, ordering, asset links | `lib/work-orders.ts` (pure) |
| Notification audiences/channels/log states, labels, the service-needs list | `lib/notifications.ts` (pure) |
| Tolerant readers (502 on a malformed record; 503 in live mode) | `lib/api-client/dispatch.ts` · `work-orders.ts` · `notifications.ts` |
| Recorded data, with provenance | `lib/fixtures/operations/dispatch.json` · `work-orders.json` · `notifications.json` |

Cross-references are real records and pinned by the fixture-contract tests: trips → cases
(`operations/cases.json`) and HR employees (`hr/employees.json`); a bound vehicle → the
scheduling fixture's Hearse 1; work-order assets → scheduling resources, dispatch vehicles and
property lots, labels included; employee assignees → HR, crew/contractor assignees → the
recorded `WORK_ORDER_TEAM_ASSIGNEES` list (no invented person can route work).

## Craft & accessibility

- The existing kit only: `PageHeader`/`PageSection`, `Card`, `Badge`, `.table`/`.table-wrapper`,
  `.kpi-grid`, `EmptyState`/`ErrorState`/`ForbiddenState`, `.btn`, `.field`; one small
  `styles/components.css` block (`.ops-lead`, `.ops-filters`, `.ops-list`, `.dispatch-route`),
  tokens only, no new visual language. Loading states: `loading.tsx` per route.
- Gates match the nav entries and stay inline arrays from the frozen vocabulary:
  `scheduling:read` · `property:read` · `cases:read` (provisional, the nav's own reuse).
  `tests/unit/staff-scope-vocabulary.test.ts` stays green.
- One `h1` per route; `tests/unit/accessibility-craft.test.tsx` harness rules hold.
- Reading budget: each screen opens on one ≤ 12-word sentence with an action, tables lead, and
  paragraphs stay ≤ 30 words — all three are in `tests/unit/reading-budget.test.tsx`.

## Render check (fixture mode, admin persona, dev server on :4113)

`document.documentElement.scrollWidth === 390` at a 390×844 viewport on every screen and state
below — no horizontal page scroll.

| Screen | 1440 | 390 |
|---|---|---|
| Dispatch — day board | `shots/dispatch-1440.png` | `shots/dispatch-390.png` |
| Dispatch — assignment view | `shots/dispatch-assignments-1440.png` | — |
| Dispatch — honest empty day (`?date=2026-09-12`) | `shots/dispatch-empty-1440.png` | `shots/dispatch-empty-390.png` |
| Work orders — the list | `shots/work-orders-1440.png` | `shots/work-orders-390.png` |
| Work orders — honest empty filter (`?q=zzz`) | `shots/work-orders-empty-1440.png` | — |
| Notifications — catalogue + empty sent log | `shots/notifications-1440.png` | `shots/notifications-390.png` |

## Evidence

- `tests/unit/dispatch.test.ts` · `work-orders.test.ts` · `notifications.test.ts` — pure
  derivations and the readers (malformed records 502, live modes 503, a test-only log entry
  proves the log branch).
- `tests/unit/dispatch-page.test.tsx` · `work-orders-page.test.tsx` ·
  `notifications-page.test.tsx` — the rendered screens: leads, states, empty states, filters,
  gates, live 503, one `h1`.
- `tests/fixture-contract/dispatch.test.ts` · `work-orders.test.ts` · `notifications.test.ts` —
  cross-references, trail invariants, the recorded-day overdue demonstration, and a scan that no
  amount-like figure or fabricated send exists.

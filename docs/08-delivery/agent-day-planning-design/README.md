# Agent day planner + the sign-in day notice (2026-10-02)

## The brief (captain, 2026-10-02)

> “the calendar should also provide a systematical planning for agent like they can
> select a day and plan what to do on that day, and that should notify them also
> whenever logged in in the agent portal”

The agent's **Appointments & tasks** calendar (which landed earlier the same day)
stops being only a read of the office's recorded day. It becomes the agent's own
**day planner** — pick a day, write what to do on it with an optional time and
note, tick it done, edit or remove it — and today's plan surfaces as a **quiet,
dismissable notice** on the portal dashboard at sign-in.

## What the planner is

`/agent/appointments` keeps every recorded fact it already showed and adds one
write:

- **a plan item** — a day, a title, an optional `HH:mm` time and an optional
  note, with `done` state. A plan is the agent's **own note**, not the office's
  diary.
- Selecting a day opens that day's detail; a **“Add a plan”** composer sits under
  it, and each plan carries **Mark done · Edit · Remove**.
- Plans sit **beside the office's recorded appointments** in the day detail,
  ordered by one clock: by time, an untimed plan after the timed entries, then
  by creation.
- The month grid marks a day that holds **any** entry with a coloured dot; the
  **legend names the plan role in words** (“Your own plan”), and the plan's dot
  is the product's own **sky** control colour — never the office's
  confirmed/waiting status colours, because a plan is not a confirmation.

## Where the data comes from

The plan is **demo-local** and honestly labelled. It is the same durable
append-only journal pattern the agent acquisition pipeline already uses
(`lib/api-client/agent-store.ts`):

- `lib/api-client/agent-plan-store.ts` — the store. An append-only journal
  (`AGENT_PLAN_STORE_PATH`, else `.data/agent-plans.json`, gitignored), written
  temp-file → fsync → `rename(2)`, serialized through one in-process writer
  chain (`createJournalLock`), with a named 500 on a corrupt file rather than a
  silent reset.
- `lib/agent/agent-plans.ts` — the **pure** record shape, validation and fold
  (`applyPlanEvents`), so the store owns only persistence, the id and the
  timestamps.
- `lib/api-client/agent.ts` folds the journal in `readWorkspace()`, so the
  **calendar, the day detail and the sign-in notice read one source** and cannot
  disagree.
- `app/api/agent/plans/route.ts` (`GET` · `POST`) and
  `app/api/agent/plans/[id]/route.ts` (`PATCH` · `DELETE`) — the write path,
  guarded by the shared agent-session gate `app/api/agent/_guard.ts`. The guard
  checks portal membership (agent or staff preview) and **invents no scope** —
  the frozen RBAC vocabulary has no scheduling token. The handler is thin: the
  shape of a plan is the pure reading; the store owns the append. An
  unauthenticated or out-of-portal session, an unreadable body, an impossible
  day, an empty title and a bad time are all refused without writing.

Nothing about the plan claims a platform contract. There is no agent-scheduling
API, so `lib/live-mode.ts` keeps the agent surface at state **“none”** and this
store can only ever serve fixture mode.

## The sign-in day notice

`components/agent/agent-day-notice.tsx` renders on `/agent/dashboard` above the
attention strip. It is built from the **same fold** as the calendar
(`dayNotice` over `buildAgentCalendarEvents`), so the count and the next thing
can never contradict the day detail:

- **the count** — how many of today's plans are still open, and how many office
  stops are recorded;
- **the next thing** — the earliest entry that is not already finished (a done
  plan and a done task are both behind the agent), with its time;
- **a link** to the day — “Open the day” → `/agent/appointments?day=…`, which
  opens the calendar on that day.

It is a **quiet band, not a modal**: it renders in the page flow, carries one
line and two actions, and is dismissed with a button. The dismissal lasts the
browser session for that day (`sessionStorage`), so a fresh sign-in shows it
again; when storage is unavailable it simply stays visible.

## Honesty

- Office-scheduled appointments stay **read-only** beside the plans; a plan never
  books a slot and never changes the office's diary.
- Nothing promises a **reminder outside the portal** or an **office sync**. The
  composer says so in one line: “A plan is your own note for the day. It never
  books a slot and never changes the office's appointments.”
- No availability is invented, and the existing booking actions keep their
  disabled names.

## Evidence

Before is a production build of the base commit (`c7ffd38`, the calendar without
the planner) on `:4112`; after is this branch's production build on `:4111`. Both
signed in as the demo agent (`agent@vm.demo`) in fixture mode; the after capture
holds one plan (“Call Lorna about the lawn lot”, 9:00 AM) added through the
planner UI.

| Shot | Viewport | File |
|---|---|---|
| Before · appointments (no planner) | 1440 | [`before-appointments-1440.png`](before-appointments-1440.png) |
| Before · dashboard (no notice) | 1440 | [`before-dashboard-1440.png`](before-dashboard-1440.png) |
| Before · appointments | 390 | [`before-appointments-390.png`](before-appointments-390.png) |
| Before · dashboard | 390 | [`before-dashboard-390.png`](before-dashboard-390.png) |
| After · appointments (plan + marks + controls) | 1440 | [`after-appointments-1440.png`](after-appointments-1440.png) |
| After · dashboard (today's plan notice) | 1440 | [`after-dashboard-1440.png`](after-dashboard-1440.png) |
| After · appointments | 390 | [`after-appointments-390.png`](after-appointments-390.png) |
| After · dashboard | 390 | [`after-dashboard-390.png`](after-dashboard-390.png) |

The live interaction loop was also exercised against the after build: **add**
(wrote a plan), **edit** (set the time through the form), **mark done** (store
`done: true`, control flips to “Mark not done”) and **remove** (journal gains
`plan_removed`, the plan and its grid mark disappear).

## Checks

```
npm run lint        → 0 errors (4 pre-existing warnings)
npm run typecheck   → passes
npm test            → 3,092 tests in 278 files, all pass
npm run build       → passes
```

Relevant guards:

- `tests/unit/agent-plans.test.ts` — the pure reading (a real calendar day, a
  title, an optional `HH:mm` and note), the edit reading, the fold (last save
  wins, a removal drops the id), the order and `nextOpenPlan`.
- `tests/unit/agent-plans-store.test.ts` — the durable journal: create · edit ·
  done · remove, the atomic envelope, the concurrent-writer serialization, the
  named 500 on a corrupt file, and that `listAgentPlans()` reads the same
  journal.
- `tests/unit/agent-plans-route.test.ts` — the BFF: 401 without a session, 403
  outside the agent portal, 422 on a bad day/title/time with nothing written, a
  legal add · done · edit · remove readable by every surface, the staff preview,
  and the 404/422 writes-nothing cases.
- `tests/unit/agent-calendar.test.ts` — the plan placed on its day, ordered by
  time (untimed last) beside the office's stops, the named role, the day summary
  and the notice reading (count, next, done plan and done task skipped).
- `tests/unit/agent-appointments-page.test.tsx` — the planner controls render,
  the day opens on the notice's link, and a plan shows beside the recorded day
  with its cell marked.
- `tests/unit/agent-day-notice.test.tsx` — the notice's count/next/link
  contents, the quiet dismiss control, and that a plan written through the
  journal reaches the dashboard while another day's does not.
- `tests/unit/typography-system.test.ts`, `page-backgrounds.test.ts`,
  `broken-pages.test.ts`, `accessibility-craft.test.tsx` — the planner reuses
  the shipped ladder type, adds only the functional plan dot/key to the sky
  ground allowlist, declares no duplicate class, and keeps one `h1` and labelled
  fields.

## Files

- `lib/agent/agent-plans.ts` — the plan record, the validation readings and the
  fold (pure).
- `lib/api-client/agent-plan-store.ts` — the durable demo journal.
- `app/api/agent/plans/route.ts` · `app/api/agent/plans/[id]/route.ts` — the
  guarded BFF write path.
- `lib/api-client/agent.ts` — folds the planner journal into the workspace and
  exposes `listAgentPlans()`.
- `lib/agent/agent-calendar.ts` — places plans on their day, names the role and
  reads `dayNotice`.
- `lib/agent/agent-view.ts` — `manilaMinutes` (one clock for mixed entries).
- `components/agent/agent-day-planner.tsx` — `PlanRow` and `PlanComposer`.
- `components/agent/agent-calendar.tsx` — the day detail renders the planner;
  the grid marks plan days; the legend names the role.
- `components/agent/agent-day-notice.tsx` — the quiet sign-in notice.
- `app/(agent)/agent/appointments/page.tsx` — reads the plans and opens on
  `?day=`.
- `app/(agent)/agent/dashboard/page.tsx` — builds and renders the notice.

## Open with the platform

No agent-scheduling contract exists (no read/write API, no availability service).
The planner is deliberately demo-local and the office's recorded appointments
stay read-only. When a scheduling/crm contract freezes, the plan gains its live
branch and the office sync/reminders question becomes answerable — until then
nothing here promises either.

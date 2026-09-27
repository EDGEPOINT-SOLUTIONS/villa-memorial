# AGENTS.md — `app/(agent)` (agent portal surfaces)

> Nested instructions. A harness that loads `AGENTS.md` files discovers this file when a
> session touches a file under `app/(agent)/`, and it is not loaded before then.
> The cross-cutting rules stay in the repository-root [`AGENTS.md`](../../AGENTS.md). Read that first.

## Agent lots map — the office's map, never a second one (read before touching `/agent/lots`)

- `/agent/lots` renders `components/agent/agent-park-map.tsx`, which mounts the SAME
  `components/park-maps-view.tsx` the staff property screen (`components/property-explorer.tsx`)
  and the public `/map` render, fed the same listing as staff (`listLots()` → the
  `liveStatusById`/`liveOwnerById` overlays). Never hand-draw an agent-only masterplan/pin layer.
- Capability differences only: map editing appears for sessions holding `property:write` (the
  agent persona holds `property:read` alone); the shared `PlotDetails` panel is the agent's lot
  profile, and `showReserveRequest={false}` swaps the public customer request link for the
  agent's disabled “ask the office to hold” intent. `tests/unit/agent-park-map.test.tsx` pins the
  parity — both pages must pass the shared map the same lot set/statuses.

## Agent lead record — `/agent/prospects/[id]` (read before touching it or the agent fixture)

- F-09 (captain 2026-09-18) grew the approved page-04 prospect record into the lead record the
  pipeline opens: hero (name · how/when they came in · who handles them · contact chips · stage),
  the recorded next step in the action band with call/text from the record's own phone, then
  **Where they are** (the PRD trail plus the recorded `stage_history` — every move with its date
  and author, oldest first), the two content cards, the conversation timeline, and the designed
  move-forward choices (disabled; the write waits). One short line names what waits on the unbuilt
  customer-records service (crm-families). The record stays at the pipeline's existing route —
  never fork a second lead route for the same person.
- Data is `lib/fixtures/agent/workspace.json` read through `lib/api-client/agent.ts`: each lead
  carries `first_contact_at` + `stage_history` (first move `new` at `first_contact_at`, last move
  the current stage at `last_contact_at`; instants render through `manilaDay`). Never invent a
  stage move, activity entry or value at render time — `tests/fixture-contract/agent.test.ts` pins
  the record, `tests/unit/lead-detail.test.tsx` pins the screen (one h1, the four questions, the
  empty states, the single honest paragraph).
- Vocabulary lives in `lib/agent/agent-view.ts` (`PIPELINE_STAGES`/`stageTrail`,
  `leadSourceLabel`, `activityKindLabel`) — extend it there, not in the view. The office number on
  the screen is read from `lib/family/contact.ts` (the one contact module), never typed. The page
  is in `tests/unit/reading-budget.test.tsx`. Evidence shots:
  `docs/08-delivery/agent-portal-design/shots/`.


# Agent acquisition — prospects to clients, end to end (2026-10-01)

**Status:** shipped on `fm/villa-agent-acquisition`.
**Captain's intent:** *"We should be able to perform the step by step client acquisition from
prospects to clients."* (2026-10-01, after the agent portal workbench plan.)

---

## What this makes work

The agent portal's pipeline was read-only. The lead record drew the recorded `stage_history` and
the designed "Move them forward" controls were disabled, because no crm-families write contract
names a stage endpoint (`data/villa-agent-portal-plan/report.md` §5.6 lists "any CRM write" among
the jobs not in the product). This work runs the acquisition in the demo:

- the record presents the acquisition as **clear steps** — the seven PRD stages
  (New → Contacted → Qualified → Presentation → Proposal → Reserved → Sold,
  `docs/04-modules/commerce-catalog.md:33`, owned by `lib/agent/agent-view.ts`) with the current
  step marked, its purpose stated, and the one real action that moves it forward;
- the move writes a **durable, server-owned demo journal** (append-only, atomic rewrite,
  serialized mutations) and folds it onto the recorded fixture in `lib/api-client/agent.ts`, so
  the record, the pipeline board, the dashboard stage flow, the conversion funnel, the performance
  page and the client book all read one source and cannot disagree;
- **conversion puts the person in the client book**.

**One definition of "pipeline value".** `pipelineValueCents` in `lib/agent/acquisition.ts` is the
single reading: the value of the people still considering, so a sale lowers the dashboard hero, the
performance page's pipeline figure and the prospect list's "possible together" by the same amount.
The workbench's stage-flow (`lib/agent/agent-dashboard.ts`) carries the per-stage counts and values,
so a move is visible stage by stage, and the funnel recomputes from the same record.

## The conversion point — `sold`

A prospect becomes a client at the **Sold** stage, not at Reserved.

Why, from the docs and the shipped product:

- the shipped Clients empty state says it in the portal's own words — *"Your first sale creates the
  client record — until then, build the pipeline."*;
- the conversion funnel the design carries is `contacted → presentations → sold`
  (`data/villa-agent-portal-plan/report.md` §7.2, §6.3);
- the CRM lifecycle is Lead → Inquiry → Consultation → Arrangement → Customer
  (`docs/04-modules/crm-cases.md`), so a reservation (an arrangement) is still in the pipeline and
  the customer record follows the sale.

**Its test:** `tests/unit/agent-acquisition-flow.test.tsx` asserts a sold prospect appears in
`/agent/clients` and that the record shows the conversion; `tests/unit/agent-acquisition-route.test.ts`
("conversion at Sold") asserts the client record, the funnel's `sales`, and the open-pipeline drop
follow the sale; `tests/unit/agent-acquisition-store.test.ts` pins that a sold prospect becomes
exactly one client (the second fold mints no duplicate).

## The flow

1. **Steps** — `/agent/prospects/[id]` renders the seven PRD stages as a list. Reached stages are
   marked, the current stage carries its purpose, future stages are quiet. (Presentation only; the
   vocabulary is `PIPELINE_STAGES` / `stageMeta`, never a second list.)
2. **The move** — under the steps, a form takes a short note and one button labelled with the
   action that leaves the current stage (e.g. "Book the presentation", "Mark it sold"). The form is
   the design's move grammar, now live.
3. **The write** — `POST /api/agent/prospects/:id/stage` validates (a known forward stage and a
   non-empty note, both pure rules in `lib/agent/stage-move.ts`) and appends to the journal.
4. **The fold** — on the next read, `lib/api-client/agent.ts` applies the journal: the stage,
   `stage_history` (with who/when/note in the record's existing timeline shape) and `last_contact_at`
   move together; the dashboard's stage-flow moves the person's value to its new stage and the open
   pipeline value excludes sold people; the funnel recomputes; a sold prospect becomes a client
   (`client-<prospect-id>`).
5. **The book** — `/agent/clients` shows the converted family as a new client, and its record opens.

## Store, path and mode

- `lib/api-client/agent-store.ts` — the journal. Follows the repo pattern
  (`lib/api-client/journal.ts`; `inquiry-store.ts`): append-only, one writer chain per store, temp
  file + fsync + `rename(2)`.
- Path: `AGENT_STORE_PATH` when set (tests, throwaway dirs), else `.data/agent-pipeline.json`
  (gitignored). `tests/setup.ts` redirects it for every suite.
- **Demo-local, never live.** There is no agent-workspace contract and `lib/live-mode.ts` keeps the
  agent surface at state `"none"`, so there is no live branch to enter. The screens say "on the demo
  record"; the store and route say demo-local in their headers.

## Guarding

- `app/api/agent/_guard.ts` resolves the existing portal session from the httpOnly cookies
  (`buildSession` + `portalForSession`) — agent or staff only. A family session is a 403.
- Ownership: an agent may move only a prospect whose `owner` is their display name; staff may
  correct any record. The check is at the call site, so hiding the control is never the only gate.
- **No `crm:*` scope is invented.** The agent persona holds `tenancy:modules:read`, `catalog:read`,
  `orders:read`, `orders:write`, `property:read` (rbac-scopes-v1 names no crm scope). A test asserts
  the persona holds no `crm:*` token
  (`tests/unit/agent-acquisition-route.test.ts`).

## Honest boundary — what stays disabled

The out-of-scope writes keep their disabled controls with a reason on the record: **lot hold**
(property contract), **order** (commerce contract), **payment** (billing contract), **document
upload** (documents contract). Enquiry capture / customer sync / lead assignment still name the
customer-records service in one line. The device-local capture queue (`/agent/new`) is untouched.

## Evidence

### Commands

```bash
npm run lint          # pass
npm run typecheck     # pass
npm test              # 245 files, 2772 tests, pass
npm run build         # pass
```

Focused suites:

```bash
npx vitest run tests/unit/agent-acquisition-store.test.ts \
  tests/unit/agent-acquisition-route.test.ts \
  tests/unit/agent-acquisition-flow.test.tsx \
  tests/unit/lead-detail.test.tsx tests/unit/reading-budget.test.tsx \
  tests/unit/page-backgrounds.test.ts
```

### Screenshots — `shots/`

Captured against the production build (`npm run build` + `next start` on :4100), signed in as
`agent@vm.demo`, at 1440×900 and 390×844.

| File | What it shows |
|---|---|
| `record-before-1440.png` · `record-before-390.png` | **Before:** the lead record's move controls disabled (`MOVE_OPTIONS`), no working step. |
| `record-after-1440.png` · `record-after-390.png` | **After:** the acquisition steps, the current step's purpose, and the live note + move form. |
| `record-cecilia-advanced-1440.png` | Cecilia moved Qualified → Meeting planned; the new move is at the foot of "Where they are" with the agent's name and note. |
| `record-sold-1440.png` · `record-sold-390.png` | Rosa Lim at **Sold**: the full recorded trail including the two demo moves, and the conversion confirmation linking to her client record. |
| `clients-after-1440.png` · `clients-after-390.png` | The client book now holds **Rosa Lim — New client** (7 families), with her plan holding and the sale date. |
| `dashboard-after-1440.png` · `dashboard-after-390.png` | The workbench's stage flow reads Sold 1, the hero pipeline value has dropped by her ₱91,200.00, and the "Sold this month" vital reads the same sold set as the funnel. |
| `performance-after-1440.png` | The analytics page reads the same folded record: pipeline value ₱451,840.00 and the year's real series. |

### Tests added / changed

- `tests/unit/agent-acquisition-store.test.ts` — journal order, atomic envelope, serialized
  concurrent writes, corrupt-store 500; fold append/advance; one-client conversion; open-pipeline
  value.
- `tests/unit/agent-acquisition-route.test.ts` — 401/403 (portal + ownership), 404, 422
  (unknown/backward/empty note, nothing written), 201 and the read-through, staff override, no
  invented `crm:*` scope, conversion at Sold.
- `tests/unit/agent-acquisition-flow.test.tsx` — the record, the dashboard stage flow and the
  client book read the same move; the open pipeline drops by exactly her value.
- `tests/unit/lead-detail.test.tsx` — the record now presents real steps and an enabled move.
- `tests/setup.ts` — `AGENT_STORE_PATH` redirected for tests.
- `tests/unit/page-backgrounds.test.ts` — the step dot added to the sky-indicator allowlist.
- `tests/unit/reading-budget.test.tsx` — the record keeps its budget with the new step block.

## Files

| File | What it is |
|---|---|
| `lib/agent/acquisition.ts` | Pure fold: journal events → effective prospects; sold → one client; stage counts, pipeline value, funnel. |
| `lib/agent/stage-move.ts` | The one pure reading of a move (known forward stage, note present). |
| `lib/agent/agent-view.ts` | The PRD vocabulary plus each step's purpose and forward action. |
| `lib/api-client/agent-store.ts` | The durable demo journal. |
| `lib/api-client/agent.ts` | Folds the journal so every surface reads one record. |
| `app/api/agent/_guard.ts` · `app/api/agent/prospects/[id]/stage/route.ts` | The BFF session/ownership gate and the move route. |
| `app/(agent)/agent/prospects/[id]/move-forward.tsx` | The live step-forward form (client component). |
| `app/(agent)/agent/prospects/[id]/page.tsx` · `app/(agent)/agent/dashboard/page.tsx` | The record's step block; the dashboard stage flow. |
| `styles/components.css` | `.ag-steps` / `.ag-step*` / `.ag-move*` / `.ag-flow*`. |

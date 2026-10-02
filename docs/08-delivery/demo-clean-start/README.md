# The clean start — demo data off, and the workflows it starts

Captain, 2026-10-02: *"Remove sample datas for the agent and family portal, what we need to
do now is to try the system workflows if it's working."*

The agent and family portals now begin with **no demo people and no demo records**. Every
screen that relied on them renders its honest empty state with the one action that starts
the workflow. The office's reference data — the catalogue, the 2026 price list and plans,
the lot records and map, the branches, the contact details and the recorded content
documents — is kept.

## What is empty now

| Surface | Removed | Kept |
|---|---|---|
| Agent workspace (`lib/fixtures/agent/workspace.json`) | demo prospects, clients, appointments, tasks, work items, applications, contact history, shares, commission statement | the agent identity, the quick actions, the marketing-material links, the lot-availability rows and the unconfigured commission vocabulary |
| Family snapshot (`lib/fixtures/family/snapshot.json`) | the Dela Cruz household and every loved one (plans, balances, papers) | the account identity the signed-in manager owns |
| Family workspace (`lib/fixtures/family/workspace.json`) | the demo lot records, requests and appointments | the `ask_for` request taxonomy (the office's vocabulary, not a record) |
| Family case (`lib/fixtures/family/case.json`) | the recorded arrangements | — |
| Family memorials (`lib/fixtures/memorials/memorials.json`) | already empty (`consents: []`) | the store rules |

## What starts the workflow

Two new BFF writes replace the demo rows:

- **`POST /api/agent/prospects`** (`lib/agent/lead-capture.ts` + `lib/api-client/agent-store.ts`)
  — a lead captured at `/agent/new` is journalled and folded onto the workspace by
  `capturedProspects()` (`lib/agent/acquisition.ts`), so it reaches the pipeline, the board
  and the funnel. With no signal the form keeps the lead on the device
  (`lib/demo-agent-captures.ts`), and the confirmation says which happened.
- **`POST /api/family/loved-ones`** (`lib/family/loved-one-intake.ts` +
  `lib/api-client/family-household-store.ts`) — the family adds the person the other screens
  are about; `getFamilyHousehold()` folds the added people beside the (empty) recorded ones.
  An added person carries only a name and life dates, so the plan, money, papers and lot
  screens keep their honest empty states rather than inventing a record.

`getFamilySnapshot()` now returns `null` for an account with nobody on it, and every family
page renders `components/family/family-empty.tsx` (the Add-a-loved-one form) instead of a
crash.

## The workflows, exercised from the clean state

Run against the fixture-mode dev server (`npx next dev --port 4310`), signed in through the
real `POST /api/auth/login`:

### Agent

| Step | Result |
|---|---|
| `POST /api/agent/prospects` `{name, phone, need, source, callback, note}` | `201`; `/agent/prospects` lists **Test Lead One** |
| `POST /api/agent/prospects/<id>/stage` — contacted → qualified → presentation → proposal → reserved → sold | `201` × 6; the record's stage history carries each move |
| `/agent/clients` | the sold lead appears as a client ("New client") |

### Family

| Step | Result |
|---|---|
| `POST /api/family/loved-ones` `{name, life_dates}` | `201`; `/client/dashboard`, `/client/family` and `/client/memorials` show **Nena Bautista** |
| `POST /api/family/memorials` `{visible:true, show_photo:true, show_birth:true, show_death:false, show_lot:true}` | `200`; the public `/memorials/<id>` page shows the name and the **birth** year, and the **death** year stays hidden |
| `POST /api/family/images?slot=portrait&person=<id>` (PNG) | `201`; the public memorial then serves the portrait |
| `/client/requests/slip?...&kind=papers` | `200`; the printed request names the person and the paper kind |
| `/client/requests/slip?...&visit=park_visit&date=2026-10-20` | `200`; the printed request names the person, the visit and the day |

An earlier run caught a real bug the clean state exposed: a malformed legacy row in the
dev pipeline journal (`{kind:"stage_move", move:{…}}`) took the whole pipeline down. The
reader now tolerates both row shapes (`lib/api-client/agent-store.ts`).

## Evidence

`shots/before/` and `shots/after/` — the agent and family portals at 1440×900 and 390×844
(dashboard, pipeline/clients, new-lead; family home, family list, remembering, requests).
The `before` set is the recorded demo data, restored temporarily for the shot; the `after`
set is the shipped clean state.

## Validation

- `npm run lint` — 0 errors (3 pre-existing warnings in `gallery-page.test.tsx`)
- `npx tsc --noEmit` — clean
- `npx vitest run` — **302 files / 3,263 tests passed**
- `npm run build` — production build passes

The fixture-contract tests now pin the clean state (`tests/fixture-contract/{agent,family,
family-workspace,family-case,proposed-contracts}.test.ts`). The page-render tests that
pinned the demo records keep their content-bearing coverage through test-only copies under
`tests/fixtures/` (mocked per suite), and the new routes are pinned by
`tests/unit/{agent-capture-route,family-loved-ones-route,demo-clean-start}`. The family
amortization suites (`family-amortization`, `family-amortization-pages`) added on main the
same day seed the same test-only copies, so their recorded-plan arithmetic still runs.

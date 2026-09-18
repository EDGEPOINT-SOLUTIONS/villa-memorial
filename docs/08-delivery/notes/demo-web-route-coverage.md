# Portal route coverage — current build (living document)

> Purpose: one short, honest map of what every portal route serves today, so agents and
> reviewers don't have to re-audit `app/**`. Per-screen PRD alignment, evidence and the
> gap lists live in [`prd-alignment-audit.md`](../prd-alignment-audit.md); this note is only
> the route index. Check = open the route in a running build (`npm run dev`, fixture mode by
> default) and confirm it renders data, an honest empty state, or an honest placeholder —
> never a broken page.
>
> Legend: ✅ real screen (live contract or durable fixture store) · ⚠ honest placeholder
> ("not wired yet" / "coming soon", naming what unblocks it) · ❌ absent.
> When a contract lands, change the page **and** its row here in the same PR.

## Public site — `app/(public)`

| Route | What it serves |
|---|---|
| `/` | ✅ content-model home (editable LandingPage document; live park map in the middle column) |
| `/services`, `/services/death-at-home`, `/services/death-at-hospital`, `/transport` | ✅ client's 2026 a-la-carte/embalming/chapel sheets; chapel lines open the booking dialog |
| `/facilities` | ✅ the park's rooms (chapel classes + the sheet's per-day rates) and the masterplan's grounds list; no room name/capacity/count (an open client question, said on the page) |
| `/products`, `/products/[sku]` | ✅ 24 casket models from the 2026 sheet; sample imagery labelled illustrative |
| `/plans`, `/plans/[sku]`, `/plans/compare`, `/plans/senior-benefits`, `/plans/villa-memorial-plan`, `/packages` | ✅ plan tables + catalogue read the pricing/catalog stores |
| `/lots`, `/lots/[id]`, `/lots/price-list-2026` | ✅ lot browse/filter, detail, 2026 lot families |
| `/map` | ✅ shared park map — 2D masterplan + 3D mode (plotting is `property:write` only) |
| `/gallery` | ✅ grouped client photography (gate · pavilion & grounds · chapels/viewing/carriage) + the ONE entry to `/map` and the full-screen 3D walk-through; sheet samples labelled illustrative |
| `/cart`, `/checkout`, `/orders/[number]` | ✅ cart and real order creation on the frozen commerce contract |
| `/builder` | ✅ Smart Service Builder (F-05): an ESTIMATE over the client's published 2026 figures (casket/senior columns · a-la-carte · embalming · chapel schedule · the pricing store's plan tables); the plan amount is kept out of the one-time total; the office confirms |
| `/quote`, `/appointments` | ⚠ real capture, nothing sent/stored server-side (no quotation/scheduling write contract); confirmation says so |
| `/contact` | ✅ request landing; captures to the browser-local demo store the staff inquiries board reads (no CRM service) |
| `/faq` | ✅ static content |
| `/immediate-assistance` | ✅ the call-first screen (F-01): the 24/7 `tel:` action first, four numbered steps, then the secondary paths; the number is read from the landing content document |
| `/memorials`, `/memorials/find` | ✅ rules-first digital-memorial search + the family's find path; the recorded store publishes NO memorial (no digital-memorial service exists — nothing is fabricated), so the empty state names the service and the privacy floor |
| `/memorials/[id]` | ✅ published family records render the memorial profile (proven by tests); the fixture publishes no one, so an absent AND an unpublished id get the same not-available answer — `noindex` until a family publishes |
| `/register` | ⚠ account provisioning is not frozen; submission ends in an explicit demo state |

Sign-in doors: `/login` (staff) ✅ · `/client/login` (family) ✅ · `/agent/login` (agent) ✅ —
one BFF, separate doors because the JWT carries scopes but no role/portal claim.

## Staff portal — `app/(staff)/staff`

| Route | What it serves |
|---|---|
| `/staff/dashboard` | ✅ scope-gated ops/finance/lots aggregation from the same clients as the screens |
| `/staff/customers`, `/[id]`, `/staff/inquiries` | ✅ fixture-backed records (no crm-families contract yet); the Customers list also links the recorded lead records; `new` forms ⚠ (crm-families) |
| `/staff/pipeline`, `/[id]` | ✅ the staff lead record (PRD S4 Lead Detail) + the recorded lead list, read-only over `lib/fixtures/crm/lead-records.json`; the pipeline's own stage moves/assignment ⚠ (crm-families unbuilt) |
| `/staff/cases`, `/[id]`, `/new`, `/[id]/service-contract`, `/[id]/preparation`, `/[id]/instruments` | ✅ frozen case contract + capture/export; the preparation record is a PROVISIONAL recorded fixture (no preparation contract — live answers 503, and a case without one shows its task lines); the guarantee-instrument tracker is STATUS ONLY (no sub-ledger, no deduction math, no posting) |
| `/staff/ops` | ✅ operations board — the case fixture/store grouped into the frozen stage lanes, with the case screen's own two writes; ages are days since `updated_at` (no agreed staleness threshold), guarantee papers use the contract's 3-day term |
| `/staff/schedule` | ✅ day board over the bookings API (fixtures; live with `SCHEDULING_BASE_URL`) + chapel administration (settings/availability/bookings) over the scheduling store |
| `/staff/dispatch` | ⚠ vehicle dispatch (vehicles as scheduling resources; scheduling delivery) |
| `/staff/work-orders` | ⚠ lot maintenance (deferred property workflow) |
| `/staff/property`, `/[id]`, `/[id]/apply`, `/[id]/document`, `/[id]/ownership`, `/[id]/transfers`, `/[id]/interments`, `/[id]/exhumations` | ✅ shared park map; lot reserve; purchase application is PROVISIONAL (503 live); the four lot-record screens render the recorded lot-lifecycle fixture (APP-AUTHORED example data — each names its gap once; no amount is invented) |
| `/staff/catalog`, `/new`, `/[id]/edit` | ✅ durable catalogue store (503 live — no catalog write contract); public storefront reads the same store |
| `/staff/plans`, `/staff/pricing` | ✅ editable pricing store for plan rates + lot families; `/staff/plans/[id]` and `/new` ⚠ |
| `/staff/plans/membership`, `/new`, `/[id]` | ✅ plan-holder enrolment folio (F-18): the register, the folio and the application paper (print/Word/PDF); every rate is read from the pricing store; it is an APPLICATION — the office issues the real COC, and live mode answers 503 (no membership-record contract) |
| `/staff/orders`, `/[number]` | ✅ durable orders store + app-authored lifecycle (503 live — no order-admin contract) |
| `/staff/billing`, `/record-payment`, `/provisional-receipts`, `/provisional-receipts/new`, `/provisional-receipts/[id]` | ✅ frozen billing list + payment recording; the provisional-receipt journal is the counter's marked paper (not an official receipt) with the OR display state replacing it when one exists — live mode 503 (no provisional-receipt contract) |
| `/staff/commission` | ✅ the commission engine's screen (F-12) over the real orders with a blank Commission column: the client has given no rates, so every rate-derived figure is “Not configured” (`₱—`), never a zero (PROVISIONAL gate: `billing:read`) |
| `/staff/accounting` | ⚠ no staff-facing ledger API |
| `/staff/notifications` | ⚠ no notification rule/event contract |
| `/staff/reports` | ⚠ reporting-analytics unbuilt; the dashboard aggregates today |
| `/staff/copilot` | ⚠ the PRD's AI Copilot (S29) as the DESIGNED surface: four recorded questions answered by lookup over the case store, the guarantee-instrument tracker and (with `scheduling:read`) the chapel calendar, each finding carrying its record trail; the governance boundary and the not-connected state are printed on the screen. No model provider and no model call — attaching one is exactly what a frozen AI-governance contract has to gate |
| `/staff/landing` | ✅ real content editor for the home document (and the FAQ region) — the ONE content surface (audit G5) |
| `/staff/store` | ✅ redirect to `/staff/landing`; the old separate store stub and its duplicate nav entry are gone (captain, 2026-09-18) |
| `/staff/documents`, `/[id]` | ✅ repository + generation/export; upload disabled (no object store); `/new` ⚠ |
| `/staff/hr`, `/[id]` | ✅ fixture-backed directory; `/new` ⚠ (hr service) |
| `/staff/users` | ⚠ auth/roles are real; user provisioning is dev-authored; `/new` is the invite door |
| `/staff/workflows`, `/new`, `/staff/settings` | ⚠ config/workflow engine deferred |
| `/staff/audit` | ✅ frozen audit-events read |

Every ⚠ page renders the shared `NotWiredState` with the unblocking contract named, after a
scope gate that renders the designed `ForbiddenState` when the session lacks it
(`tests/unit/staff-scope-vocabulary.test.ts` pins that every gate uses frozen scope tokens).

## Family portal — `app/(family)/client`

All screens share the family/agent house style (`components/portal-frame.tsx`). Data is one
recorded family snapshot fixture until the family API contract freezes — the honesty state is
the deliverable, not a leftover.

| Route | What it serves |
|---|---|
| `/client/dashboard` | ⚠ partial snapshot summary (loved one, balance, next due) |
| `/client/family` | ⚠ household links; each row points at its honest screen |
| `/client/plans`, `/payments`, `/cases`, `/notifications`, `/privacy` | ⚠ partial snapshot or honest state; the missing service/contract is named on the page |
| `/client/property`, `/requests`, `/appointments`, `/memorials` | ⚠ the four record-backed screens (2026-09-18): each shows the office's own record through the recorded workspace fixture, ends in a calm note naming the contract it still waits on, and invents no figure, chapel, ticket number or published memorial (`lib/family/portal-coverage.ts`, pinned by test) |
| `/client/documents`, `/client/documents/receipts/[reference]` | ⚠ the family's own papers (service contract, official receipts) always show; a receipt copy prints only from a record that carries number+date+amount, else 404 |
| `/client/support` | ✅ the client's real numbers/places with the office call as the action |
| `/client/profile` | ⚠ partial; device-local reading preferences are real |

## Platform operator surface — `app/(platform)/platform`

Belongs to the **platform**, not to any tenant (classification:
`docs/02-architecture/platform-administration.md`). The operator entry point is
`/platform/sign-in`, reached by URL: no product menu links here (the guard is
`tests/unit/platform-screens.test.tsx`), `/platform/` is disallowed in `app/robots.ts` and the
surface sets its own `noindex`. Every screen is marked with the operator-surface wording
("not the funeral product") and says what the platform must provide.

| Route | What it serves |
|---|---|
| `/platform/sign-in` | ⚠ the operator door — a distinct design (not the shared SignInCard): platform admins are a separate identity type outside the tenant hierarchy; the form checks its entry and then says nothing was sent (no platform identity service exists) |
| `/platform/tenants`, `/platform/tenants/[id]` | ⚠ tenant management — the recorded sample list (state · plan · address) and one tenant's record (administrator · subdomain · provisioned date), read-only; names the provisioning requirements and the deferred work (suspend/delete, custom domains, usage metrics, platform audit) |
| `/platform/sign-up` | ⚠ tenant sign-up — a designed two-step flow (business + subdomain, then first administrator) that creates nothing; shows the Configure → Import → Train → Go live sequence |

Data is `lib/fixtures/platform/tenants.json` (APP-AUTHORED SAMPLE records with provenance —
every row `sample: true`, named as a sample, on `.example` addresses; `lib/api-client/platform.ts`
refuses an unmarked row and offers no live mode), pinned by
`tests/fixture-contract/platform.test.ts`. The app's cosmetic staff tenant switcher
(`lib/demo-tenants.ts`) is unrelated.

## Agent portal — `app/(agent)/agent`

11 routes (`dashboard`, `prospects`, `prospects/[id]`, `clients`, `clients/[id]`, `sales`,
`lots`, `applications`, `appointments`, `marketing`, `new`): ⚠ all read one provisional
agent-workspace fixture — no agent/commission contract exists, so commission amounts are
`null` by design and the pages say so. `/agent/lots` mounts the same shared park map as
`/staff/property` and `/map`.

## Absent (not routes yet) — needs a contract or a decision

The platform-admin screens (tenant management, platform login, sign-up) are designed screens
now — see the platform section above — but still wait on the platform's own tenancy/identity
services. See the audit's §7.2/§7.3 for what each one is blocked on, and
[front-end complete](../frontend-complete.md) for the current platform-contract list.

Screens exist but their services do not: the commission engine (the screen is real, the
figures are blank by design), the Smart Service Builder's live pricing/availability engine
(the screen is an estimate), the digital-memorial service (the screens render the honest
states), the lot-lifecycle records (recorded fixture) and the app-authored admin stores
(catalogue, pricing, orders, chapel admin, provisional receipts, membership, preparation,
guarantee instruments — all answer the named 503 in live mode).

The AI Copilot's MODEL is the one absence the screen itself states. `/staff/copilot` is a real
route — four recorded questions answered by lookup, every finding carrying its record trail,
the governance boundary and the not-connected state printed on the page — and nothing is
generated there, because attaching a model waits on an AI-governance contract the client has
not answered (`docs/07-client-villa/open-questions.md` §Operations & governance).

## Standing rules

- ✅ means real data and RBAC — not just "the route exists".
- ⚠ pages must name **what unblocks them** (contract/service), not just exist.
- Never render a screen pretending to have data it cannot fetch; a route that cannot exist
  honestly stays absent.
- Re-run this checklist before every demo; update the row in the same PR as the screen.

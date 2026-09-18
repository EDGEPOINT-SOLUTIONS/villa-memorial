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
| `/products`, `/products/[sku]` | ✅ 24 casket models from the 2026 sheet; sample imagery labelled illustrative |
| `/plans`, `/plans/[sku]`, `/plans/compare`, `/plans/senior-benefits`, `/plans/villa-memorial-plan`, `/packages` | ✅ plan tables + catalogue read the pricing/catalog stores |
| `/lots`, `/lots/[id]`, `/lots/price-list-2026` | ✅ lot browse/filter, detail, 2026 lot families |
| `/map` | ✅ shared park map — 2D masterplan + 3D mode (plotting is `property:write` only) |
| `/cart`, `/checkout`, `/orders/[number]` | ✅ cart and real order creation on the frozen commerce contract |
| `/quote`, `/appointments` | ⚠ real capture, nothing sent/stored server-side (no quotation/scheduling write contract); confirmation says so |
| `/contact` | ✅ request landing; captures to the browser-local demo store the staff inquiries board reads (no CRM service) |
| `/faq` | ✅ static content |
| `/register` | ⚠ account provisioning is not frozen; submission ends in an explicit demo state |

Sign-in doors: `/login` (staff) ✅ · `/client/login` (family) ✅ · `/agent/login` (agent) ✅ —
one BFF, separate doors because the JWT carries scopes but no role/portal claim.

## Staff portal — `app/(staff)/staff`

| Route | What it serves |
|---|---|
| `/staff/dashboard` | ✅ scope-gated ops/finance/lots aggregation from the same clients as the screens |
| `/staff/customers`, `/[id]`, `/staff/inquiries` | ✅ fixture-backed records (no crm-families contract yet); `new` forms ⚠ (crm-families) |
| `/staff/pipeline` | ⚠ sales pipeline (crm-families) |
| `/staff/cases`, `/[id]`, `/new`, `/[id]/service-contract` | ✅ frozen case contract + capture/export |
| `/staff/schedule` | ✅ day board over the bookings API (fixtures; live with `SCHEDULING_BASE_URL`) + chapel administration (settings/availability/bookings) over the scheduling store |
| `/staff/dispatch` | ⚠ vehicle dispatch (vehicles as scheduling resources; scheduling delivery) |
| `/staff/work-orders` | ⚠ lot maintenance (deferred property workflow) |
| `/staff/property`, `/[id]`, `/[id]/apply`, `/[id]/document` | ✅ shared park map; lot reserve; purchase application is PROVISIONAL (503 live) |
| `/staff/catalog`, `/new`, `/[id]/edit` | ✅ durable catalogue store (503 live — no catalog write contract); public storefront reads the same store |
| `/staff/plans`, `/staff/pricing` | ✅ editable pricing store for plan rates + lot families; `/staff/plans/[id]` and `/new` ⚠ |
| `/staff/orders`, `/[number]` | ✅ durable orders store + app-authored lifecycle (503 live — no order-admin contract) |
| `/staff/billing`, `/record-payment` | ✅ frozen billing list + payment recording |
| `/staff/accounting` | ⚠ no staff-facing ledger API |
| `/staff/notifications` | ⚠ no notification rule/event contract |
| `/staff/reports` | ⚠ reporting-analytics unbuilt; the dashboard aggregates today |
| `/staff/landing` | ✅ real content editor for the home document |
| `/staff/store` | ⚠ broader storefront-content editor (no content contract); landing is the real CMS seam |
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
| `/client/plans`, `/payments`, `/property`, `/cases`, `/appointments`, `/requests`, `/memorials`, `/notifications`, `/privacy` | ⚠ snapshot or honest state; the missing service/contract is named on the page |
| `/client/documents`, `/client/documents/receipts/[reference]` | ⚠ the family's own papers (service contract, official receipts) always show; a receipt copy prints only from a record that carries number+date+amount, else 404 |
| `/client/support` | ✅ the client's real numbers/places with the office call as the action |
| `/client/profile` | ⚠ partial; device-local reading preferences are real |

## Agent portal — `app/(agent)/agent`

11 routes (`dashboard`, `prospects`, `prospects/[id]`, `clients`, `clients/[id]`, `sales`,
`lots`, `applications`, `appointments`, `marketing`, `new`): ⚠ all read one provisional
agent-workspace fixture — no agent/commission contract exists, so commission amounts are
`null` by design and the pages say so. `/agent/lots` mounts the same shared park map as
`/staff/property` and `/map`.

## Absent (not routes yet) — needs a contract or a decision

Platform-admin screens (tenant management, platform login); public Smart Service
Builder; interment/exhumation/ownership/transfer workflows; commission engine; digital
memorial (e-memorial, e-wake, abuloy, QR, search); AI copilot. See the audit's §7.2/§7.3
for what each one is blocked on.

## Standing rules

- ✅ means real data and RBAC — not just "the route exists".
- ⚠ pages must name **what unblocks them** (contract/service), not just exist.
- Never render a screen pretending to have data it cannot fetch; a route that cannot exist
  honestly stays absent.
- Re-run this checklist before every demo; update the row in the same PR as the screen.

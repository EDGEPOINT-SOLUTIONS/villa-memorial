# The post-Prospect lifecycle — Members · Services · Lots · Products

**Date:** 2026-10-03 · **Owner:** Admin Portal · **Branch:** `fm/villa-admin-lifecycle`

## What the captain asked

> "If prospects say they will avail a Plan, they will fall to the Member page … this should
> record their plan, amortization, paid or not paid, this page should have a notification
> system which the admin can just input a modular notif for example 2 days before, a day
> before … Now if they did not fall as 'Member' but they ask for a burial service … they will
> fall on the 'Service' page and this page is connected or synced in the calendar … Now if
> they will buy a product, it will fall to a product page and it will be recorded … the
> funeral also includes a lot that can be paid monthly … this is also a product … be creative
> … or if it's much better to have a dedicated page for this for a much cleaner lists. Now all
> those services, plan, lots, products should have a one page dedicated to record them all."

## The four registers (what landed)

| Register | Page | What it records |
|---|---|---|
| **Members** | `/staff/members` | Every plan membership — the plan and term, the amount, **paid**, **outstanding** and the **next due date**. The captain's rule "a list of memberships and nothing else" is honoured: no KPI band, no editor, no other content on the list. |
| **Services** | `/staff/services` | Every service availed — the client, the service and its **price basis**, the day it is booked and the resource, the amount and what is paid. |
| **Garden lots** | `/staff/lots` | Every lot sold — its section, its **monthly term**, the amount, paid, outstanding and the next due. |
| **Products bought** | `/staff/products` | Every one-time sale — what was bought, when, and the amount, paid and outstanding. |

*Every row opens one shared accounting page (`/staff/lifecycle/[id]`): the money figures, the
**amortization schedule** (period · due · amount · status · remaining), the recorded
**payments**, and the **modular notices**.*

### The lots decision, stated

A lot is a product, but it is paid over a term. The captain offered the choice; we took the
**dedicated page** (`/staff/lots`), because mixing a 60-month amortization into a one-time
sales list hides the one figure the lot's row exists to lead with — its next due. The
**Products bought** page states the split in its own lead and links to the lots register.

## One fact, one source

- **`lib/api-client/lifecycle-store.ts`** is the one durable record (recorded seed
  `lib/fixtures/lifecycle/engagements.json` + an append-only journal, the repo's shared
  `journal.ts` mechanics; `LIFECYCLE_STORE_PATH`, default `.data/commerce-lifecycle.json`).
  Every page reads it; no page restates a figure.
- The **Prospects** link is real, not decorative: an outcome carries the `prospect_id` and the
  recorded `agent`, the record form can be opened from a sold prospect, and
  `soldProspectsAwaiting()` reads the **SAME agent journal the Prospects screen and the agent
  portal fold** (`lib/api-client/agent.ts` / `agent-store.ts`) so a sale the office has not yet
  recorded as an outcome is surfaced with a one-press way to record it — never silently lost
  between the pipeline and the register.
- **`lib/calendar-day.ts`** folds a service's recorded `schedule` into the one labelled staff
  calendar as a named `service` day type whose href opens the client's record. The record's
  "On the calendar" card links back to that day (`/staff/calendar?date=…`). The calendar and
  the register cannot disagree about a booking.

## The money is derived, never stored twice

`lib/lifecycle.ts` (PURE) owns the one reading: the contract split into `installments` (the
last carries the remainder), due dates derived from `mode` + `first_due_on`, the recorded
payments applied **oldest-first** (no credit is modeled — an overpayment is a 422, never a
floored balance), and the totals (`paid`, `outstanding`, `overdue`, `due_soon`, `next_due`).
No screen adds or subtracts; `now` is always passed in.

## The notification system (modular, honest transport)

- A **template** is a rule the office writes once: a name, a whole number of days before the
  due date, and a message carrying `{amount}` / `{date}` / `{member}`. The seed ships
  **Two days before · A day before · On the due day**; the office adds or pauses its own from
  the member's page.
- The app **schedules** one notice per open installment per active template (fire date = due
  date − offset) and derives each notice's state: `Scheduled` → `Ready to send` → `Sent`, with
  `Window passed` when a due date goes by unsent. The state is never stored as a claim; only
  the office's hand-off is recorded.
- **Honest transport:** no email or SMS service is connected (P4), so the page says the notice
  is held in-system and handed to the office's own mail app. A long lot shows the next three
  open installments' notices; the rest sit in the schedule above.

## The gates (provisional, frozen vocabulary)

`cases:read` lists, `cases:write` writes — the same provisional reuse the Inquiries/Prospects
area carries while no lifecycle contract exists. `staff-scope-vocabulary.test.ts` verifies the
tokens and the admin persona; the BFF routes re-check the scope server-side.

> **Contract ask.** No contract under `docs/08-delivery/contracts/` names a lifecycle /
> engagement record (a plan membership, a booked service, a product sale or a monthly-paid
> lot), its amortization or its notices. The store is fixture-mode and `lifecycleLiveModeEnabled()`
> is always false; there is no `501`/`503` live branch pretending otherwise. The ask travels in
> `docs/08-delivery/open-items.md`.

## Files

- `lib/lifecycle.ts` — the pure model, amortization, notices and form intakes.
- `lib/api-client/lifecycle-store.ts` — the durable journal store.
- `lib/api-client/lifecycle.ts` — the app-facing read/write client.
- `app/api/staff/lifecycle/{route,payments/route,templates/route,notices/route}.ts` — the BFF writes.
- `components/staff/{engagement-form,engagement-register,awaiting-sales,payment-form,notice-rules,notice-list}.tsx`.
- `app/(staff)/staff/{members,services,lots,products}/page.tsx`, `app/(staff)/staff/lifecycle/new/page.tsx`, `app/(staff)/staff/lifecycle/[id]/page.tsx`.
- `lib/calendar-day.ts` + `lib/api-client/staff-calendar.ts` + `components/staff/unified-calendar.tsx` — the calendar sync.
- `lib/rbac/nav.ts` — the new **Clients & records** group.
- `lib/fixtures/lifecycle/engagements.json` — the recorded seed (figures pinned to the client's sheets).

## Tests

`tests/unit/lifecycle.test.ts` (the model: amortization, totals, notice scheduling, intakes) ·
`lifecycle-store.test.ts` (the fold, reference allocation, overpayment refusal, notices) ·
`lifecycle-route.test.ts` (the gate and the writes) · `lifecycle-calendar.test.ts` (the
service↔calendar link) · `lifecycle-pages.test.tsx` (the registers and the accounting page) ·
`tests/fixture-contract/lifecycle.test.ts` (every figure pinned to `planRateOf` / the catalogue
/ the lot sheet). Lint, typecheck, the full suite (3345 tests) and the production build pass.

## Evidence

`evidence/` — 1440 and 390 of each register and record:

- `01/02` Members (list) · `03/04` a member's accounting (schedule + notices) · `05/06` Services
- `07/08` a service record linked to its calendar day · `09/10` the office calendar showing the service
- `11/12` Garden lots · `13/14` a lot's amortization · `15/16` Products bought · `17/18` a buyer's record

# Demo data consistency — one household, one record

**Captain's brief (2026-09-30):** *“The datas are not consistent, please make the datas
consistent.”* The first hard evidence: the family portal served the Dela Cruz household
(Cory Customer · the loved one Ernesto Dela Cruz · plan `VM-PLAN-2026-0188` ·
Lawn A-01 · ₱42,000 total / ₱20,000 paid / ₱22,000 left · next due Sep 27, 2026 ·
₱12,000) that **did not exist anywhere on the office/agent side**. The agent portal's
book of business was six unrelated families (Santos / Cruz / Reyes / Villanueva), so a
person looking at both portals saw two different funeral homes.

While this branch was in flight, `main` grew the household shape (captain, 2026-09-30):
one account manages **two** loved ones — Ernesto (Lawn A-01 · `VM-PLAN-2026-0188`) and
Aurora (Niche C-02 · `VM-PLAN-2026-0241`, ₱34,020 total / ₱17,010 paid / ₱17,010 left ·
next due Oct 5, 2026 · ₱8,505). This branch was rebased onto that shape, so the office
side now derives **both** loved ones, and the one drifts it can still hide were closed.

This record states what disagreed, where each fact now lives, what the office-side record
derives, and what is deliberately still different.

## 1 · The fact inventory (before)

Every shared fact, its recorded home, and every screen that printed it.

| Fact | Family home when the brief was written | Agent home when the brief was written | Drift |
|---|---|---|---|
| Household / account holder | `family/snapshot.json#family.display_name` = “Cory Customer” | — (no such family) | **absent entirely** |
| Loved ones | `family/snapshot.json#loved_ones[].name` = “Ernesto Dela Cruz”, “1948 – 2026” (+ Aurora, “1951 – 2024”, added on `main`) | — | absent |
| Plan names | `family/snapshot.json#loved_ones[].plan_summary.plan_name` = “Premium Lawn · Lawn A-01”, “Garden Niche · Niche C-02” | — | absent |
| Plan references | `family/snapshot.json#…payment_schedule.reference` = `VM-PLAN-2026-0188`, `VM-PLAN-2026-0241` | — | absent |
| Money | `family/snapshot.json#…balance` + `#…balance_cents` = ₱42,000 / ₱20,000 / ₱22,000 and ₱34,020 / ₱17,010 / ₱17,010 | — | absent |
| Next due | `family/snapshot.json#…plan_summary.next_due` (derived per person by `lib/payment-schedule.ts`) = “Sep 27, 2026 · ₱12,000” and “Oct 5, 2026 · ₱8,505” | — | absent |
| Lot codes | `family/workspace.json#loved_ones[].lot` = A-01 · Section A and C-02 · Section C, at Sanctuario de Mercedes y Gloria | — | absent |
| Lot plan/owner | **duplicated** in `family/workspace.json#…lot.plan_name` / `owner_name` | — | one fact stored twice on the family side |
| Papers | `family/snapshot.json#…recent_documents` = Service contract · Official receipt (both loved ones) · Death certificate (Aurora, `pending_review`) | — | absent |
| Visits | `family/workspace.json#loved_ones[].appointments` = six records across the two loved ones | — | absent |
| Memorial visibility | `memorials/memorials.json` — nothing published, `consents: []` | n/a | consistent already |

Two further gaps in the same class:

* the account holder (`customer@vm.demo`) was a **persona only** — no row in the office's
  `crm/customers.json`, so no office record could name her;
* the agent side had no visit records for the family at all.

A third drift surfaced only once the office side started reading the family record: the
family portal prints Aurora's **Death certificate** as *“Being checked”*
(`pending_review`), but the first cut of the derivation copied every document title into
the agent's *“Papers you can hand over”* block, whose template says *“Released by the
office”*. Same record, two contradictory claims — see §2.

## 2 · What changed — one fact, one source

* **`family/snapshot.json` is the one home for the people, the loved ones, the plans, the
  money and the papers.** It carried them before; it still does, unchanged.
* **`family/workspace.json` is the one home for the lot codes and the visits.** The
  duplicated `lot.plan_name` and `lot.owner_name` were **removed**;
  `getFamilyHousehold()` (`lib/api-client/family.ts`) now derives them from the snapshot,
  so the lot screen and the plan summary can never describe two plans or two owners. The
  workspace provenance note says so.
* **The office/agent record now carries the household as a thin row.** `client-cory` in
  `lib/fixtures/agent/workspace.json` stores only agent-only fields (id, `customer_id`,
  the office's own household line, `since`, `check_in`) plus a `household_ref`. It copies
  **none** of the shared facts.
* **`lib/api-client/agent.ts#toClient` derives the shared facts at read time** from the
  family's own record: name/phone/email, **one plan holding and one lot holding per loved
  one** (name, reference, term, remaining / code, section, park), `next_amount` (the
  **earliest** open instalment across both plans, via `nextPaymentDue`), `papers`, and the
  family's visits (each carrying the loved one's name, because the office record has no
  person switcher). A non-household client passes through untouched.
* **Only papers the office has actually released reach the agent.** `toClient` filters the
  derived titles through `familyDocumentReleased()` (`lib/family/family-view.ts`) — the
  same status vocabulary `familyDocumentView()` maps for the family page. A paper still
  being checked (or rejected) is never presented as “Released by the office”; Aurora's
  Death certificate stays on the family's page as *“Being checked”* and is absent from the
  agent's hand-over list.
* **`crm/customers.json` now carries Cory Customer** (`…0105`, family `…0202` “Dela Cruz
  family”), so the agent client's `customer_id` resolves to a real recorded customer.
* **The agent client record shows the family's visits** (new `Client.visits`, rendered in
  `app/(agent)/agent/clients/[id]/page.tsx`) — the same ids, day/time labels, places and
  states the family portal shows, each labelled with the loved one it belongs to.

The result: the family portal and the agent portal now read the *same* recorded facts for
the *same* household. Editing one copy is impossible because there is only one copy.

## 3 · Deliberately left different

These differences are product policy, not drift:

* **The agent sees the next amount, not the full ledger.** The family sees each plan's
  total / paid / remaining and the schedule rows; the agent's “Money, plainly” shows the
  household's earliest next instalment and its date only (the PRD's sensitive-data
  principle, `roles-permissions.md:13`). The agent record carries `next_amount`, never a
  balance.
* **The office's case record keeps its own arrangement wording.** `family/case.json` names
  each loved one and writes the burial place as *“Your family's lot · Lawn A-01”* /
  *“… Niche C-02”*. This is the office's own recorded wording, not a second source of
  truth: `tests/fixture-contract/family-case.test.ts` pins the name to
  `snapshot.json#…name`, the burial place to the workspace lot code, and the arrangement
  instant/place to the recorded office visit. The copy is deliberate and cannot drift
  silently.
* **The family's papers and the office's numbered repository are different records.** The
  family's `recent_documents` are display-level (titles, a status, and the family's own
  receipt number for a receipt); the office's `DOC-2026-…` repository belongs to other demo
  families and is untouched. Inventing matching reference numbers would be the dishonesty
  the product forbids; the gap is recorded here instead.
* **The plan's “Lawn A-01” / “Niche C-02” are not property-grid plots.** The property
  grid's demo lots are `A-001`…`D-00x` at the client's 2026 sheet prices (a different
  record and a different demo purpose, sold to a different recorded owner, *Juan* Dela
  Cruz); the plans' own lot labels are `A-01` / `C-02`. `lib/family/family-plots.ts`
  refuses to guess `A-01 → A-001` and answers the plain park map, so no screen frames the
  wrong grave. They are not merged.

## 4 · Evidence

Screens captured at 1440 × 900 from a worktree dev server on this branch (fixtures mode,
signed in as the demo family and the demo agent through `/api/auth/login`).
`before-agent-clients.png` is the real pre-fix render: the agent's book of business with
six unrelated families and no Dela Cruz.

| Pair | Screen A (family) | Screen B (agent) | Before | After |
|---|---|---|---|---|
| Household | family chrome “Looking after **Dela Cruz family**” | client hero “The **Dela Cruz family** — Cory holds the plans for Ernesto and Aurora” | B said nothing (family absent) | same family named on both |
| Plans + money | dashboard “₱22,000 is still to pay on Ernesto's plan” · “Premium Lawn · Lawn A-01”; Aurora “₱8,505” · “Garden Niche · Niche C-02” | “What the family holds” lists both plans: “VM-PLAN-2026-0188 · monthly · ₱22,000 still to pay” and “VM-PLAN-2026-0241 · monthly · ₱17,010 still to pay” | B absent | same plans, references and amounts |
| Next due | Ernesto “The next date is Sep 27, 2026 · ₱12,000” | “NEXT AMOUNT DUE ₱12,000.00 · Sep 27” (the household's earliest open instalment) | B absent | same date and amount |
| Lots | lot page “Lot A-01 · Section A · Sanctuario…” and “Lot C-02 · Section C” | client “Lot A-01 · Premium Lawn · Lawn A-01 · Section A…” and “Lot C-02 · Garden Niche · Niche C-02 · Section C…” | B absent | same codes, sections and park |
| Papers | “Service contract”, “Official receipt”; Aurora's “Death certificate — **Being checked**” | “Papers you can hand over”: Service contract · Official receipt (the Death certificate is **not** listed as released) | B absent | same released papers; the pending one is not over-claimed |
| Visits | appointments/calendar for the selected loved one | client “Their visits” lists all six, each prefixed with Ernesto / Aurora | B absent | same dates, times, places and states |

Files: `before-agent-clients.png` · `after-agent-clients.png` · `after-agent-client-delacruz.png` ·
`after-agent-client-delacruz-visits.png` · `after-family-dashboard.png` ·
`after-family-dashboard-aurora.png` · `after-family-payments.png` · `after-family-property.png` ·
`after-family-documents.png` · `after-family-appointments.png` · `after-family-plans.png`.

Automated guard: **`tests/unit/demo-consistency.test.tsx`** (11 tests) asserts the
fixture derivation *and* renders the family and agent screens, reading the same strings
from both. The existing `tests/fixture-contract/family-workspace.test.ts` was updated to
assert the lot plan/owner derivation (the invariant is stronger, not weaker);
`tests/fixture-contract/agent.test.ts` keeps its foreign-key check for the new customer.

## 5 · Facts pinned by the new test

Across the fixtures **and** across the rendered family and agent screens:

* **People** — account holder, phone, email (`family/snapshot.json#family`).
* **Loved ones** — each `id` and `name`, with life dates.
* **Plans** — each plan name and its payment-schedule reference.
* **Money** — each plan's total / paid / remaining, and the invariant
  `remaining = total − paid`; the household `next_amount` is the earliest open instalment.
* **Lots** — each lot code, section and park; the plan name and owner derived from the
  snapshot rather than stored a second time.
* **Papers** — the released document titles reach the agent; a `pending_review` paper does
  not.
* **Visits** — id, day label, time label, place, state and the loved one's name, in the
  family record and on the agent record.
* **Memorial visibility** — no consent recorded, so nothing is published.

The test's output (`npx vitest run tests/unit/demo-consistency.test.tsx`) is the guard a
future edit to one copy must fail.

## 6 · What remains open

* A family-facing document contract would let the family's papers carry real reference
  numbers; until it freezes, the display-level titles are the honest record.
* The property grid and the plans' `A-01` / `C-02` are separate records by design (see §3).
* No route, RBAC guard, reading budget or honesty rule changed; the new page markup is the
  agent client record's “Their visits” block.

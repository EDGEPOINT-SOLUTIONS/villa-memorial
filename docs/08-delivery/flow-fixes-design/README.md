# Flow fixes — the three enquiries, end to end

**Captain, 2026-10-03:** *"fix this all please and tell me if it's 10/10."*
Follow-up to the honest flow audit (`data/villa-flow-audit/report.md`). This record is
the proof of the fixes: what changed, the exact steps walked, and the honest re-score.

Branch `fm/villa-flow-audit` (local-only). No remote, no PR.

---

## 1. The four calls, decided and built

| # | Call | What was built |
|---|---|---|
| 1 | **Phone at the family ask gate**, office can add one, contact required only at the case | The gate form collects a **Contact number** (optional — the case is where a reachable person is required); `POST /api/family/inquiries` records it; the office can **add or correct** it on the enquiry; **`Convert to prospect` no longer requires a phone**; **`Send to case` now requires one** and refuses with a plain sentence. |
| 2 | **Open a case independently of conversion** | The board's case button is no longer gated on `converted`; any enquiry with a contact and no case offers **Open case**. The service quote was carried into a case while still `new`. |
| 3 | **One pipeline, in the nav** | `/staff/pipeline` and `/staff/pipeline/[id]` **redirect to `/staff/prospects`**; the Agents screen and the Customers screen read the one shared prospect journal (the recorded `lead-records.json` read is retired from the UI); the left rail names the pipeline **Sales pipeline**. |
| 4 | **Clear the leftover demo** | `lib/fixtures/chat/threads.json` and `lib/fixtures/operations/work-orders.json` are emptied (test-only copies under `tests/fixtures/` keep the content-bearing suites covered). The Inbox no longer shows the Santos / Alex / Dela Cruz demo threads or the demo work orders. |

### Also fixed

- **The opened case 404** — `getCase` now reads the folded durable store instead of
  checking the recorded seed first (`lib/api-client/operations.ts`).
- **The service tab-switch dead end** — the outcome form is keyed by kind, and a
  non-term kind always submits `one_time` even if the mode state is stale
  (`components/staff/engagement-form.tsx`, `app/(staff)/staff/lifecycle/new/page.tsx`).
- **Record the outcome from the flow** — the enquiry row and the prospect panel link to
  `/staff/lifecycle/new?kind=…&name=…` so the office never leaves the flow.
- **The calendar opens on today** — not the recorded fixture `as_of` day
  (`app/(staff)/staff/calendar/page.tsx`, `app/(staff)/staff/dashboard/page.tsx`).
- **No false notice** — the assignment hints no longer claim the agent is notified; the
  notification service (P4) is still unbuilt and the text says so.

`lib/api-client/agent-store.ts` also stopped rejecting a persisted prospect with no
phone (the old reader made the phone required, which is what made the family-gate fix
impossible).

---

## 2. The proof walk — the three enquiries to an outcome

Rebuilt on the production build (`npm run build` → `next start`, fresh stores) and walked
in a real browser (`chrome-devtools-axi`). Screenshots at **1440** and **390** are in
`shots/`.

| Step | Screen | 1440 | 390 |
|---|---|---|---|
| Family plan gate now asks for a contact number | `/client/ask?kind=plan…` | `plan-gate-phone-1440.png` | `plan-gate-phone-390.png` |
| Plan ask recorded (`INQ-2026-00001`) | gate confirmation | `plan-ask-sent-1440.png` | — |
| The three enquiries on the office board, each with **Open case** and **Record outcome** | `/staff/inquiries` | `office-inquiries-1440.png` | `office-inquiries-390.png` |
| Service quote carried into a case while still **new** (conversion not required) | board → case | `service-case-opened-1440.png` | — |
| The case the office opens actually opens (`CASE-2026-0001`) | `/staff/cases/<id>` | `case-detail-1440.png` | `case-detail-390.png` |
| All three records with a case | `/staff/inquiries` | `board-all-cased-1440.png` | `board-all-cased-390.png` |
| A phone-less enquiry shows **Add contact number** and "Add a contact number" in the case cell | `/staff/inquiries` | `add-contact-button-1440.png` | — |
| The office adds the number in a dialog | board dialog | `add-contact-dialog-1440.png` | `add-contact-dialog-390.png` |
| Plan and lot both **converted** (no phone refusal) and both carried to cases | `/staff/inquiries` | `board-all-cased-1440.png` | `board-all-cased-390.png` |
| The one pipeline (`Prospects`), with the converted prospects | `/staff/prospects` | `sales-pipeline-1440.png` | `sales-pipeline-390.png` |
| `/staff/pipeline` redirects to the one pipeline | — | (verified: lands on `/staff/prospects`) | — |
| The calendar opens on **today** (Sat, Oct 3) | `/staff/calendar` | `calendar-today-1440.png` | `calendar-today-390.png` |
| Plan → Service tab switch saves (no "Enter the first due date") | `/staff/lifecycle/new?kind=service` | `service-outcome-saved-1440.png` | `service-outcome-saved-390.png` |
| The Inbox is clean — no demo threads or work orders | `/staff/inbox` | `inbox-clean-1440.png` | `inbox-clean-390.png` |

The three real references: `INQ-2026-00001` (Silver 1 plan · Monthly, phone `0917 000 0002`),
`INQ-2026-00002` (Lot A-001, phone `0917 000 0003`), `INQ-2026-00003` (service quote,
`0917 000 0001`). Each was converted / carried to a case; the plan and lot were carried
only after conversion, the service before it.

---

## 3. Regression tests

Every fix has a test that fails on the old behaviour:

- `tests/unit/inquiry-to-case.test.ts` — the case opens **and its detail reads back**
  (`getCase`), and a phone-less enquiry is refused a case with a plain sentence.
- `tests/unit/inquiry-convert.test.ts` — a phone-less plan/lot enquiry converts; the
  office records a contact number; an empty number is refused; a read-only caller is
  refused.
- `tests/unit/family-inquiry-gate.test.tsx` — the gate records the number the family
  leaves, and still accepts an ask without one.
- `tests/unit/staff-prospects-store.test.ts` / `staff-prospects-route.test.ts` — a
  phone-less prospect with a known need is accepted; an unknown need is refused.
- `tests/unit/sales-pipeline-retired.test.tsx` — both retired pipeline routes redirect to
  `/staff/prospects`, and the Customers screen no longer prints a second lead list.
- `tests/unit/agents-page.test.tsx` — the Agents screen reads the shared prospect journal
  and links to `/staff/prospects`.
- `tests/unit/nav.test.ts` — the rail says **Sales pipeline** and still does not link the
  retired route.
- Chat/work-order suites were moved to test-only copies of the now-empty demo fixtures.

**Gates:** `npm run lint` · `npx tsc --noEmit` · `npx vitest run` (**317 files / 3328
tests**) · `npm run build` — all pass.

---

## 4. Honest re-score: 8 / 10

Up from **3/10**. The three enquiries now go **arrival → a recorded outcome without
leaving the site's flow**: the gate collects a number, the office converts without a hard
block, a case opens *and* opens on screen, the outcome is one link away, the pipeline is
one surface, the calendar opens on today, and the demo is actually clean.

**Why not 10** — the honest residuals, none of which block a transaction:

- **No automated notice or reminder fires.** The notification service (P4) is still
  unbuilt; the UI now says so instead of implying otherwise. Until it exists, an
  assignment or a due date cannot notify anyone.
- **"Converted" still means two things** — an enquiry becomes a *prospect*; a prospect
  becomes a *client*. Adjacent screens still use the same word for two states.
- **The enquiry's assignee still reads Unassigned** after the prospect is assigned to an
  agent, and a "Needs pricing" prospect still prints a ₱0.00 possible value.
- **A case is still born "Pending intake"** and unassigned until intake is captured —
  correct for the funeral sequence, but it means the case record starts incomplete.

These were not in the ship scope; they are recorded so the next pass can weigh them.

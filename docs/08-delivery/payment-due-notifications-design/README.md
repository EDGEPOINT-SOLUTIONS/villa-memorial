# Payment-due notifications — implementation record (client minute 2026-09-21, item 1)

**Routes:** `/client/payments` (“What’s coming”) and `/client/notifications` (the in-system
reminders).
**Brief:** the client’s minute — *“The system shall automatically notify clients of upcoming
payment due dates at least two (2) days before the scheduled due date. Notifications should be
visible within the system and, where supported, may be delivered through other configured
notification channels.”* — with clear identification of the client, payment reference, amount
due and due date.

## What ships

1. **One source of truth: `lib/payment-schedule.ts`** (pure). The client’s recorded plan —
   payment mode + first due date + each instalment’s amount/paid — is read here and every
   **due date is DERIVED** from the mode’s interval (`PLAN_TERM_DEFS.paymentsPerYear`), never
   stored twice. The same module owns the state rule and the notification selection, with
   `now` always passed in — no timer, no wall clock.
2. **The two-days-before rule.** `PAYMENT_DUE_SOON_DAYS = 2`: an instalment with a balance is
   `overdue` when its date has passed, `due_soon` from today through +2 days, `upcoming`
   beyond that, and `paid` once settled. `paymentDueNotices()` selects `due_soon` + `overdue`
   only, most overdue first.
3. **A client-visible surface.** `/client/payments` lists every open instalment under “What’s
   coming” (the reference, what is left, the derived due date, and the upcoming-vs-overdue
   word); `/client/notifications` lists the selected reminders with the client’s name, the
   reference, the amount and the due date. The recorded fixture’s due-soon instalment leads
   the notifications page.
4. **A channel seam, not an integration.** `lib/payment-reminder-channels.ts` declares the
   adapter interface the platform’s P4 notification service will implement; only `in_app` is
   wired, the adapter list is empty, and the module carries no `fetch`, provider or credential
   path (pinned by test).

## The recorded plan (provisional fixture, honest state)

`lib/fixtures/family/snapshot.json` gains a `payment_schedule`: reference `VM-PLAN-2026-0188`,
term `monthly`, first due `2026-07-27`, four instalments (₱10,000 · ₱10,000 · ₱12,000 ·
₱10,000). The two paid instalments sum to the snapshot’s ₱20,000 paid; the derived open
balance is ₱22,000 and the amounts sum to ₱42,000 — pinned by
`tests/fixture-contract/family.test.ts`, which also keeps `plan_summary.next_due` equal to the
derived earliest open instalment. The dates are recorded data and age with the clock exactly
like the billing seed; tests use explicit clocks so they never rot.

| Instalment | Derived due date | Amount | Paid | State at 2026-09-25 |
|---|---|---|---|---|
| 1 | 2026-07-27 | ₱10,000 | ₱10,000 | paid |
| 2 | 2026-08-27 | ₱10,000 | ₱10,000 | paid |
| 3 | 2026-09-27 | ₱12,000 | ₱0 | due soon (+2 days) |
| 4 | 2026-10-27 | ₱10,000 | ₱0 | upcoming |

No live gateway data is invented: the family snapshot stays provisional (no frozen family API),
and `parsePaymentSchedule` is the tolerant seam that will read the frozen billing contract’s
`installments[]` (`seq`, `due_date`, `amount_cents`, `paid_cents`) once it becomes
family-facing.

## Rules pinned by tests

- **Due-date derivation** — monthly/quarterly/semi/annual intervals and day clamping
  (31 January + 1 month → 28 February), `tests/unit/payment-schedule.test.ts`.
- **The two-days-before boundary** — due today / tomorrow / +2 days are `due_soon`; +3 days is
  `upcoming`; yesterday is `overdue`; a settled instalment is `paid` and never reminds. The
  relative dates are built from `Date.now()` so the boundary cannot rot.
- **The notification selection** — only `due_soon` + `overdue`, client + reference + amount +
  due date, most overdue first.
- **The surface** — `tests/unit/family-payment-notices.test.tsx` renders the real pages with a
  relative schedule: “₱12,000 due in 2 days” / “₱5,000 overdue by 5 days”, the client name, the
  reference and the due date; the honest empty state when nothing is due or no schedule exists.
- **The seam** — `tests/unit/payment-reminder-channels.test.ts`: only `in_app` wired, no
  adapters, no live integration in the source.

## Measured values (no screenshots)

| Measured | Value |
|---|---|
| `/client/payments` open-page prose | 113 paragraph words (budget 150); longest paragraph 13 words (limit 25) |
| `/client/notifications` open-page prose | 29 paragraph words; longest paragraph 7 words |
| Family reading-budget guard | `tests/unit/family-reading-budget.test.tsx` — all 14 family pages pass |
| Full suite | `npm test` — 212 files / 2511 tests pass |
| Gates | `npm run lint && npm run typecheck && npm test && npm run build` all green |

## What is deliberately not here

- **No background job.** The demo cannot run a timer, so the state and the reminder are a pure
  derivation from the plan and today’s date — the same answer every render.
- **No fabricated payment, provider or message.** Money is integer minor units formatted for
  display only (repo money rule); external channels are a declared interface, and the
  notifications page says plainly that only in-system reminders work today.
- **No new chrome.** The pages render the existing portal kit (`Answer` · `Section` · `Rows` ·
  `Row`) and tokens; no CSS or style change rides with this PR.

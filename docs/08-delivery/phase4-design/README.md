# Phase 4 — one meaning for "overdue"

**Brief:** the client-minutes audit (`../client-minutes-audit-2026-09-21/README.md` §4) found the
staff dashboard reading **"Overdue accounts 2"** beside the red band's **"6 overdue"** — two
definitions of the same word on one screen — plus a row cap that hid due-soon rows, and no
read-only place for a reader to open the payment the alert named. Fix all three.

**Date:** 2026-09-28.

## What changed

| # | Defect | Fix | Cite |
|---|---|---|---|
| 1 | Two "overdue" numbers | ONE date-derived rule, `invoiceOverdue(invoice, now)` in `lib/payment-alerts.ts`, read by the dashboard KPI, the billing KPI **and** the `?status=overdue` filter | `lib/api-client/reporting.ts`, `app/(staff)/staff/billing/page.tsx` |
| 2 | Due-soon rows never rendered at 5+ overdue | the band caps **each state** at `MAX_ROWS` instead of concatenating and slicing | `app/(staff)/staff/dashboard/payment-alert-band.tsx` |
| 3 | A reader could not open the payment the alert named | new read-only route `/staff/billing/invoices/[number]` (`billing:read`); the band's rows and the billing table's invoice number link there; `Record payment` appears only with `billing:write` | `app/(staff)/staff/billing/invoices/[number]/page.tsx` |
| 4 | `PaymentAlert.due_on` computed, never printed | each band row prints the due date beside the countdown | `payment-alert-band.tsx` |
| 5 | `NO_PAYMENT_ALERTS` exported, no consumer | removed | `lib/payment-alerts.ts` |

## Why the date rule is the one

The frozen billing contract stores `issued | partially_paid | paid` and none of them is "overdue";
`lib/api-client/billing-derive.ts` derives the display status, and it deliberately keeps a
**part-paid invoice `partial` however late it is** ("its lateness is carried by the aging bucket,
not the status"). So the status-based count (2) under-reported exactly the late part-payments the
office needs to chase. The date-derived rule — *still owes money **and** the due date has passed* —
is the same rule the family's two-day reminder runs on (`lib/payment-schedule.ts`), so the dashboard
and the reminder lane can no longer disagree. A settled invoice is never overdue even when its date
has passed.

## Measured before / after (fixtures, `now = 2026-09-25`)

| Figure | Before | After |
|---|---|---|
| Dashboard "Overdue accounts" KPI | 2 (status) | **6** (date) |
| Band headline | "6 payments need attention · 5 overdue · 1 due within 2 days" | same numbers, now reconciled with the KPI |
| Billing "Overdue accounts" KPI | 2 | **6** |
| Billing `?status=overdue` rows | 2 | **6** (includes the late part-payments) |
| Band rows when 6 overdue + 1 due-soon | 5 overdue only, due-soon counted but not shown | 5 overdue **and** the due-soon row |

## Evidence

- `tests/fixture-contract/reporting.test.ts` — `finance.overdue_count` equals
  `payment_alerts.overdue_count` and the date rule over the invoices (was pinned to the status).
- `tests/unit/dashboard-payment-alerts.test.tsx` — due-soon rows render at 5+ overdue; each row
  links to the read-only invoice; the due date prints.
- `tests/unit/invoice-detail-page.test.tsx` — a `billing:read` session opens the invoice with no
  `Record payment`; a writer sees it; an unknown invoice 404s.

## Not changed

`overdue_cents` / `due_soon_cents` / `PAYMENT_ALERT_STATES` were listed as dead weight too, but they
are part of the tested pure summary (`tests/unit/payment-alerts.test.ts`,
`dashboard-payment-alerts.test.tsx` uses the cents to model outstanding) — removing them is churn,
not a fix, so they stay. `nextPaymentDue()` is a tested pure export of the family schedule module.

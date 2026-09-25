# Dashboard payment alerts — implementation record (client minute 2026-09-21, item 4)

**Route:** `/staff/dashboard` (the red alert band above the KPI tiles).
**Brief:** the client's minute — *“Integrate a red-colored notification indicator on the
dashboard for payments approaching their due date, specifically two (2) days before the due
date.”* — with the number of payments requiring attention, access to the payment details, and a
clear upcoming-versus-overdue distinction. UI note: red used consistently for payment alerts,
readable and accessible.

## What ships

1. **One rule home, composed not forked.** `lib/payment-schedule.ts` (the family-notification
   lane, PR #126) owns `PAYMENT_DUE_SOON_DAYS = 2`, `daysUntilDue` and `paymentDueState`.
   `lib/payment-alerts.ts` imports all three and only SELECTS the two alert states — it declares
   no threshold itself. A change to the window moves the family reminder and the office
   dashboard together.
2. **The staff data source is the billing ledger.** The staff side of the platform ask
   (`docs/08-delivery/open-items.md` §6) is the frozen billing list contract's `due_at` plus the
   outstanding balance. `lib/api-client/reporting.ts` maps each invoice to a
   `PaymentAlertSource` and derives `payment_alerts` in the same aggregate the dashboard already
   reads, so the dashboard cannot contradict `/staff/billing`.
3. **The surface is the shared red primitive.** `PaymentAlertBand`
   (`app/(staff)/staff/dashboard/payment-alert-band.tsx`) renders the product-wide `Alert`
   (`tone="danger"`) with an icon, the total in words (“N payments need attention”), the
   `overdue · due within 2 days` split, up to five named rows (client · invoice number · amount ·
   state word · countdown) and a route to `/staff/billing`. When nothing is due or overdue the
   band does not render at all. It re-classifies no date.

   **Type right-sized** (captain feedback, 2026-09-25): the headline rides the card-title role
   (22px, stepping to 18px on a phone) and the count phrase + each amount ride the 18px ladder
   step (`.payment-alerts__headline` / `__figure` / `__amount` in the “Dashboard payment
   alerts” block of `styles/components.css`). The identification text (client, reference,
   countdown) stays at 14/12px, so the figures lead without the band shouting past the KPI
   tiles.
4. **Red consistently, but never red alone.** The band is the red `Alert`, and both state
   `Badge`s use the same danger tone (the minute's UI note: red for payment alerts). The
   distinction rides the words — “Overdue” vs “Due soon” plus “overdue by N days” vs “due in N
   days” — and the band carries `role="alert"`, an `aria-hidden` icon and a `<strong>` count for
   each half, so the state survives colour-blindness, high-contrast and monochrome. No raw
   colour: the band uses tokens and existing utilities only.

## The rule (reused from PR #126)

| Days until due | Outstanding | State | Alerts? |
|---:|---|---|---|
| any | 0 | paid | no |
| < 0 | > 0 | overdue | **yes** |
| 0 … 2 | > 0 | due soon | **yes** |
| ≥ 3 | > 0 | upcoming | no |
| unreadable date | — | — | no (dropped, never guessed) |

## Measured values (no screenshots)

| Measured | Value |
|---|---|
| Demo state at the recorded seed's clock (2026-09-25) | **6 overdue · 0 due soon · ₱20,000** (most-late first; 5 rows + “+1 more”) |
| Split both states at the 2026-09-01 clock (INV-2026-00006 due +2) | **5 overdue · 1 due soon** — the fixture-contract test pins it |
| Boundary at exactly `PAYMENT_DUE_SOON_DAYS` | +2 included, +3 excluded (unit test) |
| Dashboard alert source | the same `listInvoices()` `/staff/billing` reads (reconciliation pinned) |
| Focus ring / contrast | the shared `Alert` + `Badge` primitives; `accessibility-craft` (127 tests) green |
| Band type (captain follow-up) | headline `--text-card-title` = **22px** (18px on a phone); counts + amounts `--text-lg` = **18px** — pinned by the dashboard test |

## Rules pinned by tests

- **The pure selection** — `tests/unit/payment-alerts.test.ts`: today/tomorrow/+2 are due soon,
  +3 is not, `-1` is overdue; a settled or unreadable-due record never alerts; the split, counts
  and cent totals; most-late-first / nearest-first order; UTC calendar-day derivation.
- **The reader** — `tests/fixture-contract/reporting.test.ts`: `payment_alerts` reconciles with
  the invoices classified through the same shared rule, and the explicit 2026-09-01 clock pins
  the upcoming-vs-overdue split.
- **The rendered states** — `tests/unit/dashboard-payment-alerts.test.tsx`: the two-state band,
  the singular/plural headline, the row cap + “+N more”, `role="alert"`, the route, and the
  honest empty state when nothing is due or the source could not be read.

## What is deliberately not here

- **No fabricated due-soon demo row.** The recorded invoice seed ages with the clock exactly as
  it did before this lane; at the demo's date it has six overdue accounts and no invoice inside
  the two-day window. The due-soon path is proven by tests with relative clocks rather than by
  hand-editing recorded JSON to make the feature look active.
- **No new CSS block and no screenshots.** The band composes the existing `Alert`/`Badge`/utility
  grammar and tokens; evidence is the test output and the measured values above.
- **No second notification channel.** Email/SMS/push remain the platform's P4 service
  (`lib/payment-reminder-channels.ts`); this lane is the office's in-system dashboard only.

## Full check set (all green)

```
npm run lint && npm run typecheck && npm test && npm run build
```

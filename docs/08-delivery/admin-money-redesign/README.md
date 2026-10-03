# Admin money redesign — the collections desk, a working ledger, and analytics at a glance

**Task:** `villa-admin-money` · **Repo:** villa-memorial · **Branch:** `fm/villa-admin-money` · **Date:** 2026-10-03 · **Mode:** local-only ship
**Source:** the captain's admin-redesign intent (2026-10-02): *"Redesign the Billings and
Collections, Accounting should be really a real accounting page that will be a tool that helps
the entire business. An analytics understandable in a glance, no other shenanigans, no unecessary
titles, no unecessary wordings."*

---

## 1 · The routes — reachable before and after

No route was added, removed or renamed. Every RBAC gate is unchanged (`billing:read`,
`accounting:read`, `cases:read`; the finance reads the analytics any-of gate already used). The
route map is a surface map: what each route was, what it is now.

| Route | Before | After |
|---|---|---|
| `/staff/billing` | three tiles (invoices · overdue · outstanding), a stacked aging bar, a filter, a read-only invoice table | **the collections desk**: four figures lead, the derived aging strip, an open-invoice work list with ONE action per row (`Record payment` / `Open`), and the counter payment journal with its official receipts |
| `/staff/accounting` | one long display page: Money at a glance · The recorded ledger · Dues aging · Trial balance · Journal · Receipts · Reconciliation flags, each with an intro paragraph | **four query-param views** — Books · Receivables · Receipts · Reconciliation. Books carries the full chart of accounts + journal; Receivables carries aging, open invoices and the **client accounts** that open a member's own accounting |
| `/staff/analytics` | six tiles, a "Trends" heading, two charts, Dues aging, Lots, a "Where every number comes from" source table, and two chart-rules notes | **four figures and two charts**, nothing else |
| `/staff/lifecycle/[id]` | the client's accounting (unchanged) | reached directly from Accounting → Receivables → Client accounts |

The nav rail, the shell and every other finance route (`/staff/reports`, `/staff/commission`,
`/staff/orders`, `/staff/billing/invoices/[number]`, `/staff/billing/record-payment`, the
provisional-receipt routes) are untouched.

---

## 2 · Billing & collections — the collections desk

`app/(staff)/staff/billing/page.tsx`

- **Figures lead.** Outstanding · Overdue · Received this month · Open invoices. A figure with no
  record is a named blank ("—", "nothing owed", "no payment recorded this month"), never ₱0.00.
- **Since when.** The four office buckets (0–30 · 31–60 · 61–90 · 90+) come from
  `lib/receivables.ts` `duesAging`, DERIVED from each invoice's own `due_at` and balance — the
  same rule Accounting and Analytics print, not the seed's stored bucket. A bucket with no
  account prints "—", never "₱0.00" (`components/staff/receivables-aging.tsx`).
- **One obvious action per row.** Each open invoice carries a single action: `Record payment`
  (to the record-payment screen, `billing:write` only) or `Open` (the read-only invoice) for a
  reader. The invoice number always opens the record; the customer name opens the invoice that
  names them.
- **What was received.** The counter payment journal, newest first, each payment paired with the
  official receipt it issued (`DOC-YYYY-NNNNN`, linking the documents repository).
- No lead paragraph beyond the band's one line ("The collections desk."), no intro prose, no
  duplicated totals.

## 3 · Accounting — the office's books as a tool

`app/(staff)/staff/accounting/page.tsx` · new pure option in `lib/accounting.ts`

Four query-param views, server-rendered, `?view=` with Books as the default:

| View | Carries |
|---|---|
| **Books** | the whole **chart of accounts** (every account, movement or not) with the period's debit / credit / net side and a totals footer, the **journal** with its case/order links, and the period filter. `buildTrialBalance(accounts, entries, { includeZeroMovement: true })` adds the chart view to the same derivation — balances still come from the entry lines alone, and a window with no movement reads "Nothing posted", never "Out of balance" |
| **Receivables** | the dues-aging buckets, the open invoices, and the **client accounts** — every recorded plan / service / lot / product buyer with their paid line, outstanding, next due and state. Opening a client goes to `/staff/lifecycle/[id]`, the client's own accounting: **every recorded payment and the amortization schedule** |
| **Receipts** | the official receipts a recorded payment issued, and the counter's provisional slips |
| **Reconciliation** | the two flag types (unposted / unmatched), each naming the feed it needs; expenses and statements are named as not recorded rather than rendered as a ₱0 table |

Posting is not here and must not be added: no staff-facing ledger API has frozen, and the screen
says so in one line (`ACCOUNTING_NOT_WIRED`). The whole route is read-only.

## 4 · Analytics — at a glance

`app/(staff)/staff/analytics/page.tsx`

- **Four figures:** Collections · Sales · Outstanding · Overdue, each summed over the selected
  period (This month / This quarter / This year) and each naming why it is blank when it is.
- **Two charts:** Collections and Sales, **trailing six months** (the chart title says so),
  drawn by the kit `LineChart` — zero baseline, ≤4 gridlines, ≤6 x labels, tabular figures, one
  value label, a named empty state, and the draw-on-view stroke that `prefers-reduced-motion`
  removes. A single recorded month prints its figure and says it needs a second month for a
  line; no month is fabricated as a zero point.
- **Removed:** the "Trends" heading, the six-tile row, the dues-aging panel, the lots panel, the
  per-metric source table and both chart-rules notes. The figures and the charts say what they
  are.

## 5 · Evidence

Captured with `chrome-devtools-axi` against the dev server (`npm run dev`, fixture mode, signed
in as `admin@vm.demo`), 1440 and 390 wide.

The demo seed is a **clean start** (captain, 2026-10-02: recorded demo records removed), so the
live screens render their honest empty states. The populated shots swap the recording
`tests/fixtures/invoices-demo.json` into `lib/fixtures/finance/invoices.json` for the capture
only, then restore it — the file is byte-identical to `HEAD` after the capture (`git diff`
clean). The client-account and member-accounting shots use one plan membership recorded through
the app's own `/api/staff/lifecycle` write (a gitignored `.data/` store).

| Surface | Before | After (1440) | After (390) |
|---|---|---|---|
| Billing & collections | `before/billing-1440.png` · `before/billing-390.png` | `after/billing-1440.png`, `after/billing-populated-1440.png` | `after/billing-390.png`, `after/billing-populated-390.png` |
| Accounting — Books | `before/accounting-1440.png` · `before/accounting-390.png` | `after/accounting-1440.png` | `after/accounting-390.png` |
| Accounting — Receivables | — | `after/accounting-receivables-1440.png`, `after/accounting-receivables-populated-1440.png` | `after/accounting-receivables-390.png` |
| Accounting — Receipts | — | `after/accounting-receipts-1440.png` | `after/accounting-receipts-390.png` |
| Accounting — Reconciliation | — | `after/accounting-reconciliation-1440.png` | `after/accounting-reconciliation-390.png` |
| Analytics | `before/analytics-1440.png` · `before/analytics-390.png` | `after/analytics-1440.png`, `after/analytics-populated-1440.png` | `after/analytics-390.png` |
| A member's accounting | — | `after/member-accounting-1440.png` | `after/member-accounting-390.png` |

Measured on the running dev server (`documentElement.scrollWidth` × `clientWidth` at 390):
`/staff/billing`, `/staff/accounting` (all four views), `/staff/analytics` and
`/staff/lifecycle/[id]` each read **390 × 390** — no horizontal overflow.

## 6 · Gates

| Gate | Result |
|---|---|
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | pass |
| affected tests | `tests/unit/{billing-collections-page,accounting-page,accounting-money,analytics-page,accounting,page-opening}.test.*` pass (49 tests) |
| `npm test` | 3,366 tests / 321 files pass |
| `npm run build` | pass (production build, `/staff/billing`, `/staff/accounting`, `/staff/analytics` in the route manifest) |

New/updated coverage:

- `tests/unit/billing-collections-page.test.tsx` (new) — the figures, the derived aging strip,
  the per-row action for a writer vs a reader, the recorded receipt, and the no-₱0 blank.
- `tests/unit/accounting-page.test.tsx` — the chart of accounts (all rows), the honest
  "Nothing posted" state, the period filter, and the three non-Books views.
- `tests/unit/accounting-money.test.tsx` — the receivables view's named blanks, the recorded
  receipt on the Receipts view, the billing-scope state.
- `tests/unit/analytics-page.test.tsx` — the four figures, the two real series, the named
  collections blank, and the absent source table / rules note.
- `tests/unit/accounting.test.ts` — unchanged; the existing trial-balance rules still pass with
  the new `includeZeroMovement` option defaulting off.

## 7 · Honest boundaries

- **Fixture mode.** No staff-facing ledger API is frozen, so the Books view reads the
  app-authored recorded ledger; the Receivables and Receipts views read the recorded invoices and
  the durable counter payment journal. No live branch dresses fixtures as service data.
- **No posting, no reconciliation feeds.** The screen names `posting-instruction-v1`, a
  bank/gateway feed, and E2 reporting-analytics rather than rendering a fabricated flag or a ₱0.
- **The analytics gate is provisional.** `rbac-scopes-v1` names no analytics scope; the page
  reuses the finance reads it aggregates, the same any-of gate `/staff/reports` carries.
- **The money clean start means most of the demo is empty.** The redesign is built for that
  state first: every figure names its absence and every list has an honest empty state.

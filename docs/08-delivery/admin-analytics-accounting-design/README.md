# Admin analytics & accounting — the chart grammar and the money room

**Task:** `villa-admin-accounting` · **Repo:** villa-memorial · **Branch:** `fm/villa-admin-accounting` · **Date:** 2026-10-02
**Source:** the captain's admin-revision board (`data/villa-admin-plan/report.md` §9.1 Analytics, §9.2 Accounting) and the board's own mockups (`§06 /staff/analytics`, `§07 /staff/accounting`).
**Captain, 2026-10-02:** *"i want an analytics, a line graph with cool animation also, and also accounting feature."*

---

## 1 · What shipped

### Analytics — `/staff/analytics` (new)

The plan's §9.1 figures, each derived from the store the plan names and each naming the service
that will produce it live. The screen follows the board's composition: a six-tile KPI row, the
trend line as the lead, the dues-aging buckets and lot availability beside it, then the source
table and the chart rules.

| The board / plan ask | Where it lives |
|---|---|
| KPI row — collections · outstanding · overdue · sales · inquiry→order · lots available | `app/(staff)/staff/analytics/page.tsx` + kit `StatCard` |
| A **real recorded line** with labels and units, zero baseline, ≤4 gridlines, ≤6 x labels, one value label, tabular figures | kit `LineChart` (`components/kit/line-chart.tsx` + `chart-model.ts`), fed by `lib/analytics.ts` |
| The named empty state when a series has no record | `LineChart`'s empty state + `COLLECTIONS_BLANK_REASON` (the dashboard's own reason) |
| Dues aging (0–30 · 31–60 · 61–90 · 90+) | `lib/receivables.ts` → `duesAging`, rendered `.aging` |
| Lot availability | `lib/analytics.ts` → `lotAvailability` + the kit stackbar/legend |
| One draw-on-view animation that reduced motion removes | the chart kit's existing 1100 ms draw + `prefers-reduced-motion: reduce` rules (unchanged; pinned by `tests/unit/agent-charts.test.tsx`) |

**The line is real recorded data.** Sales-by-month reads the durable order store's own
`placed_at`/`total_cents` (June–September 2026 in the demo). Collections-by-month reads the
counter's payment journal; with no payment recorded it shows the board's named state — never a
zero line. Both use the kit's one chart grammar; the lead is the money line.

New pure modules: `lib/analytics.ts` (window, series, conversion, lot rollup, the source table)
and `lib/receivables.ts` (outstanding balance, aging buckets, overdue sum, received-in-period).
A `emptyNote` prop was added to the kit `LineChart` so a caller can print its own one-line empty
message in place of the default "Needs …" — the board's exact collections-state sentence.

### Accounting — `/staff/accounting` (extended)

The ledger half was already shipped read-only; this adds the money the office is owed and has
taken, all from recorded billing/accounting records, all read-only.

| The plan §9.2 ask | Where it lives |
|---|---|
| Received / outstanding / overdue tiles | `lib/receivables.ts` on the counter's payment journal + recorded invoices |
| Aging buckets 0–30 · 31–60 · 61–90 · 90+ | `duesAging` — derived from each invoice's `due_at` and balance, never a stored bucket |
| Read-only trial balance + journal | unchanged (`lib/accounting.ts`, `lib/api-client/accounting.ts`) |
| Receipts — the official receipt from the payment event + the provisional-slip journal | `billing-store`'s payment/receipt rows + `provisional-receipts-store`, listed in the new Receipts section |
| Reconciliation flags (unposted / unmatched) | a panel that **names each feed it needs** instead of listing fabricated flags |
| Expenses and statements do not exist | the "Not built (named, not zeroed)" note: no record shape, named service |

**A figure with no record is named, never a zero.** The `Received this month` tile prints "—"
until the counter records a payment; the reconciliation tile and panel print the missing feed;
the receipts sections print named empty states. An invoice that owes nothing is not a due.

---

## 2 · Evidence — the board beside the build

Rendered from the production build (`npx next start -p 4311`, fixture mode, signed in as
`admin@vm.demo`) and screenshot at 1440 and 390. The board's own mockups are captured beside
them for comparison.

| Surface | Board | Build 1440 | Build 390 |
|---|---|---|---|
| Analytics | `board/analytics-1440.png` | `after/analytics-1440.png` | `after/analytics-390.png` |
| Accounting | `board/accounting-1440.png` | `after/accounting-1440.png` | `after/accounting-390.png` |

Measured on the running build:

| Check | Result |
|---|---|
| phone overflow (`documentElement.scrollWidth === clientWidth` @ 390) | `/staff/analytics` **390 = 390** · `/staff/accounting` **390 = 390** |
| the sales line renders with a real series | 4 plotted months (Jun · Jul · Aug · Sep), the durable order store |
| the collections line with no payments | the named empty state, no `chart__line` |

---

## 3 · Tests & gates

New regression coverage:

- `tests/unit/analytics-model.test.ts` — the window (month/quarter/year + trailing months), the
  series (real months only, empty series stays empty), conversion (null, not 0%, on an empty
  window), lot availability, and the receivables rules (balance floor, four aging buckets,
  overdue sum, received-in-period).
- `tests/unit/analytics-page.test.tsx` — the page renders the six tiles, draws the real sales
  line, names the collections blank, draws the collections line once payments exist, prints the
  aging + lots, sums the year range, and prints the source table + chart rules.
- `tests/unit/accounting-money.test.tsx` — the money tiles, the named blank, the recorded
  payment's official receipt, the aging buckets, the reconciliation gaps, the billing-scope
  state, one `h1` and read-only.

Gates (all run from the worktree root on this head):

| Gate | Result |
|---|---|
| `npm run lint` | 0 errors (4 pre-existing warnings in untouched files) |
| `npm run typecheck` | pass |
| `npm test` | 3,174 tests / 288 files pass |
| `npm run build` | pass (includes `/staff/analytics` in the route manifest) |

---

## 4 · Honest boundaries

- **Fixture mode.** No reporting-analytics service is frozen, so every figure aggregates the same
  recorded stores the screens already read; there is no live branch that dresses fixtures as
  service data. The source table names the live service per metric.
- **Reconciliation, expenses and statements are not built.** The screen says so, with the exact
  feed/API each needs — `posting-instruction-v1`, a bank/gateway feed, E2 reporting-analytics.
- **The analytics gate is provisional.** `rbac-scopes-v1` names no analytics scope, so the page
  reuses the finance reads it aggregates (`accounting:read` / `billing:read`), the same any-of
  gate `/staff/reports` carries.
- **Read-only.** The app displays accounting and analytics; it never posts, sends or schedules.

## 5 · Open items

- A `reporting-analytics` (`E2`) contract would let the figures become one query behind the same
  module boundaries; the live per-metric services are named in `ANALYTICS_SOURCES`.
- A bank/gateway feed would populate the reconciliation flags; until then the panel names the gap.

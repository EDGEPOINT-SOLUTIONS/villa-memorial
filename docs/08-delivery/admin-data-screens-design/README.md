# Admin data screens — Inventory · Accounting · Reports (implementation record, 2026-09-20)

The three admin routes the captain found empty were twelve-line stubs. Each waits on a
platform service that does not exist — an inventory service, a staff-facing ledger API
(the accounting service exists; the ledger read does not), and reporting-analytics. That
stays true and each screen now says so in **one line** and then gets on with showing the
office's recorded data, the pattern the commission, lot-record, guarantee-instrument and
AI-copilot screens already use.

**Routes:** `/staff/inventory` · `/staff/accounting` · `/staff/reports`
(`app/(staff)/staff/{inventory,accounting,reports}/page.tsx`).
**Evidence:** shots in `shots/` (1440×900 and 390×844), all captured from the production
build (`next start`, fixture mode, signed in as the admin persona).

## What each screen does, in reading order

### Inventory — the stock room

1. One line naming the missing service, then four KPI tiles: items tracked · out of stock
   · low stock · stock value at recorded cost (with the count of rows carrying no cost).
2. **Items on the shelf** — the table leads: item + SKU, category, on-hand + unit, the
   derived state badge (out · low · in stock), reorder level, supplier, location, cost and
   price. Out-of-stock rows lead, then low, then the rest; category/state/text filters
   above. A catalogue-linked row's price is resolved from the durable catalogue, so an
   admin edit on `/staff/catalog` is what this screen shows; a supply the catalogue does
   not carry prints "Not listed". A missing supplier, location or cost prints the missing
   state.
3. **Movement history** — newest first: date, item, kind (received · allocated · adjusted),
   signed change, reference (delivery receipt or `CASE-…`) and who recorded it.

### Accounting — the ledger, read-only

1. One line naming the missing API, then the trial balance figures: entries in period
   (of the recorded total) · total debits · total credits · a Balanced badge.
2. **Trial balance** — account + code, type, debit, credit, net balance with its Dr/Cr
   side, and a totals row. The balance is derived from the journal by `lib/accounting.ts`;
   nothing is stored beside the entries.
3. **Journal entries** — date, reference, description, amount, and what it is against
   (the case/order links only when the session holds `cases:read`/`orders:read`; otherwise
   plain text). The period filter (inclusive calendar dates) applies to both halves.

### Reports — four of the office's own reports, tabbed

Each tab renders its own period form, one line naming the live service, and its table:
collections (the durable payment journal, grouped by month), sales by agent (the real
orders — the agent column reads "Not recorded" because no order carries one, and the note
names crm-families as the missing input), lot & chapel occupancy (property lots snapshot +
arrivals, and chapel booked/closed/open days with occupancy; closures excluded from both
sides of the ratio), cases by stage (cases opened in the period, grouped with the ops
board's own stage words and order). A store that cannot be read says so; a period with no
data shows its honest empty state — never a fabricated chart.

## What is deliberately absent

- **No write path of any kind.** No posting, reversal, purchasing, adjustment or stock
  movement control exists in any mode, and the Accounting screen says it is read-only.
- **No invented figure.** Inventory prices resolve from the catalogue (never stored in the
  stock fixture); the accounting trial balance is derived from balanced entries; every
  report aggregates a real recorded source. A missing datum prints as a missing state.
- **No new visual language.** The pages use the existing page header, folio cards, KPI
  grid, filter bar, table and empty/error states, the typography ladder and tokens only.
- **No change to nav or the other six stubs.** The three nav entries already existed and
  their scopes are unchanged (`catalog:write` / `accounting:read` /
  `accounting:read|billing:read`).

## Where every fact comes from

| Fact | Source |
|---|---|
| Stock items, suppliers, costs, locations, reorder levels, movements | `lib/fixtures/commerce/inventory.json` (APP-AUTHORED example records with provenance) through `lib/api-client/inventory.ts` |
| Casket prices | the durable catalogue store (`getCatalogRecord`), the same store the storefront sells from |
| Stock state, signs, filter/sort, rollups | `lib/inventory.ts` (pure) |
| Chart of accounts, journal entries, recorded period | `lib/fixtures/finance/accounting.json` (APP-AUTHORED example books with provenance) through `lib/api-client/accounting.ts` |
| Trial balance, period filter, entry totals | `lib/accounting.ts` (pure, derived from the entries) |
| Collections | the durable billing store's recorded payments + invoices |
| Sales by agent | the durable order store (real orders; agent not recorded) |
| Lots | `lib/api-client/property.ts` (`listLots`) |
| Chapel days | `lib/api-client/chapel-admin.ts` (scheduling resources/bookings/blocks) |
| Cases by stage | `lib/api-client/operations.ts` (`listCases`) + `lib/operations/case-board.ts` vocabulary |
| Report keys, rollups, calendar window | `lib/reports.ts` + `lib/period.ts` (pure) |

## Render check (production build, fixture mode, admin persona)

| Shot | Route | Viewport |
|---|---|---|
| `shots/inventory-1440.png` · `shots/inventory-390.png` | `/staff/inventory` | 1440×900 · 390×844 |
| `shots/accounting-1440.png` · `shots/accounting-390.png` | `/staff/accounting` | 1440×900 · 390×844 |
| `shots/reports-empty-1440.png` · `shots/reports-empty-390.png` | `/staff/reports` (collections, no payment recorded — the **honest empty state**) | 1440×900 · 390×844 |
| `shots/reports-cases-1440.png` · `shots/reports-cases-390.png` | `/staff/reports?report=cases` | 1440×900 · 390×844 |

`document.documentElement.scrollWidth === clientWidth` at both widths on every shot
(1440/1440 and 390/390): no horizontal panning, including the scrolling data tables, the
wrapping report tabs and the stacked period forms.

## Tests

- `tests/fixture-contract/inventory.test.ts` — movements sum to on-hand, catalogue prices
  resolve from the catalogue, allocated movements name real cases, `by` names HR employees,
  no stored price.
- `tests/unit/inventory.test.ts` + `tests/unit/inventory-page.test.tsx` — state/sign/filter
  rules; the rendered screen (gating, honest line, real rows, empty state, one h1).
- `tests/fixture-contract/accounting.test.ts` — every entry balanced and one-sided, chart
  membership, order/case references real, derived trial balance balanced.
- `tests/unit/accounting.test.ts` + `tests/unit/accounting-page.test.tsx` — balances,
  period boundaries, the rendered trial balance + journal, the empty period, read-only.
- `tests/unit/reports.test.ts` + `tests/unit/reports-page.test.tsx` — the shared period
  window and every rollup; the four rendered tabs, the honest empty states and the
  one-line live source.

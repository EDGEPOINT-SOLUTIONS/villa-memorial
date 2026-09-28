# Phase 5 — the lot's monthly and its "total"

**Brief:** the audit (`../client-minutes-audit-2026-09-21/README.md` §8) found a lot's card printing
three figures that do not reconcile — Prime Lots **₱1,920 / month**, "Payment term: 6 years
(72 months)", "Total contract price ₱128,000" — because 1,920 × 72 = ₱138,240. The follow-up plan
proposed tying the monthly to the annual with `annual = monthly × 12`. **That rule is arithmetically
impossible for this sheet**, and this record corrects the diagnosis before changing anything.

**Date:** 2026-09-28.

## The correction (evidence first)

The recorded 2026 lot sheet does not compute `monthly = selling ÷ 72`. Every row keeps two
different schedules:

- `annual = round(selling ÷ 6)` — the six-year amortization (already enforced: `annual × 6 ≈ selling`
  within ₱3).
- `monthly = round(selling × 1.5%)` — a *financed* schedule. Over 72 months it totals ≈108% of the
  cash price (an ~8% carrying cost).

This holds for **all 20 rows** (regular and senior). Worked example, Prime Lots lot-only:
`128,000 ÷ 6 = 21,333` ✓ annual; `128,000 × 0.015 = 1,920` ✓ monthly; `1,920 × 72 = 138,240`
(not 128,000). So the three figures are each the sheet's own, and they *legitimately* differ by the
financing — the card's contradiction is that it presents them as one arithmetic whole.

Two consequences:

1. **`annual = monthly × 12` cannot be enforced.** For Prime Lots it would need `annual = 23,040`,
   which then breaks `annual × 6 ≈ selling` (23,040 × 6 = 138,240 ≠ 128,000). Enforcing it would
   mean rewriting the client's selling price — the seed is **not** hand-editable
   (`lib/fixtures/commerce/pricing.json` provenance rule).
2. The real product question — *does a monthly plan's total equal the contract price, or the
   financed figure?* — is the client's to answer, exactly like the senior-rate sheet conflict.

## What changed

| # | Change | Cite |
|---|---|---|
| 1 | A lot row's **monthly must at least cover the contract price** over the recorded term (`monthly × 72 ≥ selling`) — the lower bound the sheet keeps; a monthly that could never pay the lot is a transcription error | `lib/pricing-model.ts` `checkLotCategories` |
| 2 | The **financed total is recorded as an open client question** (read-only fixture metadata, outside the editable document) rather than silently reconciled | `lib/fixtures/commerce/pricing.json` `questions[]` |
| 3 | `/lots` filters, sorts and its quick ranges now read **the figure the card leads with** — the monthly — so a range labelled `Up to ₱1,920.00` matches the number on the card | `lib/lot-listing.ts`, `lib/lot-listing-data.ts` |

### Change 3 in detail

`LotListingItem` carried one price (`priceCents`, the recorded contract total) used for filtering,
sorting and the quick ranges, while the card headlined the monthly. The field is now split:

- `leadPriceCents` — monthly cents when the pricing store prices the section, else the contract
  price. **Filter / sort / quick ranges read this.**
- `contractPriceCents` — the recorded price, shown only as the fallback when no monthly is priced.

Sort order was already monotonic in the total (monthly = 1.5% × selling), so the visible fix is the
**range labels**: before `Up to ₱128,000.00` / `₱567,000.00 and up`; after `Up to ₱1,920.00` /
`₱8,505.00 and up` — the monthly figures the cards show.

## Evidence

- `tests/unit/pricing-model.test.ts` — a monthly too small to pay the lot is refused; the recorded
  seed still passes.
- `tests/fixture-contract/pricing.test.ts` — the new question is present with its screen and source.
- `tests/unit/lot-listing.test.ts` + `tests/unit/lots-listing.test.tsx` — the range/quick-range
  cases now read the monthly, and the URL case filters on it.

## Open (Track in the client register)

`docs/07-client-villa/open-questions.md` and the pricing fixture's `questions` both record: confirm
whether the monthly plan's total is the contract (cash) price or a financed figure before the office
quotes a monthly plan's total.

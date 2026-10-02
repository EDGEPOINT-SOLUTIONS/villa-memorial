# Family portal — the amortization view (captain, 2026-10-02)

**What and why.** “The family portal should have amortization also.” The family could see a
paid-share bar and a list of open reminders, but not the shape of their own agreement: how they
pay, over what term, what each period is, what is behind them, what is left and when the next
date falls. This record is the view that answers that, on the family's existing screens, reusing
the recorded data and the ONE amortization model rather than inventing a second arithmetic.

## Where it lives

| Screen | What it shows |
|---|---|
| `/client/payments` | the full **Amortization** panel (`id="amortization"`): the recorded mode, term, periodic amount, payments made, remaining balance and periods and next due, then the period · amount · status · remaining table |
| `/client/plans` | the same panel, so “Your plan” carries its own schedule (its gap note now names only the plan certificate) |
| `/client/dashboard` | the money panel's money line links to `/client/payments#amortization` (“See your full schedule →”) |
| `/client/property` | the held lot's **recorded six-year lot-sheet amortization** for its park section: regular and senior monthly figures and the selling total |

## The derivation (one home)

`lib/family/family-amortization.ts` is the ONE derivation; the panels
(`components/family/family-amortization.tsx`) are presentation only.

- **Plan.** `payment_schedule` → `lib/payment-schedule.ts` derives every due date and state;
  the module sums the recorded integer minor units (`total`, `paid`, `remaining`) and formats
  them, so no display string is ever parsed (repo money rule). It counts paid and remaining
  periods and takes the next due from `nextPaymentDue`. A uniform schedule is labelled
  “Each payment”; a varying one is labelled “Next payment” (the next open period's
  outstanding), never one amount pretending to be all of them.
- **Lot.** `lib/catalog-sources.ts` maps the lot's park section to the client's sheet family
  (A → Prime Lots … D → Mausoleum), and the new
  `lib/monthly-pricing.ts::lotFamilyMonthlyPrices` returns the family's **regular and senior**
  monthly figures in one lookup (the single-column `lotFamilyMonthlyPrice` now delegates to it).
  The term is the model's recorded `LOT_TERM_LABEL` (“6 years (72 months)”).

## The recorded numbers, checked

Verified against `lib/fixtures/family/snapshot.json` and the recorded 2026 sheet, with a fixed
clock where a date is involved:

| Figure | Ernesto (VM-PLAN-2026-0188) | Aurora (VM-PLAN-2026-0241) |
|---|---|---|
| Mode · term | Monthly · 5 years | Monthly · 5 years |
| Periodic amount | next payment ₱12,000 (periods 10,000 · 10,000 · 12,000 · 10,000) | each payment ₱8,505 × 4 |
| Payments made | ₱20,000 · 2 of 4 | ₱17,010 · 2 of 4 |
| Remaining | ₱22,000 · 2 periods | ₱17,010 · 2 periods |
| Next due (from 27 Jul / 5 Aug) | 27 September 2026 | 5 October 2026 |

- `remaining = total − paid`: ₱42,000 − ₱20,000 = ₱22,000 (Ernesto);
  ₱34,020 − ₱17,010 = ₱17,010 (Aurora) — both equal the recorded `balance_cents`.
- Uniform schedule: ₱8,505 × 4 periods = ₱34,020, exactly the recorded total (Aurora).
- Lot: section A → **Prime Lots**, 6 years (72 months), regular ₱1,920 / senior ₱1,688,
  selling ₱128,000. Note the sheet rounds each column independently — the pinned lot invariant
  is `annual × 6 ≈ selling` within ₱3 (₱21,333 × 6 = ₱127,998), not `monthly × 72`; the panel
  prints the sheet's own monthly column and never recomputes it.

## Honest states

- A record with no readable `payment_schedule` renders “Your payment schedule isn’t recorded
  here yet.” plus the office phone — never a plausible schedule.
- A lot whose section the sheet does not price renders “The recorded lot amortization isn’t on
  this page yet.” plus the office phone.
- The lot panel captions its source (“From PRICE LIST FOR 2026 · LOT ONLY · Prime Lots. The
  office confirms your own schedule.”) so the sheet figure is not read as the family's own
  billed schedule.

## Presentation

The compact table is the dashboard's own `dash-table` grammar (period · amount · status ·
remaining, with the derived due date under the period) under a two-column `dash-facts` strip —
no paragraphs, no new CSS. It inherits the `.dash` dense type scope, the tabular figures and
the phone restacking (each cell labelled through `data-label`). One `h1` per page, one primary
action before the content, and the office number one tap away are unchanged.

## Evidence

Captured from this branch's worktree (`next dev`, fixtures, signed in as `customer@vm.demo`) at
1440 and 390:

- [`payments-1440.png`](./payments-1440.png) · [`payments-390.png`](./payments-390.png) — the
  plan schedule on Payments.
- [`lot-1440.png`](./lot-1440.png) · [`lot-390.png`](./lot-390.png) — the recorded lot
  amortization on Your lot.

Tests: `tests/unit/family-amortization.test.ts` (the arithmetic and the null records),
`tests/unit/family-amortization-pages.test.tsx` (the real pages present + the missing state),
and the updated `tests/unit/family-records.test.tsx` lot assertion (the lot page now carries
the sheet's three recorded figures and still no plan balance). `npm run lint`,
`npm run typecheck`, `npm test` (3,253 passed) and `npm run build` all pass on the branch.

## Note on the clarity pass

A family-portal clarity pass (`fm/villa-family-clarity`) is in flight on these same pages. At
the time of writing that branch still sits at `main` (`09c9d3a`) with no commits, so there was
nothing to rebase onto; when it lands, keep both the shortened copy and this feature. The only
copy this change rewrote was `/client/plans`'s gap note, which had claimed the instalment
schedule was not connected — now false.

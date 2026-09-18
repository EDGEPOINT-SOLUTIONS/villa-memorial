# Provisional receipt — implementation record (F-18 · FORMS_PLAN gap 3, 2026-09-18)

**Routes:** `/staff/billing/provisional-receipts` (the list) · `/new` (the folio capture) ·
`/[id]` (the paper, or the official receipt that replaces it) · `POST /api/billing/provisional-receipts`.
**Brief:** checklist F-18 and **gap 3** of the forms work — *"Initial payment capture + receipt
view with the honest 'valid only when confirmed by official receipt' note; the actual OR
numbering/allocation is dev/finance."* This is the **provisional** half: the paper the counter
hands over, flagged as provisional, with the real official receipt swapped in when it exists.

## Why the paper is shaped this way

The client's signed **Provisional Receipt is not archived** in
`docs/07-client-villa/paper-forms/` (the folder holds the service contract and the purchase
papers only) and that folder's rule is *"when a screen and a paper disagree, the paper wins."*
So this sheet does **not** claim to reproduce that form: it records the same information the
counter writes down — payer, amount received, how it was paid, the invoice/order/case it is
against, who received it — and says unmistakably what it is not:

> **Not an official receipt — the official receipt will replace this paper.**

printed directly under the title, in bold, plus the shared validity note
(`PROVISIONAL_RECEIPT_NOTE`) at the foot. It carries **no receipt number**: numbering,
allocation and posting belong to finance, and an invented number is exactly what this paper
exists to avoid.

## The flow

1. **Capture** (`/new`, folio grammar as the purchase application and service contract use it):
   numbered `capture-section` cards + a `capture-rail` of steps and readiness checks. The
   invoice, customer, outstanding balance, order and case/contract link are **read from the
   recorded billing data** (by `?invoice=`/`?order=`/`?case=`, or the picker); the counter enters
   the payer, amount, instrument, reference (when the instrument needs one) and date. Nothing is
   typed twice and nothing is invented.
2. **The paper** (`/[id]`): assembled from the shared `PaperBlock` grammar
   (`lib/contracts/provisional-receipt.ts` → `buildProvisionalReceipt`), so the on-screen sheet,
   the `.docx` and the `.pdf` are **one document** — the same kit the service contract and
   purchase application print through (`components/paper/paper-sheet.tsx` +
   `paper-export-actions.tsx`). The letterhead is the staff-editable landing content doc
   (wordmark · location · 24/7 line via `provisionalReceiptOffice`), so no telephone or address
   is typed into the paper. The print stylesheet hides everything but the sheet.
3. **The OR display state** (`/[id]`, same route): the moment a recorded payment for the invoice
   carries an official receipt — or the documents repository holds a receipt row naming the
   invoice/order/case — `officialReceiptForProvisional` returns it and the page shows **that**
   receipt (the real `DOC-…` number + figures, or a link to the repository row) and does **not**
   print the provisional slip. One state or the other, never both. Matching is **display-only**:
   nothing here issues, numbers or posts a receipt.
4. **The list** (`/staff/billing/provisional-receipts`): every slip the counter has issued
   (durable journal), each row carrying received · payer · amount · settles · received-by ·
   official-receipt state, with a count strip (Issued · Awaiting an official receipt · Official
   receipt on file). Reached from Billing & collections.

## Where every fact comes from (nothing authored in a view)

| Fact | Source |
|---|---|
| Invoice, customer, order, balance, status | `listInvoices()` / `getInvoiceByNumber()` (`lib/api-client/finance.ts`) — the recorded billing fold |
| Case/contract link | `getCase()` / `listCases()` (`lib/api-client/operations.ts`), and only when the record names one |
| Amount · instrument · reference · date rules | the SHARED billing rule set `validatePaymentInput` (`lib/billing-payments.ts`) — never re-declared |
| Instrument vocabulary | `PAYMENT_INSTRUMENTS` (`lib/contracts/payment-capture.ts`) |
| Office letterhead | the landing content document (`listLandingContent()`), via `provisionalReceiptOffice()` |
| Official receipt number + figures | the recorded payment's `receipt_document` and the documents repository — never minted here |
| The recorded slip | `lib/api-client/provisional-receipts-store.ts` (durable journal) |

## Honest states, compressed

- **"Awaiting official receipt"** on the list and the detail KPI while no receipt exists; the
  paper itself says what will replace it in one bold line.
- **No receipt number, no posting, no sub-ledger.** The record's `id` (`prov-<uuid>`) is an
  opaque screen address, never printed. The slip changes no invoice balance (`changes no invoice
  balance` is stated on the page, and the capture alert says the balance moves in Billing).
- **Live mode is unimplemented, named.** No frozen contract names a provisional-receipt record
  or endpoint, so `lib/api-client/provisional-receipts.ts` answers **503
  `PROVISIONAL_RECEIPTS_NOT_WIRED`** for reads and writes rather than dressing local files up as
  a service. The PR carries the contract ask (see below).
- **A repository receipt row carries no amount.** That state links to the real receipt in
  Documents instead of printing figures the row never had; a slip with a recorded payment's
  receipt prints the receipt's own figures.

## Scope, entry point and the one chrome fix

- **RBAC (frozen vocabulary):** `billing:read` gates the list/detail pages (graceful
  `ForbiddenState` without it), `billing:write` gates issuing (route gate
  `app/api/billing/_guard.ts`). No new scope is invented; `tests/unit/staff-scope-vocabulary.test.ts`
  stays green.
- **Entry point:** the Billing & collections page ("Provisional receipts"), plus the issue/back
  actions on the three screens. The billing payment flow (F-08) is untouched.
- **One shared fix:** `.page-header__actions` now wraps below 48 rem
  (`styles/components.css`). A long title plus two actions overflowed the 390 px viewport
  (measured: `scrollWidth` 565 vs `clientWidth` 390 on the detail page; 542 on `/staff/billing`)
  because the block is `flex-shrink: 0`. The media query lets the header wrap and the actions
  shrink, so the affected staff headers now fit the phone. Every screenshot below was retaken
  after the fix.

## Verification

- `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` → **98 files / 1064 tests passed** ✓ ·
  `npm run build` ✓ (routes build dynamic: list 242 B, detail 3.78 kB, capture 4.12 kB).
- **New tests:**
  - `tests/unit/provisional-receipts.test.ts` (15) — rules (shared billing half, payer bounds),
    the sheet's mark/fields/no-number, the office letterhead, the official-receipt match
    (recorded payment first, repository row second, honest null).
  - `tests/unit/provisional-receipts-store.test.ts` (9) — durable journal, actor stamping,
    404/422 refusals write nothing, corrupt journal is a 500, the OR state flips after a payment.
  - `tests/unit/provisional-receipts-rbac.test.tsx` (13) — 401/403/400/404, per-control refusal,
    page gating, the folio capture, the marked paper replaced by the official receipt.
  - `tests/unit/provisional-receipts-live.test.ts` (2) — the named 503 for reads and writes,
    never touching the fixture store.
  - `tests/unit/record-payment-screen.test.tsx` updated (the fallback slip's file stem keeps
    "Provisional-", never "Official-"); `tests/setup.ts` isolates the new store path.
- **Render check at 1440 × 900 and 390 × 844** (production build, `next start`, chrome-devtools-axi,
  fixture stores on temp paths; a real payment recorded against INV-2026-00003 so both display
  states exist side by side):

  | Viewport | `h1` count | `scrollWidth` / `clientWidth` | Paper sheet | Export buttons |
  |---|---|---|---|---|
  | 1440 × 900 | 1 (`Provisional receipt`, 279 × 42 at 288,116) | 1440 / 1440 | full Letter sheet inside the main column | Print 76 · Word 129 · PDF 71 wide, one row |
  | 390 × 844 | 1 (full page; the staff rail precedes `main`) | 390 / 390 | 276 × 874 at (57,1948), fully inside the viewport | Print 76 × 41 · Word 113 × 41 · PDF 71 × 41, all reachable |

  The provisional mark is present at both widths (`document.body.innerText.includes("Not an
  official receipt — the official receipt will replace this paper.")` → true). The list renders
  both states in one table; the OR state page contains no provisional sheet at all
  (`innerText` has "Official receipt DOC-2026-00007", not "PROVISIONAL RECEIPT").
- **Exports are real artifacts** (generated from the page, fixture data):
  `shots/sample-export.pdf` (a valid 1-page PDF, 2135 B) and `shots/sample-export.docx`
  (Office Open XML, 9281 B — `word/document.xml` carries the letterhead, the mark, every field,
  the validity note and the signature line). Filenames always start `Provisional-Receipt-…`.

## Evidence files (`shots/`)

| File | Shows |
|---|---|
| `capture-1440.png` / `capture-1440-full.png` / `capture-390.png` / `capture-390-full.png` | the folio capture with the invoice read from recorded data and the capture rail |
| `provisional-paper-1440.png` / `-full` / `-390.png` / `-full` | the marked provisional paper, letterhead, Print/Word/PDF actions |
| `or-state-1440.png` / `-full` / `-390.png` / `-full` | the OR display state: official receipt DOC-2026-00007 replaces the slip |
| `list-1440.png` / `-full` / `-390.png` / `-full` | the counter's list — Issued 2 · Awaiting 1 · Official receipt on file 1 |
| `sample-export.pdf` / `sample-export.docx` | the real exports of the provisional sheet |

## Open contract asks (do not quietly widen)

1. **The client's signed Provisional Receipt paper.** Please send it (like the service contract
   and purchase papers) so the digitized slip can match the office's own form; until then this
   sheet records the same information and says plainly what it is. Recorded in
   `docs/07-client-villa/open-questions.md` (Track C).
2. **A provisional-receipt record/endpoint.** The POST body
   (`{invoice_number, case_number, payer, amount_cents, instrument, reference, received_on,
   notes}`) and the response are app-authored; there is no frozen contract, so live mode 503s
   (`PROVISIONAL_RECEIPTS_NOT_WIRED`) and fixture mode keeps the durable journal.
3. **OR linkage.** For the display match to work from the repository alone, a generated receipt
   row should name the invoice it settles (the frozen documents shape has no invoice field; only
   the title currently carries it) or related_order_number/related_case_number should be set by
   the producer.

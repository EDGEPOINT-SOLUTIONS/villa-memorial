# Store tolerance — an orphan journal event is skipped, not fatal (2026-10-03)

**The failure (found re-creating the three sample enquiries on staging, 2026-10-03).** An
ENOSPC-interrupted write left the operations journal holding a task event for a case the
case store no longer had. Every read of the case store then threw
`the case store references an unknown case` (500), so `Send to case` could not open the
case it had just made: the office saw a dead screen instead of its working data.

The journal mechanics (`lib/api-client/journal.ts`) already made a crash safe — the whole
file is written to a sibling temp file, fsynced, then `rename(2)`d — but they did nothing
about the case where a LEGAL event names a PARENT the fold does not have. That is an
orphan, not corruption, and it should cost the event, not the whole store.

## What shipped

- **An orphan is skipped and counted.** A store fold that cannot resolve an event's
  parent no longer throws: it drops that one event, keeps every good record, and collects
  a `SkippedJournalEvent` (`kind`, `at`, `parent`, `reference`). The operations store
  exposes the count through `loadStoredCaseFold()` (`{ cases, skipped }`); the other
  stores carry `skipped` on their state and log it.
- **The orphan is named on the server log.** `logSkippedJournalEvents(label, skipped)`
  prints one line per orphan — `kind`, `at`, the referenced parent field and its value.
- **Nothing is silently dropped.** The journal is never rewritten by a read; a later write
  appends and preserves the orphan row, so it stays diagnosable until an operator resolves
  it.
- **Malformed is still loud.** A journal that is not JSON, misses the `{version, events}`
  envelope, or carries an event the store's own reader cannot parse still throws a 500
  naming the store. An orphan is a *missing parent for a valid event*; anything the reader
  cannot understand is corruption and is refused.
- **A failed write says why.** `writeJournalEvents` now keeps the OS error as the
  `ApiError` `cause` and logs it (`cause.code` — `ENOSPC`, `EISDIR`, …), while
  `err.message` stays the plain `the <label> store could not be written`. The read and
  directory paths carry their cause too. The visitor message is unchanged.

## The stores checked

Every fixture-mode store reads its journal through `lib/api-client/journal.ts`. Each fold
was read for the parent-reference pattern (an event that only makes sense against an
earlier/seed record). Four shared the fatal failure; the rest were already tolerant, or
their event shapes carry no parent at all.

| Store | Verdict |
|---|---|
| `operations-store.ts` | **FIXED** — `task_status_set` naming an unknown `case_number` or `task_id`. The primary staging failure. |
| `chapel-store.ts` | **FIXED** — `block_removed` naming a block the seed/prior events do not carry. |
| `order-store.ts` | **FIXED** — `status_changed` naming an unknown `order_number`. |
| `catalog-store.ts` | **FIXED** — `item_updated` naming an unknown `item_id`. |
| `inquiry-store.ts` | Already tolerant — `if (row) …` skips a status/contact event for an absent enquiry. |
| `burials-store.ts` | Already tolerant — a `pickup_updated` for an absent burial is ignored. |
| `agent-plan-store.ts` | No throw — `plan_saved` is an upsert by id, `plan_removed` deletes by id. |
| `agent-store.ts` | Append-only events; consumers fold them; no parent lookup throws. |
| `chat-store.ts` | One journal per thread; the fold upserts messages and message states. |
| `content-entries.ts` | Upsert by entry key. |
| `content-pages.ts` | Upsert by page key. |
| `landing.ts` | Last save wins. |
| `site-config.ts` | Last save wins. |
| `pricing-store.ts` | Last document wins. |
| `documents-store.ts` | Append-only; no parent reference. |
| `family-household-store.ts` | Append-only; no parent reference. |
| `membership-store.ts` | Append-only application recordings; no parent reference. |
| `memorial-store.ts` | Upsert by `person_id`. |
| `product-lines.ts` | Upsert by line id. |
| `provisional-receipts-store.ts` | Append-only receipts; no parent reference. |
| `lifecycle-store.ts` | Engagements/templates/payments/sends are appended or upserted; no throw. |
| `billing-store.ts` | Payments are filtered onto the invoice with a matching number. An unknown-invoice payment is not folded anywhere, but it does not throw (the write path already refuses an unknown invoice), so it is outside this failure class. |

## Evidence

`tests/unit/journal-store-tolerance.test.ts` pins the behaviour:

- an orphan task event folds to all seven recorded cases with `skipped` naming the
  referenced case, and the orphan is named on the log;
- an orphan naming a task inside a real case keeps that case and counts the skip;
- a later write does not rewrite the orphan out of the journal;
- a non-JSON journal still refuses with the store-naming 500;
- a failed write keeps the plain message and carries the OS `cause` (`EISDIR` in the test,
  the same catch as `ENOSPC`);
- the chapel, order and catalogue siblings skip their orphan and name it.

Existing guards still pass: `tests/unit/ops-board.test.ts` (the two board writes and the
malformed-journal refusal), `tests/fixture-contract/operations.test.ts`,
`tests/unit/inquiry-to-case.test.ts`, `tests/unit/journal-single-source.test.ts`.

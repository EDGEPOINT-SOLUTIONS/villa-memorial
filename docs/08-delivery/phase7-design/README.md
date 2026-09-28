# Phase 7 — the "doesn't make sense" cleanup, and the journal migration

**Brief:** the audit's smaller items — copy that describes a feature that no longer exists, a
duplicated logo row, a stale planning line — plus the journal migration of the eleven older stores.

**Date:** 2026-09-28.

## Done — four stale surfaces

| Surface | Was | Now |
|---|---|---|
| `/staff/landing` blog card (`app/(staff)/staff/landing/page.tsx`) | "The newest also leads the home page's blog band." — a band removed 2026-09-27 | "The posts the office publishes — a caption plus photos or video." |
| `/facilities` metadata (`app/(public)/facilities/page.tsx`) | "…common and private chapels with their **2026 per-day rates**" | "…common and private chapels, the garden niches, mausoleum and grounds — and how to ask the office about dates and a quotation." |
| `/facilities` hero lead | "Where the wake is held — and the **2026 rates**." (the page prints no rate — Request-for-Quote, minute 5) | "Where the wake is held — ask the office for dates and a quote." |
| `/price-list` hero (`app/(public)/price-list/page.tsx`) | the identical `.logo-row` (two client logos) rendered **twice** | one row |
| `docs/08-delivery/next-session-plan.md` | items 3 (branding) and 6 (map) still "In flight … (no PR yet)" | both **Shipped** (#132, #135), with the Phase 6 brand follow-up named |

`app/(public)/AGENTS.md`'s two stale `lib/demo-inquiry-captures.ts` references were already corrected
at the start of this session (see the reconciliation diff).

## Done — the eleven older stores migrated to `lib/api-client/journal.ts`

Phase 2 extracted the shared journal mechanics to `lib/api-client/journal.ts` and moved
`content-pages.ts` + `landing.ts` onto it. Phase 7 moved the remaining **eleven** commerce/ops
stores: `order-store`, `pricing-store`, `billing-store`, `chapel-store`, `catalog-store`,
`membership-store`, `content-entries`, `operations-store`, `product-lines`,
`provisional-receipts-store`, `inquiry-store`.

Each store now:

- resolves its path with `journalPath(ENV, filename)`;
- reads with `readJournalEvents(path, label)` and maps the result through its own unchanged
  `toPersistedEvent` validator — the record shape stays with the store;
- writes with `writeJournalEvents(path, label, events)`;
- takes its one-writer guarantee from `createJournalLock()`.

The store-specific names (`readPersistedEvents` / `persistEvents` / `withStoreLock`) are kept as
thin delegates, so no call site changed and the diff is mechanics-only. Each file dropped its
`node:fs` / `node:path` imports, its `writeQueue`, its hand-rolled `JSON.parse(raw)` envelope
check and its `PersistedStore` type. Error sentences are unchanged (`the order store could not be
read`, …) because the shared functions take the store's own label.

**Guard:** `tests/unit/journal-single-source.test.ts` fails any store in `lib/api-client` that
re-grows a `node:fs` import, a `let writeQueue`, or a `JSON.parse(raw)` — the duplication is how
the Phase 2 `globalThis` mistake survived unnoticed, so it is now a test.

**Result:** one implementation of the mechanics, eleven callers. Behaviour is unchanged — the full
suite (237 files / 2,727 tests) passes with no store-test edits.

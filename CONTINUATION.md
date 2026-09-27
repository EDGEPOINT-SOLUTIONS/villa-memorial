# CONTINUATION — Villa Memorial (transfer to another laptop)

**Written:** 2026-09-27. **Repo:** `villa-memorial` (Next.js 15 App Router, fixtures-first).
**Nothing is committed.** The whole session lives in the working tree — copy the folder, not a git clone.

---

## 0 · First 5 minutes on the new laptop

```bash
cd villa-memorial
npm install
npm run typecheck && npm run lint          # both must be exit 0
npm test                                    # expect 232 files / 2,689 tests passing
npm run build                               # must compile
npx next start --port 4000                  # in a BACKGROUND job, then:
npm run smoke                               # expect "All 61 advertised routes render."
```

If `npm test` is not green, stop and re-read §4 before changing anything.

---

## 1 · The task

The captain gave the **client's signed minutes of 2026-09-21** (8 enhancements) and asked:
*verify all 8 are really working, make the staff/admin panel correct and coherent — the product
catalogue and page-editing must genuinely work, not be for show — and remove anything that does not
make sense. Evidence over assumption: no claim without a file or a measurement.*

**The 8 requirements are already verified.** The full audit with `file:line` evidence for every one:

> **`docs/08-delivery/client-minutes-audit-2026-09-21/README.md`** ← read this first

Verdicts: #1 PARTIAL · #2 PARTIAL · #3 DONE (exact ask) · #4 WORKING w/ 3 defects · #5 PARTIAL
(**a family's quote never reached the office**) · #6 PARTIAL · #7 PARTIAL · #8 WORKING.

Then a 7-phase plan was agreed. **Phases 1–3 are DONE and proven. Phases 4–7 remain.**

---

## 2 · DONE — Phases 1, 2, 3

### Phase 1 — a family's quote request now reaches the office ✅
`docs/08-delivery/phase1-design/README.md`

Before: both public forms (`/quote`, `/contact`) wrote to the **visitor's own browser**
(`lib/demo-inquiry-captures.ts`, localStorage) and told them *"Nothing was sent to a server"* — so a
Request-for-Quote reached nobody, and the preferred date + requirements were rendered on no staff screen.

Now: `POST /api/inquiries` (public) → `lib/inquiry-intake.ts` (validation, shared with the browser) →
`lib/api-client/inquiry-store.ts` (durable append-only journal, `.data/crm-inquiries.json`) →
`listInquiries()` folds it → the staff board renders the request's own words.
**Deleted** `lib/demo-inquiry-captures.ts`.

Proven end-to-end: family submits → `201` → row on disk → staff signs in **in another browser context**
→ board shows name + `Preferred date: 2026-10-05` + requirements.

### Phase 2 — page editing survives a restart ✅
`docs/08-delivery/phase2-design/README.md`

Before: `landing.ts` (Home/FAQ/blog/chrome/contact) and `content-pages.ts` (Park/Services/Plans/Coffins)
kept edits on `globalThis` with **no file behind them** — the only 2 of 13 stores that did. An edit
saved, the page re-rendered, and it was **gone on restart**.

Now: both are durable journals on shared mechanics — **`lib/api-client/journal.ts`** (new:
`journalPath` / `readJournalEvents` / `writeJournalEvents` / `createJournalLock`).
`tests/setup.ts` redirects both env vars and the old `globalThis` reset block is gone.

Proven: saved through the real API, **killed the server**, started a fresh one, read the edit back.

### Phase 3 — the catalogue controls what the storefront sells ✅
`docs/08-delivery/phase3-design/README.md`

Before: `CasketCard` printed `model.srp` from the **hardcoded sheet list** while Add-to-cart sent the
**catalogue's** `unit_price_cents`. They agreed only because a fixture contract pins the seed — one edit
away from showing one price and charging another. The **senior price was not in the catalogue at all**
(0 of 24 rows), so it was not editable, full stop. Three more surfaces read the sheet constant.

Now: all **24 casket rows carry `senior_price_cents`** (seeded from the sheet); `CatalogItem` gained it
as an **APP-AUTHORED** field (like `image`; the frozen envelope names no senior figure);
`catalog-store.ts` threads it through both readers + both write projections with
`optionalSeniorPrice`; `catalog-admin.ts` validates it (positive, integer, **below regular**, blank =
none); the admin form has a **Senior-citizen price** control; and **every consumer reads the catalogue**
— card, PDP, `/products` "from ₱X", the builder estimate, the listing's filters, the request message.

Proven: PATCH `/api/catalog/items/CSK-LUMINA` as admin → `/products` shows the **new regular AND new
senior**, the old ones gone; revert restores.

---

## 3 · TODO — Phases 4–7

Order is by business cost. Each phase: measured before/after, full gate green, its own
`docs/08-delivery/phaseN-design/README.md`.

### Phase 4 — one meaning for "overdue"
The dashboard reads **"Overdue accounts 2"** (status-based, `lib/api-client/reporting.ts:167`) beside
**"6 overdue"** (date-derived, `lib/payment-alerts.ts:96-97`) — two definitions of the same word on one
screen, and `tests/fixture-contract/reporting.test.ts:55-57` pins only one, so it can never catch it.
1. Reconcile the two counts; make `/staff/billing` use the same definition.
2. `payment-alert-band.tsx:32` `MAX_ROWS = 5` with `[...overdue, ...due_soon]` concatenated first — so
   with 5+ overdue the **due-soon rows are counted but never shown**. Fix the cap.
3. A **read-only invoice view**: today the band's link needs `billing:write`, so a reader cannot open
   the payment the alert names (minute #4: "provide access to relevant payment details").
4. Dead weight: `PaymentAlert.due_on` computed but never printed; `overdue_cents` / `due_soon_cents` /
   `NO_PAYMENT_ALERTS` / `PAYMENT_ALERT_STATES` have no app consumer; `nextPaymentDue()`
   (`lib/payment-schedule.ts:175`) has no page consumer.

### Phase 5 — a lot's monthly must reconcile with its own total
Prime Lots: monthly **₱1,920** · annual ₱21,333 · selling **₱128,000** — but 1,920 × 72 = **₱138,240**.
The card prints all three **side by side** (`components/villa/monthly-price.tsx:29-40`).
Cause: `checkLotCategories` (`lib/pricing-model.ts:379-398`) validates senior ≤ regular, whole pesos and
`annual × 6 ≈ selling` within ₱3 but **never ties the monthly column to the annual/selling**, while the
*plan* checker does enforce `annual = monthly × 12` (`:339-354`).
1. Add the missing lot rule, re-derive the seeded Prime Lots row.
2. `/lots` filters and sorts on the recorded **total** (`lib/lot-listing.ts:217-219,296-300,310-315`)
   while the card headlines the **monthly** (`:328-336`) — "price: low to high" orders a figure nobody
   sees. Make them agree.

### Phase 6 — the genuinely unfinished minute items
1. **Burial + light-pickup write path.** Minute #2 says "record and manage". A real month grid exists
   (`app/(staff)/staff/schedule/burial-calendar.tsx`), and `light_pickup` is a typed nested field on the
   burial (`lib/burial-calendar.ts:65-86`) — but there is **no write path at all** (no burials route),
   and the pickup's `scheduled → in_progress → done` state has **no transition surface**. Prep staff also
   never see it: `/staff/cases/[id]/preparation` has zero burial/pickup references.
2. **2-day payment notice trigger.** `PAYMENT_DUE_SOON_DAYS = 2` (`lib/payment-schedule.ts:34`) is real
   and single-sourced, and the family portal shows the notice — but there is **no scheduler, cron or
   sender anywhere** (`lib/payment-reminder-channels.ts:45` adapters `[]`). Nothing is ever *sent*.
   Either build the trigger or record that in-portal-only is the agreed scope.
3. **One brand constant.** "Villa Funeraria" exists in 3 places (fixture, `lib/seo.ts:37`, fallback)
   plus a separate hardcoded "Villa Memorial" in `app/(staff)/staff/layout.tsx:27` and
   `components/portal-frame.tsx:149,269`, and `app/(public)/layout.tsx:12`'s fallback title.
   **No test pins the header wordmark** (`tests/fixture-contract/landing.test.ts:41` only asserts
   non-empty), so a regression slips through.

### Phase 7 — dead weight
1. **Migrate the 11 older stores to `lib/api-client/journal.ts`.** They each still carry their own ~65
   lines of identical mechanics — that duplication is *where the Phase 2 `globalThis` mistake survived
   unnoticed*.
2. Stale copy: `/staff/landing/page.tsx:90-91` claims the newest post "leads the home page's blog band"
   (that band was removed 2026-09-27); `/facilities` metadata + hero still promise "2026 per-day rates"
   it no longer prints; `docs/08-delivery/next-session-plan.md:133,171` marks the branding item "in
   flight"; `/price-list` renders the same logo row twice (`app/(public)/price-list/page.tsx:92-103`).
3. `app/(public)/AGENTS.md` still describes the deleted `lib/demo-inquiry-captures.ts` in two places
   (the "Public Reach us forms" section) — **this doc was NOT updated in Phase 1 and is now wrong.**

### Blocked on a captain/platform decision (do not just do these)
- **`item_type` for caskets.** It is a **frozen contract enum** (`order-payment-api-v1.md:42`,
  `order-fulfilled-event.md:40` = `package | service | add_on`), so the 24 caskets are filed as
  **"Add-on"**. Phase 3 made this *honest* (one explanatory line on the catalog screen) instead of
  silently changing a frozen value. A first-class product type is a contract ask.
- **A casket created via `/staff/catalog/new` cannot appear on `/products`** — same root cause
  (`buildCasketListing` iterates the client's 24-model sheet). Same conversation.
- **Service amounts still published** on `/builder` (`components/builder/builder-estimate.tsx:48-49,84-88`)
  and on `/plans/[sku]` for a service SKU (`app/(public)/plans/[sku]/page.tsx:449-464`), though minute #5
  says remove them. Those are two surfaces the minute does not name.
- **`GET /api/content/pages` requires `catalog:write`**, not `catalog:read`, so a read-only session
  cannot load the documents. Consistent with the screen, but it is a scope-gate decision.

---

## 4 · Hard-won gotchas — read before you touch anything

1. **NEVER round-trip source text through PowerShell.** `Get-Content -Raw` + `Set-Content -Encoding UTF8`
   double-encoded `styles/components.css` and destroyed 242 em dashes; the `git checkout HEAD` that fixed
   the encoding then **discarded ~865 lines of uncommitted CSS**, and the compiled-CSS recovery source
   was overwritten by later builds before everything could be mined. Full account:
   `docs/08-delivery/services-redesign/README.md` §8.
   **Use the `edit` tool, or Node `fs` with an explicit `"utf8"`.**
2. **Never build while a server is live.** They share `.next`. It produced a phantom audit of
   *99 horizontal-overflow captures, 30 sub-12px and 24 flat-ground contrast failures* — all artifacts.
   Clean re-run: 0, 0, 0.
3. **Adding a durable store means adding its env var to `tests/setup.ts`**, or the dev `.data/` store
   leaks into tests. Missed in Phase 1; `tests/fixture-contract/crm.test.ts` caught it with
   `expected 4 to be 3`.
4. **To free port 4000, use `netstat -ano | findstr LISTENING | findstr :4000`** — `Get-NetTCPConnection`
   returns false negatives here, and a **stale server serves a stale build** (that cost an hour).
   Never kill all `node`.
5. **PowerShell's `Get-Content` mangles non-ASCII on display** — mojibake you see in console output is
   usually the console, not the file. Verify with Node's `fs`, which is reliable.
6. **`.mjs` audit scripts carry no TypeScript** — a stray `as {...}` is a syntax error.
7. `app/api/catalog/items/[idOrSku]/route.ts` — PowerShell treats `[idOrSku]` as a wildcard; use
   `-LiteralPath`.
8. **`GET /api/catalog/items/:sku` returns `{ item: AdminCatalogItem }`** and the record is at
   `.item.item` (nested twice). Guessing this wrong made a proof read `undefined`.
9. **Casket prices render via `php()`, which has NO decimals** (`₱33,000`), while the catalogue's
   `display_price` is `₱33,000.00`. Matching the wrong one made a passing feature look broken.
10. The **catalogue surfaces read the store**, so if a proof edits a price you must **revert it** —
    and `.data/*.json` is gitignored, so clean it before handing the laptop over.

---

## 5 · Verification tools (all in `scripts/design-audit/`, tracked)

```bash
node scripts/design-audit/audit.mjs              # 208 routes x 2 viewports. NEEDS a server on :4000.
node scripts/design-audit/phase1-e2e.mjs         # family submits /quote -> staff board reads it
node scripts/design-audit/phase2-restart-proof.mjs save              # writes an edit, prints a stamp
#   ...kill :4000, start a fresh server, then:
node scripts/design-audit/phase2-restart-proof.mjs verify --stamp "<the stamp>"
node scripts/design-audit/phase3-price-proof.mjs # admin PATCH -> /products shows it -> reverts
node scripts/design-audit/check-sv-classes.mjs   # the 56 dead .sv-* classes (Phase 7 material)
node scripts/design-audit/find-mojibake.mjs      # scans the tree for encoding damage
node scripts/design-audit/find-overflow.mjs      # the element wider than its viewport
node scripts/design-audit/measure-services.mjs   # per-band width/height on /services
```

They live in **`scripts/design-audit/`** deliberately: `.design-audit/` is **gitignored** (it holds
captured screenshots, `report.json`, logs and the ~50 one-off fix scripts already applied to the tree),
so anything left there does **not** travel with a `git push`.

**Audit status: Phase 3's audit run was interrupted twice and has NOT completed.** Re-run it on the new
laptop (§0) before claiming the phase closed — the other evidence (tests, build, smoke, the price proof)
is already green.

---

## 6 · State at transfer

| | |
|---|---|
| `lint` / `typecheck` | clean |
| `npm test` | **232 files, 2,689 tests passing** |
| `npm run build` / `smoke` | clean · **61 of 61 routes** |
| Design audit | **interrupted — must re-run** |
| `.data/` | cleaned (no store files) |
| Git | everything uncommitted; the tree IS the work |

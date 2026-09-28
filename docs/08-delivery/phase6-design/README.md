# Phase 6 — branding consistency, the 2-day notice decision (and what is deferred)

**Brief:** the audit (`../client-minutes-audit-2026-09-21/README.md` §3) accepted the exact branding
ask as DONE but flagged "ensure consistency": three copies of **Villa Funeraria** beside a separately
hardcoded **Villa Memorial** in the staff eyebrow, the portal frames and the `(public)` fallback
title, and no test pinning the header wordmark. Requirement 1's trigger (a 2-day payment notice that
is actually *sent*) was also still open.

**Date:** 2026-09-28.

## 1 · One brand constant — done

- **`lib/brand.ts`** is the one home: `BRAND_NAME = "Villa Funeraria"`, `PARK_NAME =
  "Villa Memorial Park"` (the place, deliberately distinct), `brandTitle()`.
- `lib/seo.ts` `SITE_NAME` now reads `BRAND_NAME`.
- The four surfaces the audit named read the constant: `app/(public)/layout.tsx` fallback title,
  `app/(staff)/staff/layout.tsx` eyebrow, both `components/portal-frame.tsx` brand blocks.
- The three other company-brand usages found while sweeping read it too: the register card eyebrow,
  the agent and family signed-out bars, and the two form consent lines.
- **Every `— Villa Memorial` page-title suffix** (63 files) moved to `— Villa Funeraria`; "Villa
  Memorial **Park**" (place) and "Villa Memorial **Plan**" (product) are untouched.
- **`tests/unit/brand-consistency.test.ts`** pins it: SEO name = the constant, a page-title suffix
  that regresses to the old company name fails, and the four surfaces reference `BRAND_NAME`.
  `tests/fixture-contract/landing.test.ts` now asserts the header **wordmark** equals `BRAND_NAME`
  (it previously only checked non-empty — the gap the audit named).

## 2 · The 2-day payment notice — decision recorded, not faked

The rule (`PAYMENT_DUE_SOON_DAYS = 2`) and the family portal's notice are real and single-sourced;
there is no scheduler and no external channel wired (`lib/payment-reminder-channels.ts` adapters =
`[]`, only `in_app`). The minute's wording is conditional ("where supported, **may** be delivered
through other configured notification channels"). Rather than invent a client agreement, this is
recorded as **Track E** in `docs/07-client-villa/open-questions.md`: confirm whether an email/SMS
reminder is required (which waits on the platform's P4 service) or whether the in-portal notice
satisfies item 1. Until answered, no surface claims a reminder "will be sent".

## 3 · The burial / light-pickup write path (requirement 2) — done

The audit's requirement-2 finding: a real month grid and a typed `light_pickup` field existed, but
there was **no write path** (no burials route) and the pickup's `scheduled → in_progress → done`
lifecycle had no transition surface. The missing verb is now built:

| Piece | Home |
|---|---|
| Durable store (seed + append-only journal on the shared `lib/api-client/journal.ts` mechanics; `BURIALS_STORE_PATH` or `.data/scheduling-burials.json`) | `lib/api-client/burials-store.ts` |
| One rules home (draft + pickup validation, the lifecycle steps) shared by the form, the route and the store | `lib/burial-admin.ts` |
| BFF writes — `POST /api/schedule/burials`, `PATCH /api/schedule/burials/:id/pickup`, both `scheduling:write` | `app/api/schedule/burials/**` |
| The screen's controls (record a burial; set/move each pickup) | `app/(staff)/staff/schedule/burial-admin.tsx`, wired into `burial-calendar.tsx` |
| Tolerant readers, moved to one home so the store and the reader share them without a cycle | `lib/burial-records.ts` (re-exported by `burial-schedule.ts`) |

**Honest states kept:** live mode (`SCHEDULING_BASE_URL`) answers the named 503 on both reads and
writes; a read-only session sees the calendar but no controls and a "Read-only for this session"
line; a refusal changes nothing (no optimistic row); a duplicate case burial is refused; a first
pickup needs a time and crew. The store's journal is redirected in `tests/setup.ts`
(`BURIALS_STORE_PATH`) so a dev `.data/` store can never leak into a suite.

**Evidence:** `tests/unit/burial-admin.test.ts` (rules + lifecycle), `tests/unit/burials-store.test.ts`
(durability, refusals, corrupt-journal 500, live 503), `tests/unit/burials-route.test.ts`
(401/403/422/201, persistence), `tests/unit/burial-calendar-page.test.tsx` (writer sees the controls,
reader does not).

**Added 2026-09-28 (this PR):** editing and removing a recorded burial. A burial's own
fields are editable (`PATCH /api/schedule/burials/:id`, `parseBurialUpdate`) and a
mis-recorded burial can be taken off the sheet (`DELETE /api/schedule/burials/:id`); the
store is append-only, so the journal keeps `burial_updated` / `burial_removed` as the audit
trail. The screen gains an "Edit or remove" panel per burial. Editing keeps the light pickup
untouched (it has its own route) and re-checks the one cross-row rule a create does — a case
carries one burial. Evidence: `tests/unit/{burial-admin,burials-store,burials-route}.test.*`.

**Deferred (unchanged):** the eleven older stores still carry their own journal mechanics — the
Phase 7 migration.

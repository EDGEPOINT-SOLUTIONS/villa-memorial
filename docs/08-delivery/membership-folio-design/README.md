# Membership application folio — implementation record (F-18 / FORMS_PLAN gap 4, 2026-09-18)

**Routes:** `/staff/plans/membership` (register + terms) · `/staff/plans/membership/new` (the
folio) · `/staff/plans/membership/[id]` (one recorded application + its paper).
**Brief:** checklist F-18 — *"Build the Villa Memorial Plan membership application folio — the
enrolment of a plan holder and the people they are protecting"* — the last of the three forms
gaps (`FORMS_PLAN.md` gap 4).

**The scope note that shapes this screen, verbatim:** *the capture folio is ours; the terms copy
is ours as a display; field-level paper authority is not.* The signed membership/COC paper is not
archived in this project (`docs/07-client-villa/paper-forms/` holds the service contract and the
two lot-purchase papers only), and that folder's rule is “the paper wins”. So this folio
**captures the plan's known shape, reproduces no document it has never seen, and is flagged
provisional** — exactly as the provisional receipt flow is.

## What the screens do

1. **The register** (`/staff/plans/membership`) — the recorded folios (recorded seed + durable
   store, newest applied first) with the plan's **published terms display** below, so the office
   can show a family what the plan covers and what it costs while they decide, then open a new
   folio. The page leads with the honest line and the scope note.
2. **The folio** (`/staff/plans/membership/new`) — the plan's own enrolment shape in numbered
   capture sections: **01 The plan holder** (name, date of birth with the age it yields, contact,
   address, application date) · **02 Who the plan protects** (unlimited beneficiary rows from the
   client's own relationship list) · **03 Plan & payment** (the five tiers, the four payment
   modes, the branch as the office writes it, the two published rate classes, and the rate
   read from the office's current rate card) · **04 Declarations** (the good-health declaration
   and the data-privacy consent the paper carries). An at-a-glance band answers *who is being
   enrolled and which plan* before anything else; a live document rail previews the paper and
   shows readiness. Print / Word / PDF come from the shared paper kit.
3. **One recorded application** (`/staff/plans/membership/[id]`) — the folio at a glance (holder,
   who it protects, plan & rate, declarations) and the **application paper** rendered from the
   recorded values, with the same Print / Word / PDF actions.

## Where every fact comes from (nothing is authored in the view)

| Fact | Source |
|---|---|
| Plan tiers, payment modes, rates, contract price rules | `lib/api-client/pricing.ts::loadPricingDocument()` handed down by the server page; the folio reads every figure through `planRateOf` (`lib/pricing-model.ts`) — never typed |
| Plan inclusions, eligibility, cash assistance, underwriter/serving notes, senior terms | `lib/villa-pricing.ts` (`VMP_INCLUSIONS`, `VMP_ELIGIBILITY`, `SENIOR_TERMS`, `CASH_ASSISTANCE`, `VMP_NOTES`) — the same constants the public plans pages publish |
| Relationship list | `MEMBERSHIP_RELATIONSHIPS` in `lib/contracts/membership-application.ts`, taken from `current-state-forms.md` §5: legal spouse · children of legal age · parents · siblings |
| Coverage line | `MEMBERSHIP_COVERAGE` — “Memorial services within Eternal Plans, Inc.'s network of accredited mortuaries” |
| Recorded rates on the seed | `tests/fixture-contract/membership.test.ts` pins each row's `rate_cents` to `planRateOf(SEED_PRICING.plans, …)`; a save reads the **current** document |
| Application paper | `lib/contracts/membership-paper.ts` → the shared `PaperBlock` kit (`components/paper/paper-sheet.tsx`, `lib/export/docx.ts`, `lib/export/pdf.ts`) — the same kit the service contract and lot purchase application use |

## Honest states (compressed, said out loud)

- **It is an application, never a certificate.** `APPLICATION_NOT_A_COC_NOTE`: *“This is an
  application, not a certificate of coverage — the office issues the real membership document
  (the COC).”* It prints on the register, the folio's glance band, the folio alert, the recorded
  page, and **on the paper's own face**. No COC number, no coverage start/end dates and no clause
  text exist anywhere in the app.
- **The shape is unfrozen.** No contract under `docs/08-delivery/contracts/` names a membership /
  COC record; the underwriter is a pre-need partner (Eternal Plans, Inc.). The record is
  fixture-mode only; live mode (`COMMERCE_BASE_URL`) answers **503 `MEMBERSHIP_ADMIN_NOT_WIRED`**
  instead of inventing a partner integration. Read/write routes: `POST /api/memberships/applications`.
- **The scope is provisional and named.** `rbac-scopes-v1` has no membership/plan-holder code, so
  the register and the folio reuse `catalog:write` — the scope the Commerce plan screens already
  use — and say so on screen. No token outside the frozen vocabulary is invented
  (`tests/unit/staff-scope-vocabulary.test.ts` stays green).
- **The paper's own wording is not reproduced.** The signed paper's health questionnaire and
  data-privacy clause are not archived in this project; the folio records the declaration the
  plan's published eligibility states and says plainly that the office's signed paper governs
  (`HEALTH_DECLARATION_WAITS`, `DPA_CONSENT_WAITS`, `PAPER_AUTHORITY_NOTE`).
- **Branch stays free text.** The park's branch structure is an open client question
  (`docs/07-client-villa/open-questions.md`), so no branch list is invented.

## Store, rules and tests

- **Durable store:** `lib/api-client/membership-store.ts` — recorded seed
  `lib/fixtures/commerce/membership-applications.json` + append-only journal
  (`MEMBERSHIP_STORE_PATH` or `.data/commerce-membership-applications.json`, gitignored; atomic
  writer, one in-process write chain, `version: 1`, `application_recorded` events). Records carry
  the rate exactly as read when saved, so a later rate-card edit never rewrites a recorded folio.
- **One rules home:** `lib/contracts/membership-application.ts` — normalisation, structural
  validation (`membershipApplicationIssues`, the same function the page's readiness gate runs),
  the relationship vocabulary and the honest-state copy.
- **Tests:** `tests/unit/membership-application.test.ts` · `tests/unit/membership-admin-rbac.test.tsx`
  · `tests/fixture-contract/membership.test.ts`. `tests/setup.ts` points the store at a throwaway
  temp file like every other durable store.
- **Nav:** the entry lives under Commerce (“Memberships”, `catalog:write` provisionally). The
  sidebar's current-page rule is now the **longest matching href** (`activeNavHref` in
  `lib/rbac/nav.ts`) so a nested route lights only its own entry.

## Evidence (2026-09-18, production build, fixture mode)

`shots/` — 1440 × 900 and 390 × 844 captures (full-page variant included where the page is
longer than the viewport):

| Screen | 1440 | 390 |
|---|---|---|
| Register + published terms | `membership-register-1440.png` | `membership-register-390.png` |
| The folio (at-a-glance band first) | `membership-folio-1440.png` / `-1440-full.jpeg` | `membership-folio-390.png` (scrolled to the glance band) |
| Recorded application + application paper | `membership-paper-1440.png` / `-1440-full.jpeg` | `membership-paper-390.png`, `membership-paper-sheet-390.png` / `-390-full.jpeg` |
| Folio's live paper preview | `membership-folio-paper-preview-1440.png` | `membership-folio-paper-preview-390.png` |

At 390 the staff shell stacks (the app's existing shell behaviour), so the viewport shots of the
folio and the paper are scrolled to the content they evidence. No horizontal overflow at 390 on
any of the three screens; no console messages; the end-to-end UI flow (fill → preview → Record
application) redirected to the newly recorded folio.

## Open contract ask (recorded, not hidden)

A membership/COC record contract (the pre-need partner domain) is needed before live mode can
record applications, issue a certificate number, or carry coverage dates. Until it lands: no
partner integration, no COC issuance, no underwriting — the office issues the real document from
its own paper, and this screen records the enrolment the paper needs.

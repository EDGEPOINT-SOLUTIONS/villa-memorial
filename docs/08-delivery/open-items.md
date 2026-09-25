# Open items — what is waiting on whom

**Last updated:** 2026-09-19 · **Source:** the [PRD alignment audit](./prd-alignment-audit.md)
([readable artifact](./prd-alignment-audit/prd-alignment-audit.html)).

This is the standing short list after the audit: four items, plus one platform contract ask the
PDP media pass raised ([§5](#5-platform-ask--the-media-upload-object-store-c12)). **Items 1, 2
and 4 are closed** — item 1 by the captain's 2026-09-18 decision, items 2 and 4 by the front
end's completion (the delivered record is [front-end complete](./frontend-complete.md)). **Item
3 is the open list:** the five answers only Villa can give. Each item says what it is, why it
matters, the options (or the decision/outcome), the reason and who can act. It is a signpost,
not a report — every claim links to the document that owns it.

**Contents**

1. [PRD drift policy — decided](#1-prd-drift-policy)
2. [Which gap to build next — closed](#2-which-gap-to-build-next)
3. [Client questions for Villa — OPEN](#3-client-questions-for-villa)
4. [The queued final commerce phase — closed](#4-the-queued-final-commerce-phase)

---

## 1. PRD drift policy

**Status: decided — 2026-09-18 (option B); unchanged since.** The record is
[`villa-extensions.md`](./villa-extensions.md); the upstream PRD is deliberately not modified.
The text below is kept as the record of the decision.

**What it is.** The build carries things the IN MEMORIAM PRD does not name. The audit tracks 13
of them in its [“beyond the PRD” table](./prd-alignment-audit.md#5-beyond-the-prd--the-villa-extensions-13):
the walk-in 3D park, the family and agent portals' house style, the four admin stores (pricing,
catalog, orders, chapel), the sky-blue brand, the public navigation redesign, the landing-page
content model with its hero and device-upload editors, paper exports, the portal switcher and
demo tooling.

**Why it matters.** The PRD is silent on surfaces the product actually ships, and our own villa
docs are the only place they are recorded. That is the exact shape of the `hr:read` incident — an
invented scope went live and sat in no contract for four days. Left alone, a future reader treats
the PRD as complete and either rebuilds or contradicts work that was approved deliberately.

**The options.**

- **A. Backport a short section into the PRD.** The PRD gains a villa section naming the 3D park,
  the portals, the admin stores, the palette and the navigation. This is a change inside the
  `in-memoriam` repository, so it needs the captain's explicit permission for that repo.
- **B. Record them as a tenant-specific extension layer.** The PRD already names the concept:
  `saas-strategy.md` defines the EXTENSIONS boundary — “genuinely unusual … built in extension
  layer, never contaminating core” — and the `configuration-engine.md` guardrail says to “push
  true outliers to the extension layer.”

**The decision: B — the extension layer.** It needs no upstream change and leaves the PRD
untouched until the dev wants it. The list already exists, fully evidenced, as the audit's
deviation table (13 rows with approval and conflict flags), so the work was a pointer, not a
rewrite. If the dev later wants the PRD itself to name these surfaces, that same table is the
backport draft.

What the decision records:

- [`villa-extensions.md`](./villa-extensions.md) is the tenant extension-layer record. It points
  at the audit's [13-row table](./prd-alignment-audit.md#5-beyond-the-prd--the-villa-extensions-13)
  as the authoritative list, and states the reading rule: a surface named there is deliberate,
  captain-approved scope — check the table before treating the PRD as complete.
- **The upstream PRD is deliberately not modified.** Nothing changes in the `in-memoriam`
  repository.
- A backport into the PRD stays available later if the platform's developer wants it. That needs
  the captain's explicit permission for `in-memoriam` and is not part of this decision.

**Who can act.** Nothing further on this item — it is closed. The only possible follow-up is the
captain granting permission for a future `in-memoriam` backport.

Relevant PRs: [#34 3D park](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/34) ·
[#32 agent portal](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/32) ·
[#35 family portal house style](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/35) ·
[#37 catalog admin](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/37) ·
[#38 pricing store](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/38) ·
[#44 navigation redesign](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/44).

## 2. Which gap to build next

**Status: closed — 2026-09-19. The recommendation was taken and then overtaken: the front end
completed.** The four family screens this item named were built first
([#48](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/48) — Requests ·
Appointments · My Lots · Memorials, each moved from the designed honest page to the office's own
record through one recorded fixture, `lib/fixtures/family/workspace.json`; the machine-readable
states are `lib/family/portal-coverage.ts`, pinned by `tests/unit/family-prd-coverage.test.ts`),
and every other screen the audit listed as not built followed (F-01 · F-02 · F-03 · F-04 · F-05 ·
F-09 · F-10 · F-11 · F-12, the operations board, the staff lead record). The delivered list and
every PR are in the [front-end completion record](./frontend-complete.md).

**What remains is not a build slot.** Every screen the PRD names for this repo's four surfaces is
built to a designed state; what the still-partial screens wait on is the platform's contract list
(the audit's [§7.2 table](./prd-alignment-audit.md#72-platform--dev-contract--blocked-or-503-until-a-contract-freezes)
plus the asks the post-audit screens raised) or Villa's answers ([item 3](#3-client-questions-for-villa)).
The one PRD surface this repo does not build is the platform's own administration (tenant
management, platform login, sign-up) — the platform track's. There is no next front-end build
slot to decide.

*As written 2026-09-17 (the record of why these four were chosen):* the audit showed 34 of the
PRD's 79 screens built, 25 honest placeholders and 20 not built
([audit §3](./prd-alignment-audit.md#3-counts)); this item recommended the four family-facing
screens still honest — Requests & tickets, Appointments, My Lots and Memorials — because they are
what families touch most after the funeral and they did not wait on the platform's write APIs.
Each could be built against recorded fixtures, the same fixtures-first way the rest of the
portals were built.

**Who can act.** Nobody on this item — it is closed. The screens' contracts and the client's
answers are followed in [item 3](#3-client-questions-for-villa) and the
[completion record](./frontend-complete.md#what-remains--with-its-owner).

## 3. Client questions for Villa

**Status: OPEN.** These are the five answers only Villa can give. Each one blocks something
specific, and the build currently publishes each honestly rather than inventing an answer. They
are the client-owned half of what remains after the front end completed; the platform-owned half
is the contract list in the [completion record](./frontend-complete.md#what-remains--with-its-owner).
The build states below were re-checked on 2026-09-19.

| # | Question | What is blocked without it | How the build stands today |
|---|---|---|---|
| 1 | **The park's real chapel list and count** | The staff chapel settings and the customer booking dialog | Two PLACEHOLDER chapels (A/B) map the seed; every customer booking says the list is provisional |
| 2 | **Commission rates and targets** | The rate-derived figures on `/staff/commission` (F-12) and the agent portal's sales page | Both screens are built ([#58](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/58)); every figure is blank + “Not configured” (`₱—`) and the engine state is `configured:false` by design — no rate, target or computed figure is invented |
| 3 | **Which senior-rate figure is right** | The chapel table on `/services` and the 2026 price list | Both published as printed: the computed column (₱1,440 / ₱3,360 per day) against the sheet's own footnote (₱1,800 / ₱4,200), per the captain's Q8; `/facilities` reads the same rate (pinned equal by test) |
| 4 | **Lot A-001's real price** | The lot pages, the 2026 price list and the purchase application | The office's per-plot quotation (₱85,000 for a 3.5 sqm lot) matches no sheet row — the sheet prices lots by family only (₱75,000 / ₱114,000 / ₱128,000 at 2.5 sqm; ₱567,000 @ 12 sqm; ₱1,073,000 @ 24 sqm). Since 2026-09-18 the demo lots publish their section's family figure (`lib/catalog-sources.ts`), so no invented per-plot price is on screen — the office's plot prices stay the question |
| 5 | **Which 2025 / 2026 rules stand** (refunds and cancellation, lot classifications) | The purchase-agreement templates and the contract lifecycle | The app captures each revision's own fields rather than reconciling — the 2026 no-refund transfer window and the changed lot-class list are kept as separate revisions |

For #3 and #4 the two conflicts live as read-only metadata in the pricing store
(`lib/fixtures/commerce/pricing.json` → `questions`), outside the editable document, so an editor
save can never silently drop or “fix” one. The full question list is
[`docs/07-client-villa/open-questions.md`](../07-client-villa/open-questions.md); the audit's
[deviation 6](./prd-alignment-audit.md#6-known-deviations--reason-and-consequence) records each
conflict and its current treatment.

**Who can act.** These go to Villa (JBR owns the product decisions). Our side should carry them
as one ask — the captain can hand this table over as-is. Nothing in this repo can close them.

## 4. The queued final commerce phase

**Status: closed — 2026-09-19. Both halves are settled, and neither is a queued front-end build
phase.**

- **Store & content — resolved (captain, 2026-09-18; audit G5).** There is ONE content editor,
  [`/staff/landing`](./notes/demo-web-route-coverage.md); `/staff/store` is a redirect to it and
  its duplicate navigation entry is gone. Storefront commerce settings live on the real admin
  screens (`/staff/catalog`, `/staff/pricing`, `/staff/plans`). Carried in
  [#47](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/47).
- **Inventory — not a front-end phase.** `/staff/inventory` stays the designed honest state: it
  names its blocker (the catalog-management / stock contract). What it waits on is a platform
  contract — the audit's [§7.2 row “catalog write + pricing read/write APIs”](./prd-alignment-audit.md#72-platform--dev-contract--blocked-or-503-until-a-contract-freezes)
  — so it belongs to the platform list, not to a captain “go” for another commerce build.

*As written 2026-09-17 (the record):* Inventory and Store & content were the two staff commerce
screens still showing the honest not-wired state, and the item proposed one more fixture-store
phase for them, awaiting the captain's word to start. The word arrived on 2026-09-18 for the
content half, and the completion settled the rest.

**Who can act.** Nobody on this item — it is closed. Inventory's live half is with the platform
(see [front-end complete](./frontend-complete.md#what-remains--with-its-owner)).

## 5. Platform ask — the media upload object store (C12)

**Status: OPEN — platform-owned.** P4 of the editable-PDP plan hardened the editors' photo
storage: an editor's device upload is downscaled in the browser and written by the app-authored
`POST /api/content/media` under `MEDIA_UPLOAD_DIR` (default `.data/media-uploads`), and the
content document stores the short `/api/media/<id>.<ext>` path rather than a base64 data URL
(`lib/media-upload.ts` · `lib/media-url.ts`; evidence in the PR). That interim store is the
honest demo home, not the platform's object store.

**What the platform owns.** The frozen `documents-api-v1` names `POST /api/v1/documents` upload
as **Deferred** (no object store), and the post-audit contract list records it as **C12** —
document upload / object store / versioning / e-signature
(`data/villa-platform-contracts-plan/report.md` C12; `docs/08-delivery/contracts/documents-api-v1.md`).
The staff documents screen keeps its upload button disabled for the same reason.

**How the seam is built for it.** The document field is the route path, unchanged by the swap:
when C12 freezes, only `lib/media-upload.ts`'s backing store changes to S3/CDN, and
`MEDIA_PUBLIC_BASE_URL` is the optional prefix for a separate media origin. No public URL, no
saved document and no editor flow has to change — a no-op migration. The build never claims the
object store exists: the route writes local files and names that plainly.

**Who can act.** The platform (freeze the C12 upload/object-store contract). Nothing in this
repo can close it; the local store stays until the contract lands.

---

*Raised 2026-09-17 from the audit review; updated 2026-09-19 — items 2 and 4 closed, item 1 kept
as the decision record, item 3 the open list. The audit and the linked documents remain the
authoritative record.*

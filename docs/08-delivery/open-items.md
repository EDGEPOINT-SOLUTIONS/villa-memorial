# Open items — what is waiting on whom

**Last updated:** 2026-09-18 · **Source:** the [PRD alignment audit](./prd-alignment-audit.md)
([readable artifact](./prd-alignment-audit/prd-alignment-audit.html)).

This is the standing short list after the audit: four items. Item 1 is **decided** — the captain
chose the extension layer on 2026-09-18 — and is kept as the record of that decision; items 2–4
are still open. Each item says what it is, why it matters, the options (or the decision), the
reason and who can act. It is a signpost, not a report — every claim links to the document that
owns it.

**Contents**

1. [PRD drift policy — decided](#1-prd-drift-policy)
2. [Which gap to build next](#2-which-gap-to-build-next)
3. [Client questions for Villa](#3-client-questions-for-villa)
4. [The queued final commerce phase](#4-the-queued-final-commerce-phase)

---

## 1. PRD drift policy

**Status: decided — 2026-09-18 (option B).** The record is
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

**What it is.** Of the PRD's 79 screens, 34 are built, 25 are honest placeholders and 20 are not
built ([audit §3](./prd-alignment-audit.md#3-counts)). The next build slot should go to the four
family-facing screens still honest: **Requests & tickets** (`/client/requests`), **Appointments**
(`/client/appointments`), **My Lots** (`/client/property`) and **Memorials**
(`/client/memorials`).

**Why these four.** They are what families touch most after the funeral, and they do not wait on
the platform's write APIs — each can be built against recorded fixtures today, the same
fixtures-first way the rest of the portals were built. The alternatives are platform-blocked
(the operations board, the commission engine, the Smart Service Builder) or admin work with no
family on the other end.

**What would make them real.** The screens can ship on fixtures now; these are the platform
contracts that turn each one live:

| Screen | Contract that makes it real | PRD owner |
|---|---|---|
| Requests & tickets | a crm-families service-desk / ticket contract | [`04-modules/crm-cases.md`](https://github.com/EDGEPOINT-SOLUTIONS/in-memoriam/blob/main/docs/04-modules/crm-cases.md) |
| Appointments | a family-facing scheduling contract | [`04-modules/facilities-scheduling.md`](https://github.com/EDGEPOINT-SOLUTIONS/in-memoriam/blob/main/docs/04-modules/facilities-scheduling.md) |
| My Lots | a family-facing lot/ownership projection (property read + the sale application record) | [`04-modules/memorial-property-gis.md`](https://github.com/EDGEPOINT-SOLUTIONS/in-memoriam/blob/main/docs/04-modules/memorial-property-gis.md) |
| Memorials | the digital-memorial service (content, moderation, visibility) | [`06-cultural-digital-memorial/digital-memorial.md`](https://github.com/EDGEPOINT-SOLUTIONS/in-memoriam/blob/main/docs/06-cultural-digital-memorial/digital-memorial.md) |

Cross-cutting: a family API contract and a family role/portal claim in the frozen identity
contracts. Today the family session is inferred from scopes (`lib/auth/destination.ts`) rather
than being a role — the audit carries that as deviation 3. The family portal's own coverage table
([`lib/family/portal-coverage.ts`](../../lib/family/portal-coverage.ts), pinned by tests) records
each screen's state and what is missing.

**Recommendation: build the four on fixtures now.** The design language is already approved
([family portal design](./family-portal-design/README.md)), the honest states are in place, and
the work moves the largest user-facing gap with no dependency on anyone outside this repo.

**Who can act.** Our frontend track can start today. The dev freezes the contracts above when the
platform track reaches them.

## 3. Client questions for Villa

These are the five answers only Villa can give. Each one blocks something specific, and the build
currently publishes each honestly rather than inventing an answer.

| # | Question | What is blocked without it | How the build stands today |
|---|---|---|---|
| 1 | **The park's real chapel list and count** | The staff chapel settings and the customer booking dialog | Two PLACEHOLDER chapels (A/B) map the seed; every customer booking says the list is provisional |
| 2 | **Commission rates and targets** | The staff Commission screen (`/staff/commission`, F-12) and the agent portal's sales and commission figures | Every rate-derived amount is blank + “Not configured” (`₱—`) and the engine state is `configured:false` by design — no rate, target or computed figure is invented |
| 3 | **Which senior-rate figure is right** | The chapel table on `/services` and the 2026 price list | Both published as printed: the computed column (₱1,440 / ₱3,360 per day) against the sheet's own footnote (₱1,800 / ₱4,200), per the captain's Q8 |
| 4 | **Lot A-001's real price** | The lot pages, the 2026 price list and the purchase application | The office's per-plot quotation (₱85,000 for a 3.5 sqm lot) matches no sheet row — the sheet prices lots by family only (₱75,000 / ₱114,000 / ₱128,000 at 2.5 sqm; ₱567,000 @ 12 sqm; ₱1,073,000 @ 24 sqm). Since 2026-09-18 the demo lots publish their section's family figure (`lib/catalog-sources.ts`), so no invented per-plot price is on screen — the office's plot prices stay the question |
| 5 | **Which 2025 / 2026 rules stand** (refunds and cancellation, lot classifications) | The purchase-agreement templates and the contract lifecycle | The app captures each revision's own fields rather than reconciling — the 2026 no-refund transfer window and the changed lot-class list are kept as separate revisions |

For #3 and #4 the two conflicts live as read-only metadata in the pricing store
(`lib/fixtures/commerce/pricing.json` → `questions`), outside the editable document, so an editor
save can never silently drop or “fix” one. The full question list is
[`docs/07-client-villa/open-questions.md`](../07-client-villa/open-questions.md); the audit's
[deviation 6](./prd-alignment-audit.md#6-known-deviations--reason-and-consequence) records each
conflict and its current treatment.

**Who can act.** These go to Villa (JBR owns the product decisions). Our side should carry them
as one ask — the captain can hand this table over as-is.

## 4. The queued final commerce phase

**What it is.** Inventory and Store & content are the only staff commerce screens still showing
the honest not-wired state. The rest of the commerce track shipped: orders
([#25](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/25)), catalog
([#37](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/37)), plans and pricing
([#38](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/38)).

**What the phase would cover.**

- **Inventory** (`/staff/inventory`) — stock levels and movements for caskets, urns, flowers and
  supplies: SKU, supplier, cost/price, quantity, location, batch, reorder level,
  purchasing/receiving, allocation and reservation to orders
  ([PRD `facilities-scheduling.md` §31](https://github.com/EDGEPOINT-SOLUTIONS/in-memoriam/blob/main/docs/04-modules/facilities-scheduling.md)).
- **Store & content** (`/staff/store`) — the storefront content and settings surface beyond the
  landing-page editor. The audit's G5 notes the overlap between `/staff/store` and the real
  `/staff/landing` editor, so this phase would first draw the line between global store settings
  and the per-page editor.
- **The same shipping pattern** as the rest of the commerce track: real screens on durable
  fixture stores, with live mode staying honest (503) until platform write contracts exist — no
  fake writes.

**Status: queued — it waits on the captain's word to start.** Nothing is broken today; the two
screens render their designed honest states.

**Who can act.** The captain, by saying go.

---

*Raised 2026-09-17 from the audit review. Update or close an item here as it lands; the audit and
the linked documents remain the authoritative record.*

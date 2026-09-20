# Front end complete — the dated record

**Date:** 2026-09-19 · **Build recorded:** `villa-memorial` `main` at PR
[#73](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/73) (`713a0fc`).
**Before:** the [PRD alignment audit](./prd-alignment-audit.md) (2026-09-17) — its findings are
the "before" and are never rewritten. **Open list:** [open items](./open-items.md).

This is the page a future reader starts from to learn where the front end stands and what it is
waiting on. It records, it does not argue: every claim here is a repo document or a PR.

## What “complete” means here

Every PRD screen that belongs to this repo's four surfaces (public · staff · family · agent) is
built to a designed state: a real screen on a frozen contract or a durable fixture store, or the
designed honest state that names the contract it waits on. **Nothing fakes data**, and the honest
states are the deliverable (`AGENTS.md` rule 5). The per-route proof is
[`notes/demo-web-route-coverage.md`](./notes/demo-web-route-coverage.md).

Of the audit's **20 “not built” screens, 17 are built**. The three that remain are the
platform's own surface:

| Audit item | State |
|---|---|
| Platform administration (all 3: tenant management, platform login, sign-up) | The platform's own surface — not a screen this repo hosts. |

## What was delivered

### The audit's not-built screens, now built

| Audit items | Screen(s) | PR | Landed |
|---|---|---|---|
| P9 Smart Service Builder | `/builder` (estimate over the client's published figures) | [#66](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/66) | 2026-09-19 |
| P22 Immediate Assistance | `/immediate-assistance` (call-first) | [#54](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/54) | 2026-09-18 |
| P25 Facilities | `/facilities` (rooms, per-day rates, honest chapel-list gap) | [#55](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/55) | 2026-09-18 |
| P26 Virtual Tour · P27 Gallery | `/gallery` + the park's 3D walk-through entered from it (`/map` hosts it, never rebuilt) | [#62](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/62) | 2026-09-19 |
| P28 Digital Memorial Search · P29 Digital Memorial Page · P30 Find My Loved One | `/memorials` · `/memorials/[id]` · `/memorials/find` (nothing published by default) | [#65](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/65) | 2026-09-19 |
| S2 Operations Board | `/staff/ops` (stage lanes; the case screen's own writes) | [#72](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/72) | 2026-09-19 |
| S4 Lead Detail | `/staff/pipeline/[id]` (the office's view of one lead) | [#71](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/71) | 2026-09-19 |
| S11 Embalming/Preparation | `/staff/cases/[id]/preparation` (the mortuary record) | [#57](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/57) | 2026-09-18 |
| S16–S19 Ownership · Transfers · Interments · Exhumations | `/staff/property/[id]/ownership` · `…/transfers` · `…/interments` · `…/exhumations` | [#59](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/59) | 2026-09-18 |
| S25 Commission | `/staff/commission` (the engine's shape; every rate-derived figure blank) | [#58](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/58) | 2026-09-18 |
| S29 AI Copilot | `/staff/copilot` — the DESIGNED surface, which is the deliverable: four recorded questions answered by lookup over the case store, the tracker and the calendar, every finding carrying its record trail, and the governance boundary + not-connected state printed on the page. **No model is attached**; it waits on the platform's AI capabilities + governance wiring (audit §7.2) and the client's answer. | [#75](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/75) | 2026-09-19 |

### The rest of the completion push (PRs #43–#73)

| PR | What it did |
|---|---|
| [#43](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/43) | Fixed the four malformed staff scope gates (audit G1/G1b) + the scope-vocabulary regression test; refreshed the stale route-coverage note and README (G2/G3). |
| [#44](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/44) | The approved two-layer public navigation bar. |
| [#45](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/45) · [#46](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/46) | The open-items page and the extension-layer record (captain's option B). |
| [#47](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/47) | SEO surface (canonical/OG/sitemap/robots/JSON-LD), the editable FAQ region, one content editor (`/staff/store` → `/staff/landing`) — audit G4/G5/G7. |
| [#48](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/48) | The four record-backed family screens (Requests · Appointments · My Lots · Memorials). |
| [#49](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/49) | Reading budget: `/services` and `/plans` compressed to a glance. |
| [#50](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/50) | Staff schedule day board + the service's overlap flag. |
| [#51](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/51) | The client's own sample data: un-sourced catalogue items withdrawn, demo lots on their section's family figure, the real phone line seeded. |
| [#52](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/52) | Record a payment and print its official receipt (F-08). |
| [#53](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/53) | Task status and stage moves from the case screen (the ops board's writes). |
| [#56](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/56) | The agent lead record (F-09). |
| [#60](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/60) | Guarantee instruments tracked per case (F-18 gap 5). |
| [#61](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/61) | Typography: Alegreya + Source Sans 3, a seven-step ladder, four ink roles. |
| [#63](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/63) | The provisional receipt — the counter's paper and the OR that replaces it (F-18 gap 3). |
| [#64](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/64) | Villa Memorial Plan membership folio (F-18 gap 4). |
| [#67](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/67) · [#69](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/69) | The composition and visual craft passes. |
| [#68](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/68) | The journey's action/contact layer: one closing band, click-to-call, one contact surface (F-17). |
| [#70](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/70) | The accessibility & craft pass: one focus ring, real labels, honest headings (F-16). |
| [#73](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/73) | The paper layer: every printed document on the client's own sheet, in the client's own type. |
| #TBD | The last three admin screens (PRD S30 · S31/S32): `/staff/users` (the people and the recorded role↔scope model), `/staff/workflows` (the four processes the modules run, with their in-flight records) and `/staff/settings` (the configuration the product applies) — designed, read-only, each naming its missing service. See [`admin-platform-design/`](./admin-platform-design/). |

## What remains — with its owner

### The platform (the dev) — the contract list

The audit's [§7.2 table](./prd-alignment-audit.md#72-platform--dev-contract--blocked-or-503-until-a-contract-freezes)
is the authority for the **19 standing asks**: crm-families (read + write) · HR service ·
reporting-analytics · accounting screens API · catalog write + pricing read/write · order-admin
record/lifecycle · notification contract + scope · family API + family scopes · agent
workspace/commission contract · public-lots read path / scheduling family contract ·
sale-financing/application record · document upload/object store, versioning, e-signature ·
per-installment receipt event + payer on receipt · interment/exhumation/ownership/transfer
workflows · commission engine + client rates · AI capabilities + governance wiring · platform
administration · digital-memorial services · Smart Service Builder rules/availability engine.

The screens built after the audit raised **eight more of the same kind** — each names its ask in
its design record and refuses live mode honestly (a named 503 or a `not_wired` state):

| Ask | What waits on it |
|---|---|
| Provisional-receipt record/endpoint | `/staff/billing/provisional-receipts` live mode (`PROVISIONAL_RECEIPTS_NOT_WIRED`); the app-authored POST body/response. See [`provisional-receipt-design/`](./provisional-receipt-design/). |
| Membership application / COC record | `/staff/plans/membership` live mode (`MEMBERSHIP_ADMIN_NOT_WIRED`); the pre-need partner's number/coverage/clause fields. See [`membership-folio-design/`](./membership-folio-design/). |
| Embalming-preparation record | `/staff/cases/[id]/preparation` live mode (`PREPARATION_NOT_WIRED`); a funeral-cases extension for the mortuary record. See [`notes/known-limitations-cp1.md`](./notes/known-limitations-cp1.md) Module H. |
| Guarantee-instrument record | The FSC-deduction tracker's live mode; the sub-ledger is dev-owned (`FORMS_PLAN.md` gap 5, the dev's issue #54). See [`guarantee-instruments-design/`](./guarantee-instruments-design/). |
| Scheduling resource write + maintenance shape | Chapel settings/closures/confirmations live mode (`CHAPEL_ADMIN_NOT_WIRED`); a booking-events write endpoint. See [“Chapel administration — staff side”](../../AGENTS.md) in `AGENTS.md`. |
| User provisioning + role assignment | `/staff/users` is read-only over the recorded seed (`lib/api-client/access-control.ts`, always `false` live mode): identity-access publishes no user list, invite or role endpoint. See [`admin-platform-design/`](./admin-platform-design/). |
| Workflow engine | `/staff/workflows` renders the four processes the shipped modules already enforce; no service lets the office define steps, owners or order. The ask is the deferred config/workflow layer. See [`admin-platform-design/`](./admin-platform-design/). |
| tenancy-config (module flags / tenant settings) | `/staff/settings` reports the configuration the product applies and the platform-only remainder; the service that would own tenant settings and the A–J module registry is not in this build. See [`admin-platform-design/`](./admin-platform-design/). |

### Villa (JBR owns the decision) — the five answers

These are the client-owned half of what remains; their current treatment is recorded in
[open items §3](./open-items.md#3-client-questions-for-villa) and
[`07-client-villa/open-questions.md`](../07-client-villa/open-questions.md):

1. the park's real chapel list and count;
2. commission rules and rates (targets included);
3. which senior chapel-rate figure is right — the computed column or the sheet's own footnote;
4. Lot A-001's real price against the 2026 sheet's lot families;
5. which 2025 / 2026 rules stand (refunds and cancellation, lot classifications).

## Maintenance

When one of the remaining items lands, update it here with a dated row, in the route-coverage
note, and in [open items](./open-items.md) — and add the feature's design record beside the
others. The audit's findings stay as written; only its post-audit note and review record grow.

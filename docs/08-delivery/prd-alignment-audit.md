# Villa Memorial ↔ IN MEMORIAM PRD — alignment audit

**Date:** 2026-09-17 · **Audited:** `villa-memorial` at `f2ce5c7` (PRs #38 + #40 merged). This branch is based on `main` (`ab0a70f`, PR #41) and carries the audit document plus the interactive artifact — no production code changed.
**PRD:** the canonical IN MEMORIAM docs in the `in-memoriam` repo (`docs/`). Every `PRD reference` in this document is relative to that docs root. The copy inside `villa-memorial/docs/` is a 2026-09-08 snapshot plus villa-only additions (see §6, deviation 8/9).
**Nature:** read-only audit. All commands were run in a disposable worktree; render evidence came from a fixture-mode dev server on `:4001`. The defects in §8 are proposed fixes, **not** applied in this PR (the delivery steer for this change is document + artifact only).
**Interactive artifact:** [`prd-alignment-audit.html`](prd-alignment-audit/prd-alignment-audit.html) — the Lavish review surface, self-contained (opens with no server).

---

> **Post-audit note — 2026-09-19. This audit is evidence of the 2026-09-17 state; its findings
> are kept exactly as written and are annotated, never rewritten.** Since the audit the front end
> completed: 16 of the 20 screens §1–§4 list as “not built” were built (F-01 · F-02 · F-03 · F-04 ·
> F-05 · F-09 · F-10 · F-11 · F-12, the operations board and the staff lead record), the §8
> defects were fixed in PR [#43](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/43),
> the completeness gaps G4/G5/G7 were closed in PR
> [#47](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/47), and the stale docs (G2/G3)
> were refreshed in the same PR as G1. The four screens that remain are the three platform-administration screens (the
> platform track) and AI Copilot (deferred by the CP plan). Read §3's counts and §4's statuses as
> the audit date, not today. The current state — what was delivered and by which PRs, and what
> remains with the platform's contract list and Villa's five answers — is the
> [front-end completion record](./frontend-complete.md) and [open items](./open-items.md); the
> per-route index is [`notes/demo-web-route-coverage.md`](./notes/demo-web-route-coverage.md).

---

## 1. Verdict (plain language)

**Yes — the build is still on the PRD's path, and it is honest about where it is not.** The core architecture the PRD froze is followed (Next.js BFF per ADR-003/004, frozen `Lot`/`Case`/order/booking/document contracts, scope-gated RBAC, tokens-only styling), the client's real 2026 prices and papers drive the storefront, and every screen without a live service says so in designed wording instead of faking data.

**Where we are not in line is a mix of deliberate and accidental:**

1. **Not built (20 of 79 inventory screens):** the public digital-memorial family (`Digital Memorial Page/Search`, `Find My Loved One`), `Smart Service Builder`, `Immediate Assistance`, `Facilities/Virtual Tour/Gallery`; admin `Operations Board`, `Lead Detail`, `Embalming/Preparation`, `Ownership/Transfers/Interments/Exhumations`, staff `Commission`, `AI Copilot`, platform administration (all 3) — every one blocked on an unbuilt service/contract, a role/scope, or an explicit CP-2 deferral, except a few that are simply not started (Immediate Assistance, Facilities, Virtual Tour, Gallery).
2. **Honest placeholders (25):** screens that exist and name what unblocks them (CRM/HR/pipeline/inventory/work-orders/accounting/reports/notifications/workflows/settings/users; the family portal's service-less screens; public Request-account).
3. **Beyond the PRD (13 tracked extensions):** the captain-approved villa additions the PRD screen inventory does not ask for — the 3D park, the portal designs, the pricing/catalog/orders/chapel admin stores, the sky/navy/gold palette, portal switcher, hero colour/transparency editor, device uploads, the AWS agent toolkit. They extend named PRD rules (CMS, GIS/digital-twin, commissions, chapel calendar) but the PRD itself has not been updated to name them — that is the drift to watch.
4. **Found defects (4 screens + 2 stale docs):** `/staff/dispatch`, `/staff/pipeline`, `/staff/work-orders` render a 403 to the admin because their scope tokens are malformed (`scheduling`, `cases`, `property` instead of `scheduling:read` …), and `/staff/inventory` prints a reason string starting `read:`. The villa-snapshot route-coverage note and the app README describe a pre-portal build and are stale.

The counts, per screen: **34 built · 25 honest placeholder · 20 not built** (79 total), plus the 13 extensions listed in §5.

---

## 2. Method and evidence

### Read (PRD — canonical in-memoriam docs)
`04-modules/screen-inventory.md` (full), `04-modules/commerce-catalog.md`, `crm-cases.md`, `documents-contracts.md`, `facilities-scheduling.md`, `finance-billing.md`, `memorial-property-gis.md`, `reporting-dashboards.md`, `04-modules/AGENTS.md`; `02-architecture/roles-permissions.md`, `design-system.md`, `adr-003-react-nextjs-frontend.md`, `adr-004-bff-gateway.md`; `06-cultural-digital-memorial/digital-memorial.md`, `filipino-culture-module.md`; `07-client-villa/client-to-saas-mapping.md`, `open-questions.md`, `current-state-forms.md`; `08-delivery/checkpoint-delivery-plan.md`, `contracts/rbac-scopes-v1.md`, `notes/known-limitations-cp1.md`, `notes/phase-2-backlog.md`, `README.md`.

Villa-only docs read: `docs/07-client-villa/park-3d-spec.md`, `docs/02-architecture/premium-admin-direction.md`, `docs/08-delivery/services-design/README.md`, `family-portal-design/README.md`, `agent-portal-design/README.md`, `docs/08-delivery/notes/demo-web-route-coverage.md`.

### Read (build)
`app/**` (all four route groups + all BFF routes), `components/**`, `lib/api-client/**` (property, operations, commerce, catalog-store, pricing-store, order-store, chapel-admin, chapel-reservations, family, agent, landing, audit, hr, finance, docs), `lib/fixtures/**` (provenance headers), `lib/rbac/nav.ts`, `lib/auth/portal-guard.ts`, `lib/auth/destination.ts`, `lib/family/portal-coverage.ts`, `lib/pricing-model.ts`, `portal-nav.ts`, `styles/tokens.css`, `AGENTS.md`, `README.md`, `PORT_PLAN.md`, `SYNC.md`, `FORMS_PLAN.md`, `package.json`.

### Rendered (fixture-mode `next dev` on `:4001`, curl + cookie login)
- All public routes: **27/27 loaded 200** (`/`, `/services` + 2 guides, `/transport`, `/products`, `/products/CSK-LUMINA`, `/plans`, `/plans/PKG-BASIC`, `/plans/compare`, `/plans/senior-benefits`, `/plans/villa-memorial-plan`, `/packages`, `/lots`, `/lots/:id`, `/lots/price-list-2026`, `/map`, `/cart`, `/checkout`, `/quote`, `/contact`, `/appointments`, `/faq`, `/register`, `/login`, `/client/login`, `/agent/login`, `/orders/ORD-2026-00001`).
- Staff (admin session): **49/49 loaded 200**. 16 render the designed not-wired state (notifications, reports, the new-forms, inventory, store, accounting, hr/new, documents/new, users(+new), workflows(+new), settings, plans/new, plans/1); `/staff/dispatch`, `/staff/pipeline`, `/staff/work-orders` instead show a 403 because of defect G1.
- Family (customer session): **14/15 loaded 200**; `/client/documents/receipts/OR-2026-0001` → 404 (correct: the family snapshot carries no receipt number, so no receipt copy is printable).
- Agent (agent session): **9/9 loaded 200**.

### Commands
```bash
npm test                 # 75 files, 805 tests — all pass, EXIT=0
npx next dev --port 4001 # fixture mode, no env vars
curl -c/-b cookies       # POST /api/auth/login per persona; GET each route
```

### Could not verify
- **Live mode** (no gateway/`*_BASE_URL` available): all live branches reviewed by code only; none executed.
- `npm run build` was not re-run in this session (dev-server render + full test suite used instead); a prior `.next` exists in the worktree.
- The docker-compose stub-gateway stack was not started.
- PRD docs not read line-by-line: `01-product/*`, `03-domain/*`, `05-ai/*`, most ADRs, and the remaining `08-delivery/contracts/*` were skimmed/not opened; nothing in them contradicts what is below, but the audit's PRD basis is the document set listed above.
- The captain approvals quoted in §5 are taken from the villa design docs' own approval records; I did not re-confirm them with the captain.

---

## 3. Counts

**PRD screen inventory** = 32 public + 12 family + 32 admin/staff + 3 platform = **79 screens** (`screen-inventory.md:7-12, 15-16, 19-24, 26-27`).

| Bucket | Public | Family | Staff | Platform | Total |
|---|---:|---:|---:|---:|---:|
| Built | 20 | 1 | 13 | 0 | **34** |
| Honest placeholder (incl. partial) | 4 | 11 | 10 | 0 | **25** |
| Not built | 8 | 0 | 9 | 3 | **20** |
| **Total** | **32** | **12** | **32** | **3** | **79** |

**Beyond the PRD:** 13 tracked extensions (§5) — captain-approved villa-only work the inventory does not name (3D park, three portal design systems, admin stores, palette, etc.).

---

## 4. Alignment table

Status key: **A** = aligned/built · **H** = aligned as an honest placeholder · **N** = not built. Every row carries its PRD line and its villa route/component.

### 4.1 Public website (32 screens)

| # | PRD item | Where it lives | PRD ref | St | Reason |
|---|---|---|---|---|---|
| P1 | Homepage | `/` → `app/page.tsx` + `components/landing/landing-view.tsx` (content document `lib/fixtures/landing/content.json`) | screen-inventory.md:7 | A | The PRD asks for a homepage; the build renders a full content-model home (hero, rails, about, services, plans, map, blog) from an editable LandingPage document, live lot map included. |
| P2 | Funeral Services listing | `/services` → `components/villa/service-rates-2026.tsx` | screen-inventory.md:7 · facilities-scheduling.md:3-7 | A | Publishes the client's 2026 a-la-carte, embalming and chapel sheets with Add-to-cart/Request actions; every figure comes from `lib/villa-pricing.ts`. |
| P3 | Service detail | `/services/death-at-home`, `/services/death-at-hospital`, `/transport` | screen-inventory.md:7 | A | Per-scenario guide pages replace a generic `/services/[slug]`; every sellable line is actionable in place. Adapted IA, same job. |
| P4 | Products listing | `/products` → `components/villa/casket-catalogue.tsx` | screen-inventory.md:7 · commerce-catalog.md:7-10 | A | 24 casket models grouped by collection, SRP/senior/discount from the 2026 sheet; sample imagery labelled illustrative. |
| P5 | Product detail | `/products/[sku]` (SKU from `coffinSku`, `lib/catalogue-skus.ts`) | screen-inventory.md:7 | A | Card → "View details" → full facts/prices/inclusions from catalogue + `lib/villa-pricing.ts`; unknown SKU → 404. |
| P6 | Packages listing | `/packages` | screen-inventory.md:7 | A | Real catalogue (`item_type=package`) cards with Add-to-cart + detail link. |
| P7 | Package detail | `/plans/[sku]` + route-local `price-list-2026-module.tsx` | screen-inventory.md:7 | A | The client-approved `package.html` layout: breadcrumb → hero → VMP panel → 5-column package grid → 2026 price module → rail buy card. |
| P8 | Package comparison | `/plans/compare` | screen-inventory.md:7 | A | Real-data comparison over the catalogue. |
| P9 | Smart Service Builder | — | commerce-catalog.md:12-17 | N | Not built; the PRD's configurator (identify what the family has → compose arrangement → live total) has no route/engine. Depends on the pricing/availability rule engine, which is also not built platform-side. |
| P10 | Memorial Lots listing | `/lots` + `lib/lots-legend.ts` | screen-inventory.md:7 · memorial-property-gis.md:76-91 | A | Filters by park/status/legend type with live chip counts over the real lot listing. |
| P11 | Interactive Lot Map | `/map` → `components/public-park-map.tsx` + shared `park-maps-view.tsx` | memorial-property-gis.md:87-94 | A | Interactive masterplan, plot selection = digital profile (the PRD's "killer UX"), same store as staff. The 3D mode is beyond the PRD (§5). |
| P12 | Lot Search | `/lots` search + type filters | memorial-property-gis.md:96-99 | A | Search/filter over lot number/section/type/status (proximity and AI/natural-language search not built). |
| P13 | Lot Detail | `/lots/[id]` | memorial-property-gis.md:76-81 | A | Lot attributes, status, price, `/map` link, request action. |
| P14 | Lot Reservation | staff: `components/lot-reserve-action.tsx` + `POST /api/property/lots/:id/reserve`; public: request-to-reserve link | memorial-property-gis.md:96-99 | H | The reservation transaction is real for `property:write` sessions and enforced by property-gis; a public visitor gets the honest request path because **no public reservation contract exists** (the PARK's reservation period/expiry/payment flow is unbuilt). |
| P15 | Pre-Need Plans | `/plans`, `/plans/villa-memorial-plan`, `/plans/senior-benefits` | screen-inventory.md:8 · finance-billing.md:42-48 | A | Five tiers × four terms, regular + senior, through one renderer (`plan-payment-table.tsx`) fed the pricing store. |
| P16 | Plan Detail | `/plans/[sku]` + `PlanTermSelector` | screen-inventory.md:8 | A | Tier × term selection prices through `planRate()`; non-monthly terms open the prefilled request (see plan-selection). |
| P17 | Plan Comparison | `/plans/compare` | screen-inventory.md:8 | A | Real plan comparison. |
| P18 | Cart | `/cart`, `lib/cart/cart-context.tsx` | commerce-catalog.md:19-25 | A | One cart for products/services/packages/chapel stays; localStorage persistence + display snapshot refresh (frozen checkout sends `{sku,quantity}` only). |
| P19 | Checkout | `/checkout` → `POST /api/orders` | commerce-catalog.md:19-25 · order-payment-api-v1 (frozen) | A | Real order creation on the frozen contract; chapel holds are claimed after the 201 (best effort). |
| P20 | Quote Request | `/quote` + `lib/public-forms/*` | screen-inventory.md:10 | H | The form and gate are real; **nothing is sent or stored server-side** (no quotation service) and the confirmation says exactly that. |
| P21 | Appointment Booking | `/appointments` + `lib/public-forms/*` | screen-inventory.md:10 · facilities-scheduling.md:16-19 | H | Same: designed capture, no scheduling write contract; confirmation says "Request checked — nothing was sent." |
| P22 | Immediate Assistance | 24/7 call panel on `/` and `/services` | screen-inventory.md:10 | N | No dedicated screen; the call-first answer exists inline but the screen is absent from the app. |
| P23 | Contact | `/contact` (+ `lib/public-forms/request-prefill.ts` landing) | screen-inventory.md:10 | A | Publishes numbers/address; captures to the browser-local demo store which the staff inquiries board reads (no CRM service). |
| P24 | FAQ | `/faq` | screen-inventory.md:10 | A | Static FAQ page; content is hand-written marketing copy rather than a CMS collection (acceptable, worth noting under CMS). |
| P25 | Facilities | — | screen-inventory.md:10 | N | Not built (no park facilities page; chapels are documented on `/services`). |
| P26 | Virtual Tour | — | screen-inventory.md:10 | N | Not built; the 3D park is a different (beyond-PRD) experience. |
| P27 | Gallery | — | screen-inventory.md:10 | N | Not built (client photography exists in `public/media` but no gallery page). |
| P28 | Digital Memorial Search | — | digital-memorial.md:18-20 | N | Not built; the memorial service does not exist. |
| P29 | Digital Memorial Page | — | digital-memorial.md:6-11 | N | Not built; family `/client/memorials` is the honest "not switched on" state. |
| P30 | Find My Loved One | — | digital-memorial.md:18-20 · memorial-property-gis.md:112-115 | N | Not built; needs the deceased/memorial search service and the privacy rules the PRD itself leaves open. |
| P31 | Login | `/login`, `/client/login`, `/agent/login` → `POST /api/auth/login` | screen-inventory.md:12 | A | Real BFF session (httpOnly cookies, defensive claim parse). Three doors is a deviation (§6.3) caused by the missing role claim. |
| P32 | Register | `/register` → `RegisterCard` | screen-inventory.md:12 | H | UX complete; account provisioning is not frozen, so submission ends in an explicit demo success state. |

### 4.2 Plans & property (PRD rules)

| Item | Where it lives | PRD ref | St | Reason |
|---|---|---|---|---|
| Pricing store (plan rates + lot families) | `lib/api-client/pricing-store.ts` + `lib/api-client/pricing.ts`, seed `lib/fixtures/commerce/pricing.json`; editor `/staff/pricing`, `/staff/plans` | finance-billing.md:42-48 · commerce-catalog.md:3-5 | A | One editable home for every published figure; `lib/pricing-model.ts` validates (four modes, whole pesos, annual/semi/quarterly/monthly identity, senior ≤ regular, lot rounding ₱3). Public pages read it per request. No platform write contract → live 503 (deviation §6.4). |
| Lot pricing published from the client's sheets | `/lots/price-list-2026` + lot families in the store | memorial-property-gis.md:76-81 | A | Six lot families regular + senior with six-year amortization, transcribed from `PRICE LIST FOR 2026`; `questions` carry the two unresolved client conflicts. |
| 2D park map + plot store | `lib/park-maps.ts`, `components/park-maps-view.tsx`, `parks-canvas.tsx` | memorial-property-gis.md:87-94 | A | Shared between public `/map`, staff `/staff/property`, agent `/agent/lots`; image-space plots, status/type/section, linked lots; demo-local persistence (deviation §6.2). |
| 3D park | `lib/park-3d/*`, `components/park3d/*` | memorial-property-gis.md:117-119 (digital twin, roadmap) | A(extension) | Beyond the inventory; implements the digital-twin direction the PRD marks future. Masterplan-only, placeholder inventory labelled, `property:write` gates plotting. See §5.1. |
| Chapel booking (customer) | `components/chapel-booking-dialog.tsx`, `lib/chapel-booking.ts`, `lib/api-client/chapel-reservations.ts`, BFF `/api/chapel/*` | facilities-scheduling.md:3-7 | A | 3–9 day stays, per-day availability from the live schedule, exact range price, reserve-on-add/release-on-remove with a race check. The chapel-only rental the PRD calls out is therefore sold. Chapel names/count are PLACEHOLDER rows (client data gap §6.5). |
| Chapel administration | `/staff/schedule` chapel sections, `lib/chapel-admin.ts`, `lib/api-client/chapel-store.ts`, BFF `/api/schedule/*` | facilities-scheduling.md:3-7 · screen-inventory.md:20 (Chapel Calendar) | A | One store, two faces (staff settings/availability/bookings and the customer dialog); holds vs confirmed; cancel-with-reason; live mode 503 for the app-authored write shape (no booking-events write endpoint). |
| Case management | `/staff/cases`, `/staff/cases/[id]`, `lib/api-client/operations.ts` | crm-cases.md:57-65 · case-events-v1 (frozen) | A | List/detail, stage progression, task checklist, staff intake capture, service-contract link; live branch implemented (`OPERATIONS_BASE_URL`). |
| Case intake + service contract | `/staff/cases/new`, `/staff/cases/[id]/service-contract` | crm-cases.md:57-65 · documents-contracts.md:86-90 · current-state-forms.md:3-16 | A | Villa's paper Service Contract is captured as structured data and can be exported; intake addendum is additive per the frozen contract (`case-events-v1` addendum in villa docs). |
| Purchase application + agreement | `/staff/property/[id]/apply`, `[id]/document`, `components/purchase-application-*`, `POST /api/property/lots/:id/purchase-application` | current-state-forms.md:18-43 · documents-contracts.md:86-99 | H | PROVISIONAL app-authored shape (no frozen sale-financing/application contract); fixture-mode capture + real DOCX/PDF export. Live mode honestly 503 `PURCHASE_APPLICATIONS_NOT_WIRED`. |

### 4.3 Commerce

| Item | Where it lives | PRD ref | St | Reason |
|---|---|---|---|---|
| Catalogue as authoritative source | `lib/api-client/commerce.ts` reads the durable catalogue store; public `/plans /services /products /packages` + staff `/staff/catalog` | commerce-catalog.md:3-5 | A | One storefront source for public and staff; admin edit reaches the storefront on the next request. Real 2026 figures replace the upstream placeholder seed (deviation §6.7). |
| Catalog admin | `/staff/catalog`, `/staff/catalog/new`, `[id]/edit`, `lib/catalog-admin.ts`, `lib/api-client/catalog-store.ts` | commerce-catalog.md:7-10 | A(extension) | Product/Service Management with real CRUD-into-a-store, deactivate-not-delete, photo picker. No platform write API → live 503 `ADMIN_CATALOG_NOT_WIRED`. |
| Order management | `/staff/orders`, `/staff/orders/[number]`, `lib/api-client/order-store.ts` | commerce-catalog.md:19-25 · screen-inventory.md:20 | A | Durable fixture store (atomic journal), filters via searchParams, app-authored `new→confirmed→fulfilled / cancelled` lifecycle that never rewrites the frozen payment status; live 503 `ADMIN_ORDERS_NOT_WIRED`. |
| Checkout → order | `/checkout` → frozen `POST /orders` | commerce-catalog.md:19-25 | A | Real order creation; quote-required items route to the request form (PRD rule satisfied by `/quote` + prefilled actions). |
| Cart rules | `lib/cart/cart-context.tsx`, `lib/plan-selection.ts` | commerce-catalog.md:19-25 | A | Mixed cart of services/caskets/packages/chapel days; plan tier × term only carts the monthly non-senior selection, otherwise opens the request naming the sheet amount — exactly the PRD's "plan subject to contract rules". |

### 4.4 Staff operations (32 screens)

| # | PRD item | Where it lives | PRD ref | St | Reason |
|---|---|---|---|---|---|
| S1 | Admin Dashboard | `/staff/dashboard` | reporting-dashboards.md:131-140 · roles-permissions.md:16-23 | A | Ops + finance + lots summaries aggregated from the SAME clients the screens use (structural no-contradiction), each figure scope-gated. |
| S2 | Operations Board | — | facilities-scheduling.md:21-24 | N | Not built; the dashboard's upcoming list and `/staff/schedule` cover adjacency, but "today's retrievals/embalmings/viewings/dispatches/ceremonies/interments with owners" has no board. |
| S3 | CRM | `/staff/customers`, `/staff/customers/[id]`, `/staff/inquiries` | crm-cases.md:39-46 | H | Screens real over recorded fixtures; **crm-families is unbuilt**, so no live customer/inquiry data (documented invariant). |
| S4 | Lead Detail | — | crm-cases.md:39-46 | N | No lead record route; customer detail is not a lead. Blocked on crm-families. |
| S5 | Sales Pipeline | `/staff/pipeline` | commerce-catalog.md:32-36 | H | Honest not-wired stub (crm-families) — but currently renders a 403 to admin due to the scope-token defect (§8-G1). |
| S6 | Product/Service Management | `/staff/catalog` | commerce-catalog.md:7-10 | A | Real admin over the durable catalogue store. |
| S7 | Package Management | `/staff/plans` + `/staff/catalog` | commerce-catalog.md:7-10 | A | Package prices/tiers are edited in the plan-rate admin and package items in the catalogue admin. |
| S8 | Pricing Rules | `/staff/pricing`, `/staff/plans` | finance-billing.md:42-48 · commerce-catalog.md:19-25 | A | Same validation function as the BFF save; preview renders the public components; client `questions` are read-only beside the document. |
| S9 | Order Management | `/staff/orders` | commerce-catalog.md:19-25 | A | Durable store, filters, lifecycle, RBAC `orders:read/write`. |
| S10 | Funeral Case Management | `/staff/cases` (+ new/intake/service-contract) | crm-cases.md:57-65 | A | Frozen case contract; stages/tasks/intake; live branch real. |
| S11 | Embalming/Preparation | case task "Confirm embalming completion" only | crm-cases.md:67-71 | N | No prep record screen (embalmer, schedule, dressing/cosmetics, checklist) — only a case task. Blocked on a funeral-cases extension. |
| S12 | Chapel Calendar | `/staff/schedule` | facilities-scheduling.md:3-7 | A | Chapel settings/availability/bookings with confirmation and reason-cancel; customer dialog reads the same store. |
| S13 | Vehicle Dispatch | `/staff/dispatch` | facilities-scheduling.md:9-14 | H | Honest stub (vehicles as scheduling resources; UX with scheduling delivery) — currently 403 to admin (§8-G1). |
| S14 | Cemetery Map | `/staff/property` | memorial-property-gis.md:87-94 | A | Same shared map as public/agent; plotting/editing for `property:write`; reserve/sell transitions. |
| S15 | Lot Management | `/staff/property`, `/staff/property/[id]` | memorial-property-gis.md:76-81 | A | Lot detail, status, owner, reserve, purchase-application capture; vacant/garden demo plots labelled. |
| S16 | Ownership | — | memorial-property-gis.md:101-104 | N | No ownership/co-owner/authorized-family record or certificate issuance. Blocked on property-gis ownership API (deferred upstream). |
| S17 | Transfers | — | memorial-property-gis.md:101-104 | N | No transfer request→verify→approve workflow. Deferred upstream. |
| S18 | Interments | case stage only | memorial-property-gis.md:106-110 | N | `interment` is a case stage; no verify-deceased/lot/ownership/payment/permit workflow or GIS update. Deferred upstream. |
| S19 | Exhumations | — | memorial-property-gis.md:106-110 | N | Not built. Deferred upstream. |
| S20 | Maintenance/Work Orders | `/staff/work-orders` | facilities-scheduling.md:31-34 | H | Honest stub (deferred property workflow) — currently 403 to admin (§8-G1). |
| S21 | Inventory | `/staff/inventory` | facilities-scheduling.md:26-29 | H | Honest stub (no stock API) — renders with a malformed `read:` reason (§8-G1). |
| S22 | Contracts/Documents | `/staff/documents`, `/staff/documents/[id]`, generated contract pages + `POST /api/documents/generate`, `/render` | documents-contracts.md:86-103 | A | Repository + generation (service contract, purchase agreement, receipts) and export; upload disabled (no object store) per the honest state. |
| S23 | Payments/Collections | `/staff/billing`, `/staff/billing/record-payment` | finance-billing.md:42-48 · billing-list-api-v1 (frozen) | A | Live-capable billing list + record payment; overdue/aging derived client-side as documented. |
| S24 | Accounting | `/staff/accounting` | finance-billing.md:50-53 | H | Honest stub: the accounting service exists but no staff-facing ledger/trial-balance API is frozen. |
| S25 | Commission | — | finance-billing.md:55-61 | N | No staff commission engine screens; the agent portal's "Sales & commissions" is a fixture-shaped agent view, not the admin engine. |
| S26 | Notifications | `/staff/notifications` | documents-contracts.md:105-109 | H | Honest stub: no notification rule/event contract or scope. |
| S27 | CMS | `/staff/landing` (real content editor) · `/staff/store` (stub) | documents-contracts.md:111-115 | A | Real CMS seam for the home document (hero, rails, about, services, plans, map, blog) with pickers and device uploads. `/staff/store` remains the honest stub for a broader storefront-content editor. |
| S28 | Reports/BI | `/staff/reports` | reporting-dashboards.md:125-140 | H | Honest stub: dashboard aggregates today; reporting-analytics is unbuilt. |
| S29 | AI Copilot | — | 05-ai/ai-capabilities.md (not read in full) | N | No AI surface at all; explicitly deferred by the CP plan. |
| S30 | User/Roles/Permissions | `/staff/users` (+ `/new` stub), `lib/rbac/nav.ts`, frozen scopes | roles-permissions.md:4-13 · rbac-scopes-v1 | H | Auth + nav gating are real; user provisioning/role assignment API is dev-authored → the page is the honest invite stub. |
| S31 | Audit Log | `/staff/audit` | audit-event-types-v1 (frozen) | A | Live-capable audit trail read under `audit:events:read`; outcome filters. |
| S32 | System Settings | `/staff/settings` | platform-administration.md (classification) | H | Honest stub: module-flag reads frozen but the config-engine surface is deferred. |

### 4.5 Family portal (12 screens)

The machine-readable table is `lib/family/portal-coverage.ts` (pinned by `tests/unit/family-prd-coverage.test.ts`); states below match it and the rendered pages.

| # | PRD item | Route | PRD ref | St | Reason |
|---|---|---|---|---|---|
| F1 | Customer Dashboard | `/client/dashboard` | screen-inventory.md:15 · crm-cases.md:43-50 | H(partial) | Real snapshot summary (loved one, balance, next due); funeral schedule/case progress not projected — says so and points to the office line. |
| F2 | Family Dashboard | `/client/family` | screen-inventory.md:15 · digital-memorial.md:26-30 | H(partial) | Family membership with roles needs identity work; lot/interment/memorial projections not wired; each row links to its honest screen. |
| F3 | My Plans | `/client/plans` | screen-inventory.md:15 · finance-billing.md:42-48 | H(partial) | Plan snapshot shown; instalment schedule/certificate need the contracts/documents service. |
| F4 | My Lots | `/client/property` | screen-inventory.md:15 · memorial-property-gis.md:76-81 | H | No family-facing ownership projection; the park map is real and carries the action. |
| F5 | My Payments | `/client/payments` | screen-inventory.md:15 · finance-billing.md:42-48 | H(partial) | Balance/due shown from the snapshot; payment history, receipts, online payment need the payments/AR service. |
| F6 | My Documents | `/client/documents` | screen-inventory.md:15 · documents-contracts.md:92-99 | H(partial) | The family's own papers (service contract, official receipt) always show as "Yours" from the family-safe projection; full repository/download/certified copies need the documents service. Receipt copy route exists but the snapshot has no receipt number, so it 404s honestly. |
| F7 | My Memorials | `/client/memorials` | screen-inventory.md:15 · digital-memorial.md:6-11 | H | Memorial service absent; page states nothing is published until the family says yes. |
| F8 | My Funeral Cases | `/client/cases` | screen-inventory.md:16 · crm-cases.md:57-65 | H | Case projection service absent; the page carries the office answer and the family papers. |
| F9 | My Requests | `/client/requests` | screen-inventory.md:16 · crm-cases.md:79-83 | H | No service desk/ticket contract; a phone call is the one route that reaches a person. |
| F10 | My Appointments | `/client/appointments` | screen-inventory.md:16 | H | Scheduling has no family-facing contract; a time is only real when the office confirms. |
| F11 | Support/Ticket | `/client/support` | screen-inventory.md:16 · crm-cases.md:79-83 | A | Built: the client's real numbers/places with the biggest action on the one channel that always works. |
| F12 | Privacy Center | `/client/privacy` | screen-inventory.md:16 · roles-permissions.md:13 | H | Consent controls/access log need a privacy service; published promises only, no invented defaults. |

Supporting (beyond inventory, same design and data rules): `/client/notifications` (H, notifications engine), `/client/profile` (H/partial, device-local reading preferences real).

### 4.6 Agent portal (not in the inventory; aligned to the commissions module)

| Item | Where it lives | PRD ref | St | Reason |
|---|---|---|---|---|
| Agent dashboard + pipeline + clients + appointments + lots + applications + marketing + new lead (9 routes) | `app/(agent)/agent/*`, `components/agent/agent-ui.tsx`, `lib/api-client/agent.ts`, fixture `lib/fixtures/agent/workspace.json` | finance-billing.md:55-61 · roles-permissions.md:4-7 · commerce-catalog.md:32-36 · facilities-scheduling.md:16-19 | H | The PRD (as an admin concern) asks for an agent dashboard with leads/prospects/follow-ups/sales/commission/targets/conversion; the captain-approved agent portal answers exactly that field list. **No agent-workspace API contract exists** (crm-families unbuilt, commission engine deferred), so every screen reads one provisional fixture and says so; commission amounts are `null` by design until rates are configured. |

### 4.7 Platform-wide rules

| Rule | Where it lives | PRD ref | St | Reason |
|---|---|---|---|---|
| Next.js frontend as one codebase for all surfaces | `app/(public|staff|family|agent)` | adr-003:106-121 | A | One Next.js + TS app, SSR public routes, client components for cart/map/3D. |
| Next.js server side IS the BFF; dumb-BFF guardrail | `app/api/**` route handlers, `lib/api-client/staff-fetch.ts` | adr-004:180-192 | A | Route handlers only fetch/aggregate/reshape/session-manage; business rules live in `lib/*-model.ts` consumed by both sides (e.g. pricing-model), no writes originate in BFF. No business rule found in a route handler during this audit. |
| Sessions server-side only | `app/api/auth/*`, `lib/auth/session.ts` | adr-003:118-119 · rbac-scopes-v1:68 | A | httpOnly cookies, defensive claim parse, unknown shape → logged-out, tokens never in client JS. |
| RBAC gates nav AND actions; UI 403 is graceful | `lib/rbac/nav.ts`, `components/ui/states.tsx` `ForbiddenState`, page gates in every staff page | rbac-scopes-v1:65-71 · roles-permissions.md:9-13 | A | Nav hides items; each page re-checks scope server-side and renders a designed 403; only villa-authored statuses live in the app. Defect G1 shows the mechanism working (users see 403) — it's the gating *input* that's wrong on 4 pages. |
| Frozen cross-track contracts | `lib/api-client/property.ts` (lot-events), `operations.ts` (case-events), `commerce.ts` (order-payment), `scheduling.ts` (booking-events), `documents.ts` (documents-api), `finance.ts` (billing-list), `audit.ts` | 08-delivery/contracts/* | A | Tolerant readers validate field by field (`toLot`/`toCase`), missing → 502, extra ignored; fixtures pinned by 17 fixture-contract test files. |
| Design tokens are the single source of visuals | `styles/tokens.css` + the `styles/components.css` blocks | design-system.md:36-46 | A | Every view references tokens/BEM classes; palette values differ from the PRD's granite/marble/brass by captain direction (deviation §6.9) but the consumption rule is intact. |
| Six UI states on async screens | `components/ui/states.tsx` (+ empty/skeleton/alert) | screen-inventory.md:3-4 | A | Error/empty/loading/validation/permission/success are the shared kit; async screens use them. |
| No hard-coded money in views; every amount has one transcription home | `lib/villa-pricing.ts`, `lib/pricing-model.ts`, pricing store | finance-billing.md:68-70 | A | `tests/unit/villa-pricing.test.ts` + `price-surfacing.test.tsx` render the real pages and pin every figure. Deterministic money, no AI. |

---

## 5. Beyond the PRD — the villa extensions (13)

All are documented as captain-approved in the villa docs; none contradicts a PRD rule, but none is named by the PRD either. That is the audit's "drift watch".

| # | Extension | Where | Approval/evidence | Conflict? |
|---|---|---|---|---|
| B1 | **3D park** (orbit navigation, plot picking, placeholder inventory) | `lib/park-3d/*`, `components/park3d/*`, `/map` | `docs/07-client-villa/park-3d-spec.md` (captain 2026-09-16; orbit 2026-09-17) | None; it is the PRD's digital-twin §43 direction, ahead of its roadmap. Anti-hallucination contract (masterplan only, placeholder labels) deliberately stricter than the PRD requires. |
| B2 | **Agent portal** (9 screens) | `app/(agent)/agent/*` | agent-portal-design README (captain 2026-09-16) | None; answers finance-billing.md:56-61, a screen set the inventory does not enumerate. |
| B3 | **Premium navy/gold/sky palette** | `styles/tokens.css` | premium-admin-direction.md (captain 2026-09-08) + sky-blue rule in services-design README (captain 2026-09-16) | **Deviates from** design-system.md:27-31 (granite/marble/brass). Token mechanism preserved; PRD palette text not updated. |
| B4 | **Landing-page content model + editor** | `/staff/landing`, `lib/api-client/landing.ts`, `lib/landing/*` | AGENTS.md landing block; Lavish villa-landing-plan | None; it is the PRD's CMS §50 implemented as a document store. The PRD has no content contract, so the app is the authority. |
| B5 | **Hero background colour + transparency editor** | `components/landing/hero-background-field.tsx`, `lib/landing/hero-background.ts` | AGENTS.md | None; a CMS extension, default renders unchanged. |
| B6 | **Device uploads into content documents** | `components/landing/device-uploader.tsx`, `lib/device-upload.ts` | AGENTS.md | None; substitutes for the missing object store (media live in the JSON document). |
| B7 | **Pricing store + editor** | `/staff/pricing`, `/staff/plans`, `lib/api-client/pricing-store.ts` | AGENTS.md pricing block | None; implements Pricing Rules. No platform write API (deviation §6.4). |
| B8 | **Catalog admin store** | `/staff/catalog`, `lib/api-client/catalog-store.ts` | AGENTS.md catalog block | None; implements Product/Service Management. Live 503 by design. |
| B9 | **Orders admin lifecycle** | `/staff/orders`, `lib/api-client/order-store.ts` | AGENTS.md orders block | The lifecycle is APP-AUTHORED around the frozen envelope; no contract names it. Live 503 by design. |
| B10 | **Chapel admin + customer booking workflow** | `/staff/schedule`, `chapel-booking-dialog.tsx`, `lib/chapel-admin.ts` | AGENTS.md chapel sections | None; implements chapel-only rental + calendar. Extends booking-events v1 with app-authored blocks/states. |
| B11 | **Paper exports (DOCX/PDF) + purchase-application capture** | `components/paper/*`, `lib/export/*`, `/api/export/paper-pdf` | premium-admin-direction.md · FORMS_PLAN.md | None; PRD generation module requires it; PDF was "deferred" in known-limitations-cp1.md:74 but is now built for papers. |
| B12 | **Portal switcher + separate sign-in doors** | `components/portal-switch.tsx`, three sign-in routes | README §"four surfaces" | Fills the missing role/portal claim (deviation §6.3); one door when the contract lands. |
| B13 | **Demo tooling**: tenant switcher (cosmetic), demo quick-fill, browser-local inquiry/agent captures, stub-gateway + docker compose, `.agents/skills` AWS agent toolkit | `lib/demo-*.ts`, `stub-gateway/`, `.agents/skills/` | README, AGENTS.md, `.env.example` | Tooling/dev surfaces — no product conflict; the toolkit skills are not app code and are excluded from lint per AGENTS.md. Demo capabilities are clearly labelled and never fake data. |

---

## 6. Known deviations — reason and consequence

1. **Fixture-first data instead of live services.** Reason: the cross-track plan is contract-driven and several services/contracts are unbuilt; screens must not wait. Consequence: every portal demos standalone, live branches are real where contracts are frozen (property, cases, billing, auth, audit, documents, ordering) and honest 503 where they are not. Fixtures carry provenance headers and are pinned by 17 fixture-contract suites; drift is a real risk the platform knows about (known-limitations-cp1.md:83).
2. **Browser-local demo persistence.** Reason: no write contracts/object store. Consequence: inquiries (`lib/demo-inquiry-captures.ts`), agent field captures (`lib/demo-agent-captures.ts`), cart, reading preferences, park-map edits and the tenant switcher live in `localStorage`; nothing survives a device change; confirmations say so.
3. **Family/agent role and portal claim missing from frozen RBAC.** Reason: `jwt-claims-v1` + `rbac-scopes-v1` define scopes only; the customer session holds `catalog:read` + `tenancy:modules:read`, the agent session holds `orders:*`, `property:read`, `catalog:read`. Consequence: `lib/auth/destination.ts` infers the portal from scope heuristics; four doors exist; the customer room has no scope of its own (`isFamilySession` = "not staff, not agent"). Needs a role/portal claim in the frozen contract.
4. **No catalogue or pricing write API platform-side.** Reason: no frozen contract names one. Consequence: `/staff/catalog`, `/staff/plans`, `/staff/pricing` write app-authored fixture stores; live mode refuses with 503 (`ADMIN_CATALOG_NOT_WIRED`, `PRICING_ADMIN_NOT_WIRED`) instead of inventing endpoints.
5. **Placeholder chapel names/count; commission rates unconfigured.** Reason: client has not confirmed the park's chapel list/classes nor commission rules (`open-questions.md:50-71`). Consequence: Chapel A/B rows are labelled PLACEHOLDER and cross-pinned to the scheduling fixture; every commission amount is `null` and `configured:false`.
6. **Unresolved client-data conflicts, published, not reconciled.**
   - *Senior chapel rate:* sheet III's senior column computes to 96% of the regular total (₱1,440/₱3,360 per day) while its own footnote prints ₱1,800/₱4,200 — both published as printed (captain Q8); `pricing.json.questions` carries it.
   - *Lot A-001:* fixture records ₱85,000 (3.5 sqm) matching no 2026 sheet row (families start ₱75,000 / ₱114,000 at 2.5 sqm) — do not fold.
   - *2025 vs 2026 purchase agreements:* refunds/cancellation and lot-class lists diverge (`current-state-forms.md:36-38`, `client-to-saas-mapping.md:41`); the app captures Villa's per-revision fields rather than reconciling.
   Consequence: both `questions` are read-only metadata outside the editable document — a save can never resolve them.
7. **Catalogue diverges from the upstream platform seed.** Reason: the client's real 2026 figures win; `commerce/catalog-items.json` is the mirror + real items. Consequence: upstream parity is a captain/dev decision; four items with no 2026 sheet (`SRV-LIGHTS`, `ADD-COFFIN-LIZO-SR`, `ADD-FLOWERS`, `ADD-URN`) keep seed prices by design.
8. **The repo has grown past the PRD documents.** Reason: villa-specific captain work (3D park, portals, stores, palette). Consequence: the in-memoriam PRD does not describe or govern those surfaces; the villa `docs/` snapshot adds them but is not the PRD and contains stale files (`demo-web-route-coverage.md`, README). Drift risk is real: the canonical PRD and the shipped product no longer describe the same surface area.
9. **Palette deviation from the PRD design system.** Reason: captain direction (COO blue/gold 2026-09-08; public sky blue 2026-09-16). Consequence: token architecture honored, but `design-system.md:27-31` is wrong about the product's palette; it should be amended or the villa direction recorded as a tenant theme.
10. **Four sign-in doors / portal switcher.** Reason: no role claim (deviation 3). Consequence: UX workaround visible to all users; documented to collapse to one door.
11. **Two frontends / source-of-truth split.** `PORT_PLAN.md` records the open decision: `in-memoriam/web` canonical vs `villa-memorial` deployment copy. Consequence: they can drift — at audit time project `main` was at `ab0a70f` (PR #41) while the worktree PRD build was `f2ce5c7`; one PR ahead. `SYNC.md` + `scripts/sync-from-monorepo.sh` exist but are manual.
12. **Demo quick-fill / tenant switcher are deliberately non-production.** Reason: demo UX; the quick-fill password is a server-side opt-in and the tenant switcher is cosmetic. Consequence: neither can leak credentials or change tenant context (verified in code).

---

## 7. Gap list by owner

### 7.1 Villa frontend — fixable in this repo (no contract needed)

| Gap | Detail | Evidence |
|---|---|---|
| G1 — malformed scope tokens on 4 staff pages | `/staff/dispatch` `["scheduling"]`, `/staff/pipeline` `["cases"]`, `/staff/work-orders` `["property"]` never match a real scope, so admins get a 403 instead of the honest placeholder; `/staff/inventory` passes a reason beginning `"read:"` so the not-wired text renders as "read:Stock levels…". | `app/(staff)/staff/gated-section.tsx` signature; rendered 403 confirmed via curl as admin (§2). |
| G2 — stale route-coverage note | `docs/08-delivery/notes/demo-web-route-coverage.md` says family/agent portals absent, `/staff/plans` absent, `/site/transport` absent, no product catalogue type — all outdated; it misleads agents about current coverage. | File vs current `app/**`. |
| G3 — stale README | Says "DOC palette", family/agent portals "coming soon", `NEXT_PUBLIC_DEMO_PASSWORD` as the deployed path — all superseded (sky theme; portals built; server-side opt-in per known-limitations). | `README.md` §surfaces/§demo logins vs `styles/tokens.css` + AGENTS.md. |
| G4 — CMS/SEO completeness | No `app/sitemap.ts`, `app/robots.ts`, canonical/OpenGraph/structured data despite documents-contracts.md:111-115. | Repo search; `next.config.mjs` minimal. |
| G5 — store screen overlap | `/staff/store` is a not-wired stub while `/staff/landing` is the real editor; the IA duplicates or misleads unless store later grows beyond landing content. | `app/(staff)/staff/store/page.tsx`. |
| G6 — stale villa docs snapshot | `villa-memorial/docs/` is a 2026-09-08 copy; files that must reflect new work (`known-limitations-cp1.md`, `case-events-v1.md` addendum, `open-questions.md`) exist only in the villa copy, and its `README` claims "source of truth remains in-memoriam". Refresh policy is manual (`SYNC.md`). | `diff -rq docs /home/gab/firstmate/projects/in-memoriam/docs` (17 differences). |
| G7 — FAQ content not in the content model | `/faq` is hand-written JSX, so staff cannot edit it via the CMS surface that now exists for `/`. Minor CMS consistency gap. | `app/(public)/faq/page.tsx`. |

### 7.2 Platform / dev contract — blocked or 503 until a contract freezes

| Missing service/contract | What it blocks | PRD ref | Current honest state |
|---|---|---|---|
| crm-families (read + write) | Customers/inquiries live reads, lead capture persistence, lead detail, sales pipeline, agent customer sync | crm-cases.md:39-46, 79-83 · commerce-catalog.md:32-36 | Fixtures; browser-local captures; stubs. |
| HR service | Staff directory live data, attendance/leave writes | known-limitations-cp1.md:56-59 | Fixture-backed; writes stubbed. |
| reporting-analytics | Reports/BI, executive dashboards, real aggregation | reporting-dashboards.md:125-140 | Dashboard aggregates in the app; `/staff/reports` stub. |
| accounting screens API | Journal entries/trial balance UI | finance-billing.md:50-53 | `/staff/accounting` stub. |
| catalog write + pricing read/write APIs | Admin stores' live mode | commerce-catalog.md:3-10 · finance-billing.md:42-48 | App-authored fixture stores; 503 live. |
| content/CMS read-write contract (page documents + catalogue entries) | Pages & content (`/staff/landing/*`) and the per-item page-content editor (`/staff/catalog/[id]/content`, content-catalogue Phases 0–4) | documents-contracts.md:111-115 | App-authored globalThis stores (landing · content-pages · content-entries); every save re-validates against the LIVE catalogue + pricing stores; no upstream service to address. See [`content-catalogue-cleanup-design/`](./content-catalogue-cleanup-design/). |
| order-admin record/lifecycle | Orders admin live mode | known-limitations-cp1.md:48-49 | App-authored wrapper; 503 live. |
| notification service contract + scope | Staff + family notifications | documents-contracts.md:105-109 | Honest stubs both portals. |
| family API contract + family scopes | Family portal live data (plans, payments, lots, cases, documents, appointments) | digital-memorial.md:26-30 · rbac-scopes-v1 | Snapshot fixture; 11/12 screens honest/partial. |
| agent workspace/commission contract | Agent portal live data; commission engine | finance-billing.md:55-61 | One provisional fixture; commission null. |
| public lots read path / scheduling family contract | Public `/map` live mode; family appointment times | memorial-property-gis.md:87-91 · facilities-scheduling.md:16-19 | Fixture; graceful error live. |
| sale-financing/application record | Purchase application persistence | current-state-forms.md:18-43 | App-authored shape; 503 live. |
| document upload/object store, versioning, e-signature | Document repository completeness | documents-contracts.md:92-103 | Upload disabled; honest. |
| per-installment receipt event (`payment.recorded`) + payer on receipt | Receipt per payment; payer name | known-limitations-cp1.md:74 | One receipt per fully-paid invoice; "Issued to: —". |
| interment/exhumation/ownership/transfer workflows | S16-S19 | memorial-property-gis.md:101-110 | Not built (deferred upstream). |
| commission engine + client rates | S25 | finance-billing.md:55-61 | Not built. |
| AI capabilities + governance wiring | S29, AI rules | 05-ai/* | Not built (deferred). |
| platform administration (tenant mgmt, platform login, sign-up) | 3 platform screens | screen-inventory.md:26-27 · platform-administration.md | Not built in this repo (platform surface); tenant switcher is cosmetic only. |
| digital-memorial services (e-memorial, e-wake, abuloy, QR, search) | P28-P30, F7 and the cultural module | 06-cultural/* | Not built; family memorial page is the honest state. |
| Smart Service Builder rules/availability engine | P9 | commerce-catalog.md:12-17 | Not built. |

### 7.3 Client data — needs Villa's answer (carried as open questions)

| Question | Where it bites | PRD/evidence |
|---|---|---|
| Chapel names/count/classes | `/staff/schedule` + booking dialog | `open-questions.md:51`; fixture PLACEHOLDER. |
| Commission rates/rules | Agent sales page (`null` by design) | `open-questions.md:70`; `workspace.json` header. |
| Senior chapel rate conflict (96% column vs footnote) | `/services` chapel table + price list | pricing `questions[0]`; services design Q8. |
| Lot A-001 price vs 2026 sheet families | `/lots`, price list, application | pricing `questions[1]`. |
| 2025 vs 2026 refund/cancellation + lot classifications | Purchase agreement templates, future contract lifecycle | `current-state-forms.md:36-38` · `client-to-saas-mapping.md:41`. |
| Actual park sections/blocks/dimensions, legal model wording | GIS map inventory, purchase agreement text | `open-questions.md:52-53`. |
| Payment gateways, notification channels, DPA retention, AI governance, SLAs | respective modules | `open-questions.md:58-71`. |

### 7.4 Firstmate tooling

| Item | Note |
|---|---|
| `.agents/skills` AWS agent toolkit vendored in the repo | Not app code; excluded from lint per AGENTS.md. Keep that exclusion when tooling/linters change, or move it out of the app repo if it starts affecting CI. |
| Docs-snapshot sync | `SYNC.md`/`scripts/sync-from-monorepo.sh` protect villa-only docs but the snapshot's *content* diverges from the canonical PRD (17 file differences). A refresh task should decide which villa docs are backported to the PRD and which stay villa-only. |
| Audit-artifact regeneration | This audit's route inventory can be re-run from the commands in §2; keeping the render script with the report makes the next check mechanical. |

---

## 8. Defects found (actionable now, all in this repo)

1. **G1 — scope tokens on `/staff/dispatch`, `/staff/pipeline`, `/staff/work-orders`** (`["scheduling"]`, `["cases"]`, `["property"]`) can never match (`scheduling:read`, `cases:read`, `property:read`), so an admin session gets `ForbiddenState` where the designed not-wired state belongs. Fix: correct the three scope arrays.
2. **G1b — `/staff/inventory` reason string** begins `"read:Stock levels…"` (same edit accident), so the honest text renders with a stray `read:` prefix. Fix: strip the prefix.
3. **G2/G3 — stale doc positions** in `docs/08-delivery/notes/demo-web-route-coverage.md` and `README.md` (details §7.1). Fix: update or archive.

These are small, low-risk edits. They are not PRD deviations; they are defects in the presentation of honest states, and they make the staff IA look less complete than it is.

---

## 9. Recommendations

1. **Fix G1/G1b now** (one PR; three array values + one string), and add a unit test that every `gatedSectionPage` scope token is a member of the frozen vocabulary — the exact class of bug the frozen-scopes contract warns about (`rbac-scopes-v1.md:64-71`).
2. **Refresh the stale docs** (G2/G3) in the same PR; they are the first thing an agent reads.
3. **Decide the PRD/villa drift policy** (deviation 8/11): either backport the villa extensions into the PRD (a short section naming the 3D park, the portals, the admin stores, the sky/navy/gold palette) or record them as a tenant-specific extension layer the PRD explicitly permits. The current state — PRD silent, villa docs authoritative but stale — is how `hr:read` happened. **Decided 2026-09-18: option B** — recorded in [`villa-extensions.md`](./villa-extensions.md); the PRD is not modified.
4. **Carry the client questions to the captain in one place** (chapel list, commission rates, senior-rate conflict, A-001, 2025/2026 divergence). The build publishes them honestly, but nothing in this audit shows the client has been asked.
5. **Open the contract asks this audit surfaces** in the platform track: family/agent role claim; catalog/pricing/order-admin write contracts; crm-families; accounting screens; reporting-analytics; interment/ownership/transfer workflows; digital-memorial services. Each is already written into the codebase as a named blocker.
6. **Do not reconcile the conflicting figures** (senior chapel rate, A-001, 2025/2026 rules) without the client's word — that is the discipline the build already enforces.

---

## 10. Trailers

- **Interactive artifact:** `docs/08-delivery/prd-alignment-audit/prd-alignment-audit.html` — the Lavish review surface, exported self-contained (`lavish-axi export`, 80,727 bytes, zero unresolved local assets). Open it directly in a browser; it needs no server.
- Raw render evidence (status codes per route) is reproduced in §2 and was produced by curl against `next dev` on `:4001`.
- Automated screenshots could not be taken in the audit environment (browser launch failed); the artifact was served by Lavish and validated by its session open.
- Worktree state at audit time: `f2ce5c7fdaa656e648ab5d6ac1981c2ee7fe432a` (detached); no production file modified by the audit itself.

## 11. Review record

*Opened 2026-09-17 as a Lavish review. Updated as feedback arrives.*

| Time (UTC) | Channel | What came back | Resolution recorded |
|---|---|---|---|
| open | Lavish session | (pending) | — |
| 2026-09-17 ~11:00Z | captain message | "can you save this lavish plan and PR it, so that i can go back into this using my personal computer, because right now im using a different computer." | Delivered as this PR: the audit document plus the portable artifact under `docs/08-delivery/prd-alignment-audit/`. |
| 2026-09-18 | captain decision (open item 1) | Option B — the extension layer, not a backport. | Recorded in [`villa-extensions.md`](./villa-extensions.md); the upstream PRD is not modified; open item 1 is closed. |
| 2026-09-19 | post-audit record | The front end completed (PRs #43–#73); the audit's findings unchanged. | Note above §1; [front-end completion record](./frontend-complete.md); [open items](./open-items.md). |
| 2026-09-19 | post-audit record | §4's S29 AI Copilot was the last unbuilt product screen. Its **designed surface** landed in PR [#75](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/75) — `/staff/copilot`: four recorded questions answered by lookup, every finding carrying its record trail, and the governance boundary + not-connected state printed on the page. **No model is attached** and none may be added before the client answers AI governance (open question, §Operations & governance). The audit's §4 statuses stay as written. | [AI Copilot design record](./ai-copilot-design/); the route row and the completion row in [front-end complete](./frontend-complete.md). |
| 2026-09-19 | post-audit record | §4's S30/S31/S32 admin stubs (Users & roles · Workflows · Tenant settings) were replaced by designed read-only screens: `/staff/users` renders the recorded role ↔ scope model from the seeded personas (pinned to `rbac-scopes-v1`), `/staff/workflows` renders the four processes the shipped modules run with their recorded in-flight records, and `/staff/settings` renders the identity the app publishes plus the business rules the modules apply. No provisioning, workflow or tenancy service exists; each screen names its missing service in one line. The audit's §4 statuses stay as written. | [Admin platform design record](./admin-platform-design/); route rows in [front-end complete](./frontend-complete.md). |

**Follow-up for the captain (not part of this PR):** the defects in §8 (the malformed scope tokens and the stale docs) are proposed fixes only; they should ship as their own small PR with a scope-vocabulary test.

**Unanswered at open (queued as decisions in the artifact):** scope-defect fix yes/no · next gap to prioritize · whether to compile the client questions into one ask. (The PRD-drift policy was decided 2026-09-18 — option B, the extension layer; see the review record and [`villa-extensions.md`](./villa-extensions.md).)

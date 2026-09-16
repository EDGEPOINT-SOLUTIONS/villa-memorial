# Known Limitations — CP-1 Checkpoint (Aug 28, revised Aug 29)

> Per-module list of what works, what's provisional, and what's deferred. Silent gaps
> are not allowed — every limitation here was discovered during build and is documented
> honestly so the dev can triage post-CP-1.
>
> **Revision Aug 29:** the Day-3 backend services (property-gis, funeral-cases,
> scheduling-resources) shipped the day after the checkpoint, and their contracts were
> frozen at the same time. Modules D and H are no longer fixture-only; the entries below
> are updated accordingly. Modules A, E, G, I and J remain fixture-backed.
>
> **Revision Aug 29 (evening), CP-1 carryover work — MERGED (PR #44) AND DEPLOYED.**
> `https://in-memoriam.edgepoint-ai.com` now runs this build; statements marked
> *(carryover)* describe the demo host as well as the repository. Changed: the Module D
> reserve button is wired (#8/#31); documents ⓡ exists, so Module J has a backend and an
> official receipt is generated from every completed payment (#12); brakeman + a
> cross-stack two-tenant isolation gate close the security half of #13.
>
> Verified on the box after redeploy: 16 containers (15 + Caddy, cert intact), all three
> gates green (`e2e.sh`, `e2e-ops.sh`, `e2e-tenant.sh`), and over HTTPS — a generated
> receipt renders from the Module J screen, and the reserve form appears on an available
> lot. `db:prepare` created the `documents` database on the pre-existing volume, which is
> exactly the path it was chosen for.

---

## Module A — Customer Management
- ✅ **Works:** Customer list with search, customer detail with family account linkage, inquiry board with quick-capture demo, public registration page (UI only, no backend).
- ⚠️ **Provisional:** Customer/inquiry data is fixture-only (crm-families service unbuilt). Quick-capture inquires are client-side session-only — nothing persists.
- ❌ **Deferred:** Real backend persistence for inquiries, customer communication history, lead assignment.

## Module B — Memorial Plans / Commerce
- ✅ **Works:** Plan catalog with type filters, plan detail with add-to-cart, cart with quantity editing, checkout with order creation, order status polling.
- ⚠️ **Provisional:** Prices are seeded placeholders from catalog-pricing. Order data is fixture-only in fixture mode (in-memory globalThis store). Cart stores SKU+qty only in localStorage.
- ❌ **Deferred:** Subscription/pre-need contract lifecycle, payment schedule visibility, plan comparison.

## Module C — Service/Product Catalog
- ⚠️ **Placeholder only:** Staff catalog page shows "not wired yet" state. Catalog is browsable by customers via Module B storefront.
- ❌ **Deferred:** Staff-side catalog management (add/edit/deactivate items), price rule configuration, package builder.

## Module D — Memorial Lot & Cemetery
- ✅ **Works:** Lot grid with search and status filter, lot detail with attributes, status badges, owner display. **Backend live:** property-gis serves the frozen `Lot` shape (KEB-D3-01); reserve → sell transitions are enforced server-side and emit `lot.reserved` / `lot.released` / `lot.sold`. Scenario F is proven end-to-end by `platform/tests/e2e-ops.sh`.
- ⚠️ **Provisional:** Screens read live lots when `PROPERTY_BASE_URL` is set, fixtures otherwise — the two datasets are kept in sync by hand (seed file mirrors the fixture), not by a test. No real GIS map — static grid/list only (cut lines #1 and #5 invoked). *(carryover)* **Reserve is now wired**: `/staff/property/[id]` posts to `POST /lots/:id/reserve` through a BFF route, gated on `property:write` (the staff persona holds `property:read` and sees a read-only explanation instead of a broken button). Fixture mode mirrors the same transition rules. **Reserve-and-PAY is still not wired** — buying a lot through checkout needs the M1 lot-as-order-line decision.
- ❌ **Deferred:** Interactive GIS map, GeoJSON payloads, lot-as-order-line (buying a lot through checkout — `POST /sell` records an `order_number` for provenance but nothing reconciles it), ownership transfer, interment scheduling, search by proximity. `occupied` / `for_transfer` / `on_hold` / `maintenance_hold` are states with no workflow to reach them.

## Module E — Billing & Collections
- ✅ **Works:** Invoice list with status filter, aging summary, overdue highlighting, outstanding total. **Backend live:** finance-billing serves the frozen list shape (KEB-D4-01); invoices are raised from `order.fulfilled` and the money path posts to the GL, proven by `platform/tests/e2e.sh`.
- ⚠️ **Provisional:** "Overdue" and the aging bucket are **derived client-side** from `due_at`, not stored — the rules are frozen in `billing-list-api-v1.md` and unit-tested, but they are a presentation convention, not a service guarantee. `getInvoice` resolves through the list (the service addresses invoices by capability token, the screens hold ids). The list is unpaginated. **Collections-this-month is not shown at all** — it needs payment history the list does not carry.
- ❌ **Deferred:** Payment recording from the UI (the API supports it; the screen is read-only), statement of account, collection notes, refund processing. *(carryover)* Official receipt generation now exists (documents ⓡ, #12) — but it is triggered by the event, not by a button, and there is no "print receipt" action on the billing screen yet.

## Module F — Accounting
- ✅ **Backend exists:** accounting service with generic ledger, posting rules, trial balance (Keb-built).
- ⚠️ **No frontend screen:** Accounting is viewable only via direct DB query or future reporting screen.
- ❌ **Deferred:** Staff-facing accounting screens, journal entry viewer, financial statements.

## Module G — Human Resources
- ✅ **Works:** Employee directory with search, employee detail with contact info, attendance table, leave requests table.
- ⚠️ **Provisional:** All data is fixture-only (hr service is unbuilt — D13 gap). No module spec exists beyond service-priorities.md description. HR scopes (`hr:read`) are invented provisionally — may change when Keb freezes the hr contract.
- ❌ **Deferred:** Real backend persistence, attendance recording, leave request submission/approval, payroll integration, department management.

## Module H — Funeral Cases & Operations
- ✅ **Works:** Cases list with stage filter, case detail with stage progression, tasks checklist, linked services display. **Backend live:** a paid order creates a funeral case with its stage task template (`order.fulfilled` → funeral-cases), and that case creation books a chapel (`case.stage_changed` → scheduling-resources). Both hops run on real events with idempotent consumption; scenario H is proven end-to-end by `platform/tests/e2e-ops.sh`. Document repository with type/status filter (fixtures).
- ⚠️ **Provisional:** A case opened from an order shows `deceased_name: "Pending intake"` until staff complete intake — `order.fulfilled` v1 carries the *purchaser*, and the checkout contract is frozen. The API supports task status changes and stage moves; **the ops board screen is still read-only** — it renders tasks but does not PATCH them. Auto-booking uses a fixed rule (default chapel, next day 09:00–17:00 UTC), not staff choice. *(carryover)* Documents are no longer unbuilt — see Module J — but nothing links a case to its documents yet: `related_case_number` exists on the shape and no producer sets it.
- ❌ **Deferred:** Task completion from the UI, staff-chosen booking windows, vehicle dispatch, document upload/verification workflow, deceased/intake record as a first-class entity.

## Module I — Dashboards & Reporting
- ✅ **Works:** Dashboard with session info, permissions display, and summary tables that **aggregate the same clients the screens use**, in every mode. The dashboard can no longer contradict a screen — that is structural now, not coincidental (it previously read 6 cases while the live board showed 4). Each table is still scoped to the same permission as the screen it mirrors.
- ⚠️ **Provisional:** Aggregation happens **in the web tier**, by listing every record and counting — fine at VM's volume, not a reporting service. reporting-analytics is still unbuilt. Figures with no source render "—" rather than a number: collections-this-month (no payment history) and both activity counts (no inquiries or orders list endpoint). A source that fails to load nulls its own section rather than the page.
- ❌ **Deferred:** A real aggregation service, charts/visualizations (cut line #4 invoked), drill-down reports, export, scheduled reports, executive dashboards.

## Module J — Documents & Contracts
- ✅ **Works:** Document repository with type/status filter, document metadata display (number, title, type, status, uploader, size). *(carryover)* **Backend live:** documents ⓡ serves the frozen `Document` shape (`contracts/documents-api-v1.md`), and **every completed payment generates an official receipt** — `payment.completed` → receipt → visible in the repository, rendered artifact viewable from the screen. Proven by `platform/tests/e2e.sh`.
- ⚠️ **Provisional:** *(carryover)* Screens read live documents when `DOCUMENTS_BASE_URL` is set (the dedicated profile now sets it), fixtures otherwise — **and the two differ on purpose**: the fixture repository shows uploaded permits and certificates, which v1 cannot store, while live mode shows what the service can genuinely produce. Generated artifacts are **HTML, not PDF**. Seeded rows are generic per ADR-005 (documents is a ⓡ service) and sit in the 9xxxx number band.
- ❌ **Deferred:** **Upload** (no object store — the button stays disabled), PDF rendering, versioning, e-signature, per-document access control, retention. **Per-installment receipts**: `payment.completed` fires once per invoice at fully-paid, but VM's counter issues a receipt for every payment — that needs a `payment.recorded` event finance-billing does not emit (M1 contract decision). **Payer name on the receipt**: `payment.completed` v1 carries no payer, so the receipt renders "Issued to: —".

## Module H/D scheduling — conflict handling
- ⚠️ **Overlapping bookings are flagged, never blocked** (cut line #3, deliberate). `Booking.conflicting` warns on both sides of a clash; the calendar shows it. Auto-conflict blocking needs resolution UX that CP-1 does not ship, and a wrong block in a funeral operation is worse than a visible warning.
- ❌ **No schedule screen.** `/staff/schedule` is still a gated placeholder — the bookings API exists with no UI in front of it.

## Cross-Cutting Limitations
- **Partial live backend integration:** `AUTH_BASE_URL`, `COMMERCE_BASE_URL`, `PROPERTY_BASE_URL`, `OPERATIONS_BASE_URL` and `BILLING_BASE_URL` switch their screens to live services; the dashboard follows automatically because it aggregates those clients. HR and documents remain fixture-only — those services are unbuilt.
- **Demo persona buttons fill the email only by default.** One-click fill is an explicit server-side opt-in: `DEMO_QUICK_FILL=1`, resolved per request and delivered in that response — never inlined into public JavaScript. The password comes from `DEMO_QUICK_FILL_PASSWORD`, or from the recorded dev seed when the web tier itself serves fixtures; a gateway-backed deployment must set the explicit password. **When enabled, the deployment's demo password is disclosed to anyone who loads the sign-in page — demo deployments only.** `NEXT_PUBLIC_DEMO_PASSWORD` remains a local-dev-only inlining path and is never set on deployed builds.
- **Fixture/live parity is manual.** The property and cases seeds mirror the web fixtures by hand. Nothing fails if they drift; a parity test is in the Phase-2 backlog.
- **`getCase` resolves through the list in live mode.** funeral-cases addresses cases by `case_number` (a capability token), while the screens hold record ids. One extra hop, no contract change. Fine at demo scale, not at VM's real volume.
- **RBAC scopes are now frozen** (`contracts/rbac-scopes-v1.md`), including `hr:*` and `documents:*`. Nothing yet asserts that the frozen list, the identity seed and the web nav stay in sync — that check is in the Phase-2 backlog.
- *(carryover)* **Tenant isolation is now tested across the stack.** `platform/tests/e2e-tenant.sh` provisions a second tenant through the real tenancy API, bootstraps its administrator, and asserts that a FULL admin of tenant B sees nothing of tenant A across property, cases, scheduling, billing, documents and audit — including 404 (not 403) on a foreign id, refusal of a mutation, and a spoofed `X-Tenant-Id` header changing nothing. What it exposes: **there is still no API to provision a tenant's first user** — the test bootstraps one with a `rails runner` script, which is the Phase-2 Week-2 provisioning gap made visible.
- *(carryover)* **Static analysis now runs.** brakeman + bundler-audit across all 11 services (`platform/tests/security-smoke.sh`), clean at the time of writing. Note this is a *local* gate: CI still cannot run (#43).
- *(carryover)* **Every service's Rails suite can now be run without Ruby on the host** (`platform/tests/service-suite.sh`) — the production image excludes dev/test gems, so before this there was no way to run a suite locally at all. Running them found identity-access's suite red: its tests sign in as a seeded persona, and the CI recipe migrated the test database without seeding it. Fixed in the recipe, not in the tests.
- **No performance optimization:** Screens load all records client-side for filtering (acceptable for demo-sized datasets). Live list endpoints are unpaginated.

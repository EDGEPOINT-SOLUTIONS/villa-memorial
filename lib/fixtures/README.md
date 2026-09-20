# Recorded contract fixtures

Fixtures mirror REAL response shapes of frozen contracts / live service code so
screens demo standalone (`docker compose up` against `stub-gateway/`, or bare
`npm run dev` with no `AUTH_BASE_URL`).

## Rules (see web/AGENTS.md rule 2)

1. **Provenance is mandatory** — every file documents which contract/service
   shape it records. Current sources:
   - `auth/personas.json` ← identity-access seeds (`db/seeds.rb`) +
     login response envelope (`api/v1/auth_controller.rb`) +
     JWT claims v1 (`docs/08-delivery/contracts/jwt-claims-v1.md`).
   - `landing/content.json` ← the front-end Landing Page CMS seam (approved in
     the Lavish villa-landing-plan): an APP-AUTHORED content model, NOT a
     service response — no content contract exists yet. Prices inside are
     pinned to the real 2026 figures of `lib/villa-pricing.ts` by its
     fixture-contract tests. Replaced by recorded fixtures once a content
     contract freezes (see the file's own comment + `lib/api-client/landing.ts`).
   - `content/pages.json` ← the page documents of the content catalogue
     (Phase 0+1, captain review 2026-09-21): `park · services · plans · coffins`
     for Pages & content. APP-AUTHORED with provenance in its own `_provenance`
     block — the hero words are the CURRENT PAGE COPY transcribed from the live
     pages, not new marketing copy, and no price is authored anywhere (price
     blocks bind to catalogue SKUs / the pricing store). Home is NOT stored
     here: it is the landing document above. Read/written by
     `lib/api-client/content-pages.ts` (in-process, like landing content) and
     saved through `POST /api/content/pages`; the model is `lib/content-catalog.ts`.
   - `commerce/catalog-items.json` ← the FROZEN `GET /api/v1/catalog_items`
     response shape (docs/08-delivery/contracts/order-payment-api-v1.md) with
     the client's real 2026 price-list figures: SKUs unchanged, prices and four
     names aligned to the sheets transcribed in `lib/villa-pricing.ts` and
     pinned by `tests/fixture-contract/commerce.test.ts`. The ONE item → client
     document → figure map is `lib/catalog-sources.ts`, enforced by
     `tests/fixture-contract/catalog-sources.test.ts` — a published entry whose
     price has no recorded client source fails that test, naming the item. This
     DIVERGES from the upstream platform seed (still placeholder-priced — see
     the file's comment); the four items no 2026 sheet prices (`SRV-LIGHTS`,
     `ADD-COFFIN-LIZO-SR`, `ADD-FLOWERS`, `ADD-URN`) were WITHDRAWN 2026-09-18
     rather than published at an invented figure (`WITHDRAWN_CATALOG_ITEMS`).
   - `commerce/orders.json` ← recorded demo orders for the staff Orders admin.
     Each row WRAPS the FROZEN order-payment-api-v1 envelope with app-authored
     admin fields (checkout contact, fulfilment lifecycle, timeline) — NO
     contract names an order-admin record yet, so the wrapper is a fixture/demo
     shape and live mode answers 503. Seed orders mirror the billing fixture's
     invoice numbers/customers/totals; SKUs, prices and totals are pinned to
     `commerce/catalog-items.json` by `tests/fixture-contract/orders.test.ts`
     (the withdrawn SKUs no longer appear in the demo orders either).
     Fixture-mode checkout APPENDS to `ORDERS_STORE_PATH` (default
     `.data/commerce-orders.json`, gitignored) — see
     `lib/api-client/order-store.ts` for the storage rationale.
   - `commerce/pricing.json` ← the RECORDED 2026 plan tables + lot price list
     (app-recorded content, NOT a service response): no catalog-pricing read or
     write contract exists, so live mode keeps this seed for display and refuses
     admin writes with 503. The plan/lot figures are transcribed from the
     client's own sheets (COMPLETE MEMORIAL PACKAGE.jpg, TYPES OF COFFIN.jpg,
     PRICE LIST FOR 2026.jpg) and pinned by `tests/unit/villa-pricing.test.ts` +
     `tests/fixture-contract/pricing.test.ts` (plan monthly figures must equal
     the plan SKUs in `commerce/catalog-items.json`). It also carries the
     read-only `questions` (the senior-rate sheet conflict and the office's
     per-plot lot quotation vs the lot sheet's families), deliberately OUTSIDE
     the editable document.
     Fixture-mode edits from `/staff/plans` and `/staff/pricing` APPEND to
     `PRICING_STORE_PATH` (default `.data/commerce-pricing.json`, gitignored) —
     see `lib/api-client/pricing-store.ts`. The property lots' own areas/prices
     are STATIC demo records, not this document: `lib/catalog-sources.ts`
     (`LOT_FAMILY_BY_SECTION`) maps each park section to a lot sheet family and
     `tests/fixture-contract/catalog-sources.test.ts` pins them to it.
   - `scheduling/chapel-admin.json` ← the park's OWN chapel administration
     records (staff Schedule → chapels/availability/bookings): the editable
     PLACEHOLDER chapel list (class · capacity · active · notes) keyed to the
     scheduling resources fixture, plus (empty) closed ranges and booking
     confirmation/cancellation records. NO contract names these: booking-events-v1
     defers resource maintenance windows and exposes no resource write endpoint,
     so they are an app-authored shape and live mode answers 503. Seeded chapel ids
     and classes are pinned to `scheduling/resources.json` +
     `lib/chapel-booking.ts`'s fallback rules by
     `tests/fixture-contract/chapel-admin.test.ts`; fixture-mode edits APPEND to
     `CHAPEL_STORE_PATH` (default `.data/scheduling-chapel-admin.json`,
     gitignored) — see `lib/api-client/chapel-store.ts`. The customer booking
     dialog reads the same records through `/api/chapel/schedule`.
   - `property/lot-lifecycle.json` ← the office's OWN recorded file for a lot's
     paperwork (staff lot records F-11: Ownership · Transfers · Interments ·
     Exhumations): transfer requests in the clerk's four states, interment
     records with the checks before the ground is opened, exhumation requests
     with their requirements, and the papers that back a lot. NO service owns
     any of it — lot-events-v1 (KEB-D3-01, FROZEN) makes `occupied` and
     `for_transfer` status-only and says interment/transfer workflows do not
     exist — so this is APP-AUTHORED example data with provenance, the same
     pattern as `family/workspace.json`. It cross-references the lots, cases,
     documents, parks and customers fixtures (and the purchase application's
     beneficiaries); nothing is invented and no amount appears anywhere —
     `tests/fixture-contract/lot-lifecycle.test.ts` pins every cross-reference,
     and `lib/api-client/lot-lifecycle.ts` is the only reader.
   - `crm/lead-records.json` ← the office's OWN lead file for the CRM area
     (PRD S4 Lead Detail + the Sales pipeline screen): per lead, the person and
     the enquiry, the recorded pipeline movement, the recorded contact history,
     the recorded next step and who is handling them. crm-families is unbuilt
     (docs/02-architecture/microservices.md:49), so this is APP-AUTHORED example
     data with provenance and `lib/api-client/crm-leads.ts` offers no live mode.
     Its enquiry fields are the matching `crm/inquiries.json` row, and for a
     person the agent portal also carries, the owner/stage/movement/contact/
     next step MIRROR `agent/workspace.json` exactly —
     `tests/fixture-contract/crm-leads.test.ts` fails on any drift and on any
     amount-like leaf. The pipeline vocabulary itself is not repeated here:
     `lib/crm/lead-view.ts` re-exports the agent record's own stage words.
   - `finance/commission.json` ← the recorded STATE of the commission engine for
     the staff Commission screen (F-12): app-authored, because no commission
     contract exists and the engine is deferred platform scope
     (finance-billing.md §Commissions). The client has not fixed the rules or
     rates (open-questions.md — “Commission rules and rates”), so every
     rate-derived amount is deliberately absent and no rate may ever be added
     here; `tests/fixture-contract/commission.test.ts` walks the file and fails
     on one. The engine's vocabulary (seven bases, four states, capabilities)
     lives in `lib/commission.ts`, pinned to the agent workspace fixture; what
     actually sold is NOT here — the screen reads the durable order store.
   - `commerce/inventory.json` ← the office's recorded stock file for the
     Inventory screen: items (caskets · urns · flowers · supplies) with SKU,
     supplier, cost, on-hand count, location and reorder level, plus the signed
     movement history (received · allocated to a case · adjusted). APP-AUTHORED
     example records with provenance — no inventory service or contract exists,
     so `lib/api-client/inventory.ts` is fixture-only and names the missing
     service once on screen. The casket rows carry the storefront's real SKUs and
     their PRICES ARE NOT STORED HERE: the reader resolves each price from the
     durable catalogue, so an admin price edit is what the stock screen shows.
     Supplier names are Sample labels; `by` names are HR employees; movements sum
     to each item's on-hand count and allocated ones name real cases — all pinned
     by `tests/fixture-contract/inventory.test.ts`.
   - `finance/accounting.json` ← the office's recorded ledger for the Accounting
     screen: a small chart of accounts and a balanced double-entry journal. The
     platform's accounting service exists and its posting-rule contract is frozen,
     but NO staff-facing ledger API has frozen, and posting stays the service's
     business (the screen is read-only) — so this is APP-AUTHORED example
     bookkeeping with provenance, served only in fixture mode by
     `lib/api-client/accounting.ts`. The trial balance is never stored: it is
     DERIVED from the entries by `lib/accounting.ts`. Entries naming an order or
     case carry that order's total / a real case number, pinned by
     `tests/fixture-contract/accounting.test.ts`.
   - `memorials/memorials.json` ← the recorded state of the PUBLIC digital-memorial
     surface (F-04 / 06-cultural-digital-memorial/digital-memorial.md, blueprint
     §22–23). APP-AUTHORED because NO digital-memorial service or contract exists:
     the file records `service_state: "not_wired"` and an EMPTY `memorials` list,
     because the demo family's own record
     (`lib/fixtures/family/snapshot.json#loved_one`) has chosen no visibility. This
     is the privacy floor in data form — nothing is published by default and no
     memorial may be fabricated to make the screens look alive. The three
     visibility choices, the searchable/never-shown rules and the search matching
     live in `lib/memorials.ts`; `lib/api-client/memorials.ts` is the tolerant
     reader and DROPS every record whose visibility is not `published`, so a
     private or undecided record can never reach a page shape. A published
     record's shape (name · life dates · family words · optional photograph ·
     resting place) is validated field by field there, and
     `tests/unit/memorials-pages.test.tsx` renders it from a test-only record —
     the fixture itself never carries a fabricated person.
   - `operations/guarantee-instruments.json` ← the guarantee-instrument tracker
     (F-18 / FORMS_PLAN gap 5): per case, the LGU/DSWD/SSS/GSIS/life-plan
     deductions its Funeral Service Contract records, with the office's filing
     state, the agency's response, the contract's own ID/plan blank where the
     paper has one, and the supporting-document checklist. APP-AUTHORED demo
     records — no contract names a guarantee-instrument record (the sub-ledger,
     the deduction math and posting are dev-owned), so live mode answers
     `not_wired` through `lib/api-client/guarantee-instruments.ts` and only
     fixture mode serves these. Amounts and references are EXAMPLE values (no
     client document in the repo prices a family's guarantee); a row with
     `amount_cents: null` renders an em dash. The three-day deadline is NOT
     stored: it is derived from the case's recorded contract date
     (`lib/guarantee-instruments.ts`, paper clause 2) and pinned by
     `tests/fixture-contract/guarantee-instruments.test.ts`.
   - `operations/dispatch.json` · `operations/work-orders.json` ·
     `operations/notifications.json` ← the three designed admin screens
     (`/staff/dispatch`, `/staff/work-orders`, `/staff/notifications`). ALL THREE ARE
     APP-AUTHORED with provenance, because none of their services exists: dispatch is
     D5 scheduling-resources (no dispatch contract — live answers 503), work orders
     are the unbuilt field-ops service (live answers 503), and notifications are P4
     (no contract and no outward API — the log is EMPTY and no message may be
     fabricated). Dispatch cross-references the real case records and the HR
     directory; work orders cross-reference scheduling resources, dispatch vehicles
     and property lots and derive overdue from the recorded due date against the
     file's own `as_of` day; the notification catalogue carries the four designed
     message types, audiences and channels and no recipient detail. Pinned by
     `tests/fixture-contract/dispatch.test.ts`, `work-orders.test.ts` and
     `notifications.test.ts`; readers are `lib/api-client/dispatch.ts`,
     `work-orders.ts` and `notifications.ts`.
   - `platform/tenants.json` ← the platform operator surface (PRD screen
     inventory "Platform Dashboard/Tenant Management · Platform Login · Tenant
     Sign-Up"; classification `02-architecture/platform-administration.md`).
     APP-AUTHORED SAMPLE RECORDS: the platform surface is not tenant-scoped,
     platform admins are a separate identity type and sign-up creates a tenant
     + its owner in one transaction — but NO tenancy service, platform identity
     service or sign-up endpoint exists in this build, so the screens are a
     designed reference and read-only. The samples rule is hard: every row is
     `sample: true`, named "Sample"/"Example", on the reserved `.example` TLD,
     and `lib/api-client/platform.ts` REFUSES an unmarked row; the state/plan
     vocabulary (active_trial / trial_expired / cancelled, free_trial) and the
     14-day trial are pinned by `tests/fixture-contract/platform.test.ts`.
2. **Never hand-edit a fixture to make a failing test pass.** If the contract
   changed, update the fixture AND its contract test together.
3. Fixture tokens are structurally shaped but UNSIGNED — they exist only so
   session plumbing works without a live issuer. They must never be accepted by
   any real service (services verify RS256 via JWKS).
4. Drift between fixtures and upstream specs fails CI nightly once services
   publish OpenAPI specs (identity-access spec is still template-generic).

## Platform-contract pre-wire (2026-09-21)

The app-side pre-wire (`lib/live-mode.ts`, `lib/contracts/validate.ts`,
`lib/contracts/proposed-shapes.ts`) turns the platform-contracts plan into a swap. It
does NOT add a contract or change a record. The fixtures below are the recorded shapes
a proposed packet describes; `tests/fixture-contract/proposed-contracts.test.ts` reads
each through the shared validation layer against its proposed field list, so a fixture
that drifts from the proposal fails loudly (naming the field).

| Fixture | Proposed packet | Live state |
|---|---|---|
| `crm/customers.json` · `crm/inquiries.json` | C1 crm-families | refuses — `CRM_NOT_WIRED` 503 |
| `hr/employees.json` | C2 HR | refuses — `HR_NOT_WIRED` 503 |
| `family/snapshot.json` · `family/workspace.json` | C8 family API | declared, fixture-only |
| `agent/workspace.json` | C9 agent workspace | declared, fixture-only |
| `finance/commission.json` | C15 commission engine | declared, fixture-only |
| `memorials/memorials.json` | C18 digital memorials | declared, fixture-only |
| `operations/notifications.json` | C7 notifications | declared, fixture-only |
| `commerce/inventory.json` | C28 inventory | declared, fixture-only |
| `finance/accounting.json` | C4 accounting read | declared, fixture-only |
| `property/lot-lifecycle.json` | C14 lot lifecycle | declared, fixture-only |
| `operations/preparation-records.json` | C22 preparation | declared, fixture-only |
| `operations/guarantee-instruments.json` | C23 guarantee instruments | declared, fixture-only |
| `property/purchase-applications.json` | C11 purchase application | declared, fixture-only |
| `commerce/membership-applications.json` | C21 membership/COC | declared, fixture-only |
| `commerce/orders.json` | C6 order admin | refuses — `ADMIN_ORDERS_NOT_WIRED` 503 |
| `commerce/pricing.json` | C5 pricing write | refuses — `PRICING_ADMIN_NOT_WIRED` 503 |

Every one is PROVISIONAL: no contract under `docs/08-delivery/contracts/` names these
records, and the proposed field list is the packet the platform dev is asked to freeze
(`lib/live-mode.ts` is the switch registry; its `module` column names the reader each
packet will enter through). When one freezes, replace the fixture with a recorded
response and delete the matching `*_NOT_WIRED` constant in the same PR.

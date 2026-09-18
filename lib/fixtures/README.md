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

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
2. **Never hand-edit a fixture to make a failing test pass.** If the contract
   changed, update the fixture AND its contract test together.
3. Fixture tokens are structurally shaped but UNSIGNED — they exist only so
   session plumbing works without a live issuer. They must never be accepted by
   any real service (services verify RS256 via JWKS).
4. Drift between fixtures and upstream specs fails CI nightly once services
   publish OpenAPI specs (identity-access spec is still template-generic).

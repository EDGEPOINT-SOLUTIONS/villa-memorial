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
     pinned by `tests/fixture-contract/commerce.test.ts`. This DIVERGES from the
     upstream platform seed (still placeholder-priced — see the file's comment);
     the four items no 2026 sheet prices keep their seed amounts.
   - `commerce/orders.json` ← recorded demo orders for the staff Orders admin.
     Each row WRAPS the FROZEN order-payment-api-v1 envelope with app-authored
     admin fields (checkout contact, fulfilment lifecycle, timeline) — NO
     contract names an order-admin record yet, so the wrapper is a fixture/demo
     shape and live mode answers 503. Seed orders mirror the billing fixture's
     invoice numbers/customers/totals; SKUs, prices and totals are pinned to
     `commerce/catalog-items.json` by `tests/fixture-contract/orders.test.ts`.
     Fixture-mode checkout APPENDS to `ORDERS_STORE_PATH` (default
     `.data/commerce-orders.json`, gitignored) — see
     `lib/api-client/order-store.ts` for the storage rationale.
2. **Never hand-edit a fixture to make a failing test pass.** If the contract
   changed, update the fixture AND its contract test together.
3. Fixture tokens are structurally shaped but UNSIGNED — they exist only so
   session plumbing works without a live issuer. They must never be accepted by
   any real service (services verify RS256 via JWKS).
4. Drift between fixtures and upstream specs fails CI nightly once services
   publish OpenAPI specs (identity-access spec is still template-generic).

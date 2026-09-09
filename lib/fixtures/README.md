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
2. **Never hand-edit a fixture to make a failing test pass.** If the contract
   changed, update the fixture AND its contract test together.
3. Fixture tokens are structurally shaped but UNSIGNED — they exist only so
   session plumbing works without a live issuer. They must never be accepted by
   any real service (services verify RS256 via JWKS).
4. Drift between fixtures and upstream specs fails CI nightly once services
   publish OpenAPI specs (identity-access spec is still template-generic).

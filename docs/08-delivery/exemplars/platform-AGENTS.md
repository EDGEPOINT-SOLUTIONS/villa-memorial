# AGENTS.md — `platform` (identity-access · tenancy-config · audit)

> Keb-owned exemplar per `docs/08-delivery/agents-md-standard.md`. Copied into the `platform`
> repo at scaffolding time; service-specific AGENTS.md files extend it, never weaken it.

## Purpose
The platform bundle is the trust root of the whole system: identity-access issues the JWTs every
service verifies, tenancy-config owns tenant/module-flag state, audit records who did what.
Everything else in the architecture assumes these three are correct. **Security foundation;
everything trusts it** (microservices-build-plan ownership map) — which is why this repo is
Keb-merge-only for any change.

## Repo layout
One repo, three services (splits happen post-CP-2, never mid-sprint):
```
platform/
├── services/identity-access/    # JWT issuance, JWKS, login, users/roles/permissions enforcement
├── services/tenancy-config/     # tenant provisioning, module registry (flags A–J+)
└── services/audit/              # append-only trail + query endpoint
```
Each service directory satisfies the full template DoD (`docs/02-architecture/service-template.md`)
independently: own compose, own DB, own contracts.

## Non-negotiable rules (merge blockers — Keb merges everything here)
1. **Private keys never leave identity-access.** Signing keys live only there (env/KMS). Every
   other service and the gateway see public material (JWKS endpoint or pinned PEM) only.
2. **Tenant context is claim-borne.** `tenant_id` enters the system ONLY as a verified JWT claim.
   The gateway forwards verified headers for convenience — services must re-verify tokens and may
   not trust edge headers alone.
3. **Audit rows are append-only.** No UPDATE/DELETE paths exist, not even for admins. Corrections
   are compensating entries.
4. **Module flags gate features, they don't hide them.** A dark module's API returns 404-class
   responses at the gateway; its data remains intact for re-enablement.
5. **RBAC matrix is data, not code.** Roles/permissions seed from the RBAC matrix doc; code reads,
   never hard-codes, the mappings.

## Traps (things agents get wrong here)
- Generating a fresh RSA keypair per boot — breaks every downstream verifier. Keys persist via
  env/volume; rotation is an explicit, documented operation (publish new JWKS before old expires).
- Putting permissions checks inside UI concerns — authorization is enforced at each service
  boundary regardless of what the frontend shows.
- Writing audit events synchronously on the request path without outbox — audit writes use the
  same transactional-outbox pattern as domain events.
- Treating `sub` (user id) as globally unique — it is unique per issuer/tenant pairing.

## Self-check commands (before every PR)
```bash
for svc in services/*/; do (cd "$svc" && npm run check); done
docker compose -f docker-compose.platform.yml up --build -d   # all three healthy + seeded
npx vitest run tests/integration                              # cross-service: login → token → audited call
```

## Contracts owned by this repo (freeze discipline)
- JWT claims shape (frozen EOD Mon Aug 25) · tenant-context header · audit event types v1
- Changes: bump versions, new schema files, one PR, Keb review, announce in sync before merge.

# Frozen cross-track contract — KEB-D1-01
# JWT claims shape v1 — producer: identity-access · consumers: ALL services, edge gateway

## Status
**FROZEN as of Tue Aug 25** (Day 1 EOD gate). Changes require Keb review; bump `version`,
never edit in place. Reference implementation: `platform/services/identity-access/src/domain/tokens.ts`.

## Access-token format
RS256 JWT, `kid` header REQUIRED (JWKS key selection). Issued only by identity-access.

## Claims (v1)
| Claim | Type | Notes |
|---|---|---|
| `sub` | string (uuid) | users.id — unique per issuer+tenant pairing |
| `tenant_id` | string | THE tenant context; services derive scoping from this ONLY |
| `scopes` | string[] | permission codes `{module}:{action}`, e.g. `"orders:write"` |
| `iss` | string | optional in dev; pinned in staging+ |
| `iat`, `exp` | int | access TTL default 900s (`ACCESS_TTL_SEC`) |

## Rules
1. Tokens without `tenant_id` are valid authn but fail every tenant-scoped call
   (services return 401 via `tenantGuard`).
2. Scopes are derived from RBAC data at issue time — never embedded from request input.
3. Refresh tokens are opaque (uuid.random), sha256-hashed at rest, rotated with
   family reuse-detection: replay of a rotated token revokes the whole family.
4. Verification: consumers use JWKS (`GET /identity/.well-known/jwks.json`) or pinned PEM
   (offline/VM profile). identity-access itself self-verifies via its signing_keys table.

## Known limitations (documented, not silent)
- No audience (`aud`) claim in v1 — acceptable while one consumer class exists; add in v2
  when partner/native-app access lands (see ADR-004 revisit triggers).
- No token revocation list for ACCESS tokens — short TTL is the mitigation; refresh
  families revoke server-side.

# AGENTS.md — identity-access

> Exemplar #3 per `docs/08-delivery/agents-md-standard.md` (Wave 0 deliverable). Extends
> [`platform-AGENTS.md`](platform-AGENTS.md); lives beside `src/` when the service scaffolds
> Monday from the template.

## What this service owns
- Users, roles, permissions (seeded from the RBAC matrix), login, JWT issuance (RS256), JWKS
  endpoint at `/.well-known/jwks.json`, token refresh + revocation.
- It is the ONLY issuer of platform JWTs. Nothing else mints tokens, ever.

## Owned entities / events
- Tables: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens`
- Published: `user.authenticated` v1? — NO. Login is a synchronous API concern; no event unless
  security-audit requires it (decide with Keb before adding any event).

## Non-negotiable rules (in addition to platform exemplar)
1. Password hashing: argon2id (or bcrypt cost ≥12 if argon2 unavailable). Never reversible
   storage, never logs containing credentials.
2. Token lifetimes: short access TTL (~15 min), refresh rotation with reuse-detection → revoke
   family on replay. Concretely: refresh-token table keyed by token-family.
3. Every authz denial returns 403 (authenticated) or 401 (not) — never 500, never silent allow.
4. JWKS serves PUBLIC keys only. If a private key ever appears in a response, incident-stop and
   rotate immediately.
5. Seeds include one user per persona (admin, staff, agent, customer) with deterministic
   passwords documented in README for demos only.

## Traps (things agents get wrong here)
- Issuing tokens WITHOUT `tenant_id` claim — downstream tenantGuard will 401 every request.
  Claims contract: `sub`, `tenant_id`, `scopes[]`, standard exp/iat.
- Long-lived access tokens "to make demos easier" — demo friction is solved with seeded
  long-lived DEV tokens behind a dev-only env flag, never by changing production defaults.
- Checking password then returning generic error vs specific — return generic ("invalid
  credentials") always; log details server-side only.
- Forgetting `kid` header on issued JWTs — JWKS consumers need it for key selection.

## Self-check commands
```bash
npm run check
# integration: issue → verify round-trip against the template verifier logic
docker compose up --build -d && curl -s localhost:3100/.well-known/jwks.json | head -c 80
```

## Contract surface (freeze EOD Mon Aug 25 — changes need Keb review)
- `POST /api/v1/auth/login` → `{ access_token, refresh_token, expires_in }`
- `GET /.well-known/jwks.json` → JWKS (public keys only)
- `POST /api/v1/auth/refresh` → rotated pair
- JWT claims shape: `{ sub, tenant_id, scopes[], iss, exp, iat }`

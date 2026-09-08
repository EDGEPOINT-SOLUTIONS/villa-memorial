# Frozen cross-track contract — KEB-D1-02
# Tenant-context header v1 — producer: edge gateway · consumers: internal observability only

## Status
**FROZEN as of Tue Aug 25** (Day 1 EOD gate).

## The rule
**Tenant identity comes from verified JWT claims — never from headers, body, or query params.**

The gateway forwards *verified* claims as convenience headers AFTER its own JWT check:

| Header | Source |
|---|---|
| `X-Tenant-Id` | verifier-checked `tenant_id` claim |
| `X-User-Id` | verifier-checked `sub` claim |
| `X-User-Scopes` | space-joined `scopes` claim |

## Binding rules for services
1. Services MUST re-verify the bearer token and derive tenant context from claims
   (`req.ctx.tenantId` set by auth middleware) — these headers are advisory/diagnostic,
   NOT an authorization input anywhere in platform code.
2. Any code path that reads `X-Tenant-Id` to make an authorization decision is a
   security defect (merge blocker).
3. Correlation propagation stays as shipped: inbound `X-Correlation-Id` accepted or
   generated; echoed on responses; written into published events and audit rows.

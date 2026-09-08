# ADR-003: React/Next.js + TypeScript as the platform frontend

- **Status:** Accepted (2026-08-24)
- **Deciders:** Keb (technical lead), JBR (product owner)
- **Related:** [`adr-002-microservices.md`](adr-002-microservices.md) ·
  [`microservices.md`](microservices.md) · [`technology-stack.md`](technology-stack.md) ·
  supersedes the Hotwire rendering approach of
  [`adr-001-rails-monolith.md`](adr-001-rails-monolith.md)

## Context

ADR-002 moved the platform to microservices where every module is an independent codebase with its
own database, integrating via versioned JSON APIs and events. This removes the precondition that
made ADR-001's Rails 8 + Hotwire choice viable: server-rendered HTML required co-location of
rendering and domain logic inside one deployable. Under DB-per-service boundaries there is no home
for monolith views; the frontend must become its own independent, portable codebase consuming the
API Gateway.

`technology-stack.md` already recorded React/Next.js + TypeScript as the evaluated alternative and
the "default direction if a split frontend is ever triggered." That trigger has fired by
construction: the architecture now *requires* a split frontend.

Requirements constraining the choice:

1. **Multi-surface data** — public site, family portal, staff ops boards, PWA/mobile consume the
   same catalog/order/lot/memorial data through versioned APIs.
2. **SEO matters** — funeral-service search traffic and public memorial pages (`public-web`)
   need server-side rendering or static generation.
3. **Server-owned correctness** — money, ownership, schedules, permissions, audit stay behind
   services; the client renders state, never computes it.
4. **Contract-driven parallel tracks** — UI teams build against frozen OpenAPI/event contracts.
5. **Portability** — the frontend itself must satisfy the standalone/portable bar
   (`service-template.md`): own repo, containerized, env config, health checks, contract tests.

## Decision

Adopt **React + Next.js + TypeScript** as the single frontend codebase for all surfaces:

- Public web pages (SSR/ISR for SEO), family portal, staff/admin portals, ops board.
- One repo (`web`), deployed independently; talks only to the API Gateway/BFF over `api/v1`
  contracts — never to service databases or internal endpoints directly.
- Server Components + SSR/ISR for public and content-heavy routes; client components for
  interactive surfaces (cart/checkout, GIS lot map, ops board).
- State/data fetching via typed API clients generated from the services' OpenAPI specs;
  event-driven updates (e.g., ops board live status) via the Gateway's realtime channel backed by
  the outbox stream — never by polling service DBs.
- AuthN via identity-access tokens (JWT in secure cookie/session handled at the BFF); RBAC scopes
  gate UI affordances, but enforcement remains at service boundaries.
- PWA/offline field-ops workflows build on this same codebase (service worker + sync queue)
  per the blueprint §64 requirement.

## Alternatives considered

| Option | Why rejected |
|---|---|
| Keep Rails 8 + Hotwire | No deployable owns domain logic anymore; views would need a dedicated Rails BFF — an extra stack serving only markup |
| React SPA (Vite/CRA) without framework | Loses SSR/SEO for public memorial/catalog pages — a stated product requirement |
| Per-surface frontends (public/portal/admin separate repos) | Multiplies repos beyond team capacity; shared design system + route-level separation achieves isolation cheaper |
| Hotwire Native-first mobile | Mobile deferred; Next.js PWA covers field-ops offline needs first |

## Consequences

**Positive**
- Frontend is one portable codebase consistent with the microservice rule.
- SSR/ISR preserves SEO for public-web traffic; ISR suits slow-changing memorial/catalog content.
- Type-safe end-to-end: TS types generated from OpenAPI keep UI honest against frozen contracts.
- Unblocks React-specialist staffing and the offline-PWA roadmap.

**Negative / accepted costs**
- Node toolchain returns (build pipeline, dependency upkeep) — accepted cost of the pivot.
- Two auth surfaces to reason about (BFF session vs service JWTs) — mitigated by keeping token
  handling in the BFF/Gateway layer only.
- Team must maintain component/design-system discipline across portals (see `design-system.md`).

## Compliance notes

- ADR-001's *rendering rule of thumb* ("server-rendered views when the page is the only consumer")
  is retired; all UI consumes `api/v1` JSON contracts. Its contract discipline (frozen shapes,
  schema-locking tests) carries forward unchanged.
- Deterministic core rule unaffected: no pricing/scheduling/ownership logic in the client.

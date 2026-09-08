# ADR-004: Next.js acts as the BFF; thin config gateway at the edge

- **Status:** Accepted (2026-08-24)
- **Deciders:** Keb (technical lead), JBR (product owner)
- **Related:** [`adr-002-microservices.md`](adr-002-microservices.md) ·
  [`adr-003-react-nextjs-frontend.md`](adr-003-react-nextjs-frontend.md) ·
  [`microservices.md`](microservices.md)

## Context

ADR-003 established `web` (React/Next.js + TypeScript) as a single independent frontend codebase
consuming services only through the API layer. Something must sit between `web` and the ~18
backend services:

- The browser cannot call 18 services directly (auth handshakes, CORS, chatty round trips,
  aggregation leaking into client code, secrets in the client).
- Screens need composed data (ops board = cases + scheduling + property) without N×M request
  fan-out from the client.
- Sessions/cookies should be handled server-side; verified JWTs forwarded downstream.

**BFF (Backend for Frontend)** is a purpose-built aggregation/session layer for one frontend
family. An **API Gateway** is the related infrastructure concern: routing, TLS, rate limiting,
edge auth enforcement.

Options evaluated: (1) Next.js itself as BFF, (2) dedicated Node/TS BFF service, (3) purely
config-driven gateway (Kong/KrakenD/Traefik) including aggregation, (4) hybrid — config gateway
at the edge plus a lightweight code BFF for chatty screens only.

## Decision

**Option 1 now, evolving to Option 4 when triggered:**

1. **`web`'s Next.js server side acts as the BFF.** Route Handlers / Server Components /
   Server Actions fetch, aggregate, reshape, and cache service responses into screen-shaped
   payloads. Session cookies live here; verified JWTs are forwarded to services.
2. **A thin config-driven gateway sits at the edge of the service mesh regardless** — plain
   NGINX/Caddy or Traefik to start. Responsibilities strictly limited to: routing to services,
   JWT validation, rate limiting, TLS. No aggregation logic in gateway config.
3. **Guardrail — the BFF stays dumb**: fetch · aggregate · reshape · session-manage only. Any
   business rule appearing in the BFF layer is a defect; it belongs in an owning service.
   Enforced in code review; no data writes originate from BFF code.
4. **Revisit trigger — extract a dedicated BFF service (Option 2/4)** when any of these land:
   - A second consumer class appears (native mobile app, partner/public API consumers) needing
     shared aggregation — at that point common composition moves into an independent `bff`
     service per the service template, while `web` keeps UI-specific reshaping locally.
   - Gateway-level rate limiting/auth proves insufficient for abuse scenarios.
   - Aggregation latency or deploy coupling between `web` releases and service contract changes
     becomes measurable pain.

## Alternatives considered

| Option | Why rejected for now |
|---|---|
| Dedicated Node BFF service immediately | One more repo/deploy beyond team capacity during MVP; no second consumer exists yet to justify it |
| Config gateway doing aggregation (KrakenD-style) | Complex composition gets awkward in declarative config; debugging worse than TS; still needs custom logic eventually |
| No BFF — browser calls services via gateway only | Chatty multi-service screens, client-side aggregation, session handling in browser — rejected on security and performance grounds |

## Consequences

**Positive**
- Zero additional codebases during MVP; smallest operational surface consistent with ADR-002.
- Type-safe end-to-end from OpenAPI specs through Server Components into UI.
- Edge security (JWT check, rate limiting) enforced uniformly by config, not code discipline.
- Extraction path is mechanical later because all consumption already goes through versioned
  `api/v1` contracts.

**Negative / accepted costs**
- Frontend deploys couple to API shape changes (mitigated by frozen contracts + generated types).
- Aggregation logic lives in the frontend repo where backend-focused reviewers must also look.
- A future dedicated BFF will duplicate some composition code temporarily during migration.

# ADR-002: Microservice architecture with independent, portable codebases

- **Status:** Accepted (2026-08-24) — supersedes [`adr-001-rails-monolith.md`](adr-001-rails-monolith.md)
- **Deciders:** Keb (technical lead), JBR (product owner)
- **Decomposition detail:** [`microservices.md`](microservices.md)
- **Boundary decisions ratified:** 2026-08-24 (commissions in finance-billing · public-web merge ·
  standalone field-ops · standalone ticketing · DB-outbox backbone, no broker) — see
  "Ratified boundary decisions" in [`microservices.md`](microservices.md); service portability
  standard in [`service-template.md`](service-template.md)

## Context

ADR-001 adopted a single Rails 8 monolith for MVP delivery (team of three, hard demo/launch dates).
The product direction has since been set: **microservice architecture where each module is an
independent codebase, standalone and portable.** This decision restructures deployment boundaries
while retaining ADR-001's valid engineering constraints:

- Server-owned correctness (money, ownership, schedules, permissions, audit never in clients).
- Frozen cross-track contracts (JSON APIs + versioned events, e.g. `order.fulfilled` v1).
- Build once, configure many times; client #1 is a tenant.
- Small team — operational overhead must be consciously managed.

## Decision

Adopt a microservice architecture:

1. **Each module = one independent codebase** in its own repository with its own database/schema.
   No shared databases; integration exclusively via versioned APIs and events.
2. **Standalone & portable definition of done** per service: containerized, config via environment,
   own migrations + seeded dev data (`docker-compose.yml` up yields a working demo), health checks,
   versioned contracts, tenant-scoped data and logs.
3. **Event backbone generalizes the outbox pattern** from `08-delivery/contracts/order-fulfilled-event.md`:
   append-only, tenant-scoped, at-least-once, idempotent consumers, dedupe on `event_uuid`,
   forward-compatible `schema_version` handling.
4. **Coarse-to-fine phasing**: begin with ~6 coarse grains (platform, tenancy-config,
   identity-access, commerce, operations, finance) and split along the seams defined in
   `microservices.md` only when change cadence or scaling demands it.
5. **Stack freedom per service**, within guardrails: PostgreSQL (+PostGIS where spatial) default
   store, JSON APIs, versioned event schemas. No service may reach into another's datastore.

## Alternatives considered

| Option | Why rejected / deferred |
|---|---|
| Stay on ADR-001 monolith through launch | Contradicts the settled direction; loses independent deployability and per-module portability now required |
| Immediate fine-grained split (~20 services) | Operational surface (deploys, observability, contract testing) exceeds a three-builder team's capacity; phased coarsening captures most benefits early |
| Modular monolith (separate engines, one deployable) | Preserves boundaries without distributed-systems cost, but does not satisfy the independent-codebase/portability requirement |

## Consequences

**Positive**
- Independent deployability; modules can be developed, tested, demoed, and scaled in isolation.
- Clear ownership seams matching the bounded contexts already documented.
- Portable modules support future dedicated enterprise deployments and partner/franchise models.
- Event-driven core makes reporting/analytics (E2) and AI orchestration (E1) additive consumers.

**Negative / accepted costs**
- Distributed-systems complexity: eventual consistency between services, saga-style flows across
  ordering → cases → scheduling → billing, network failure modes.
- Contract discipline becomes mandatory: every API and event needs versioning and tests locking shapes.
- More repositories and pipelines than the team would ideally carry during MVP; mitigated by phased
  coarse grains and standardized service scaffolding.
- Cross-service queries are forbidden by design; reporting requires the event-fed analytics layer
  rather than direct joins.

## Compliance notes

- Retains ADR-001's rendering rule and JSON-contract strategy; the monolith's `api/v1` namespace
  maps cleanly onto service APIs.
- Deterministic-first rule unchanged: financial calculations, allocations, schedules, statuses stay
  conventional logic inside owning services; AI remains read-mostly at the edges.
- Multi-tenancy isolation requirements (`multi-tenancy.md`) apply per service; tenant context is
  propagated through tokens and event payloads.

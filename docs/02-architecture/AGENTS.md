# AGENTS.md — 02 Architecture

## Scope
How the platform is built: tenancy model, module boundaries, configuration engine, workflow engine,
technology choices, security posture.

## Key decisions captured here
- **Hybrid SaaS**: one codebase, multi-tenant, modular, configurable, extensible; optional dedicated
  enterprise deployments; never clone per client.
- Tenancy hierarchy: Platform → Tenant → Business Unit → Branch → Facility.
- PostgreSQL + PostGIS as default transactional+spatial store (unless a documented decision proves
  otherwise); suggested stack React/Next.js + TypeScript, Node.js (Express/NestJS) backend.
- Config engine + workflow engine are core platform components, not features.
- Three boundaries: CORE (never customize) / MODULES (on-off) / EXTENSIONS (isolated client code).

## Files
- `system-architecture.md` — topology, bounded contexts, API domains, security/audit baseline
- `multi-tenancy.md` — tenancy model, isolation, per-tenant configuration
- `configuration-engine.md` — what is configurable per tenant
- `workflow-engine.md` — configurable stages, approvals, escalations
- `roles-permissions.md` — user roles, granular permission model, role dashboards
- `technology-stack.md` — stack recommendation + decision criteria
- `adr-001-rails-monolith.md` — ADR: Rails 8 + Hotwire monolith (SUPERSEDED for deployment
  boundaries by ADR-002; contract/rendering discipline retained)
- `microservices.md` — service decomposition: catalog, ownership, events, phasing, open decisions
- `adr-002-microservices.md` — ADR: microservices with independent portable codebases, superseding ADR-001
- `adr-003-react-nextjs-frontend.md` — ADR: React/Next.js + TypeScript frontend, one `web` codebase over the API Gateway
- `adr-004-bff-gateway.md` — ADR: Next.js server side as BFF + thin config gateway at the edge;
  extraction trigger for a dedicated BFF
- `adr-005-reusable-service-layers.md` — ADR: two-layer model (reusable platform layers vs domain
  layer); generic-language rule; adaptation-based integration; includes accounting (D12) and hr (D13)
- `adr-006-vm-dedicated-deployment.md` — ADR: Villa Memoria founding client on dedicated
  single-tenant deployment, frozen to IMSMS scope, release-pinned; no forks
- `service-template.md` — standalone/portable definition of done: repo layout, env config, health
  checks, event envelope, contract tests, compose requirements

## Agent guidance
Any new cross-module behavior must be placed in one of: core platform, module, configuration,
workflow rule, or extension. If it doesn't fit cleanly, escalate as an architecture decision.

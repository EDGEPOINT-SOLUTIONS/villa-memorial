# ADR-007: Backend implementation stack reverts to Rails

- **Status:** Accepted (2026-08-25) — supersedes the backend portion of
  [`technology-stack.md`](technology-stack.md)'s 2026-08-24 update for *implementation*;
  microservices decomposition (ADR-002) is UNCHANGED.
- **Deciders:** Keb (technical lead)

## Context

ADR-001 proposed Rails 8 monolith; ADR-002 split it into microservices and the same-day
technology-stack update picked Node.js + TypeScript as implementation language. Wave 0 and
Day 1 were built on that choice (service template, identity-access, tenancy-config, audit —
all green). The team's deepest expertise is Rails; Keb has directed the backend revert.

## Decision

1. **Backend services are implemented in Ruby on Rails (API-only), starting with Rails 8.1.**
   The microservices architecture, service boundaries, repo layout, and coarse-grain bundling
   stand exactly as ratified in ADR-002 / the build plan.
2. **The contract surface is unchanged and remains authoritative** — this is why the revert is
   affordable at all:
   - Event envelope v1 (JSON Schemas, frozen field set)
   - JWT claims v1, tenant-context header v1, audit event types v1
   - Template DoD: compose-up demo, `/healthz`·`/readyz`, forward-only migrations,
     transactional outbox, contract tests, tenant scoping from verified claims only
   - Edge gateway, jwt-verifier sidecar, e2e proof scripts, CI structure
   The template rule "language/framework is free per service, but the contract surface is not"
   (service-template.md) anticipated exactly this swap.
3. **Node implementations move to `legacy/`** and remain runnable reference implementations of
   the contracts until the Rails ports pass the same gates; deleted after CP-1 retro.
4. Frontend stays React/Next.js (ADR-003) — unaffected.

## Consequences

- Day 2 (money spine) proceeds in Rails; its scope absorbs the porting work. The pre-agreed
  cut lines apply if Wednesday's gate slips — no renegotiation mid-sprint.
- Agent-assisted building (Gab's workflow) must be re-pointed at Rails idioms; AGENTS.md
  exemplars updated with Rails-specific traps (N+1s, AR callbacks doing money math, mass
  assignment, `update_column` skipping validations/audits).
- Two stacks coexist briefly (legacy reference + Rails ports) — bounded by CP-1 retro cleanup.

## Alternatives considered

- **Stay on Node through CP-1, revisit later:** lowest schedule risk, but overrules the
  direction now instead of at a natural boundary; compounding investment in the wrong stack.
- **Hybrid (some Node, some Rails):** worst of both for a two-person team — two sets of
  idioms/traps in review, no shared template. Rejected.

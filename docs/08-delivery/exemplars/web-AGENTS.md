# AGENTS.md — `web` (React/Next.js + TypeScript, all portals + BFF)

> Exemplar per `docs/08-delivery/agents-md-standard.md`. Gab-owned with agent assistance;
> Keb reviews every PR. Extends the template's frontend adaptation
> (`docs/02-architecture/service-template.md` §"Frontend adaptation").

## Purpose
Single frontend codebase serving all portals (staff · customer · agent) plus the BFF layer.
Per ADR-004 the Next.js server side IS the BFF: fetch · aggregate · reshape · session-manage.
Screens are built **fixtures-first** against recorded contract fixtures so UI work never waits
on backend services.

## Non-negotiable rules (merge blockers)
1. **The BFF stays dumb** (ADR-004 guardrail): no business rules in BFF/route handlers; no data
   writes originate from BFF code. Business logic found here is a defect — move it to the owning
   service.
2. **Fixture↔contract drift fails CI nightly.** Fixtures are generated/validated against services'
   OpenAPI specs; a service contract change that breaks fixtures must update them in the same PR
   chain, never by hand-editing recorded JSON to make tests pass.
3. **Sessions server-side only.** Access tokens live in httpOnly cookies managed by BFF routes;
   tokens never reach browser JS, localStorage, or logs.
4. **RBAC gates nav AND actions.** Hiding a button is UX; authorization still happens at
   services. The UI must render graceful 403 states when scopes don't allow an action.
5. **Every async screen has error/empty/loading states per design system before merge** (Day 1
   gate). No bare spinners-only screens.

## Traps (things agents get wrong here)
- Calling services directly from client components — everything goes through BFF route handlers
  or the gateway base URL; check `.env.example` for what's available client-side (only gateway
  URL + public keys).
- Hand-rolling fetch wrappers per component — one typed client generated from OpenAPI specs;
  regenerate, don't fork.
- Trusting JWT payload shape at runtime without validation — parse defensively; unknown shapes
  → logged-out state, not a crash.
- Copying Villa-specific vocabulary into shared components — domain terms live in feature
  folders/config; shared kit stays generic (ⓡ discipline applies to UI too).

## Self-check commands (before every PR)
```bash
npm run lint && npm run typecheck && npm test        # unit + fixture-contract tests
npm run build                                        # production build must pass
docker compose up --build                            # SSR on PORT against stub gateway w/ fixtures
```

## Structure conventions
```
web/
├── app/                  # Next.js App Router: routes per portal
│   ├── (staff)/          # RBAC-gated portal frames
│   ├── (customer)/
│   └── api/              # BFF route handlers ONLY — session mgmt, aggregation, reshape
├── lib/api-client/       # GENERATED typed clients from services' OpenAPI specs (do not hand-edit)
├── lib/fixtures/         # recorded contract fixtures; validated nightly vs specs
└── components/ui/        # design-system components — generic, zero domain vocabulary
```

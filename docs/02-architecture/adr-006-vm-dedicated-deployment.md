# ADR-006: Villa Memoria as founding client on a dedicated, feature-frozen deployment

- **Status:** Accepted (2026-08-24)
- **Deciders:** Keb (technical lead), JBR (product owner)
- **Related:** [`adr-002-microservices.md`](adr-002-microservices.md) ·
  [`multi-tenancy.md`](multi-tenancy.md) · [`../08-delivery/service-priorities.md`](../08-delivery/service-priorities.md) ·
  [`../08-delivery/microservices-build-plan.md`](../08-delivery/microservices-build-plan.md)

## Context

Villa Memoria is the founding client whose requirements shaped the blueprint. Per agreement:

- Their copy of the system runs on a **separate, dedicated server** — it is **not** part of the
  SaaS tenancy pool.
- Their feature set is **frozen** to the contracted IMSMS scope (modules A–J, per
  `service-priorities.md`): customer management, memorial plans, funeral services, memorial lot &
  cemetery, billing & collection, accounting, HR, documents, dashboards, system administration.
- Contract deliverables include source code, database scripts, installation/deployment files, and
  documentation — i.e., VM receives a complete, operable system.

The platform principle "build once, configure many times" and the hybrid-SaaS stance in
`multi-tenancy.md` (optional dedicated enterprise deployments) anticipate exactly this situation.

## Decision

1. **One codebase, two deployment profiles.**
   - **SaaS profile:** multi-tenant cloud deployment; evolves continuously per product roadmap.
   - **VM profile:** dedicated single-tenant deployment of the *same* services, pinned to a
     stable release line, hosted on VM's own server.
2. **No fork, ever.** VM runs identical service code. Divergence happens only through:
   - **Version pinning** — VM adopts tagged releases on its own schedule (default: security and
     correctness fixes only; feature adoption is opt-in).
   - **Configuration** — module on/off flags (`tenancy-config`) restrict VM to modules A–J;
     everything else stays dark, not deleted.
3. **Single-tenant mode is a configuration, not a variant.** Services retain full tenant
   machinery; the VM deployment provisions exactly one tenant at install time. No `#ifdef`-style
   forks, no separate branches per client — only release tags.
4. **Freeze mechanics:** the VM release line is cut at executive acceptance (Wave 4). Post-freeze,
   changes reach VM solely via patch releases that pass the full template DoD + regression suite.
5. **SaaS evolution continues on main** — deferred-backlog features (AI copilots, digital
   memorials, field-ops PWA, ticketing extraction) ship to SaaS tenants without touching VM until
   VM opts in.

## Consequences

**Positive**
- Founding client gets isolation, predictability, and contractual scope stability.
- Platform validates its own portability claim early: a clean dedicated deploy is the strongest
  proof the service template and ⓡ layers actually work.
- No maintenance cliff from cloned codebases — the exact anti-goal (`product-vision.md`).
- Clean separation of change risk: SaaS experimentation can never break VM operations.

**Negative / accepted costs**
- Release-engineering discipline required: every merge to the VM patch line needs regression
  against the frozen scope; tag hygiene becomes operational duty.
- Features built for SaaS must not assume multi-tenant context in ways that break single-tenant
  installs — verified by making **one dedicated-profile compose stack a first-class CI target**
  from Wave 0.
- Two support surfaces eventually (VM ops + SaaS ops); accepted while client count ≈ 1.

## Compliance notes

- Contract deliverables map directly: deployment files = VM compose/Helm profile; database scripts
  = per-service migrations; user/admin manuals and technical docs are already mandated artifacts.
- Data migration for VM's existing records (customers, plans, lots) is a Wave 4 workstream using
  the seeded-import path each service ships with.

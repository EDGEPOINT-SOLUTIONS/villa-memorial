# AGENTS.md — 08 Delivery

## Scope
How the platform gets built: team organization, AI specs-engineering workflow, MVP roadmap,
acceptance criteria, QA strategy, KPIs and risks.

## Key decisions captured here
- Delivery model: **AI Specs Engineering + Human delivery team**. "AI writes much of the software.
  Humans own the system."
- Specs are the source of truth; code implements specs. No coding to discover requirements.
- 4-week aggressive integrated MVP target; master blueprint remains full scope (phasing ≠ deletion).
- Feature task cards with IDs, owners, acceptance criteria, traceability.

## Files
- `team-and-workflow.md` — roles, pods, specs-engineering pipeline, cadence, DoD
- `mvp-roadmap.md` — 4-week plan, backlog, acceptance scenarios, post-MVP hardening
- `qa-testing.md` — test master checklist, KPIs
- `requirements-engineering.md` — artifact list A–T, 8-phase output, spec-driven method, agent behavior rules
- `risks.md` — risk register with mitigations
- `deploying-staging.md` — staging v0.1 deploy runbook (Kamal, secrets, first-boot steps)
- `deploying-web.md` — the **front end's** production profile: what to build, what to set,
  how to check a deploy is healthy, which surfaces can go live, and what the platform owes.
  The demo/development stack stays `docker-compose.yml`; this is the deployable one.
- `contracts/` — frozen cross-track contracts: `order-fulfilled-event.md`,
  `order-payment-api-v1.md`, `jwt-claims-v1.md`, `tenant-context-header-v1.md`,
  `audit-event-types-v1.md`
- `service-priorities.md` — IMSMS contract modules (A–J) mapped to microservices; priority tiers;
  gaps resolved 2026-08-24 (standalone accounting D12, standalone hr D13)
- `microservices-build-plan.md` — wave-based build plan, Rev 2: two-builder team (Keb lead +
  Gab agent-assisted), ownership map with review gates, contracts freeze points, deltas vs mvp-roadmap
- `capacity-building-plan.md` — Gab's builder ladder (4 stages with written promotion criteria),
  task card format, rituals, junior+agent guardrails
- `agents-md-standard.md` — Keb-owned standard for repo-level AGENTS.md files that make
  agent-assisted building reliable
- `checkpoint-delivery-plan.md` — governing schedule: CP-1 Aug 28 (VM features finished,
  dedicated profile) · CP-2 Sep 30 (full SaaS platform); day-level sprint plan, cut lines,
  exit criteria
- `cp1-day-plan.md` — CP-1 zoom-in: block-by-block per-builder plan Aug 24–28, daily freeze
  points, EOD gates, cut lines
- `exemplars/` — Keb's reference repo-level AGENTS.md files (template, platform,
  identity-access, web); copied into repos at scaffolding time

## Agent guidance
AI build tasks must arrive as complete specifications (feature ID, owner, acceptance criteria).
Every artifact must trace back to blueprint requirements; run completeness audits at phase end.

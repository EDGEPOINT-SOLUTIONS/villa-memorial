# Capacity-Building Plan — Gab's Builder Ladder

> **Status:** Adopted (2026-08-24). Companion to [`microservices-build-plan.md`](microservices-build-plan.md).
> Premise: Gab builds agent-assisted; reliability comes from *written specifications, enforced
> templates, and review gates* — not from experience he doesn't have yet. The system's docs-first
> discipline (`agents-md-standard.md`, service template, task cards) is what makes a junior safe.

## Principles

1. **Specs do the thinking, agents do the typing, Gab does the orchestrating.** Keb writes specs
   and contracts; Gab translates them into task cards for coding agents; contract tests and review
   gates catch what slips.
2. **Never merge on trust.** Agent output passes the same template DoD as human code. "The agent
   wrote it" is not an explanation — Gab must be able to explain every merged PR in one paragraph.
3. **Ownership is earned by written criteria**, promoted at wave boundaries.
4. **Teaching artifacts are delivery artifacts** — AGENTS.md files, seeds, task cards, and reviews
   count toward the project, not against it.

## The ladder

### Stage 1 — Operator (Wave 0–1)
*Goal: Gab can move code through the pipeline and understands the shape of the system.*
- Clone→green-pipeline on any templated repo, unaided by humans
- Write seed data for a service from its spec
- Build UI screens against frozen contracts + recorded fixtures
- Explain the 20-service map and which layer (reusable/domain) each belongs to
- **Gate to Stage 2:** runs his own PRs through the full checklist without reminders; demoed `web`
  login/nav against real identity-access

### Stage 2 — Service owner (Waves 2–3)
*Goal: Gab owns bounded services end-to-end with agent leverage.*
- Owns P4 notification ⓡ, then D13 hr ⓡ: spec → task cards → agent implementation → tests → seed → docs
- Writes his first AGENTS.md draft (hr) for Keb review
- Triages a failing contract test to root cause (his bug vs upstream contract change)
- **Gate to Stage 3:** two services pass DoD with ≤1 review cycle per PR average; zero
  generic-language violations in ⓡ services after Wave 2 midpoint

### Stage 3 — Domain contributor (Wave 4+)
*Goal: Gab works inside the hard domains under mentorship.*
- Builds E2 reporting-analytics views over the event stream
- Proposes (not just implements) an event schema addition end-to-end
- Debugs a cross-service flow (e.g., payment → posting rule → GL entry) with Keb shadowing
- **Gate to Stage 4:** proposed schema accepted without structural rework; cross-service debug
  writeup circulated

### Stage 4 — Contract author (post-contract / graduation project)
- Extracts workflow-engine from its embedded state (or equivalent seam work) as lead, not helper:
  writes the ADR draft, contracts, migration plan; Keb reviews
- Signals: trusted with review-gate exceptions proposals, mentors the next junior

## Rituals (cheap, recurring)

| Ritual | Cadence | Purpose |
|---|---|---|
| Spec walkthrough (Keb → Gab) | 2×/week · 90 min | Gab leaves knowing *why*, with task cards drafted |
| PR review-with-teaching | async + weekly block | Review comment = teaching note when instructive |
| Friday demo | weekly | Gab demos his own work; explaining is the test |
| Ladder checkpoint | wave boundary | Written promotion criteria checked; gaps become next-wave goals |
| Retro note | weekly | What the agent got wrong this week → feed into AGENTS.md improvements |

## Task card format (every Gab task)

```
ID: <wave>-G<nn>
Context:    2–4 sentences — where this fits, what depends on it
Spec link:  doc section / API contract / event schema
Do:         concrete deliverables
Don't:      explicit out-of-scope (esp. money logic, other services' schemas)
Watch out:  known traps (concurrency, tenant scoping, generic-language rule…)
Learn:      one-line "why this matters" / concept being practiced
Done when:  acceptance criteria mirroring the template DoD
```

## Guardrails that make junior+agent safe

- Money math, auth, contract authorship, and cross-service schemas are **Keb-only** (see ownership
  map in the build plan). Not "Gab shouldn't" — structurally cannot merge.
- Contract tests are the floor: no PR without them green, regardless of who wrote the code.
- Every ⓡ service PR gets the generic-language check; violations bounce automatically-ish via checklist.
- If Gab is blocked >30 min: escalate to Keb or write the blocker into the task card retro —
  silent thrash is the failure mode agents induce.

## Measuring the dual goal

Per wave record: services Gab owns · review cycles/PR trend · contract-test failures attributable
to his services · ladder criteria met. The ERP ships when modules A–J demo; **the builder ships
when Stage 3 criteria are met** — both are tracked in the same completeness audit.

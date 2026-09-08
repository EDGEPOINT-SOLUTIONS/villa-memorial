# AGENTS.md Standard — Authoring Guide for Repo-Level Agent Guidance

> **Status:** Adopted (2026-08-24). Keb-owned standard. Every service repo carries an `AGENTS.md`
> whose job is to make **agent-assisted building reliable** — especially with a junior builder
> (see [`capacity-building-plan.md`](capacity-building-plan.md)) driving coding agents.
>
> An AGENTS.md is a *contract with coding agents*: it tells them what exists, what rules are
> non-negotiable, and how to verify their own work. Write it so a competent agent plus a junior
> reviewer produces mergeable code.

## Where AGENTS.md files live

| Level | Location | Owner | Content |
|---|---|---|---|
| Docs tree | `docs/<area>/AGENTS.md` | Keb | Knowledge-base navigation & decisions (existing pattern) |
| Root | `<service-repo>/AGENTS.md` | Keb (exemplars), later Gab drafts | Per-repo agent guidance — this standard |
| Subdir (optional) | `src/api/AGENTS.md` etc. | repo owner | Only if the area has rules agents keep missing |

## Required sections (per service repo)

```markdown
# AGENTS.md — <service-name>

## What this service is
One paragraph: purpose, layer (ⓡ reusable / domain), who consumes it.

## Non-negotiables
- Template DoD applies (link ../service-template copy in repo)
- [ⓡ only] Generic language ONLY — forbidden terms list (e.g., lot, funeral, case, chapel)
- Money = integer minor units + ISO 4217. Never floats.
- Tenant ID from verified JWT claims only; propagate to rows/events/logs
- No network calls except: <explicit allowlist>

## Contracts
- API: contracts/api/v1.yaml — changes require bump + consumer review
- Events published: <types> (schema in contracts/events/)
- Events consumed: <types> — dedupe on event_uuid, idempotent handlers, skip unknown schema_version

## How to verify your work (agent self-check before claiming done)
1. docker compose up --build → healthy + seeded
2. Run: <test command> — all green including contract tests
3. curl examples for the endpoints you touched (include expected responses)
4. Checklist: healthz/readyz · logs carry correlation_id · no new env vars undocumented

## Patterns to follow (with file pointers)
- "Add an endpoint": see src/api/<example>.ts + its test
- "Publish an event": see src/events/<example>.rb — outbox write must be same-transaction
- "Add a field": migration + schema update + contract test update TOGETHER in one PR

## Traps (learned the hard way — append, never delete)
- e.g., "polling consumer must order by (occurred_at, id), not id alone"

## When unsure
Ask via the task card, don't guess. Never modify another service's schema/event. Never weaken a
test to make it pass.
```

## Writing rules (what makes these files actually work)

1. **Pointers over prose.** Agents follow file-path exemplars far better than descriptions.
   Every pattern section links a real, exemplary file in the repo.
2. **Non-negotiables are short, absolute, and checkable.** "Money is integer centavos" beats
   "be careful with currency."
3. **Verification steps are commands, not vibes.** The agent should be able to run them itself;
   Gab's job is reading results, not interpreting ambiguity.
4. **Traps sections are append-only institutional memory.** Each agent mistake that escapes
   becomes one line here. This is how the system learns across repos and across Gab's tenure.
5. **Keep it under ~120 lines.** Long AGENTS.md files get skimmed by agents and humans alike;
   push detail into linked docs.
6. **Version it like code.** Changes to AGENTS.md go through PR; Gab may draft, Keb approves.

## Rollout sequence (Keb writes these first)

| Order | Repo | Why first |
|---|---|---|
| 1 | Service template/generator | Every repo inherits its skeleton |
| 2 | identity-access | Everything trusts it; sets security tone |
| 3 | web | Gab's primary surface in Waves 0–2 |
| 4 | Per service, **at scaffolding time** | No service starts without one |

Gab's progression: executes against Keb's files (Stage 1–2) → drafts new ones for review
(Stage 2–3) → authors standalone (Stage 4).

## Anti-patterns

- Restating the codebase ("this repo contains folders…") — agents can see the tree
- Aspirational rules nothing enforces ("write clean code") — if it matters, tie it to a checkable
  command or the PR checklist
- Duplicating the service template DoD inline — link it; drift otherwise
- Hiding scope limits in prose — put them in the task card AND the Don't section

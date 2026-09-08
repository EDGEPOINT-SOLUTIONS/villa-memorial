# AGENTS.md — 05 AI

## Scope
AI-native architecture: what AI does, what it must never do, governance guardrails.

## Key decisions captured here
- Deterministic software owns: financial calculations, payments, inventory quantities, schedules,
  permissions, status transitions, audit records, contractual data, transactional records.
- AI owns: assistance, summarization, drafting, search, analytics, forecasting, recommendations —
  always permission-aware and grounded in authoritative data.
- AI must NEVER bypass RBAC, invent prices/availability/ownership/terms, or finalize legally
  significant output without human approval.

## Files
- `ai-capabilities.md` — capability catalog by persona
- `ai-governance.md` — hard guardrails and approval gates

## Agent guidance
Any AI feature spec must state: grounding source, permission model, human-approval requirement,
failure/confidence behavior, and logging approach.

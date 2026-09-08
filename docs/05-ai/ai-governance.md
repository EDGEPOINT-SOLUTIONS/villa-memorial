# AI Governance

## Non-negotiable guardrails
1. **No unrestricted authority.** Role-based AI access; tenant isolation; permission-aware retrieval;
   AI can never bypass normal application permissions or become an RBAC bypass.
2. **Deterministic-first rule.** Conventional logic handles financial calculations, payments,
   inventory quantities, schedules, permissions, status transitions, audit records, contractual and
   transactional data. If deterministic software is safer, say so and skip the AI feature.
3. **Grounding.** AI must be retrieval/data-grounded against authoritative tenant data; must never
   hallucinate price, availability, ownership, contract terms, schedules, operational status.
4. **Human approval gates** required for:
   - AI-generated public memorial content
   - legally significant records/documents
   - ownership decisions
   - financial adjustments
   - designated operational decisions
   - document preparation where appropriate
5. **Traceability & audit**: source traceability, confidence handling, logging of AI interactions.
6. **Sensitive-data controls** and prompt-injection defenses.
7. **Model/provider abstraction** — avoid lock-in to one model vendor.
8. **Labeling**: AI-assisted output clearly labeled as such (e.g., draft eulogy) and requires review.

## Delivery-side AI governance (PM plan)
- AI has no direct production authority over payments, contracts, ownership, accounting, interment,
  permissions, sensitive data.
- Every production-bound AI-generated code artifact is reviewed by a human builder.
- AI receives only complete approved specifications (never vague tasks like "build the cemetery module").
- KPI: "AI grounding — AI responses use authoritative data and user permissions."

## Testing requirements
AI grounding tests · permission tests · hallucination/guardrail tests · user acceptance of AI outputs.

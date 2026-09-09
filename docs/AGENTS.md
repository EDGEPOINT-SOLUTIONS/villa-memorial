# AGENTS.md — VILLA MEMORIAL Documentation Root

## Purpose
This `docs/` tree decomposes the salient points of an external source corpus into a navigable,
agent-readable knowledge base. The corpus comprised two document sets:

1. **Master Prompt set** — product/SaaS/architecture direction for a *replicable, configurable,
   AI-enabled Funeral & Memorial Services SaaS platform*.
2. **Villa Funeral Homes client set** — first-tenant requirements: blueprint, PM plan, legal forms,
   insurance/partner materials.

No source files are stored in this tree; section references (e.g., "blueprint §22", "master prompt §16")
point into that external corpus.

## Governing principle (from the master prompt)
> **BUILD ONCE. CONFIGURE MANY TIMES.**
> Client documents are *requirements evidence*, not the product spec. Do not hard-code the first
> client's processes into the platform. Every design decision must pass the test:
> "Can this be deployed for another funeral company without modifying core code?"

## Tree map

| Directory | Contents |
|---|---|
| `01-product/` | Product vision, SaaS strategy, packaging & commercialization |
| `02-architecture/` | Hybrid SaaS/multi-tenant/module/config/workflow architecture, tech stack |
| `03-domain/` | Domain model, entity inventory, business models |
| `04-modules/` | Functional module specs (commerce, cases, property/GIS, finance, ops) |
| `05-ai/` | AI-native architecture, capabilities, governance guardrails |
| `06-cultural-digital-memorial/` | Filipino culture module, e-wake/e-lamay/digital memorial |
| `07-client-villa/` | Villa Memorial client profile, current-state forms, requirement mapping |
| `08-delivery/` | Team model, AI-assisted delivery workflow, MVP roadmap, QA, risks |

## Rules for agents working in this tree
- Each subdirectory has its own `AGENTS.md` describing scope and key decisions captured there.
- Source documents remain authoritative for verbatim legal/contract language; these markdown files
  are analytical decomposition.
- Classify every requirement as one of: **Core SaaS / Configurable SaaS / Optional Module /
  Integration / Client-specific / Future roadmap** before implementation.
- Never let client-specific requirements silently become core platform behavior.
- Specs are the source of truth; code implements specs.

# SaaS Strategy

## The fundamental distinction
| Layer | Meaning | Examples |
|---|---|---|
| **A. Core platform capabilities** | Common across most funeral businesses | Customer/family mgmt, deceased records, cases, services, scheduling, facilities, inventory, sales, billing, payments, contracts, documents, staff, suppliers, reports, notifications, audit, dashboards, CRM, user/role mgmt |
| **B. Configurable capabilities** | Vary per business, handled by config | Packages, pricing, payment terms, workflow stages, approvals, doc templates, numbering, facility types, chapel rules, hours, cancellation/discount/commission rules, roles, tax settings, terminology, branch structures |
| **C. Optional modules** | Only some customers need | Memorial park, lots, crematorium, columbarium, pre-need, merchandise, fleet, wake, embalming, installment mgmt, insurance/payment gateway/accounting integration, portals |
| **D. Client-specific requirements** | NOT auto-hard-coded | Evaluate: make configurable? reusable module? workflow config? feature flag? rules-engine capability? integration? genuine customization? |

## Recommended architecture stance (hybrid)
**Product Platform + Multi-tenant SaaS + Modular + Configurable + Extensible**, with optional
dedicated deployments for exceptional enterprise customers.

- Reject clone-per-client (version divergence kills compounding product development).
- Reject rigid "pure SaaS" (becomes an unwieldy configuration monster).
- Target: **~80–90% common / 10–20% adaptable**.

## Three strict customization boundaries
1. **CORE** (almost never customized): auth, tenant management, users, permissions, core case &
   customer architecture, audit, notifications, billing framework, workflow engine, configuration
   engine, AI infrastructure.
2. **MODULES** (on/off): funeral ops, chapel, wake, embalming, crematorium, memorial park, lots,
   cemetery, columbarium, inventory, fleet, pre-need, advanced CRM, analytics, AI.
3. **EXTENSIONS** (genuinely unusual): e.g., legacy ERP integration for a national chain — built in
   extension layer, never contaminating core.

## Enterprise exception
Large clients may get isolated deployment (own DB/infrastructure/config) running the SAME product
architecture/codebase — distinct from cloning.

## Delivery stages (master prompt sequence)
1. Stage 1 — Master product/SaaS architecture prompt (no client docs)
2. Stage 2 — Upload client documents as current-state evidence
3. Stage 3 — Gap analysis (core / configurable / client-specific / future module / exclude)
4. Stage 4 — Product architecture finalization
5. Stage 5 — Build

## Anti-overfitting questions (ask per requirement)
Common in the industry? Specific to this client? Better standard workflow exists? Configurable?
Reusable module candidate? Should stay client-specific? Increases or decreases SaaS scalability?

## Final architecture test
> If client #1 disappears tomorrow, can we deploy substantially the same platform to another funeral
> business with different structure/services/pricing/workflows/branches/documents/facilities/rules —
> primarily through configuration rather than rewriting? If no, redesign.

# Team & Delivery Workflow

## Team (Villa PM plan)
| Person | Role |
|---|---|
| **JBR** | Product Owner / Executive PM — vision, priorities, business rules, final acceptance |
| **Keb** | Senior Builder / Technical Lead / AI Specs Engineering Lead — architecture, AI orchestration, review, security, release gate |
| **JP** | Builder / Full-Stack Module Lead — business systems & integration (backend, transactions, payments, contracts, CRM, inventory, accounting) |
| **Jawi** | Advanced Full-Stack Module Lead — GIS/cemetery, scheduling, operations, digital memorial, mobile/PWA, AI integration |
| **Gab** | Frontend / UX Lead — public site, cart/checkout, lot map, family portal, design system |
| **Hana** | QA / Data / Documentation Engineer — test strategy, regression, traceability, master data |

Model: humans **define, architect, validate, test, approve, manage**; AI **generates, implements,
refactors, documents, assists testing**.

## Feature pods
| Pod | Tech lead | UX | QA | Approval |
|---|---|---|---|---|
| Memorial Commerce | JP | Gab | Hana | Keb + JBR |
| Funeral Operations | Jawi | Gab (as needed) | Hana | Keb + JBR |
| Memorial Property / GIS | Jawi | Gab | Hana | Keb + JBR |
| Customer / Family | JP + Gab | Gab | Hana | Keb + JBR |
| Finance / CRM | JP | Gab (as needed) | Hana | Keb + JBR |
| AI & Intelligence | Keb | Jawi/Gab | Hana | Keb + JBR |

## Specs-engineering / AI build pipeline
```
BUSINESS REQUIREMENT → PRODUCT OWNER VALIDATION → SPECS ENGINEERING → DOMAIN SPEC
→ UX SPEC → DB SPEC → API SPEC → ACCEPTANCE CRITERIA → AI BUILD → BUILDER REVIEW
→ QA → SECURITY REVIEW → BUSINESS ACCEPTANCE → STAGING → DEPLOY
```
AI never gets vague tasks ("build the cemetery module"); Keb converts requirements into complete specs.
AI-generated code is never "done" until reviewed and tested.

## Feature task card template
```
FEATURE ID: VM-FUN-001   FEATURE: Independent Embalming Service
BUSINESS OWNER: JBR   TECHNICAL LEAD: Jawi   ARCHITECTURE REVIEW: Keb
FRONTEND: Gab   QA: Hana   AI BUILD: Specs Engineering AI
ACCEPTANCE: no plan required; Add to Cart/Buy Now; catalog/rules pricing; appointment rules;
availability checked; order created; case linked per rule; task created; payment recorded;
audit recorded; confirmation sent.
DONE: SPEC→UI→DB→API→AI BUILD→REVIEW→QA→SECURITY→BUSINESS ACCEPTANCE→DOCS
```

## Board columns
Backlog → Business Review → Spec Engineering → Spec Approved → AI Build → Builder Review → QA →
Bug Fix → Business Acceptance → Ready to Deploy → Staging → Production.

## Cadence
Daily 15-min stand-up · daily AI specs/build cycle · daily builder review · daily QA cycle ·
technical huddles · business decision huddles · Friday integrated demo ("working software, not slides") ·
Friday retro/planning. Weekly: Monday planning (JBR+Keb), QA triage, decision review.

## Definition of Done
Approved spec + acceptance criteria · UI states (loading/empty/error/validation/success/permission-denied) ·
DB+API implemented · AI code human-reviewed · tests pass · no unresolved critical/high defects
(high-risk exceptions need explicit approval) · permissions+audit verified · business owner accepted ·
docs+traceability updated · staged · deployed.

## Three-layer development workflow (master-prompt set)
1. **Product/domain architect conversation** → requirements, domain model, SaaS architecture
2. **Development specification** (the /docs tree — source of truth)
3. **AI development agent** implements specs; back to layer 1 for architecture review/QA.

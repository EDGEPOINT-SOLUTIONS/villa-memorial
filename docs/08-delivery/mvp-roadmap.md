# MVP Roadmap

## Target
**4-week aggressive integrated MVP** proving the core end-to-end business engine. Full master
blueprint remains long-term scope; phases are sequencing only — features are never deleted from scope.

## Week-by-week
| Week | Theme | Key outputs |
|---|---|---|
| **W1** | Foundation + specs + commerce setup | Architecture/scope, specs decomposition, repo/CI/CD/security baseline, design system, QA framework, auth/RBAC/users, customer core, catalog, pricing/rules engine |
| **W2** | Memorial commerce engine | Products/services/packages, Smart Service Builder, cart/order/checkout, payment foundation; **Milestone 1 integrated commerce demo** |
| **W3** | Funeral operations | Funeral case/deceased, embalming, chapel scheduling, hearse/retrieval/transfer, operations board/checklists, order-to-case integration |
| **W4** | Cemetery + family + integration | GIS foundation, lot map/search/detail, reservation/sales, ownership/transfer, interment, family portal, digital memorial/QR, CRM/collections/reporting, AI assistant demo, full regression, security/UAT, **executive MVP acceptance** |

## Master backlog (IDs VM-001…VM-036)
W1: architecture foundation, auth/RBAC, customer/family, design system, QA framework.
W1–W2: product catalog, service catalog, pricing/rules engine. W2: packages/add-ons, Smart Service
Builder, cart, checkout, payment foundation. W2–W3: order/fulfillment engine. W3: funeral case,
deceased, embalming, chapel booking, hearse/transport, retrieval/transfer, operations board.
W3–W4: GIS foundation. W4: lot search/map, lot reservation/sales, ownership/transfer,
interment/exhumation, family portal, digital memorial, QR memorial, CRM/leads,
collections/reporting, AI assistants, full integration, security/regression/UAT, executive acceptance.

## MVP acceptance scenarios (all must demo)
- A: customer **without a plan** buys embalming only
- B: chapel-only rental, 3 days
- C: funeral-only coordination (customer already has casket/lot)
- D: mixed cart — embalming + chapel + hearse + flowers, one order
- E: pre-need plan comparison + contract + payment schedule
- F: map search → select family lot → reserve + pay
- G: reservation → sale/contract → later linked to interment
- H: paid service creates funeral case, bookings, staff tasks, checklist
- I: customer portal shows payments, orders, documents, lot, memorial
- J: family opens QR memorial, submits approved tribute
- K: manager dashboard — cases, sales, collections, lot status, alerts
- L: authorized AI question answered from database-grounded data

## Blueprint implementation phases (blueprint §69 — sequencing only, no feature deletion)
| Phase | Focus |
|---|---|
| Foundation | Architecture, auth, RBAC, master data, catalog, customers, audit, CMS, API foundation |
| Commerce | Products/services/packages, smart builder, cart, checkout, quotes, pricing, payments |
| Funeral Operations | Cases, deceased, embalming, chapel, scheduling, vehicles, checklists, documents |
| Memorial Property | GIS, park/sections/blocks/lots, availability, reservation, ownership, transfers |
| Finance/CRM | AR, collections, accounting integration, CRM, agents, commissions, reports |
| Customer/Families | Family portal, self-service, digital memorial, QR/NFC, find loved one |
| AI & Intelligence | AI assistants, management copilot, predictive analytics, AI memorial creation |
| Advanced Operations | Mobile/offline field ops, digital twin, maintenance intelligence, advanced integrations |
| Future Experience | AR, voice, environmental analytics, community features, advanced computer vision |

## Post-month hardening & expansion
Security hardening/pen test · payment production certification · data migration/reconciliation ·
staff UAT · performance/load · backup/DR validation · training/SOPs · production deploy ·
advanced self-service · advanced CRM/marketing automation · accounting integration depth ·
AI management copilot + predictive analytics · offline field ops · digital twin expansion · AR ·
voice · environmental analytics · community remembrance · computer vision/drone assistance.

## Required specs-engineering work products (before coding)
BRD/PRD · capability map · bounded-context map · personas · sitemap · screen inventory · user
journeys · use cases · process diagrams · state machines · business rules catalog · pricing rules
spec · ERD · data dictionary · privacy classification · RBAC matrix · API contracts · event/webhook
catalog · notification matrix · GIS spec · AI architecture/guardrails · document lifecycle ·
reporting catalog · audit spec · security architecture · backup/DR · test strategy · requirements
traceability matrix · phased roadmap.

## Phase completeness audit (end of each spec phase)
List: covered requirements · unresolved decisions · missing mappings · assumptions · risks ·
recommended next artifacts. Never silently drop a requirement.

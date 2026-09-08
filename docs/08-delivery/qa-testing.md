# QA & Testing Strategy

## Test master checklist (blueprint §68)
Unit · integration · API · end-to-end browser · mobile/PWA · accessibility · responsive UI ·
pricing · discounts · tax/fees · installment/payment-schedule · payment allocation ·
refund/cancellation · **double-booking** · **lot reservation concurrency** · ownership-transfer
authorization · interment validation · exhumation workflow · document workflow · notification ·
webhook/idempotency · GIS/map · offline/sync · role/permission · privacy · security penetration ·
performance/load · backup/restore · AI grounding/permission · AI hallucination/guardrail · UAT.

## High-risk test focus areas
- Concurrency: chapel/lot/vehicle double-booking prevention (transactional integrity)
- Money: pricing rules, payment allocation to contract/order/lot/service, installment schedules, refunds
- Ownership: transfer authorization, approval workflow, audit trail
- Privacy: memorial visibility, sensitive-data RBAC, DPA compliance
- AI: grounded answers only, permission-respecting, no fabricated lots/prices

## Front-end quality standards (blueprint §70)
Original Villa visual identity (no copying reference site) · calm/respectful/dignified language ·
clear hierarchy, low-friction navigation · mobile-first · WCAG-oriented accessibility · large touch
targets, readable typography, high contrast · plain-language explanations · transparent pricing ·
clear plan/service/product/property distinction · always show availability/bookable/quote-required/
restricted status · **no dark patterns** · clear cancellation/refund/reservation terms · visible
order status.

## Every-feature UI state rule
Empty, loading, error, permission-denied, validation-error, and success states required.
Async operations need visible status + retry/error handling.

## KPIs (PM plan)
| KPI | Target |
|---|---|
| Specification completeness | 100% of active sprint features have approved specs |
| Requirements traceability | 100% implemented features trace to blueprint IDs |
| AI build review | 100% production AI output human-reviewed |
| QA coverage | 100% acceptance criteria tested |
| Critical/high defects | 0 unresolved at release (unless explicitly accepted) |
| Business acceptance | 100% core MVP journeys demonstrated |
| Auditability | Critical financial/property/interment/contract actions auditable |
| Security | No known critical issues at release |
| AI grounding | Responses use authoritative data + user permissions |

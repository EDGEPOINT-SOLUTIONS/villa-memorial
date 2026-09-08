# Risk Register

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Scope too large for one month | High | 4-week target = integrated MVP only; advanced features stay on roadmap | JBR + Keb |
| AI produces wrong business logic | High | Approved specs + human review + tests + business acceptance | Keb + leads |
| AI-generated code inconsistency | High | Architecture standards, bounded domains, code review | Keb |
| QA starts too late | High | Continuous QA from Week 1 | Hana |
| JBR becomes decision bottleneck | Med/High | Decision log + delegated technical authority | JBR |
| Frontend/backend divergence | Medium | API contracts + feature pods | JP + Gab + Jawi |
| Payment integration failure | High | Sandbox testing, idempotency, webhook tests, reconciliation | JP + Keb |
| **Double booking (lot/chapel/vehicle)** | **Critical** | Availability engine + concurrency controls | Jawi + JP |
| **Incorrect ownership records** | **Critical** | Authorization, audit, approval workflow | Keb + JP + JBR |
| **Privacy breach** | **Critical** | RBAC, data classification, secure storage, audit, privacy review | Keb |
| Migration complexity | High | Separate migration workstream, scripts, reconciliation | JP + Hana |
| Overbuilding AI too early | Medium | Core business engine first; AI layered on reliable data foundation | Keb + JBR |
| Premature production | High | Staging, UAT, security + release checklist | Keb + Hana |

## Corpus-level risks (added during document analysis)
- **Legal term drift**: 2025 vs 2026 purchase agreements differ on refunds/forfeiture/lot classes —
  rules engine must version by effective date; legal must confirm which governs new sales.
- **Regulatory boundary**: pre-need/insurance products are underwritten by Eternal Plans (IC-regulated);
  platform must track, not underwrite — confirm scope with counsel.
- **Empty activity tracker**: no operational baseline metrics available; demo data must be synthesized.
- **Client-anchoring risk**: rich client paperwork invites hard-coding; enforce the classification
  discipline in `client-to-saas-mapping.md`.

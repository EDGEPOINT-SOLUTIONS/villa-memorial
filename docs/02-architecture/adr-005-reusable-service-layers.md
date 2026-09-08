# ADR-005: Microservices as reusable, composable layers across projects

- **Status:** Accepted (2026-08-24)
- **Deciders:** Keb (technical lead), JBR (product owner)
- **Related:** [`adr-002-microservices.md`](adr-002-microservices.md) ·
  [`microservices.md`](microservices.md) · [`service-template.md`](service-template.md)

## Context

Beyond In Memoriam, Edgepoint intends to build further products. Services such as accounting,
HR, identity, documents, notifications, workflow, and audit are common across virtually any
business system. Building them once as product-agnostic layers turns every project into partial
subsidy for the next: another project needing accounting or HR composes the same services rather
than rebuilding them.

This also aligns with ratified decisions on the IMSMS contract (2026-08-24): standalone
`accounting` service (GL, journal entries, cash receipts/disbursements, financial statements) and
standalone `hr` service (employee records, attendance, leave, payroll interface).

## Decision

1. **Two-layer classification** of all services (see `microservices.md`):
   - **Reusable layer** — product-agnostic capabilities deployable in any Edgepoint project:
     identity-access · tenancy-config · workflow-engine · notification · documents · audit ·
     accounting · hr · reporting-analytics · support-ticketing · inventory (reclassified
     2026-08-24; further candidates tracked in `microservices.md` → "Candidate reusable extractions")
   - **Domain layer** — encapsulates this product's subject matter (funeral & memorial services):
     catalog-pricing · commerce-ordering · crm-families · finance-billing · funeral-cases ·
     scheduling-resources · property-gis · public-web · inventory · field-ops · ai-orchestration
2. **Generic ubiquitous language in reusable services.** No funeral vocabulary in code, schemas,
   APIs, or seeds of any reusable service. Accounting speaks of *accounts, journal entries,
   transactions, fiscal periods* — never lots, plans, or cases. Violations block merge.
3. **Integration via adaptation, not coupling.** Domain services translate their events into
   generic integration contracts. Example: `finance-billing` publishes `payment.completed`;
   the mapping "this payment → debit cash / credit receivables / revenue account" is a
   *posting-rule configuration* owned by the consuming project's configuration, executed by
   accounting against its generic GL model. Reusable services never import domain event types.
4. **Composition over embedding.** Projects compose reusable layers through versioned APIs and
   the event envelope (`service-template.md`). No shared libraries that merge business logic
   across layers; at most thin generated API clients.
5. **Versioned portability contract.** Reusable services carry the standard template DoD plus a
   *portability review*: fresh-clone demo without domain seed data, docs written generically,
   config examples not assuming one industry.
6. **Guardrail against over-generalization.** Domain services are NOT force-fit into reusable
   shapes. Generalize a capability only when it is (a) genuinely cross-industry and (b) needed as
   a standalone layer. When in doubt, keep it domain-layer until a second project demands it
   (adapted rule of three). Extraction path remains open because boundaries are already
   service-shaped.

## Consequences

**Positive**
- Each new project starts with identity, tenancy, documents, notifications, workflow, audit,
  accounting, HR already built, tested, and portable.
- Cleaner internal boundaries even within In Memoriam: reusable services cannot leak funeral
  assumptions, keeping the SaaS vision ("build once, configure many times") honest.
- Independent versioning/lifecycle per layer.

**Negative / accepted costs**
- Generic models cost more upfront than domain-flavored shortcuts (e.g., configurable chart of
  accounts vs hard-coded funeral revenue categories).
- Adapter/mapping configurations become real artifacts to maintain per project.
- Risk of premature abstraction if the guardrail is ignored — mitigated by the two-part test
  above and by reviewing classification at phase boundaries.

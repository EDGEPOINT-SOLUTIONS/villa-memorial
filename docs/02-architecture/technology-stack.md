> **Status update (2026-08-24):** backend is now decomposed into microservices per
> [`microservices.md`](microservices.md) / [`adr-002-microservices.md`](adr-002-microservices.md);
> frontend adopted as **React/Next.js + TypeScript** per
> [`adr-003-react-nextjs-frontend.md`](adr-003-react-nextjs-frontend.md). PostgreSQL + PostGIS
> retained. The original suggestion below is thereby ratified for the frontend; the Rails 8 +
> Hotwire monolith of ADR-001 was superseded the same day it was accepted.

# Technology Stack

## Suggested stack (Villa blueprint §53 — "subject to technical validation")
- **Frontend**: React/Next.js + TypeScript (public site, portals, PWA)
- **Backend**: Node.js + TypeScript (Express or NestJS)
- **Database**: PostgreSQL + PostGIS (transactional + GIS)
- **Storage**: object storage for documents/media
- **Async**: background job/queue infrastructure for notifications and async workflows
- **Reporting**: separate reporting/BI/analytics layer (future: AI/ML layer)

## Decision discipline (master prompt §32)
Do NOT assume a stack before deriving requirements. For each major decision document:
why appropriate · alternatives · trade-offs · scalability implications · cost implications ·
vendor lock-in · migration implications.

## Architectural quality rule
Modular, maintainable, extensible, secure, scalable, commercially viable — but avoid enterprise
complexity for its own sake. Smallest architecture that supports intended SaaS evolution.

## Non-functional requirements checklist (blueprint §71)
Security, privacy, availability, performance, scalability, maintainability, observability,
auditability, accessibility, mobile responsiveness, disaster recovery, backup/restore, data
integrity, concurrency safety, idempotency, API reliability, monitoring/alerting, error tracking,
logging with privacy controls.

## Engineering hygiene requirements (blueprint §64)
- API-first; domain logic out of the presentation layer.
- Idempotent, auditable external payment/webhook integrations; never silently discard failed
  payments, webhooks, document processing, notifications (retry + idempotency).
- Versioning for contracts, pricing rules, important documents, content.
- Offline-capable selected field workflows with sync + conflict resolution; offline must never
  bypass ownership/payment authorization.
- Document every architectural decision and tradeoff.

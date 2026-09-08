# AGENTS.md — 04 Modules

## Scope
Functional decomposition of platform modules: commerce, CRM/cases, facilities & scheduling,
memorial property & GIS, funeral operations, finance, documents.

## Key decisions captured here
- Unified cart supports heterogeneous items (products, services, rentals, property, plans, add-ons)
  and routes to correct fulfillment records.
- Availability/booking engine checks REAL operational resources before confirming bookings;
  temporary holds during checkout with expiry.
- Memorial lots: full property lifecycle (status model, reservation, ownership, transfer, interment,
  exhumation, maintenance) + interactive GIS map.
- Funeral case is the operational spine linking commerce to delivery.

## Files
- `commerce-catalog.md` — catalog classes, smart builder, cart/checkout, availability engine
- `crm-cases.md` — CRM, funeral case management, family accounts
- `facilities-scheduling.md` — chapels, vehicles, appointments, operations board
- `memorial-property-gis.md` — lots, status model, GIS map, ownership/transfer, interment/exhumation
- `finance-billing.md` — payments, installments, commissions, accounting
- `finance-billing.md` — payments, installments, AR/collections, commissions, accounting integration
- `documents-contracts.md` — templates, generation, lifecycle, e-signature, notifications, CMS
- `reporting-dashboards.md` — reporting catalog, operations/executive dashboards, BI roadmap
- `screen-inventory.md` — minimum front-end screen inventory (public/portal/admin)

## Agent guidance
Each module spec should map to: entities, workflows, permissions, screens, APIs, audit points, and
phase (per the delivery roadmap). Flag anything that can't be traced.

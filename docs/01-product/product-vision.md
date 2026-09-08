# Product Vision

## Category
**Funeral & Memorial Services Management Platform** — a "Funeral Services Operating Platform",
not merely a funeral home management system.

## Vision statement
One platform supporting the complete lifecycle of funeral-related services: initial inquiry →
arrangement → service delivery → payment → documentation → memorialization → long-term family
relationship.

## Target market (examples, not specs)
St. Peter Group, Forest Lake, Loyola Memorial Chapels, Golden Haven, Arlington, Cosmopolitan,
Eternal Garden; independent homes; regional groups; memorial parks; crematorium operators;
wake/chapter operators; chains; multi-entity groups combining services + lots + cremation +
embalming + coffin sales + transport.

## Core principles
1. **Build once, configure many times** — module + configuration + workflow + rules + permissions
   + data model instead of hard-coded assumptions.
2. **Client #1 is a tenant**, and its documents are *requirements evidence*, not spec.
3. **Deterministic core, AI at the edges** — AI never owns financial calculations, payments,
   inventory, schedules, permissions, status transitions, audit, contractual data.
4. **Dignified UX** — calm, clear, professional; avoid generic-ERP feel; primary goal is to reduce
   administrative burden while improving coordination.
5. **Philippines-first, not Philippines-limited** — abstract currency, dates, tax, terminology,
   org structures; don't over-engineer i18n prematurely.
6. **API-first** — web/mobile/portals/integrations/AI agents all consume the same business logic;
   frontend is never the only path to business logic.
7. **Avoid premature complexity** — smallest architecture that supports intended SaaS evolution.

## Anti-goals
- Do NOT digitize exactly what the first client does today if that process is inefficient.
- Do NOT clone per-client codebases.
- Do NOT build every entity in the domain model blindly.
- Do NOT let coding be the mechanism for discovering requirements (spec-driven development).

## Long-term potential
Evolve toward an "operating system for funeral & memorial-service businesses": ecosystem of homes,
parks, cemeteries, crematoriums, suppliers, families, partners, financial services, government
integrations, AI. Architecture must leave these doors open without building them now.

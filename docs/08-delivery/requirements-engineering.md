# Requirements Engineering & Development Methodology

## Required engineering artifacts before implementation (master prompt §29)
A. Product Requirements Document · B. Functional Requirements · C. Non-Functional Requirements ·
D. Domain Model · E. Entity Relationship Model · F. User Roles and Permissions Matrix ·
G. Module Architecture · H. Workflow Architecture · I. Configuration Architecture ·
J. Multi-Tenant Architecture · K. AI Architecture · L. API Architecture · M. Integration Architecture ·
N. Security Architecture · O. Reporting Architecture · P. UX/UI Architecture · Q. Data Migration
Strategy · R. Testing Strategy · S. Deployment Architecture · T. SaaS Productization Strategy.

## Eight-phase output sequence (master prompt §36)
1. **Product definition** — vision, users, market, positioning, principles, SaaS strategy
2. **Domain analysis** — domain model, business models, actors, entities, relationships, processes
3. **Product architecture** — modules, core/config/optional/client-specific split, config engine, workflow engine, multi-tenancy
4. **Client mapping** — current-state processes, requirement-to-platform mapping, gaps, conflicts, generalization
5. **Technical architecture** — application, database, API, security, integration, AI, infrastructure
6. **UX** — information architecture, navigation, roles, dashboards, screens, workflows
7. **Product roadmap** — MVP/V1/V2/V3, AI roadmap, commercialization
8. **Implementation** — backlog, epics, stories, acceptance criteria, tasks, testing, deployment, migration, onboarding, rollout

## Spec-driven development (master prompt §33)
Before coding: understand domain → define requirements → architecture → entities → workflows → APIs →
acceptance criteria → test cases → implement. Coding is never the mechanism for discovering requirements.

## AI-assisted development conventions (master prompt §34)
If AI coding agents are used, establish: project specifications · architecture documentation · coding
standards · database conventions · API conventions · component conventions · security rules · testing
requirements · acceptance criteria. **AI-generated code must conform to the architecture rather than
independently inventing it.**

## Behavioral instructions for agents (master prompt §37)
Challenge assumptions · flag requirements that reduce reusability · push back when a client requirement
doesn't belong in core · generalize workflows when possible · postpone MVP-inappropriate complexity ·
say no to AI features where deterministic software is safer · flag database designs with scalability
problems · never reproduce client inefficiency. Optimize for: **Client Fit + Industry Generalizability +
SaaS Scalability + Commercial Viability + Maintainability**.

## Data migration & deployment (artifacts Q/S)
Migration as a separate workstream with scripts + reconciliation (see `risks.md`); staging → UAT →
security review → production release gate (see `mvp-roadmap.md`).

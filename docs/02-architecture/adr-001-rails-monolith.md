# ADR-001: Rails 8 monolith with Hotwire instead of React/Next.js + Node

- **Status:** Superseded (2026-08-24) by [`adr-002-microservices.md`](adr-002-microservices.md) for
deployment boundaries. Its contract discipline (`api/v1` shapes, versioned events) and rendering
rule of thumb remain in force and carry over to the service APIs.
- **Deciders:** Keb (technical lead), JBR (product owner)
- **Supersedes:** the *suggestion* in `technology-stack.md` / Villa blueprint §53
  ("subject to technical validation") — which this document is that validation.
- **Scope:** MVP delivery (Aug 24 – Sep 30). Not claimed as the permanent final answer — see
  "Revisit triggers".

## Context

Three builders (Keb, Jawi, Gab), no dedicated QA, hard client-demo date Aug 31 and launch Sep 30.
The blueprint suggested React/Next.js + TypeScript frontend with Node backend, explicitly flagged
as unvalidated. The delivery docs require deriving stack from requirements rather than assuming it,
and documenting every architectural decision.

Requirements that actually constrain the frontend decision for this phase:

1. **Parallel tracks with frozen contracts** — Gab must build UI against data contracts without
   waiting on backend screens (W1 strategy).
2. **Multi-surface data**: same catalog/order/lot data renders in public site, staff ops board,
   family portal, QR memorial pages opened by strangers on phones.
3. **Server-owned correctness**: money, ownership, schedules, permissions, audit live on the server;
   the browser is not trusted.
4. **Small team, one repo** — bus-factor mitigation is explicit co-location; a split repo/SPA adds a
   build pipeline, CORS/auth-token plumbing, and deployment surface with zero MVP benefit.
5. **Culturally warm, content-heavy public pages** (funeral services, memorials) — SEO and first
   paint matter more than app-like client state.

## Decision

Adopt a **single Rails 8 application**:

- Server-rendered HTML via **Hotwire** (Turbo + Stimulus) for interactive UI — no SPA framework,
  no Node build step; assets via Propshaft/importmap.
- **JSON API namespace (`api/v1`)** where cross-track contracts or non-browser consumers exist
  (public catalog reads, checkout, `order.fulfilled` outbox events). This namespace is the clean
  seam if a separate frontend ever becomes justified.
- Staff-facing CRUD may use classic controller+view rendering where the only consumer is the page
  itself (see rule below).

**Rendering rule of thumb:** JSON when there is a cross-track contract or non-browser consumer;
server-rendered views when the only consumer is the page itself.

## Alternatives considered

| Option | Why rejected for this phase |
|---|---|
| Next.js SPA + Rails/Node API | Two deployables, two auth models, CORS/token plumbing; team of 3 cannot absorb it before Aug 31 |
| Rails API-only + React | Same as above minus one language; loses Hotwire's free interactivity for internal tools |
| Full monolith views everywhere (no JSON APIs) | Couples producer/consumer workstreams through markup; breaks the contract-freeze parallelization strategy; weaker story for future PWA/mobile |

## Consequences

**Positive**
- One deployable, one auth model, one test suite; daily staging deploys are cheap.
- Contracts stay explicit and testable (`api/v1` shapes + event schema lock-in tests).
- Interactive UX (cart, checkout, map) without maintaining a JS toolchain.
- SEO-friendly server-rendered public pages — matters for funeral-service search traffic.

**Negative / accepted costs**
- Heavy client-side interactivity (e.g., real-time collaborative features) will be harder than in an SPA.
- Frontend talent expecting React/TypeScript won't fit the codebase directly.
- The JSON layer must be maintained deliberately; letting it rot would close off the future split.

## Revisit triggers

Re-evaluate toward a split frontend (React/Next.js on `api/v1`) if any of these land:
1. The **offline-capable field operations** requirement (blueprint §64, post-MVP) demands a
   local-first PWA that Hotwire serves poorly.
2. A dedicated mobile app ships (Hotwire Native is the first stop, full split second).
3. Frontend staffing changes to include React-specialist capacity.
4. Public-site product requirements grow true app-like client state (drag-and-drop builders beyond
   what Stimulus handles well).

## Compliance notes vs. technology-stack.md checklist

- "API-first; domain logic out of presentation layer" → satisfied: domain logic lives in models/
  services (`CheckoutService`, `Events`, `Payments`); controllers are thin.
- "Document every architectural decision" → this document.
- PostGIS, object storage, background jobs, idempotent payment/webhook integrations → unchanged
  from the blueprint recommendation and already adopted.

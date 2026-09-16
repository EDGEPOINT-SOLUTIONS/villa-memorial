# Agent portal — approved design (2026-09-16)

**Status:** captain-approved design, committed as the contract the implementation follows.
**Artifact:** [`agent-portal-design.html`](./agent-portal-design.html) — the Lavish review surface
(13 example screens, desktop + 390 px each, research, plan, per-page specs, open questions).
**Example pages:** [`page-01-signin.html`](./page-01-signin.html) … `page-13-states.html` — one
complete, responsive example per screen, openable on their own at any width.
**Companion report** (full rationale, sources, review record, evidence): the scout report in the
firstmate data directory (`data/villa-agent-portal-design/report.md`).

The PRD that this designs against is in the in-memoriam repo. The lines that matter most:

- `docs/04-modules/finance-billing.md:16-21` — the agent dashboard fields (leads · prospects ·
  follow-ups · sales · plans sold · lots sold · service/product sales · commission · collection ·
  targets · conversion) and the commission engine (agent registration/types · internal & external
  agents · territory · lead assignment/referral tracking · attribution · rates fixed % / fixed ₱ /
  tiered / volume / milestone / split / multi-agent · approval · statements · payment tracking ·
  clawbacks/reversals · cancelled-service handling · ranking analytics).
- `docs/02-architecture/roles-permissions.md:7,13` — Sales Agent and Lot Sales Officer roles; the
  sensitive-data principle ("not exposed merely because a user can access the general customer
  record").
- `docs/04-modules/commerce-catalog.md:33` — pipeline stages New → Contacted → Qualified →
  Presentation → Proposal → Reserved → Sold, and the lead sources.
- `docs/04-modules/facilities-scheduling.md:35,44` — the seven appointment reasons; mobile/PWA
  field ops with offline-capable workflows.
- `docs/04-modules/memorial-property-gis.md:14-18` — lot status, the interactive map, lot
  search/reservation.
- `docs/04-modules/screen-inventory.md:3` — every screen requires the six UI states.
- `docs/07-client-villa/open-questions.md:26` — **commission rules and rates are open**; the design
  therefore shows the commission *shape* with placeholders and never invents a figure.

> **Do not redesign on the way in.** The artifact is the reference. A deviation is the captain's
> call, not the implementer's.

---

## 1. Brand colour — the captain's sky blue (correction applied 2026-09-16)

The first review round carried a deep-sky/navy rail and hero. The captain's correction: **brand
colour is SKY BLUE, never dark blue** — use the sky-blue brand roles the public site already uses
(`--sky-*` primitives and the sky semantic roles from the package page / services work), with
accessible navy ink (the existing `--color-*` ink tokens, never an invented one).

Applied everywhere in this artifact and in the shipped block:

| Surface | Treatment |
|---|---|
| Sidebar rail | light-sky gradient (`--sky-100 → --sky-50`), sky hairline, navy ink |
| Active rail item | sky wash (`--sky-200`) + strong sky edge (`--sky-600`), navy ink |
| Content | `--sky-50` page with a pale sky glow |
| Hero | light sky gradient (`--sky-50 → --sky-200`), navy ink, gold hairline retained |
| Primary actions | the shipped `.btn--primary` sky gradient (AA at every stop), including **View listing** on `/lots` |
| Chips / stage words | white or sky wash with sky-800 ink |
| Focus | the existing brass focus ring |

Contrast stays AA wherever it is asserted: sky surfaces carry navy ink; the deep-sky ladder is used
for ink-level text and small accents only, never as a page surface.

---

## 2. What the agent portal is for

An agent's day is not a web session. It is a phone, a bag of papers, a family at a table, and the
office on the line. The portal exists to make three things true:

1. **Nothing owed is forgotten** — Today leads with a prioritized work list: overdue first, then
   due today, then waiting on the family. Finishing an action removes it from the list.
2. **The family is served in front of them** — a prospect or client record opens on the doorstep
   with the call, the message, the history and the next action one thumb-tap away.
3. **Money is told the truth about** — commission is a shape (per sale, per basis, per state) with
   placeholders until Villa configures rates; client money the agent may not see stays with the
   office.

---

## 3. Information architecture

Four groups, ten destinations; routes are the shipped ones plus four additive ones.

| Group | Screens | Routes |
|---|---|---|
| **Today** | Today (the work list) | `/agent/dashboard` |
| **My pipeline** | Prospects · Clients · Appointments & tasks | `/agent/prospects` · `/agent/clients` · `/agent/appointments` (new) |
| **Sell & earn** | Lot availability · Sales & commissions · Applications | `/agent/lots` (new) · `/agent/sales` · `/agent/applications` |
| **Tools** | Marketing & materials · New lead | `/agent/marketing` · `/agent/new` (new) |

**Phone bottom bar** (five labelled targets ≥ 48 px): `Today · Pipeline · Clients · Lots · More`;
More opens the same groups in the drawer. **Depth rule:** everything the agent does *today* is one
tap; everything else is two. **Naming rule:** the agent's words first, with the shipped route names
kept underneath.

---

## 4. Page-by-page spec

Each page exists in the artifact (anchor `#page-NN`) and as a standalone HTML file. “Data” names the
real object/contract where one exists and says plainly where nothing exists.

1. **Sign in & first run** — `#page-01` · `/agent/login` · *works today*
   Reassurance column (privacy sentence, office number) · sign-in card · review demo-persona fill ·
   trouble line with the office number. **States:** wrong password (no counter) · signed out ·
   service down · expired session. The page is the shipped sign-in; only the sky theme is new.
2. **Today — the work list** — `#page-02` · `/agent/dashboard` · *partly ready*
   Dominant headline (date, greeting, one true sentence) → one primary action band → **What needs
   you now** (work items with one action each) → **Today's stops** (drive order, what to bring,
   confirmation state) → **Your numbers** + target → **One tap away** → example-figures note.
   **Data:** inquiries fixture; activities/leads/agent bookings new; commission engine unbuilt.
   **States:** nothing due · loading · error/offline (last-read stamp) · permission-denied · stale
   commission.
3. **Prospects — the pipeline** — `#page-03` · `/agent/prospects` · *partly ready*
   Headline counts + value · filter chips (All · Funeral services · Plans · Lots · Needs me today) ·
   desktop: ready-to-close strip + four lanes (New · Contacted · Qualified · Meeting planned) ·
   phone: the sorted urgency list · New lead. **Data:** inquiry fixture people; stages per PRD;
   owner/value/next action new. **States:** empty pipeline · empty lane · offline · sold lead moves
   with its amount · search/filter.
4. **Prospect record** — `#page-04` · `/agent/prospects/[id]` · *partly ready*
   Header + call/text → next action with context → what they want → what you've shared (opens) →
   every conversation (timeline) → move forward (logged stage change). **States:** no contact yet ·
   wrong number · duplicate phone · cold lead.
5. **Clients — the book of business** — `#page-05` · `/agent/clients` · *partly ready*
   Headline (families, check-ins) → search (name / lot / plan / phone) → filters → rows with
   holdings and the next thing that matters → privacy note (assigned families only).
6. **Client record — what the agent may see** — `#page-06` · `/agent/clients/[id]` · *partly ready*
   Header · what the family holds (+ co-decider) → money plainly (next amount + date only; confirm
   with the office) → what happens next (“no interment until fully paid” stated kindly) → papers the
   office released → the privacy paragraph. **States:** payment due (no ageing buckets) · at-need
   week (schedule leads) · no money permission (graceful 403) · do-not-contact.
7. **Appointments & tasks** — `#page-07` · `/agent/appointments` · *partly ready*
   Headline (stops, promises, unconfirmed stop) → today's agenda (reason, place, bring, confirmed vs
   waiting) → small promises (checkable) → the rest of the week → book actions + the seven-reason
   note. **States:** double-booked · cancelled · no signal · nothing scheduled.
8. **Sales & commissions — the honest shape** — `#page-08` · `/agent/sales` · *needs backend*
   Headline + statement lines → four states (pending → approved → scheduled → paid) all “₱—” →
   statement (basis, split, reversal lines) → the seven configurable bases → targets/conversion →
   office question. **Rule:** no rate, payout or target figure is ever invented.
9. **Applications** — `#page-09` · `/agent/applications` · *needs backend*
   Headline (in flight · needs you) → primary action band → cards: client, product, filed date,
   what it waits on, owner (you/the office/the family), promised by → start a new application.
10. **Lot availability** — `#page-10` · `/agent/lots` · *partly ready*
    Headline (count, read-stamp) → filters → masterplan with pins → sheet-price cards per type →
    Share / ask the office to hold / directions → two honest limits (hold is an open question;
    prices are the sheet's).
11. **Marketing & materials** — `#page-11` · `/agent/marketing` · *partly ready*
    Headline → material tiles (plan · 2026 price list · caskets · services · chapels · park) each
    with the client's own cover, a description, Open & share, and example share/open stats → how
    sharing will work (opens recorded, people not profiled) → ask the office.
12. **New lead — capture in the field** — `#page-12` · `/agent/new` · *partly ready*
    Offline banner (device-local queue) → one question at a time (name/phone; what they need; where
    from; callback; note) → photo of the form → one big Save → duplicate handling. **Data:** the
    device-local capture is real (`lib/demo-agent-captures.ts`); the CRM write waits on the contract.
13. **States & accessibility** — `#page-13` · *(design system)* · *works today*
    Empty states with a way forward · loading that never blanks the day · offline + queued captures ·
    error with the last true read stamped · permission-denied per block · the two success
    confirmations · the accessibility rules (48 px targets, 16 px base, labels always, status never by
    colour alone, reduced motion, no horizontal scroll to 320 px).

---

## 5. PRD screen → page

| PRD source | Line | Screen(s) |
|---|---|---|
| finance-billing.md | 16–21 | Today · Sales & commissions |
| roles-permissions.md | 7, 13 | Sign-in · Client record · permission-denied states |
| commerce-catalog.md | 33 | Prospects · Prospect record · New lead |
| crm-cases.md | 3–6, 17 | Clients · Client record · Today |
| facilities-scheduling.md | 35, 44 | Appointments & tasks · New lead · States |
| memorial-property-gis.md | 14–18 | Lot availability |
| commerce-catalog.md + screen-inventory.md | catalog as single source; public pages | Marketing & materials |
| screen-inventory.md | 3 | States & accessibility (and every page's states) |
| reporting-dashboards.md | 51–52 | Today numbers · Sales & commissions |

---

## 6. What is built, what waits on the backend

**Built in this implementation:** the grouped sky shell + phone tabs; Today; Prospects + record;
Clients + record; Appointments & tasks; Lot availability; Marketing & materials; New lead (device-local
capture); Sales & commissions as the designed honest placeholder page; Applications as the designed
honest page; the states collection.

**Waits on the backend:** an agent crm scope (the persona holds none — `rbac-scopes-v1`); agent-scoped
projections for leads/activities/bookings/owned clients; a crm-families write path with offline sync;
the commission engine + rates; agent attribution on orders; share-links with view tracking;
document-copy release rules for agents; lot availability freshness + hold semantics (the captain's
Q4). The pages render their final layout now and say what is missing; when a contract lands it changes
data, not design.

---

## 7. Open questions (captain / client)

1. Who signs in — internal, external, or both? *(Recommendation: both scoped to own book.)*
2. Which commission basis first? *(Recommendation: fixed % with splits; statement ready for the rest.)*
3. Who sets targets, and does every agent see them? *(Recommendation: monthly sales value per agent,
   visible to that agent and management.)*
4. Can an agent reserve a lot in the field? *(Recommendation: request-a-hold, office confirms.)*
5. What may a field agent see of a family's money and papers? *(Recommendation: next due + date +
   receipt state only.)*
6. Phone-first PWA with offline capture? *(Recommendation: yes.)*
7. Do agents submit applications and payments through the portal? *(Recommendation: applications yes,
   payments no.)*
8. Which appointments may an agent book directly? *(Recommendation: lot viewing + planning
   consultation, office-confirmed in v1.)*
9. Is share tracking wanted, and is it comfortable for families? *(Recommendation: track opens, never
   profile the family.)*
10. Confirmation pass on this design.

---

## 8. Research behind the design (fetched 2026-09-16)

Full URLs, quotes and what was taken from each are in the companion report §2.3. In brief: Microsoft
Learn (Sales accelerator work list; Dynamics 365 Sales mobile app, meetings, notes, offline actions;
Kanban desktop-only; Partner Center earnings/payments statement fields), HubSpot Knowledge Base
(mobile app; sales workspace; task queues and reminders; meeting prep on mobile; split deal credit;
documents with shareable tracked links; goals), Android Accessibility Help (48 dp targets, 8 dp
separation), NN/g (touch targets ≥ 1 cm, larger when moving; mobile navigation 4–5 labelled tabs;
microsessions; empty states; progressive disclosure; mobile input checklist), web.dev (offline
cookbook), DataReportal (Digital 2025: Philippines — 142 M mobile connections, 98.2 % broadband-capable,
median mobile download 35.56 Mbps).

---

## 9. Files

| File | What it is |
|---|---|
| `agent-portal-design.html` | the review artifact (13 pages, desktop + phone, specs, research, questions) |
| `page-01-signin.html` … `page-13-states.html` | one standalone responsive example per screen |
| `agent-portal.css` | the design's own `ag-*` block loaded after `styles/components.css`; the shipped rules live in the components.css agent block |
| `agent-review.css` | review-surface chrome only (device frames, spec cards) — not product CSS |

> The design examples reference the app's shipped `styles/*` and the client's own `public/media/*`.
> Rebuild the examples from the design source if the block changes; keep this README as the spec.

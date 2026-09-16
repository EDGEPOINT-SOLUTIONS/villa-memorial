# Family portal — approved design (2026-09-16)

**Status:** captain-approved design, committed as the contract the implementation follows.
**Artifact:** [`family-portal-design.html`](./family-portal-design.html) — the Lavish review
surface, also openable directly in a browser (it loads `../../../styles/*` and `prototype.css`).
**Example pages:** [`page-01-signin.html`](./page-01-signin.html) … `page-16-home.html` — one
complete, responsive example per screen, openable on their own at any width.
**Companion report** (full rationale, review record, evidence): the scout report in the firstmate
data directory (`data/villa-family-portal-design/report.md`).

The PRD that this designs against is in the in-memoriam repo:
`docs/04-modules/screen-inventory.md:15` names the twelve family screens;
`04-modules/{crm-cases,documents-contracts,finance-billing,memorial-property-gis,facilities-scheduling,commerce-catalog}.md`
own their contents; `06-cultural-digital-memorial/*` owns the memorial and Filipino-practice
rules; `02-architecture/roles-permissions.md:13` owns the "sensitive data is not exposed merely
because a user can access the customer record" principle.

> **Do not redesign on the way in.** The artifact is the reference. A deviation is the captain's
> call, not the implementer's.

---

## 1. What the family portal is for

A family does not visit this product to manage an account. They arrive in the worst week of their
lives, on a phone, from a group chat, in the middle of a wake — and they come back years later for a
birthday. The portal has to work for both: an at-need week that is pure logistics and emotion, and a
long, quiet relationship afterwards.

Three ideas carry the design:

1. **One Home that answers "what needs me now"** — a priority feed, not an account summary. The
   PRD's Customer Dashboard and Family Dashboard are merged into it (captain question Q1).
2. **The arrangement belongs to the family, not to one account holder** — roles, invitations and
   per-item visibility (`Family & access`).
3. **Tell the truth, plainly, and never fake a service.** Where a page's data does not exist yet it
   says so and gives the family a person to call; it never renders invented detail.

## 2. Information architecture

Six groups, 15 pages, mobile-first. Routes are unchanged from what the app already serves.

| Group | Pages |
|---|---|
| **Home** | Home (`/client/dashboard`) |
| **Our arrangement** | Funeral case (`/client/cases`) · Memorial plans (`/client/plans`) · Memorial property (`/client/property`) |
| **Money & papers** | Payments (`/client/payments`) · Documents (`/client/documents`) |
| **Remembering** | Memorials (`/client/memorials`) |
| **Getting help** | Appointments (`/client/appointments`) · Requests (`/client/requests`) · Support & tickets (`/client/support`) |
| **Our family & privacy** | Family & access (`/client/family`, new) · Notifications (`/client/notifications`) · Privacy Center (`/client/privacy`) · My profile (`/client/profile`) |

**Phone bottom bar** (four pinned + More, which opens the same groups in the drawer):
`Home · Case · Payments · Help · More`. Targets ≥ 44 px; the coordinator's number is in the sidebar
on every page and on Support.

**Naming rules:** never "My Funeral Cases" when there is one funeral — the page title is the
person's name; "Memorial property", never "My Lots"; case/invoice/document numbers live inside
pages, never in titles.

**PRD traceability:** Customer Dashboard + Family Dashboard → Home; My Plans → Memorial plans;
My Lots → Memorial property; My Payments → Payments; My Documents → Documents; My Memorials →
Memorials; My Funeral Cases → Funeral case; My Requests → Requests; My Appointments → Appointments;
Support/Ticket → Support & tickets; Privacy Center → Privacy Center. Added by the design because
the PRD requires their behaviour elsewhere: Family & access (multiple family members, blueprint
§25–26), Notifications (the bell's real page, §41), My profile (the edit path), and the states set.

## 3. The dashboard: "what needs me now"

Five bands, evaluated in this order, at most three rendered on a phone, one calm sentence when all
five are empty.

| # | Band | Trigger | Action |
|---|---|---|---|
| 1 | Waiting on you | a missing paper, a signature, a decision only the family can make | one action (photograph/sign/upload/decide) |
| 2 | Money that gates | due ≤ 7 days, or a balance the family's agreement makes a condition of a service | Pay · Talk to us first |
| 3 | Happening next | the next service within 3 days | Directions · Share |
| 4 | Ready for you | a receipt issued, a tribute to approve, a certificate ready | Open |
| 5 | Remembering | birthday, anniversary, All Souls' | Candle · Remind me |

Rules: **trigger beats date** (a missing permit outranks a payment); one primary action per card and
at most one quiet alternative; **the care window** — from the death until two days after the
interment, money cards demote below the schedule and payment notifications pause (the family can
still open Payments and see everything); a dismissed card returns only if the condition still holds
after 48 h, at most once a day; **no streaks, scores or "complete your profile" prompts**; stale
figures are stamped with the time they were read; an empty feed is a designed state.

The pure logic lives in `lib/family/family-view.ts` (`buildFamilyNeeds`) and is unit-tested in
`tests/unit/family-view.test.ts`.

## 4. Page-by-page spec

Legend: **built** = implemented in this repo today; **partly** = renders from the family snapshot;
**blocked** = designed, waiting on a service (the page says so).

### 4.1 Sign in & invitation — `/client/login` · *built (shipped sign-in)*
Reassurance column · the sign-in card (email, password, keep me signed in) · "email me a sign-in
link" · one sentence about invitation links.
**States:** wrong password (no attempt counter) · expired invitation (call the coordinator) ·
service down (office number) · signed out.
**Not real yet:** invitation links, magic links.

### 4.2 Home — `/client/dashboard` · *partly*
Breathing welcome (name, life dates, chips, "what needs you now" aside) → the needs feed →
reach us in a tap → money and papers (plan total / paid / still open, latest papers, papers we
still need) → remembering (monogram portrait, what the memorial will hold) → if something is wrong.
**States:** nothing needs you · family summary unavailable (error) · a page whose schedule/case/
memorial data is not wired (honest note) — mobile collapses the deep blocks.
**Not real yet:** the funeral schedule, case progress, memorial pages.

### 4.3 Funeral case — `/client/cases` · *blocked (designed page)*
Where they are now (the seven stages in family words — previewed on the page) · the services and
schedule · what the family arranged · the case papers · if something changes.
**Missing:** a family-scoped read of the case, its schedule and its documents.

### 4.4 Memorial plans — `/client/plans` · *partly*
Plan money strip (status · term · still open) · where the payments are (progress from integer minor
units) · what the plan is for · papers · things you can ask for.
**Not real yet:** the instalment schedule, plan terms copy, receipts, plan documents.

### 4.5 Memorial property — `/client/property` · *blocked (designed page)*
The place (with the masterplan) · who it belongs to · payments for the lot (**the "fully paid before
interment" rule stated early, with three ways out**) · on the lot right now (interments, maintenance,
care fund) · what you can ask for.
**Missing:** ownership, sale terms, interments, care fund, maintenance history.

### 4.6 Payments — `/client/payments` · *partly*
What needs you · how to pay (GCash/Maya on the number the office confirms · bank transfer on request ·
cash/collection) · payment history (**honest: not wired yet**) · if money is tight (a grace sentence,
never a penalty figure) · help with the cost (LGU, DSWD, senior, SSS/GSIS).
**Not real yet:** payment history, per-payment receipts, online payment.

### 4.7 Documents — `/client/documents` · *partly*
Waiting on you (**honest: nothing right now**) · your family's papers (from the snapshot, in family
words) · who can see these papers · when a paper is wrong.
**Not real yet:** the full repository, missing-paper rules, uploads, copy requests, certified copies.

### 4.8 Memorials — `/client/memorials` · *blocked (designed page)*
Your family's pages · tributes waiting for approval · who can see it · remembrance dates · during a
wake (guestbook, programme, private livestream).
**Missing:** the whole memorial module (content, media, moderation, visibility).

### 4.9 Requests — `/client/requests` · *blocked (designed page)*
Open requests · what you can ask for · a new request · closed requests.
**Missing:** the service desk (ticket number, owner, status, history).

### 4.10 Appointments — `/client/appointments` · *blocked (designed page)*
Upcoming (confirmed vs **requested, not yet confirmed**) · ask for a time (who is coming, what we
should prepare) · past appointments · or just call.
**Missing:** a family-facing request with a confirmation state.

### 4.11 Support & tickets — `/client/support` · *built today (contact), blocked (tickets)*
Talk to us now (coordinator, second line, Villa Agency, office and park) · send us a ticket
(designed, with the honest "nothing you type here would reach us yet") · your tickets · the six
questions families ask most.
**Missing:** ticket creation, assignment, SLA, history.

### 4.12 Family & access — `/client/family` · *blocked (designed page)*
The people on the account · what each role can see · family living abroad · decisions and consent.
**Missing:** family membership, roles, invitations.

### 4.13 Notifications — `/client/notifications` · *partly*
Latest (**clearly labelled placeholder notices from the portal build**) · what we send · how they
reach you · quiet hours · "we never market to a family in an active arrangement".
**Missing:** the notifications engine, preferences, delivery state.

### 4.14 Privacy Center — `/client/privacy` · *blocked (designed page)*
Our promise · what other people can see · who looked at your records · your choices · your Data
Privacy Act rights · what we keep and for how long.
**Missing:** the consent store, the access-log projection, DPA requests, the retention schedule
(an open client decision).

### 4.15 My profile — `/client/profile` · *partly*
About you · language and reading (**device-local switches that really work**) · sign-in and family
shortcuts.
**Not real yet:** editing contact details, languages, the signed-in devices list.
**Note:** the reading preferences are stored on the device (`localStorage`, `im_family_reading`) and
applied through `[data-fp-reading]`; the page says so.

### 4.16 States & accessibility — *(design system, not a route)*
Empty · loading · error/offline · accessibility modes · the mobile gestures deliberately **not**
used (no pull-to-refresh as the only path, no long-press primary actions, no swipe-to-delete, no
infinite scroll on money or documents, no timed sessions).

## 5. Grief-aware stance (testable)

- **Language:** no ledger-speak. The banned list lives in `FAMILY_JARGON`
  (`lib/family/family-view.ts`) and a unit test walks a rendered family block for it. Name the
  person, not the process. Plain tense ("Ernesto is in our care"), never "the remains".
- **No dark patterns:** no timers or scarcity; no pre-ticked consent; no cancellation maze; no
  upsell inside an at-need flow; payments never the pre-selected action during the care window.
- **Dignified imagery:** a photograph is never required — the monogram portrait is the default; no
  stock faces, no caskets or graves as decoration; only the family's own and the client's own
  imagery, with the park masterplan used as the lot map.
- **Accessibility (WCAG 2.1 AA targets):** 16 px base in the family portal, ≥ 44 px targets, visible
  focus ring, status never by colour alone, no horizontal scroll down to 320 px, motion
  120–200 ms and disabled under `prefers-reduced-motion`, plus the device-local reading modes.
- **Money:** amounts come from integer minor units and are never parsed out of display strings
  (`lib/family/family-view.ts`, pinned by `tests/fixture-contract/family.test.ts`).

## 6. What is built, what is blocked

**Built in this repo:** the grouped rail + phone tab bar, Home, Memorial plans, Payments, Documents,
My profile (with working reading preferences), Support's contact content, Notifications' placeholder
list, and the designed honest pages for the blocked screens.

**Blocked on the backend (eleven asks, in priority order):**

1. **A family role and family scopes** — the customer persona holds only
   `tenancy:modules:read` + `catalog:read` (`lib/fixtures/auth/personas.json`); the frozen
   `rbac-scopes-v1` has no family scope. Adding a scope is additive.
2. **Family-scoped projections** for cases, lots, invoices and documents (filtered and reshaped;
   no internal notes, no aging buckets, no other families).
3. **Family membership, roles and invitations** (owner / family / contributor / guest).
4. **Memorial service** (content, media, moderation, visibility levels, QR, reminders).
5. **Requests / tickets** (six-state lifecycle with assignment and history).
6. **Family-facing appointments** (requested → confirmed, attendee and preparation fields).
7. **Payment history, per-payment receipts, online payment** (a `payment.recorded` event; payer on
   the receipt).
8. **Consent store + access-log projection** ("who on staff looked at my family's record").
9. **Document object storage** + a "required document" rule per contract with a due date.
10. **Notifications engine + preferences + quiet hours**, with "never market to a bereaved family"
    expressible as configuration.
11. **Ownership / lot sale / interment records** for the memorial-property page.

**Client data still to confirm (never invented in the UI):** the DPA retention schedule and privacy
policy, public memorial search rules, payment destinations (no account numbers are published), and
whether Chavacano is needed alongside English and Filipino.

## 7. Fixtures

The family snapshot (`lib/fixtures/family/snapshot.json`) now carries `balance_cents` beside its
display strings: views never parse a display price, and
`tests/fixture-contract/family.test.ts` pins the two forms together. It stays explicitly
**provisional** — no family API contract exists yet.

## 8. Files

| File | What it is |
|---|---|
| `family-portal-design.html` | the review artifact (16 pages, desktop + phone, with the spec sheets) |
| `page-*.html` | one standalone responsive example per screen |
| `prototype.css` | the design pages' own stylesheet, loaded after `styles/components.css`; the shipped rules live in the components.css family block |
| `family-review.css` | review-surface chrome only (device frames, spec cards, question controls) — not product CSS |

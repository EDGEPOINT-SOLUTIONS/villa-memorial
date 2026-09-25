# Next-session plan — pick the Villa Memorial front end up on another machine

**Status:** handover plan · **Written:** 2026-09-26 · **Base:** `main` at
commit `0d62693` (merge of PR #131) · **Repository:**
`https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial`

This document is written to be read **on its own**, on a fresh clone, by whoever
continues this work. It records where the project stands, what the client asked
for and how far each ask is, the standing design rules, the work that is queued
or in flight (with acceptance criteria), how to run and test the project from
another machine, the delivery workflow, and the deployment path. Nothing here is
a secret: every path is a file that exists in this repository after cloning.

> **One-line orientation.** The product is a single Next.js (App Router,
> TypeScript) application that serves four surfaces — the public storefront, the
> Admin Portal, the family portal and the agent portal — plus its own BFF route
> handlers. It runs **fixtures-first**: with no gateway environment variables set
> it serves recorded contract fixtures in-process, so every screen demos
> standalone. Five client-requested features (minutes items 1, 2, 4, 5, 8) are
> merged; four follow-up workstreams (minutes items 3, 6, 7 and the page
> design/type system) are queued or in flight.

**Read first, in this order** (all in this repository):

1. [`AGENTS.md`](../../AGENTS.md) — the non-negotiable rules and the settled
   component patterns. This is the single most important file for a new session.
2. [`README.md`](../../README.md) — what the repo is, how to run and deploy it.
3. [`docs/08-delivery/notes/demo-web-route-coverage.md`](notes/demo-web-route-coverage.md)
   — the living route index: what every route serves today.
4. [`docs/08-delivery/frontend-complete.md`](frontend-complete.md) — the dated
   completion record: what shipped, which PRs, what remains with an owner.
5. [`docs/08-delivery/open-items.md`](open-items.md) — the standing short list of
   what is waiting on the platform and on the client.
6. This document.

**Contents**

- [1 · Where the project stands](#1--where-the-project-stands)
- [2 · The client minutes, item by item](#2--the-client-minutes-item-by-item)
- [3 · The captain's design rules](#3--the-captains-design-rules)
- [4 · Next work, in detail](#4--next-work-in-detail)
- [5 · Working from another machine](#5--working-from-another-machine)
- [6 · The delivery workflow](#6--the-delivery-workflow)
- [7 · Deployment](#7--deployment)
- [Appendix A · Command cheat sheet](#appendix-a--command-cheat-sheet)
- [Appendix B · The recent PR history](#appendix-b--the-recent-pr-history)
- [Appendix C · Where to look](#appendix-c--where-to-look)

---

## 1 · Where the project stands

### 1.1 What the codebase is

- **One application, four surfaces plus a BFF.** The route groups are
  `app/(public)`, `app/(staff)`, `app/(family)`, `app/(agent)` and `app/api/*`
  (BFF handlers only — they manage sessions and proxy; no business rules).
- **Fixtures-first.** Recorded contract fixtures live under `lib/fixtures/`;
  typed readers live under `lib/api-client/`. With no gateway base URLs set the
  readers serve the fixtures in-process. Live mode is opted in per service by an
  environment variable (see §5.4).
- **Durable admin stores.** Several admin surfaces (catalogue, pricing, orders,
  chapel schedule, content entries, membership applications, payments,
  operations cases) persist writes to an append-only journal under `.data/`
  (gitignored) in fixture mode, so edits survive a reload without a backend.
- **One typography and one token system.** Inter is the single product face;
  every visual decision goes through `styles/tokens.css`. The paper/print layer
  uses the client's own faces (`lib/export/paper-profile.ts`).
- **Size:** 336 commits on `main`, 188 unit test files and 36 fixture-contract
  test files under `tests/`.

### 1.2 Current `main`

- HEAD `0d62693`, the merge of PR #131 on 2026-09-26 (local time).
- The latest ten merged PRs (#122–#131) are the **UI renovation** and the
  **client-minutes** deliveries. The full table is in
  [Appendix B](#appendix-b--the-recent-pr-history), with each merged piece and
  what it changed.

### 1.3 The renovation PR history, and what each piece changed

The 2026-09-25 renovation was staged as a foundation plus parallel sweeps, then
the client-minutes work was layered on top.

| PR | Title | What it changed |
|---|---|---|
| [#121](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/121) | UI renovation foundation: white grounds, sky on controls + footer | Introduced the renovated system: all page grounds white, sky blue confined to controls (buttons, selected states, call actions) and the footer; flat, sharp staff shell. The foundation every other sweep builds on. |
| [#122](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/122) | Fix the `/staff/pricing` page overflow (round 2 broken pages) | Contained the wide pricing tables so the page stops panning 434 px sideways. |
| [#123](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/123) | Public-site sweep: flat white grounds, no decorative gradients or marble | Every public route onto the renovated white-ground system. |
| [#124](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/124) | Admin Portal sweep: shared route states, kit controls, flat sharp staff shell | Every Admin Portal screen onto the system, sharing route states and the component kit. |
| [#125](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/125) | Agent & family portals: calm, flat, Apple-inspired sweep | Both portals onto the same white-ground, calm grammar. |
| [#126](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/126) | Payment-due notifications: derive due dates and remind two days before | **Minutes item 1.** Derives each client's payment due dates from the recorded schedule and raises the two-days-before reminder in-system. |
| [#127](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/127) | Staff dashboard: red payment alert band for dues two days out | **Minutes item 4.** A red, accessible alert band on `/staff/dashboard` reporting payments due within the two-day window and those already overdue, with the count and a route to billing. |
| [#128](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/128) | Add the staff burial calendar with linked light pickups | **Minutes item 2.** A month/week burial calendar; each burial carries its linked light-pickup on one record for preparation/coordination staff. |
| [#129](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/129) | Funeral services: Request for Quote instead of displayed prices | **Minutes item 5.** Removed displayed funeral-service prices; every service line now carries one `Request a quote` action that opens `/quote` prefilled. |
| [#130](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/130) | Monthly-first pricing for memorial plans and lots (minutes item 8) | **Minutes item 8.** Plan and lot cards lead with the monthly installment and payment term (or an honest pending-term wording); the total contract price stays available. |
| [#131](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/131) | Home storefront rebuild: Amazon-familiar structure, right-sized type, designed opening band | Rebuilt the home on the Amazon-familiar storefront grammar: three-column anchored shell kept, structure and presentation rebuilt, useful elements only, right-sized type, a designed opening band. |

Earlier in the same arc: the public-design Phase 0 contract and its four rollout
lanes (#111, #113–#116), the homepage plans-and-lots band (#117), the footer
clean-up (#118), PDP media storage (#119), the vendored ECC reference skills
(#120), and the 2026-09-19 completion push (#43–#73) recorded in
[`frontend-complete.md`](frontend-complete.md).

### 1.4 What "complete" means here

Every screen the platform PRD assigns to these four surfaces is built to a
**designed state**: a real screen on a frozen contract or a durable fixture
store, or the designed honest state that names the contract it waits on. Nothing
fakes data. The per-route proof is
[`notes/demo-web-route-coverage.md`](notes/demo-web-route-coverage.md).

The work that remains is of three kinds:

1. **Design/UX refinement lanes** driven by the captain's 2026-09-25 feedback
   (type right-sizing, designed page openings, storefront listing structure).
2. **Client-minutes items still open** (branding, location map, photo imagery).
3. **Contract and client gates** — platform services not yet frozen, and five
   client answers only Villa can give (§4.5).

---

## 2 · The client minutes, item by item

The **Villa Memorial minutes of meeting, 2026-09-21**, list eight client
requests. Their wording is quoted in the brief that drove each piece and in the
merged PRs; the table and notes below are the consolidated record.

| # | Minutes item | Status | Carried by |
|---|---|---|---|
| 1 | Payment Due Notification | **Shipped** | [#126](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/126) |
| 2 | Calendar Integration for Light Pickup and Burial Schedule | **Shipped** | [#128](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/128) |
| 3 | Change Branding to Villa Funeraria | **In flight** | branch `fm/villa-branding-villa-funeraria` (no PR yet) |
| 4 | Dashboard Payment Due Notification (red indicator) | **Shipped** | [#127](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/127) |
| 5 | Replace Funeral Service Prices with Request for Quote | **Shipped** | [#129](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/129) |
| 6 | Villa Memorial Map Integration | **In flight** | branch `fm/villa-map-location` (no PR yet) |
| 7 | Client-provided approved imagery | **Waiting on the client** | — (no code until Villa submits) |
| 8 | Display Monthly Pricing for Memorial Plans and Lots | **Shipped** | [#130](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/130) |

### Item 1 — Payment Due Notification · shipped

> *"The system shall automatically notify clients of upcoming payment due dates
> at least two (2) days before the scheduled due date. Notifications should be
> visible within the system and, where supported, may be delivered through other
> configured notification channels."*

Expected: automatic due-date calculation, a two-days-before trigger, and clear
identification of client, payment reference, amount due and due date.

Shipped in **#126**. The rules are pure and live in `lib/payment-schedule.ts`
(`paymentDues`, `paymentDueNotices`); the reminder channels are declared in
`lib/payment-reminder-channels.ts`. Evidence:
`tests/unit/payment-schedule.test.ts`, `tests/unit/payment-due-notifications*`
and `tests/unit/family-payment-notices.test.tsx`. The family-facing billing read
is a platform ask recorded in [`open-items.md`](open-items.md) §6.

### Item 2 — Calendar for Light Pickup and Burial Schedule · shipped

> *"Integrate a calendar into the system to record and manage burial schedules.
> The calendar shall include the pickup schedule of lights, corresponding to the
> date of burial."*

Expected: burial dates on a calendar, the recorded light-pickup schedule, the
pickup linked to its burial record, visibility for preparation/coordination
staff. Shipped in **#128** on `/staff/schedule`: the month/week board reads a
PROVISIONAL recorded burial-and-pickup sheet. Pure model in `lib/burial-schedule.ts`.
Evidence: `tests/unit/burial-calendar.test.ts`, `tests/unit/burial-calendar-page.test.tsx`,
`tests/unit/burial-schedule.test.ts`. No burial-schedule contract exists, so live
mode answers a named 503.

### Item 3 — Change Branding to Villa Funeraria · in flight

> *"Replace the text 'Villa Memorial Lots' with 'Villa Funeraria' on the
> upper-left section of the homepage. Update the branding and displayed label.
> Ensure consistency with the approved Villa Funeraria branding across relevant
> pages."*

Scope: replace the stale displayed label with **Villa Funeraria** everywhere it
renders, keep the approved brand mark, and keep the **navigation bar structure
untouched** (text/wordmark only). Check metadata titles/descriptions that name
the brand; leave the legal/company name alone where it differs. Acceptance:
a plain list of every replaced string, updated tests, and the full check set
green. In flight on branch `fm/villa-branding-villa-funeraria`.

### Item 4 — Dashboard Payment Due Notification (red indicator) · shipped

> *"Integrate a red-colored notification indicator on the dashboard for payments
> approaching their due date, specifically two (2) days before the due date."*

Expected: a prominent red alert, the number of payments needing attention, a
route to the details, and a distinction between upcoming and overdue. Shipped in
**#127** on `/staff/dashboard`. The red is the payment-alert colour and stays
accessible (`--color-status-danger-strong` is the white-ink fill). Evidence:
`tests/unit/payment-alerts.test.ts`, `tests/unit/dashboard-payment-alerts.test.tsx`.

### Item 5 — Replace Funeral Service Prices with Request for Quote · shipped

> *"Remove the displayed prices for funeral services. Replace the price
> information with a 'Request for Quote' option."*

Expected: a quote action instead of a fixed price; an inquiry capturing name,
contact details, requested service, preferred date and additional requirements.
Shipped in **#129**. Every funeral-service surface (`/services`, `/facilities`,
the guide entries, the chapel cards) publishes no service rate and no cart
action; each line carries one `Request a quote` action that opens `/quote`
prefilled (`lib/public-forms/request-prefill.ts` → `buildQuoteHref`). Sheet
figures remain in `lib/villa-pricing.ts` as the office's quotation source and are
still pinned by tests. Evidence: `tests/unit/price-surfacing.test.tsx`,
`tests/unit/villa-services-premium.test.tsx`, `tests/unit/facilities-page.test.tsx`.

### Item 6 — Villa Memorial Map Integration · in flight

> *"Integrate a map showing the location of Villa Memorial… Display the location
> on the website. Provide an interactive map where appropriate. Include address
> and navigation assistance. Ensure the map location is accurate and approved by
> the client."*

Scope: a **location** block (distinct from the park/property masterplan at
`/map`) with an embedded/interactive map where it works without a paid key, the
recorded address, and a clear `Get directions` action, placed where customers
look (contact page / footer / home contact band). Use the recorded address
exactly; flag anything needing the client's confirmation. Acceptance: tests pin
the address rendering and the directions URL construction; full check set green.
In flight on branch `fm/villa-map-location`.

### Item 7 — Client-provided approved imagery · waiting on the client

Villa Funeraria will provide high-resolution, approved images (facilities, lots,
service facilities, landscaping, branding) with captions/descriptions. There is
nothing to build until the images arrive; when they do, integrate them through
the content system with the client's approved labels. **Never publish
identifiable mourners** (see §4.5). The client's existing 21 photographs are
already integrated where permitted; seven are withheld.

### Item 8 — Display Monthly Pricing for Memorial Plans and Lots · shipped

> *"The system shall display the monthly payment price instead of the full or
> total price for Memorial Plans and Lots… Display the monthly installment amount
> prominently. Provide payment terms, such as the number of months, where
> applicable. Clearly identify the total contract price and other relevant terms
> when needed."*

Expected example: *Product | Monthly Price | Payment Term*. Actual pricing and
terms must be provided/approved by Villa Funeraria. Shipped in **#130**. Plan
and lot cards now lead with the monthly installment and term through
`lib/landing/plan-lots.ts` → `lib/monthly-pricing.ts` (a lot's recorded 72-month
term and total contract price; a plan's pending-term wording when the client has
not approved a term). Never author an amount in the fixture, copy or view.
Evidence: `tests/unit/monthly-pricing.test.ts`,
`tests/unit/monthly-pricing-surfaces.test.tsx`,
`tests/fixture-contract/landing.test.ts`.

---

## 3 · The captain's design rules

These are the standing standards every change is judged against. Each rule names
where it is recorded and what enforces it, so a new session can check itself
without guessing.

### 3.1 Right-sized type — no oversizing

**Rule.** Type is at the right size; nothing is oversized. Nothing above ~40 px
on a public page; the hero tops out at 36–40 px desktop (the 52 px top of the
`--text-display` clamp reads fake); card price figures ~18–20 px; totals ~20–22 px;
stat/finance figures ~20–24 px; headings stay on the recorded rungs (page title
28, section 22, card title 18/22). Hierarchy comes from **weight, colour and
spacing — not size**. Every readable size is one of the seven ladder steps in
`styles/tokens.css` (12 px hard floor) chosen through the role→step map there
(`--text-hero` · `--text-page-title` · `--text-section-title` · `--text-card-title`
· `--text-body` · `--text-ui` · `--text-caption` · `--text-micro`).

**Known offenders named in the 2026-09-25 review:** `.shop-card__price` at
`--text-2xl` (28 px bold), `.svc-total__amount` at `--text-3xl` (36 px), and the
fluid display clamp topping at 52 px.

**Where it lives.** `styles/tokens.css`; `styles/components.css`.
**Enforced by.** `tests/unit/typography-system.test.ts` (fails a raw/off-ladder
size, a sub-12 px value, a second typeface, a gold-as-text rule, or a mapped role
class moved off its step) and `tests/unit/page-backgrounds.test.ts` for grounds.
The type right-sizing lane (§4.1) additionally makes the figure caps executable.

### 3.2 White page grounds; sky blue on controls and the footer only

**Rule.** All page backgrounds are **white**. Sky blue is for **buttons/controls
and the footer only** — never a page background; a sky-washed page reads cheap
and AI-made. Page and surface grounds are white product-wide.

**Where it lives.** `styles/tokens.css` (`--sky-*` primitives mapped to control
roles); the renovation CSS blocks in `styles/components.css`.
**Enforced by.** `tests/unit/page-backgrounds.test.ts` (white grounds
product-wide; the staff sidebar is white with a sky active edge).

### 3.3 Designed page openings

**Rule.** The first thing a customer meets on a page — the title and first
section — is a **designed band**, not a bare title on white. One pattern across
the product: eyebrow (where it helps) · headline · one short lead line · the
page's key action, plus a breadcrumb where the hierarchy needs it. It must read
sharp, familiar and empathetic, with deliberate whitespace — never crowded, never
an intimidating wall.

**Where it lives.** `components/public/public-hero.tsx` (the one public hero:
`home` / `interior` / `call-first`), `components/public/section-head.tsx`, and
the Phase 0 layout contract `lib/public-layout.ts`.
**Enforced by.** `tests/unit/public-layout.test.ts`,
`tests/unit/public-page-budget.test.tsx`,
`tests/unit/public-surface-consistency.test.ts`. The page-openings lane (§4.1)
extends these guards to the portals.

### 3.4 No unnecessary huge images

**Rule.** Every image is purposeful and right-sized; huge filler images are a
named offender. There are explicit ceilings: phone hero 42 vh; card 4:3; band
lead 3:2; PDP 4:3; map 1:1. An image's `sizes` hint must match the real box it
renders in — an underestimated hint makes the browser stretch the next-smaller
derivative. Derivatives, never multi-megabyte originals at thumbnail size.

**Where it lives.** `lib/public-layout.ts` (ceilings), `lib/media.ts` and
`lib/client-photos.ts` (which derivative each role uses), the
`public layout grammar` CSS block.
**Enforced by.** `tests/unit/public-image-rules.test.tsx`,
`tests/unit/public-layout.test.ts`, `tests/unit/phone-layout.test.tsx`,
`tests/unit/broken-pages.test.ts` (an `img`-level `aspect-ratio` must reset
`height: auto`), `tests/unit/composition-pass.test.tsx` (no decorative gradients
or card shadows in public bands).

### 3.5 Familiar Amazon-style storefront grammar

**Rule.** Customers should recognise how to scan, compare and act. The storefront
grammar is **picture first → name → price/status → one clear action**. Listing
surfaces get a sticky left filter rail (a filter sheet on phones), even
image-first columns, sort/refine affordances, and deliberate column widths.
Amazon is the *structural* reference; the colours, type and language stay ours.

**Where it lives.** The settled patterns in `components/kit/` (`DataTable`,
`ResultsGrid` + `ProductCard`, `FilterRail`, `StatCard`, `StatusChip`,
`EmptyState`); the "composition grammar" block in `styles/components.css`; the
`.shop-grid` / `.shop-card` card grammar.
**Enforced by.** `tests/unit/products-listing.test.tsx`,
`tests/unit/composition-pass.test.tsx`,
`tests/unit/component-kit-public-adoption*`, and the per-page guards named in
`AGENTS.md`. The storefront-listing lane (§4.1) extends this to every listing
surface.

### 3.6 Empathetic and uncrowded presentation

**Rule.** Grief-first wording and order; every surface answers its question **at
a glance**. Never dense walls of text, never decorative noise, fewer blocks,
deliberate whitespace, one clear action at each step. Honesty is kept but
compressed — status + what is missing + who to call, one line each.

**Where it lives.** The reading budget: one ≤12-word opening sentence + one
primary action per page; paragraph prose ≤300 words; no paragraph or list item
over 30 words. `components/public/section-head.tsx`; `tests/helpers/prose.ts`.
**Enforced by.** `tests/unit/reading-budget.test.tsx`,
`tests/unit/family-reading-budget.test.tsx`,
`tests/unit/public-page-budget.test.tsx`.

### 3.7 Navigation bars untouched

**Rule.** Do not restyle the navigation bar. Its structure is fixed: five
top-level chips (Home · Funeraria Memorial Services · Villa Memorial Plan ·
Villa Memorial Park · Contact) plus the grouped **Explore more** menu (Builder ·
Facilities · Gallery · Memorials · Price list). The brand *label* may change when
the client asks (minutes item 3), but not the bar's structure, spacing or
behaviour. `SITE_NAV_LINKS` / `EXPLORE_MORE_LINKS` in
`components/landing/site-header.tsx` are the authority.

**Where it lives.** `components/landing/site-header.tsx`; the "anchored
catalogue home" CSS block.
**Enforced by.** `tests/unit/public-nav.test.tsx`,
`tests/unit/landing-view.test.tsx`, `tests/unit/nav.test.ts`.

### 3.8 No screenshot artifacts

**Rule.** Ship no screenshot artifacts: nothing that is a screenshot of a design,
a browser/placeholder frame, or a broken/dead image may stand in as product
content. If a picture is not the client's real material it is either labelled
illustrative or omitted. Relatedly, **do not read, capture or attach
screenshots** for this work — they have wedged sessions with oversized request
bodies, and the captain's current direction is no screenshot artifacts.
**Evidence is measurements and test output, never screenshots.**

**Enforced by.** The imagery honesty tests: `tests/unit/client-photos.test.ts`,
`tests/unit/catalogue-imagery.test.ts`, `tests/unit/gallery-page.test.tsx`,
`tests/unit/broken-pages.test.ts`; plus the general rule that design records
carry measured values and test output in the PR body.

---

## 4 · Next work, in detail

Two categories: **queued/in-flight engineering lanes** with scope and acceptance
criteria, and **held items** that are waiting on an external decision or
submission. Everything here is a candidate for the next session; the lanes in
4.1 are already dispatched (their branches exist with no commits), so check
whether one already opened a PR before starting duplicate work.

### 4.1 The engineering lanes

#### Lane A — Type right-sizing product-wide

**Why.** Captain, 2026-09-25: *"the sizes of the fonts are too big, it looks so
fake and the prices are so big… Fonts size should just be at the right size with
no oversizing."* The just-merged lanes applied the rule where they touched
figures; this lane finishes everywhere else.

**Scope.**
- Audit and correct every remaining oversized figure: the shared catalogue card
  price (`.shop-card__price`, still 28 px bold), the product detail page buy box,
  admin stat/finance figures, the agent and family portal figures, the price
  lists and tables, and any other oversized figure found.
- Apply the caps from §3.1 (nothing above ~40 px public; card prices 18–20 px;
  totals 20–22 px; stat figures 20–24 px; headings on the recorded rungs).
- **Make the caps executable:** extend `tests/unit/typography-system.test.ts` so
  an oversized figure fails a test (a bounded cap per role) rather than relying on
  review.

**Acceptance criteria.**
- No figure/price anywhere renders above its role's cap; hierarchy still reads
  from weight/colour/spacing.
- `tests/unit/typography-system.test.ts` fails on an oversized figure, with the
  offending selector named.
- Money stays a live reference (no amount typed into a view).
- Full gates green (see §6.2).

**In flight:** branch `fm/villa-type-sizing`. Key files: `styles/tokens.css`,
`styles/components.css`, `tests/unit/typography-system.test.ts`.

#### Lane B — Designed page openings product-wide

**Why.** Captain, 2026-09-25: *"every page titles or 1st page section is so
basic and whack"* and *"not crowded, not overwhelming like huge images that are
not necessary."*

**Scope.**
- The interior-page opening becomes a designed band (eyebrow · headline · one
  short lead · the page's key action; breadcrumb where it helps), consistent
  across public pages, the Admin Portal and both portals.
- Keep honest, grief-appropriate tone; no unnecessary large images (the opening
  banner stays optional and within the existing ceilings; if a photo does not add
  meaning, drop it rather than shrink it to fit).
- Right-sized type per Lane A; **navigation bars untouched**.
- Extend the layout guards so the opening grammar is pinned (eyebrow/headline/
  lead/action presence, ceilings, no bare-title openings where the pattern
  applies).

**Acceptance criteria.**
- Every page opens on the designed band; no route left with a bare title on white
  where the pattern applies.
- `tests/unit/public-layout.test.ts` (or a new/extended guard) asserts the
  opening anatomy and the image ceilings.
- Full gates green.

**In flight:** branch `fm/villa-page-headers`. Key files:
`components/public/public-hero.tsx`, `components/public/section-head.tsx`,
`lib/public-layout.ts`, the portal shells.

#### Lane C — Storefront listing restructure (Amazon-familiar)

**Why.** Captain, 2026-09-25: the designs and structures were all the same; the
listing surfaces need renovating with Amazon-familiar UI/UX so customers
recognise how to scan and act.

**Scope.** Products, lots, plans, price list, gallery.
- Sticky left **filter rail** (filter **sheet** on phones).
- Even, image-first grid: picture → name → price/status → **one** clear action.
- Sort/refine affordances; deliberate columns.
- Keep the approved design language and right-sized type; no unnecessary huge
  images; remove non-useful elements.

**Acceptance criteria.**
- Each named surface has a sticky filter rail on desktop and a filter sheet on
  phones, or a documented reason it keeps its existing approved grammar (as
  `/lots` does with its captain-approved rail).
- Cards follow picture-first → name → price/status → one action, at the shared
  column widths.
- Guards updated/extended; full gates green.
- **Blocked-by:** Lane A (type sizing) and Lane B (page openings) — land those
  first so the listing lane does not fight the type/openings changes.

**Queued:** no branch yet. Key files: `components/kit/*`,
`app/(public)/{products,lots,plans,price-list,gallery}`, the listing CSS blocks.

#### Lane D — Location map (minutes item 6)

**Scope.** A **location** block (distinct from the park masterplan on `/map`)
showing where Villa Memorial is: an interactive map where it works without a paid
key, otherwise a static map-style block plus a **Get directions** link built from
the recorded address. The full address and a clear directions action, placed
where customers look (contact page, footer or the home contact band). Use the
recorded address exactly; flag any figure that needs the client's confirmation.
Address facts come from the staff-editable landing contact region — never typed
into a view.

**Acceptance criteria.**
- The block renders the recorded address and a directions URL built from it; both
  are pinned by tests.
- The block is visually distinct from the park/property map.
- Any interactive map works without a paid key, or the page is honest that it is
  not interactive.
- Full gates green.

**In flight:** branch `fm/villa-map-location`. Key files:
`app/(public)/contact/page.tsx`, the footer (`components/landing/site-header.tsx` /
the landing footer), `lib/api-client/landing.ts` (contact region),
`lib/family/contact.ts` (the one contact module).

#### Lane E — Villa Funeraria branding (minutes item 3)

**Scope.** Replace the stale "Villa Memorial Lots" displayed label with **Villa
Funeraria** wherever it renders (homepage upper-left, any footer/page shells),
keeping the approved brand mark. Update metadata titles/descriptions that name
the brand. Do **not** restyle the navigation bar. Leave the legal/company name
untouched where it is deliberately different.

**Acceptance criteria.**
- A plain list of every replaced string accompanies the change.
- Tests/snapshots asserting the old label are updated; full gates green.
- No nav-bar restyle; no other content change.

**In flight:** branch `fm/villa-branding-villa-funeraria`. Key files: the brand
mark component(s), `components/landing/site-header.tsx`,
`lib/seo.ts` (metadata), plus any page shell.

### 4.2 Held items — platform contracts

**Owner: the platform developer.** The front end names every missing contract in
the screen's honest state and refuses live mode with a named 503 or
`not_wired` — it never fakes a service. The authoritative lists are:

- [`frontend-complete.md`](frontend-complete.md) §"What remains — with its
  owner": the 19 standing asks plus the nine later ones (content/CMS read-write,
  provisional-receipt record, membership/COC record, embalming-preparation
  record, guarantee-instrument record, scheduling resource write, user
  provisioning, workflow engine, tenancy-config).
- [`open-items.md`](open-items.md) §5 (media upload object store, C12) and §6
  (family payment schedule).

**When a contract freezes:** update the four places `AGENTS.md` names (the
route-coverage note, `frontend-complete.md`, `open-items.md`, and the feature's
design record), delete the module's `*_NOT_WIRED` constant, and add the live
branch behind the existing env switch — in the same PR. Do not invent an
endpoint, body or scope to unblock yourself.

### 4.3 Held items — Villa's five answers

**Owner: Villa (JBR owns the decision).** These block specific published figures
or lists; the build shows each honestly rather than inventing an answer. The
register is [`07-client-villa/open-questions.md`](../07-client-villa/open-questions.md);
the summary is [`open-items.md`](open-items.md) §3:

1. **The park's real chapel list and count** — the staff chapel settings and the
   customer booking dialog; two placeholder chapels are on screen and labelled
   provisional.
2. **Commission rules and rates** (targets included) — `/staff/commission` and the
   agent sales page; every rate-derived figure is blank + "Not configured"
   (`₱—`), never a zero or an invented percentage.
3. **Which senior chapel-rate figure is right** — the computed column
   (₱1,440/₱3,360 per day) against the sheet's own footnote (₱1,800/₱4,200); both
   are published as printed.
4. **Lot A-001's real price** — the office's per-plot quotation matches no sheet
   row; the demo lots publish their section's family figure, and the per-plot
   price stays the question.
5. **Which 2025/2026 rules stand** (refunds and cancellation, lot
   classifications) — the app captures each revision's own fields rather than
   reconciling.

### 4.4 Held items — withheld mourner photographs

**Owner: Villa consent.** Seven of the client's 21 photographs show identifiable
mourners; they are recorded by name in `lib/client-photos.ts`
(`HELD_CLIENT_PHOTOS`) and are deliberately **not** published and have no web
derivative. Privacy outranks imagery: never publish a mourner's face to sell a
casket. When Villa consents, move the entry up into the published set and re-run
`scripts/build-client-photos.mjs` (the comment in `lib/client-photos.ts` says
exactly how). Until then, no page may render one.

### 4.5 Held item — the client's photo submission (minutes item 7)

Villa Funeraria will provide high-resolution, approved images (facilities, lots,
service facilities, landscaping, branding) with captions/descriptions. When they
arrive, integrate them through the content system (the Pages & content editors /
the media upload route) with the client's approved labels, never with an invented
caption. Never publish identifiable mourners (`lib/client-photos.ts`).

---

## 5 · Working from another machine

### 5.1 Prerequisites

- **Git** with access to `https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial`.
- **Node.js ≥ 20** (`package.json` `engines.node`). Verified on Node **v22.23.2**
  with npm **10.9.8**; either the current LTS or that version is fine.
- **npm** (the repo uses `package-lock.json`; `npm install` or `npm ci` both work).
- Optional: **Docker + Docker Compose** for the stub-gateway stack or the
  production profile.
- Optional: **gh-axi** / **gh** for opening PRs.

### 5.2 Clone and install

```bash
git clone https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial.git
cd villa-memorial
npm install            # or: npm ci  (locked install)
```

### 5.3 Run it in fixtures mode (the default)

```bash
npm run dev            # → http://localhost:4000
```

**No environment variables are needed for fixtures mode.** With the gateway base
URLs unset, the BFF serves recorded contract fixtures in-process, so every
surface demos standalone. `.env.example` documents every variable; the only file
you might copy is:

```bash
cp .env.example .env   # optional; not required for fixtures mode
```

`next.config.ts` and `commitlint` are not relevant here; `npm run dev` is pinned
to **port 4000** deliberately (keeps `:3000` free for the platform project).

**Demo logins (fixture mode).** The persona accounts and the demo password are
documented in [`README.md`](../../README.md) §"Demo logins (fixture mode)" — this
plan deliberately does not restate the credential. Persona buttons fill the email
(and the password when the build opts in). Fixture-mode sign-in is **not access
control**; it exists to review the IA, design and RBAC.

**Env files you may need:**

| File | When |
|---|---|
| `.env.example` | The documented list of every switch (server-side gateway URLs, `SITE_URL`, media upload dir, cookie flag, port). Copy to `.env` only if you need a non-default value. |
| `.env.production.example` | The production profile (see §7). |
| `.env.production` | Created from the `.example` for a deployment; gitignored. |

### 5.4 Optional: stub-compose mode

```bash
docker compose up --build     # SSR on :4000 against stub-gateway/ with fixtures
```

This serves the same fixtures through `stub-gateway/`, mirroring the edge-gateway
paths. It is a demo stack, not a deployment — it publishes a demo password, runs
non-Secure cookies and starts the stub gateway. It keeps its NOT FOR PRODUCTION
banner.

**Live mode** is per service: set the corresponding gateway base URL (e.g.
`AUTH_BASE_URL=https://gateway.internal`) and the frozen-contract screens flip to
real services. App-authored admin stores answer a named 503 until their contract
freezes. The full switch table is in `.env.example`.

### 5.5 Test, lint, typecheck, build

```bash
npm run lint         # eslint .
npm run typecheck    # tsc --noEmit
npm test             # vitest run  (unit + fixture-contract suites)
npm run build        # production build must pass
```

`tests/setup.ts` points every suite's store paths at a throwaway temp dir, so a
developer's `.data/` store never leaks into a test run. Run the **full** suite
plus the production build once at the end of a change (not after every small
edit) — it is ~1,700 tests and takes minutes.

---

## 6 · The delivery workflow

### 6.1 Branch and PR

- Branch from the current `main`. Use a descriptive name (the convention here is
  `fm/villa-<topic>`, e.g. `fm/villa-type-sizing`), but any clear name works.
- Commit your change, push **your** branch, and open a **ready-for-review** PR
  (not a draft).
- **The captain reviews and merges.** Do not merge your own PR. Do not push to
  `main`.

### 6.2 Gates (must all be green before the PR)

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

For UI-only work while iterating, run the targeted tests and typecheck as you go
and the full suite + production build once at the end. For a docs-only change the
same full set is still the expectation.

### 6.3 Evidence expectations

- **Measurements and test output — never screenshots.** Do not read, capture or
  attach screenshots; they have wedged sessions and the captain's current
  direction is no screenshot artifacts (§3.8).
- A design change states the **measured** before/after (rendered sizes, column
  widths, image heights, word counts) and points at the **tests** that pin it.
- Every feature lands with a one-page design record under
  `docs/08-delivery/<feature>-design/` (the convention: the record lands in the
  same PR as the feature). See `docs/README.md` §2.
- Every new or changed route gets its row updated in
  `docs/08-delivery/notes/demo-web-route-coverage.md` in the same PR.

### 6.4 Non-negotiable merge blockers (from `AGENTS.md`)

A new session must read `AGENTS.md` in full; the headline rules are:

1. **The BFF stays dumb** — no business rules in route handlers; no data writes
   originate there.
2. **Fixtures faithful to contracts** — recorded response shapes with provenance; a
   contract change updates the fixtures in the same PR chain; never hand-edit
   recorded JSON to make a test pass.
3. **Sessions server-side only** — tokens in httpOnly cookies; never in browser JS,
   localStorage or logs.
4. **RBAC gates nav and actions** — graceful 403 states; staff scope gates stay
   inside the frozen vocabulary (`tests/unit/staff-scope-vocabulary.test.ts`).
5. **Every async screen has error/empty/loading states** before merge.

Plus the honesty rules that recur in this project: never invent a figure, a
scope, a contract shape or an image caption; a live branch must be real or say
plainly that live mode is unimplemented (no `501 not wired yet` pretending to be
a seam); validate upstream JSON field by field.

---

## 7 · Deployment

Two compose stacks, one application image — never mix them.

| Stack | Files | Use |
|---|---|---|
| **Demo / development** | `docker-compose.yml` | Fixtures + `stub-gateway` + demo quick-fill and persona hints on, non-Secure cookies. NOT FOR PRODUCTION. |
| **Production** | `docker-compose.production.yml` + `.env.production` | Demo conveniences pinned OFF, Secure cookies, real gateway URLs from the environment; an empty URL keeps that surface on fixtures. |

### 7.1 Pointers

- **Application recipe:** [`docs/08-delivery/deploying-web.md`](deploying-web.md)
  — the production profile, the env switches, the healthy-deploy checks, and what
  can and cannot go live.
- **AWS shape A (recommended path):**
  [`docs/08-delivery/aws-deploy.md`](aws-deploy.md) — the Terraform package under
  `infra/aws/` (one AL2023 EC2 host running the production compose stack, an ALB
  terminating HTTPS with ACM, a Route 53 alias record, security groups, a
  least-privilege instance role, and a separate encrypted gp3 EBS volume mounted
  at Docker's data root so the `villa-web-data` volume survives instance
  replacement). The runbook covers prerequisites, deploy/update/verify/rollback,
  log access, and the ECS Fargate migration path.
- **Env template:** `.env.production.example`.
- **Prerequisite not yet met:** the AWS apply is gated on AWS credentials for
  account `632296084403` and a Route 53 hosted zone; the Terraform `account_guard`
  refuses any other account. Structural validation without AWS is
  `terraform fmt -check -recursive`, `terraform init -backend=false`,
  `terraform validate`, plus `shellcheck` on the rendered `user-data.sh.tftpl`.

### 7.2 What the next session must not do

- **No billing changes and no model changes.** The payment/billing behaviour and
  the AI-copilot model wiring are out of scope; `/staff/copilot` is deliberately a
  designed surface with **no model attached** (an AI governance contract is a
  precondition).
- **No mourner photographs.** Never publish any of the seven withheld
  photographs (or any image showing identifiable mourners); they await Villa's
  consent (§4.4).
- **No authored prices.** Money is always a live reference — read it from the
  pricing store / `lib/villa-pricing.ts` / `planRate()` / the catalogue; never
  type an amount into a view, fixture or content document.
- **No invented contracts, scopes or endpoints.** When a service is missing, the
  honest state names it and live mode refuses with the named code.
- **No navigation-bar restyle** (§3.7).
- **No screenshots** as evidence (§3.8).

---

## Appendix A · Command cheat sheet

```bash
# Setup
git clone https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial.git
cd villa-memorial
npm install                      # or npm ci

# Run (fixtures mode, port 4000)
npm run dev                      # http://localhost:4000

# Gates (run all before a PR)
npm run lint
npm run typecheck
npm test
npm run build

# Optional: stub-gateway stack / production profile
docker compose up --build
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

| Task | Where to look |
|---|---|
| Route inventory / current state | `docs/08-delivery/notes/demo-web-route-coverage.md` |
| What shipped and what remains | `docs/08-delivery/frontend-complete.md` |
| Open platform/client items | `docs/08-delivery/open-items.md` |
| Client question register | `docs/07-client-villa/open-questions.md` |
| Standing rules + patterns | `AGENTS.md` |
| Design tokens | `styles/tokens.css` |
| Public layout contract | `lib/public-layout.ts` |
| Client photographs / privacy | `lib/client-photos.ts` |

---

## Appendix B · The recent PR history

Full URLs are the canonical reference; the repository's own
[`frontend-complete.md`](frontend-complete.md) and
[`notes/demo-web-route-coverage.md`](notes/demo-web-route-coverage.md) carry the
older history.

| PR | Title | Merged |
|---|---|---|
| [#131](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/131) | Home storefront rebuild: Amazon-familiar structure, right-sized type, designed opening band | 2026-09-26 |
| [#130](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/130) | Monthly-first pricing for memorial plans and lots (minutes item 8) | 2026-09-26 |
| [#129](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/129) | Funeral services: Request for Quote instead of displayed prices | 2026-09-26 |
| [#128](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/128) | Add the staff burial calendar with linked light pickups | 2026-09-26 |
| [#127](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/127) | Staff dashboard: red payment alert band for dues two days out | 2026-09-26 |
| [#126](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/126) | Payment-due notifications: derive due dates and remind two days before | 2026-09-25 |
| [#125](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/125) | Agent & family portals: calm, flat, Apple-inspired sweep | 2026-09-25 |
| [#124](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/124) | Admin Portal sweep: shared route states, kit controls, flat sharp staff shell | 2026-09-25 |
| [#123](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/123) | Public-site sweep: flat white grounds, no decorative gradients or marble | 2026-09-25 |
| [#122](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/122) | Fix the `/staff/pricing` page overflow (round 2 broken pages) | 2026-09-25 |
| [#121](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/121) | UI renovation foundation: white grounds, sky on controls + footer | 2026-09-25 |
| [#120](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/120) | Vendor a bounded, attributed ECC skill subset + one measured ops polish | 2026-09-25 |
| [#119](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/119) | PDP P4: editor photos land on the server, not as data URLs | 2026-09-25 |
| [#118](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/118) | Footer: de-duplicate the public footer, current labels, every link resolves | 2026-09-21 |
| [#117](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/117) | Home: Memorial plans & garden lots band, one post per column, legible map labels | 2026-09-21 |
| [#116](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/116) | Public catalogue & grounds minimal pass (Wave A lane 2) | 2026-09-21 |
| [#115](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/115) | Lane 3 public design: Phase 0 grammar for `/plans`, packages, `/price-list` & `/builder` | 2026-09-21 |
| [#114](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/114) | Public-minimal identity pages: memorials + sign-in doors on the Phase 0 contract | 2026-09-21 |
| [#113](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/113) | Story/service/support pages: apply the Phase 0 public grammar (Wave A lane 1) | 2026-09-21 |
| [#112](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/112) | Remove the redundant "Sample photograph" chip and the header utility row | 2026-09-21 |
| [#111](https://github.com/EDGEPOINT-SOLUTIONS/villa-memorial/pull/111) | Public layout Phase 0: the consistency contract + primitives | 2026-09-21 |

For PRs #43–#73 (the 2026-09-19 completion push) and the older features, see the
tables in [`frontend-complete.md`](frontend-complete.md).

---

## Appendix C · Where to look

| Concern | File / directory |
|---|---|
| Standing rules, patterns, traps | `AGENTS.md` |
| Repo intro, run & deploy quickstart | `README.md` |
| Docs tree rules and index | `docs/README.md` |
| Every route's current state | `docs/08-delivery/notes/demo-web-route-coverage.md` |
| Completion record | `docs/08-delivery/frontend-complete.md` |
| Open platform/client items | `docs/08-delivery/open-items.md` |
| Client question register | `docs/07-client-villa/open-questions.md` |
| Frozen contracts | `docs/08-delivery/contracts/` |
| Per-feature design records | `docs/08-delivery/*-design/` |
| Design tokens (the one source for visuals) | `styles/tokens.css` |
| Component kit | `components/kit/` |
| Public layout contract | `lib/public-layout.ts` |
| Public UI primitives | `components/public/` |
| Route groups | `app/(public)` · `app/(staff)` · `app/(family)` · `app/(agent)` |
| BFF route handlers | `app/api/*` |
| Typed API clients (fixture/live) | `lib/api-client/` |
| Recorded fixtures | `lib/fixtures/` |
| Client photographs + privacy record | `lib/client-photos.ts` |
| Client 2026 price sheet transcription | `lib/villa-pricing.ts` |
| Deployment recipe | `docs/08-delivery/deploying-web.md` |
| AWS shape A runbook | `docs/08-delivery/aws-deploy.md` |
| Terraform package | `infra/aws/` |
| Env reference | `.env.example` · `.env.production.example` |
| Client's own paper forms (never edit) | `docs/07-client-villa/paper-forms/` |

---

*Written 2026-09-26 against `main` at `0d62693`. When a piece of work in §4
lands, update the client-minutes table (§2), the route-coverage note, the
completion record and the open list together — the same discipline the repository
uses everywhere else.*

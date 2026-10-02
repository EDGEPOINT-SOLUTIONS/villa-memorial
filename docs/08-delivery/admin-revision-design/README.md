# Admin revision — the board's IA, dashboard, calendar day detail and Inbox

**Task:** `villa-admin-ia` · **Date:** 2026-10-02 · **Mode:** local-only ship
**Board:** `.lavish/villa-admin-plan/index.html` (firstmate home) · **Plan:** `data/villa-admin-plan/report.md` §4–§5
**Branch:** `fm/villa-admin-ia`, rebased clean onto `main` @ `aff402d` (the landing revision; its
`styles/components.css` changes touch no `kpi-card` / `unified-cal` / `payment-alerts` / shell rule,
so the captured surfaces are unchanged by the rebase)

The captain looked at wave 1 (commit `81476a4`) and said it was not the plan he saw:
> "that is not what i saw on the lavish plan … I want exactly what i saw on the lavish plan … Our
> current admin has so many routes, I want what we just need for now, and dont remove the forms"

Wave 1 had regrouped the navigation and added the dashboard calendar, but the rail was not the
board's seven-group list and the dashboard was not the board's composition. This pass makes the
workspace match the board, adds the four surfaces the board's rail names, and keeps every existing
route reachable.

## 1 · The information architecture (`lib/rbac/nav.ts`)

The rail is now exactly the board's seven groups, **Today first**, each named by the question the
admin is asking:

| Group | Items |
|---|---|
| **Today** | Dashboard · Calendar · Inbox |
| **Families & inquiries** | Families · Inquiries · Sales pipeline · Memberships · Memorials |
| **Orders & commerce** | Orders · Products · Pricing rules · Inventory · Commission |
| **Pages & content** | Every public page · Media library |
| **Park & services** | Property map · Schedule & chapel · Cases · Operations board · Vehicle dispatch · Preparation · Staff directory |
| **Finance** | Billing & collections · Accounting · Analytics · Reports |
| **Settings & admin** | Users & roles · Workflows · Audit trail · Tenant settings · Documents |

Compared with the pre-pass rail: Notifications merges into the new **Inbox**; **Memorials**,
**Media library** and **Preparation** are added; **Documents** moves from Park & services into
Settings & admin; and **Work orders** and **AI Copilot** leave the curated rail.

(A sibling task's **Analytics** entry landed on `main` in `c308e5d`, the analytics/accounting
merge; it is kept in Finance beside Accounting and Reports, and this branch rebases on top of it.
A second sibling's **chat Inbox** landed in `09c9d3a` at the same `/staff/inbox` route; this branch
merges its conversation list into the Inbox rather than replacing it.)

**Nothing is removed.** The RBAC gate model is untouched (inline any-of scope arrays). Every route's
page file still exists (`tests/unit/nav.test.ts` walks them), `/staff/notifications` keeps its
catalogue and is reachable from the topbar bell and from Inbox, Work orders is opened from the
calendar's work-order days and the dashboard queue, and AI Copilot moved to a workspace-topbar chip
beside the bell. The four added surfaces are real screens, not dead links.

## 2 · The dashboard (`app/(staff)/staff/dashboard/page.tsx`)

The board's composition, in reading order:

1. **Greeting + date + quick actions** — a park-time greeting, the park date, the count of items
   needing the office, then `+ New case` (sky commitment) and `Record a payment` (outline).
2. **Five figures that lead** — Family requests · New inquiries · Orders to fulfil · Payments due
   (amount · account count · nearest) · Overdue (amount · account count · worst age). Each tile is
   a link and reads the SAME client its own screen uses.
3. **Needs you today** — the cross-record queue, frozen to the board's types (`payment` · `family
   request` · `inquiry` · `order` · `document`, plus the real task/service rows), each typed with a
   chip and linked to the record.
4. **Payment notifications** — two bands side by side: overdue (red) and due inside the shared
   two-day window (amber), each leading with its count and amount and naming its accounts
   (`app/(staff)/staff/dashboard/payment-alert-band.tsx`).
5. **The labelled calendar** — the month grid whose every mark is a NAMED type with a legend, and
   whose days open their whole detail in the side panel (burials · light pickups · chapel bookings ·
   vehicle trips · payment dues · work-order dues).

## 3 · The four added surfaces

- **Inbox** (`/staff/inbox`) — the Today triage surface, one door for both halves of the plan:
  the durable family/agent ↔ office **conversations** (the §9.6 chat that landed on `main` in
  `09c9d3a`, with the office's unread count on the rail) and the cross-record **Needs you today**
  queue that folds notifications, family requests, inquiries, orders, payments and documents into
  one typed list. The designed notification catalogue is surfaced below; the catalogue keeps its
  own route and Inbox links to it. This branch rebased onto the chat task and merged the two
  rather than replace it.
- **Memorials** (`/staff/memorials`) — each household person with the family's consent switch
  (published / not public) and the fields chosen, read from the same consent store the family page
  writes. Nothing is published by default; no digital-memorial service exists.
- **Media library** (`/staff/media`) — the shipped client assets a page editor may attach, with
  previews and the sized WebP derivatives. A shared reusable upload library needs D7 public-web
  media.
- **Preparation** (`/staff/preparation`) — every recorded embalming / preparation record on one
  lane, opening the per-case record. PROVISIONAL recorded fixture; live answers 503.

## 4 · Evidence (1440 and 390)

All shots are the production build (`npm run build`, `next start` on a scratch port) against a full
admin session, captured with `chrome-devtools-axi`; they mirror the board's §1 (IA), §2 (dashboard +
calendar day detail) and the Inbox.

| Shot | File |
|---|---|
| Dashboard at 1440 (rail + greeting + 5 figures + queue + payment band) | `dashboard-1440.png` |
| Dashboard at 390 | `dashboard-390.png` |
| Calendar month + day detail at 1440 | `calendar-day-1440.png` |
| Calendar + day detail at 390 | `calendar-day-390.png` |
| Inbox at 1440 | `inbox-1440.png` |
| Inbox at 390 | `inbox-390.png` |
| The expanded seven-group rail at 390 | `navigation-390.png` |
| Media library at 1440 | `media-1440.png` |
| Memorials at 1440 | `memorials-1440.png` |
| Preparation at 1440 | `preparation-1440.png` |

Measured against the board: the rail is the same seven groups and items in the same order; the
dashboard leads with the same five figures, the same queue column grammar (What · Record · Waiting ·
Owner · Open), the same overdue/due-soon split and the same named-day calendar with a legend and a
click-through day panel. The figures themselves are the recorded fixture reads, not the board's
illustrative numbers (e.g. Payments due shows `₱0.00`/nothing in the window because no recorded
invoice is inside it).

## 5 · Honest boundaries (unchanged)

- **Fixture mode only.** The queue, bands, calendar and the four added screens read recorded
  fixtures and the app-authored stores. No live scheduling / billing / CMS / notification contract is
  frozen, so each source read is independent and a store that cannot be read contributes nothing
  rather than a guess.
- **RBAC stays at the services.** Nav labels are UX; the new pages gate on the frozen vocabulary
  (`cases:read` for Inbox / Memorials / Preparation, `catalog:write` for Media library) and the admin
  persona resolves every gate (`tests/unit/staff-scope-vocabulary.test.ts`).
- **No new visual language.** The new screens render the existing component kit (`DataTable`,
  `StatCard`, `StatusChip`) and the existing card/table/badge grammar; the dashboard reuses `.kpi-card`
  and the existing calendar block. No chart repeats a figure already printed.

## 6 · Gate results

| Gate | Result |
|---|---|
| `npm run lint` | 0 errors (4 pre-existing warnings in untouched files) |
| `npm run typecheck` | pass |
| `npm test` | **3,154 tests / 286 files pass** (a single timeout on one loaded run was flaky; two clean runs pass) |
| `npm run build` | pass; `/staff/inbox`, `/staff/media`, `/staff/memorials`, `/staff/preparation` in the route manifest |

Tests updated/added: `tests/unit/nav.test.ts` (the board's exact groups, items and kept routes),
`tests/unit/content-editor-nav.test.ts` (the `Every public page` label), and
`tests/unit/dashboard-payment-alerts.test.tsx` (the two-band composition). Added:
`tests/unit/admin-revision-pages.test.tsx` (the four added surfaces render with one `h1` each) and
extended `tests/unit/staff-queue.test.ts` (family-request and document rows).

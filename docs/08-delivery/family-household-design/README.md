# The family household — one account, many loved ones

Recorded 2026-09-30. Captain's intent: *“Family portal account can have multiple lot
for their family members that died also, one person who manages the plans, payment,
sched of visit, request for cleaning etc…”*

The account is a **household**, not a single person. One manager signs in and looks
after several loved ones at once — each with their own lot and plot, their own plan
and payments, their own papers, their own visits and their own remembering — and that
one person is the one who arranges the visits, pays the plans and asks for things like
cleaning. This is a change of **shape**, not a new section: the portal's data model was
one loved one and one lot.

## 1. The shape, and why

### Household model

The same records the pages already read are now **keyed per person**:

| Fixture | Before | After |
|---|---|---|
| `lib/fixtures/family/snapshot.json` | one `loved_one`, `plan_summary`, `payment_schedule`, `balance`, `recent_documents` | `loved_ones[]`, each carrying those same fields under its own stable `id` |
| `lib/fixtures/family/workspace.json` | one `lot`, `requests`, `appointments` | `loved_ones[]` keyed by the same `id`; `ask_for` stays household-level (the office's request taxonomy is the same for every person) |
| `lib/fixtures/family/case.json` | one `case` | `loved_ones[]` keyed by the same `id`, each with its own recorded arrangement |

`lib/api-client/family.ts` gains `getFamilyHousehold()`, which merges each loved one's
plan/money/papers (snapshot) with their lot/requests/appointments (workspace) and their
arrangement (case). Every existing reader now takes an optional `personId`:
`getFamilySnapshot(personId?)`, `getFamilyLotRecord(personId?)`,
`listFamilyRequests(personId?)`, `listFamilyAppointments(personId?)`,
`getFamilyCase(personId?)`. **An absent or unknown id resolves to the first loved one**,
so a stale link still shows the family their records and the single-person case reads
exactly as it always did.

The household is addressed by a **query parameter** (`?person=<id>`) rather than a path
segment. Reason: the fifteen `/client/*` routes already exist and are in the rail; a path
segment would have meant a second route tree, a redirect from every old address and a
rewrite of the rail and its tests. `?person=` keeps one route per screen, is shareable
and bookmarkable, and makes “the same page, a different person” the literal mechanism.

### The manager's authority — what may be done, and what the app cannot enforce

The manager acts **for every loved one** in the account. The portal already expresses
that authority in the data it shows:

| The manager may… | How the app expresses it | Enforced? |
|---|---|---|
| see every loved one's plan, payments, papers, lot, visits and remembering | the switcher + `?person=`, and the “everyone” dashboard | the session is the account's; the projection is the service's |
| pay a plan / ask about a payment | `Payments` per person, the office phone as the action | **no** — no payments/AR write contract |
| schedule or move a visit | `Ask for a visit` per person, office phone | **no** — scheduling has no family-facing write contract |
| request cleaning, a paper, a transfer, a memorial change | the request composer + the printed request slip that names the person **and** the lot | **no** — no service desk; the slip and the phone are the path |
| attach a remembering portrait | `Remembering` / the dashboard's private portrait | device/service depending; the store is guarded, not a published memorial |
| invite or serve a relative | “Family living abroad” on `Your family`, office phone | **no** — no identity/membership service |

**The one thing the app cannot enforce and says so:** there is no family-facing
authorization contract. The portal *renders* the manager as the account and offers the
actions above, but every write lands with the office (a phone call) or in a provisional
fixture. The composer is explicit about the one thing it *can* guarantee — the request
carries the person and the lot — and that nothing is booked until the office confirms it.
When the family contract freezes, the enforcement is the service's job; the shape here is
the shape it must be asked for.

### The information architecture

- **Person switcher** (`components/family/family-person-switcher.tsx`): a plain
  `<nav>` of links. `Everyone` → `/client/dashboard`; each person keeps the family on the
  current page (`?person=<id>`). The selected person is marked `aria-current="page"`;
  the name is in the link, colour is support. Keyboard and phone work because they are
  ordinary links.
- **A household of one renders nothing** — no empty switcher, no “1 of 1” clutter;
  `PersonSwitcherForSnapshot` returns `null` when `household.length <= 1`.
- **The dashboard** (`/client/dashboard`):
  - one loved one, or a named one → that person's **command centre** (unchanged), with
    the switcher above it;
  - several and no person named → the **“everyone”** reading: one summary card per
    loved one, each with their own plan and their own next visit. **The money is never
    added across two people**; the page says so in one line on each card.
- **Per-person pages** carry the switcher and the chosen person's records:
  Your lot · Your plan · Payments · Papers · The funeral · Ask for a visit ·
  Remembering · Requests · What we tell you about. The `Your family` page is the
  household overview: one row per loved one with their own plan and remaining balance.
- **Asking for things** is on `/client/requests`: the composer lets the manager pick
  *who* and *what*, and the preview names the person, their lot (section · number ·
  plan) and the park. `Open the printed request` produces
  `/client/requests/slip?person=…&kind=…&note=…`, a real paper slip
  (`lib/contracts/family-request-slip.ts`, the `family-request` paper profile) that
  names the person and the lot and can be printed, downloaded or — the honest path —
  called in. It is **not a ticket**: the app issues no ticket number and books nothing.

## 2. Evidence

Screenshots in this directory, captured at 1440×900 and 390×844 (full page where the
value is below the fold):

| File | What it shows |
|---|---|
| `before-dashboard-single-1440.png` · `before-dashboard-single-390.png` | the base command centre with the single loved one (before) |
| `after-dashboard-everyone-1440.png` · `after-dashboard-everyone-390.png` | the household dashboard: the switcher, and one summary card per loved one, never a blended total |
| `after-dashboard-ernesto-1440.png` · `after-dashboard-ernesto-390.png` | one person's command centre with the switcher in view (the base dashboard, unchanged) |
| `after-lot-aurora-1440.png` | one person's lot record |
| `after-plan-aurora-1440.png` | one person's plan |
| `after-payments-aurora-1440.png` | one person's payments |
| `after-requests-composer-1440.png` · `after-requests-composer-390.png` | the request flow naming its person and lot |
| `after-request-slip-1440.png` · `after-request-slip-390.png` | the printed request payload the office receives |

The single-person case is additionally pinned by
`tests/unit/family-switcher.test.tsx` (a one-person household renders **no**
`fv-people`) and by the pre-existing dashboard suite.

Gates run on this branch: `npm test` (2880 passing), `npm run lint`,
`npm run typecheck`, `npm run build` (production build passes; `/client/requests/slip`
is in the route table).

## 3. What is provisional and what stays open

- The family-facing contracts are **still not frozen**. Every fixture keeps its
  `PROVISIONAL` provenance marker; the household shape carries its own
  `household_note`. Live mode stays off (`familyLiveModeEnabled() === false`).
- **The second loved one is app-authored demo data** in the existing provisional
  spirit, not a real client record. Her lot family is grounded in the client's own
  2026 lot sheet (Garden Niches), and her schedule is internally consistent with her
  balance; no figure is invented beyond the office's own data.
- **The office's side is untouched** (out of scope): no staff screen reads the
  household shape, and nothing in the admin or agent portals changed.
- The **printed request is not a service integration**: no request is transmitted,
  because no service desk exists. The slip plus the office phone are the honest path,
  and the page says so in the ONE shared gap disclosure.
- **One request kind is chosen, not free text** for *what*; the *who* and the *lot* are
  always structured. The family's own words are optional and never replace the link.
- **Where the app cannot enforce authority:** stated in §1. When the family/identity
  contract freezes, the service must own “who may act for whom”; the portal shape is
  already the shape to ask it for.

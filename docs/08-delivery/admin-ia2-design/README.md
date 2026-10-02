# Admin IA-2 — Messages & inquiries, Orders & commerce, Cases, Forms, working Documents

**Task:** `villa-admin-ia2` · **Date:** 2026-10-02 · **Mode:** local-only ship
**Branch:** `fm/villa-admin-ia2`, fast-forward onto `main` (`a49083b`)

The captain's second pass on the live admin rail, faithful to the brief:

> "Change Families and inquiries to 'Messages and Inquiries' … under it is 'Families'
> 'Agents' 'Inquiries' 'Memberships' 'Memorials' … In orders and Commerce it should be
> 'Orders' 'Products and Service' 'Inventory' and create the ui/ux of the Commission.
> remove the pricing rules. … the Cases should be under Orders and Commerce … the
> Operations Board … functions the same as Cases page right? This should be so simple
> … Workflow page if this is not necessary remove this … Tenant settings is confusing …
> Document page should be completely working. All forms should have a dedicated page
> for it, all in one place."

## 1 · The revised information architecture (`lib/rbac/nav.ts`)

The eight groups now, in the captain's order. Every changed item names its reason.

| Group | Items | What changed |
|---|---|---|
| **Today** | Dashboard · Calendar · Inbox | unchanged |
| **Messages & inquiries** | Families · **Agents** · Inquiries · Memberships · Memorials | renamed; **Agents** added; `Sales pipeline` left the rail (still reaches from Agents) |
| **Orders & commerce** | Orders · **Products and service** · Inventory · **Cases** · Commission | renamed item; **Cases** moved up from Park & services; `Pricing rules` gone |
| **Pages & content** | Every public page · Media library | unchanged (synced labels) |
| **Park & services** | Property map · Schedule & chapel · Vehicle dispatch · Preparation · Staff directory | Cases and the Operations board left |
| **Forms & documents** | **Forms** · Documents | new group gathering the one forms hub and the repository |
| **Finance** | Billing & collections · Accounting · Analytics · Reports | unchanged |
| **Settings & admin** | Users & roles · Audit trail · **Park configuration** | `Workflows` removed; `Tenant settings` renamed |

Scope gating is unchanged (inline any-of arrays from `rbac-scopes-v1`); nav labels are UX,
authorization stays at the services.

### The one-page rule: the Operations board is folded into Cases

The captain asked whether the Operations board did anything Cases did not. It did not — both
read the same case records and offered the same two writes (a task tick, a stage move). Rather
than keep a second page that could drift, **the board became the Cases page's `?view=board`**:
`/staff/cases` leads with the case list, one toggle opens the stage board, and `/staff/ops`
**redirects** to that board. `app/(staff)/staff/ops/page.tsx` is now a redirect; the board
rendering lives in `app/(staff)/staff/cases/page.tsx` → `app/(staff)/staff/ops/ops-board-view.tsx`.

## 2 · Inquiries → Cases (one record, no retyping)

- A finished enquiry (status `converted` or `closed`) carries a **Send to case** button on the
  board. It posts `POST /api/inquiries/:id/to-case` (scope `cases:write`), which builds the
  case from the enquiry's own fields and stamps it with the enquiry's `reference`.
- The route is **idempotent**: a second send returns the case already carrying the enquiry, so
  there is never a twin. The case's `inquiry_reference` is the single link both screens read —
  the board shows **View case**, the case detail shows **From inquiry**.
- Fixture mode needed case creation, which the operations store did not have; it now does
  (`createCaseRecord` / `case_created` journal event, `lib/api-client/operations-store.ts`), so
  the counter's own **Open a case** form works too instead of answering 503.

## 3 · Commission

The commission admin screen (`/staff/commission`) already shipped (F-12, 2026-09-18) with the
honest blank-rate layout, the four-state path and the real sales-on-record table; the captain's
rail change placed it under Orders & commerce, which this pass does. `Commission` is unchanged
and its tests stay green.

## 4 · Documents — working end to end

- **List** and **open** already worked (`/staff/documents`, `/staff/documents/[id]`).
- **Upload** now works where a store exists: a durable fixture store
  (`lib/api-client/documents-store.ts`, `DOCUMENTS_STORE_PATH`) folds filed rows into the same
  repository the list and detail read, through `POST /api/documents` (scope `documents:write`).
- The **honest gap is named**: `documents-api-v1` has no object store, so the row is real
  (title, type, case/order link, who filed it) while the bytes are not kept — the detail page
  says **not stored** and names the object store. A live deployment refuses the write rather
  than pretending.

## 5 · Forms — one place, each form its own page

`/staff/forms` lists every form the office fills, grouped (Counter & cases · Money · Plans &
property · People & staff · Public forms), each with its dedicated page and an honest state:
**Working** (writes a durable store), **Opened from a record** (a case or lot), **Waits on a
service**, or **Public form**. The list is data (`lib/staff-forms.ts`); `tests/unit/forms-hub.test.ts`
walks every entry and fails a dead link. `/staff/inquiries/new` became a real dedicated page
(the capture form was extracted to `app/(staff)/staff/inquiries/inquiry-capture.tsx` and is
shared with the board).

## 6 · Schedule & chapel — the glance first

`/staff/schedule` now opens with a **jump rail** (Today · This week · Burials · Chapel rooms),
leads with the day board and the seven-day matrix, and labels each day-board entry's **type**
(Chapel · Preparation room · Vehicle trip) beside its room. The chapel administration
(settings · availability · bookings) sits under one **Chapel rooms** heading. The lead is one
line; the basis prose stayed short. An entry still opens its record (the burial calendar's case
links, the row's cancel).

## 7 · Workflows removed, Park configuration clarified

- **Workflows** (`/staff/workflows`, `/staff/workflows/new`, `lib/workflows.ts`,
  `lib/api-client/workflows.ts`, `lib/fixtures/operations/workflows.json`) is **deleted**: its
  engine was never built and it governed nothing the office edits; the processes render on the
  modules' own screens. Its fixture-contract and page tests went with it.
- **Tenant settings → Park configuration** (`/staff/settings`): one clear line says it is a
  read-only view of the identity and rules the park already applies, and the page points to the
  page editor for the editable half.
- **Pricing rules left the rail**; the pricing document (`/staff/pricing`, renamed **Plan rates
  & lot prices**) is reached from **Products and service** and `/staff/plans` still redirects to
  it. No rate lost its door.

## 8 · Before / after route map

| Route | Before | After |
|---|---|---|
| `/staff/agents` | — | **new** staff agent register (leads grouped by owner) |
| `/staff/forms` | — | **new** forms hub |
| `/staff/inquiries/new` | gated "not wired" stub | **real** dedicated capture page |
| `/staff/ops` | Operations board page | **redirect** → `/staff/cases?view=board` |
| `/staff/cases` | list only | list **+ `?view=board`** (the folded board) |
| `/staff/cases/[id]` | — | adds the **From inquiry** row |
| `/staff/documents/new` | "not wired" stub | **real** upload (metadata row; bytes named as a gap) |
| `/staff/workflows`, `/staff/workflows/new` | read-only workflow screen | **removed** |
| `/staff/settings` | "Tenant settings" | **Park configuration** |
| `/staff/pricing` | rail item "Pricing rules" | rail item removed; renamed **Plan rates & lot prices**, linked from the catalogue |
| `/staff/catalog` | "Products" | **Products and service** |
| `/staff/pipeline` | rail item "Sales pipeline" | rail item removed; reached from Agents |
| `/api/inquiries/[id]/to-case` | — | **new** BFF send-to-case |
| `/api/documents` (POST) | — | **new** BFF document filing |

Every route that existed before still resolves, except the two Workflows routes the brief
explicitly allowed removing.

## 9 · Evidence (1440 × 900 and 390 × 844, production build)

Shots captured with `chrome-devtools-axi` against `next start` on a scratch port, signed in as
`admin@vm.demo`, in `shots/`:

| Shot | File pair |
|---|---|
| The revised navigation | `navigation-1440.png` · `navigation-390.png` |
| Agents register | `agents-1440.png` · `agents-390.png` |
| Inquiries (+ Send to case) | `inquiries-1440.png` · `inquiries-390.png` · `inquiries-sent-to-case-1440.png` |
| Cases board (folded ops) | `cases-board-1440.png` · `cases-board-390.png` |
| Forms hub | `forms-1440.png` · `forms-390.png` |
| Documents repository | `documents-1440.png` · `documents-390.png` |
| Upload a document | `documents-new-1440.png` · `documents-new-390.png` |
| Schedule (jump rail + day types) | `schedule-1440.png` · `schedule-390.png` |
| Park configuration | `settings-1440.png` · `settings-390.png` |
| Commission | `commission-1440.png` · `commission-390.png` |

## 10 · Gates

| Gate | Result |
|---|---|
| `npm run lint` | 0 errors |
| `npm run typecheck` | pass |
| `npm test` | **306 files / 3,248 tests pass** |
| `npm run build` | pass; `/staff/agents`, `/staff/forms`, `/staff/inquiries/new`, `/api/documents`, `/api/inquiries/[id]/to-case` in the manifest |

Tests added: `tests/unit/agents-page.test.tsx` (the register groups leads by owner; gated),
`tests/unit/forms-hub.test.ts` (every listed form has a page; keys unique),
`tests/unit/inquiry-to-case.test.ts` (send-to-case carries person + reference, is idempotent,
is scope-gated), `tests/unit/documents-upload.test.ts` (upload is a real repository row, the
artifact stays the named gap, gated). Tests updated: `nav.test.ts` (the new groups/items and the
retired rail entries), `ops-board-page.test.tsx` (renders the Cases board view),
`reading-budget.test.tsx` (Workflows out, Park configuration in), `pricing-admin-rbac.test.tsx`
(the renamed rate screen), `inquiry-board-lines.test.tsx` (router stub).

## 11 · Honest boundaries

- **Agents** reads the recorded lead file (`crm-families` is unbuilt) and invents no agent,
  target or amount; a lead with no owner shows once as "Unassigned".
- **Documents upload** keeps metadata, not bytes — the object store is a dev-authored item and
  the page says so.
- **Forms** with no service are labelled "Waits on a service" and open the honest stub; nothing
  is dressed as working.
- **Fixture mode only** for the new writes (enquiry→case, document filing); live mode refuses
  with named 503s where no contract exists.

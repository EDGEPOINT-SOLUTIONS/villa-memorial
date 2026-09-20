# Admin platform screens — `/staff/users` · `/staff/workflows` · `/staff/settings` (design record)

The last three of the nine admin pages the captain found empty. Each one waited on
something that does not exist — a user-provisioning API, a workflow engine, a
tenancy/settings contract — and a blank page was never the right answer. They follow the
pattern the commission screens, the lot records and the AI copilot already use: **a
designed, working screen over the office's own recorded data, with one honest line naming
what is missing.** All three are read-only, answer at a glance (tables and lists first),
and use the existing portal kit only.

## 1 · Users & roles — `/staff/users` (PRD S30)

The question it answers: *who can sign in, what may each role do, and how does someone get
an account?*

- **People** — the recorded identity-access seed accounts (`auth/personas.json`), each
  with its name, email, role, the door its role opens (Staff · Agent · Family portal) and
  its state. Expanding a row lists that role's permissions in plain words.
- **Roles** — one card per recorded role with its permission list, grouped, **in plain
  words beside the frozen scope token** (`lib/rbac/scope-vocabulary.ts` renders
  `rbac-scopes-v1`'s own "Grants" column). The administrator holds all 23; Staff 14;
  Sales agent 5; Customer/family 2.
- **The invite path** — the three steps the office will use, with the honest state: *no
  invitation can be sent from this screen; the provisioning API does not exist.*

**Why it is a recording, not an invention:** no role/permission endpoint exists, so the
role records are app-authored with provenance (`lib/fixtures/auth/access-control.json`) —
and every role's scope list is EXACTLY its seeded persona's, in order.
`tests/fixture-contract/access-control.test.ts` fails on drift, on a scope outside the
frozen vocabulary, or on a persona held twice.

## 2 · Workflows — `/staff/workflows` (PRD S31)

The question it answers: *which processes does this office run, where is the work, and who
carries the next step?*

- **Four processes** in the order the captain named them: the funeral service contract
  (`case-events-v1`'s frozen seven-stage order), the lot purchase application (the
  property lot statuses + the application capture), the lot transfer (the office's own
  four clerk states), and the chapel booking (the online hold → confirm flow).
- **In-flight tables are real records**, read live from the modules that own them
  (`lib/api-client/workflows.ts`): every case at its stage, every application at the step
  its lot status shows, every transfer at its clerk state, every chapel booking at
  held/confirmed. Columns: Record · At step · Next step · **Owner of the next step** — a
  case's coordinator, an application's agent, or the honest `Not recorded` where no owner
  is on file.
- **Each source reads independently.** Property live mode has no application endpoint, so
  only that process shows "cannot be read"; the other three keep their records. A "Sources
  readable" KPI states the count.
- **The missing engine is one line:** *no service lets the office define steps, assign
  owners or enforce order.* No `+ New workflow` that cannot work — `/staff/workflows/new`
  stays the honest not-wired door.

## 3 · Tenant settings — `/staff/settings` (PRD S32)

The question it answers: *how is this park configured, and what can this portal not
change?*

- **Identity the app publishes** — park name, both lines, office and park addresses,
  location, read straight from the landing content document (edited in Pages & content).
- **Business rules the product applies** — every value read from the module that enforces
  it: the 3-day guarantee-paper filing window (`INSTRUMENT_FILING_DAYS`, contract clause
  2), the 3–9 day chapel stay, the four plan terms and five tiers, the lot terms and the
  sheet's ₱3 amortization rounding, the senior-rate rule, and package embalming with no
  fixed day count.
- **Configured / placeholder / waiting / not readable** — with the recorded basis for
  each: the two editable documents (edited dates when they exist), the catalogue counts,
  the chapel list's open client question, the workflow engine, the provisioning API, and
  `tenancy-config`'s absence.
- **Only the platform can change** — the account, the subscription/trial, the A–J module
  registry. Named as facts; no product action pretends to do them.

## Layout & craft

- Portal kit only: `PageHeader` + `PageSection`, `Card`, `Badge`, the `table-wrapper` /
  `table` grammar (`tabIndex={0}` so the scroll area is keyboard-reachable), the shared
  alert/empty/forbidden/error states, and the `.steps` numbered list for the invite path.
  **No new CSS classes** were added; tokens only.
- One `h1` per route, no skipped heading level, no nested paragraphs, no write controls
  (pinned by the page tests).
- 390 px: `document.scrollWidth === 390` on all three (measured); tables scroll inside
  their own frame, the KPI grid stacks, the invite steps stack, and the role cards'
  code tokens wrap.
- Reading budget: all three joined `tests/unit/reading-budget.test.tsx` — the opening
  sentence is ≤ 12 words, no paragraph over 30, no list item over 30.

## Files

| File | What it is |
|---|---|
| `app/(staff)/staff/users/page.tsx` · `workflows/page.tsx` · `settings/page.tsx` | The three screens (server components; `identity:users:manage` · `tenancy:tenants:manage` · `tenancy:tenants:manage` gates, inline arrays). |
| `lib/rbac/scope-vocabulary.ts` | The frozen `rbac-scopes-v1` vocabulary in plain words + `grantsByGroup`. |
| `lib/fixtures/auth/access-control.json` | The recorded roles (scope lists = the seeded personas' lists, provenance header). |
| `lib/access-control.ts` · `lib/api-client/access-control.ts` | The role/account model and the tolerant, fixture-only reader (no live mode can be claimed). |
| `lib/fixtures/operations/workflows.json` | The four recorded process definitions (steps pinned to the modules by the fixture test). |
| `lib/workflows.ts` · `lib/api-client/workflows.ts` | Record-position builders + the per-source composition. |
| `lib/tenant-settings.ts` · `lib/api-client/tenant-settings.ts` | The business-rule rows and the configuration composition over the real stores. |
| `tests/fixture-contract/access-control.test.ts` · `workflows.test.ts` | Fixture ↔ frozen contract / module vocabulary. |
| `tests/unit/users-page.test.tsx` · `workflows-page.test.tsx` · `settings-page.test.tsx` | Rendered screens: gating, honest states, one h1, no write controls, paragraph nesting. |

## Evidence (`shots/`)

| Shot | Shows |
|---|---|
| `users-1440.png` · `users-390.png` | People table, the four role cards with plain words + frozen tokens, and the invite path; phone: stacked cards, wrapped tokens, no page sideways scroll. |
| `workflows-1440.png` · `workflows-390.png` | The four processes, step chips, KPI strip, and the in-flight tables with owners; phone: internal table scroll, stacked KPI tiles. |
| `settings-1440.png` · `settings-390.png` | Identity, the eight applied business rules, the configuration states, and the platform-only list; phone: stacked tables. |

Verified with `npm run lint`, `npm run typecheck`, `npm test` (147 files / 1812 tests),
`npm run build`, and the browser render check at 1440 and 390 (`documentElement.scrollWidth`
equals the viewport at 390; no console messages). The `Admin Portal` page-title suffix is
from the parallel portal-rename work; these three screens use it and must not be reverted
to `Staff Portal`.

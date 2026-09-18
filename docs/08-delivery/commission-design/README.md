# Commission screens — implementation record (F-12, 2026-09-18)

**Route:** `/staff/commission` (`app/(staff)/staff/commission/page.tsx`) — the staff
commission-engine screen the checklist named; the agent portal's approved page 08
(`/agent/sales`) is unchanged and stays the agent's view.
**Brief:** checklist F-12 — build the commission screens with every figure left blank,
because the client has not given us any rates.

## What the screen does, in reading order

1. **The state, first.** The header badge and the warning panel say, in one brief statement,
   that Villa has not fixed the rates or targets; a blank on this screen means “Not
   configured”, never a zero. Beside it, four KPI tiles: *Commission payable* (`₱—`),
   *Rate basis* (`—`), *Target* (`₱— · No target set`) and *Sales on record* — the only
   real figure in the row: the count of confirmed/fulfilled orders and their recorded value.
2. **The shape of the calculation.** One table answers the four questions the brief names:
   which sales count · over which period · how the amount is worked out · against which
   target · how it is approved and paid. Every rate-derived “Today” cell is blank +
   `Not configured`; the period and target cells also carry the recorded reason they are
   unset. Below it: the four-state path every line walks (`pending approval → approved →
   scheduled → paid`, with reversals kept as their own line), the seven configurable bases
   from the PRD, and the rest of the engine the office will configure.
3. **The real records.** *Sales on record*: every order in the durable order store, newest
   first, with its real sale value and fulfilment badge — the inputs to a commission with no
   rate applied. The Commission column is blank on every row; *Attributed to* reads “Not
   recorded” because an order does not carry an agent yet, and the note below says so.
4. **One next step.** Ask the office about commission rates — the client's own line, read
   from `lib/family/contact.ts` (never typed). No control pretends the rate can be
   configured here.

## What is deliberately absent

- **No rate, percentage, target or computed commission anywhere** — the fixture contains no
  numeric leaf at all, and `tests/fixture-contract/commission.test.ts` fails if one appears.
  There is no placeholder constant either.
- **No statement shape invented ahead of a contract.** The screen says “None issued yet”
  and names the engine the PRD defines; it does not guess a statement record.
- **The agent-facing view is untouched.** It already ships the approved honest placeholder
  (rates `null`, “not configured” markers); the new fixture-contract test pins its bases and
  statement states to the same vocabulary the staff engine shows, so the two surfaces cannot
  describe different rules.

## Where every fact comes from

| Fact | Source |
|---|---|
| Unconfigured state, period/target reasons | `lib/fixtures/finance/commission.json` (recorded app state, provenance in the file) through `lib/api-client/commission.ts` |
| Seven bases · four states + reversal · engine capabilities | `lib/commission.ts` — the ONE vocabulary home (PRD `finance-billing.md` §Commissions) |
| Sales, values, fulfilment states | the durable order store, `listOrders()` (`lib/api-client/order-store.ts`) |
| Office phone | `lib/family/contact.ts` |
| Client question tracked | `docs/07-client-villa/open-questions.md` (“Commission rules and rates”); `docs/08-delivery/open-items.md` row 2 |

**Backend ask recorded by this PR:** the commission engine + the client's rates/targets (an
open client question), and a commission API contract when the engine lands. Until then the
reader is fixture-only (`commissionLiveModeEnabled() === false`) and the fixture is where a
contract replaces it.

## RBAC

Gated on `billing:read` provisionally — no commission scope exists in `rbac-scopes-v1`, and
commission statements/payouts are the finance module (`finance-billing.md` §Commissions);
the same precedent as Reports. Order-number links degrade to plain text for a reader without
`orders:read` (the Orders admin's own gate) instead of leading to a dead end.

## Render check (production build, `next start`)

| Viewport | Where | First screenful | Overflow |
|---|---|---|---|
| 1440 × 900 | page top | h1 116–158 px · alert 182–290 px · KPI row 322–453 px | none (`scrollWidth` 1440) |
| 390 × 844 | content top (scrolled past the app-wide stacked staff nav) | alert 82–376 px · first KPI 408–538 px | none (`scrollWidth` 390) |

One `h1` per route at both widths; the tables scroll inside `.table-wrapper` (they never
push the page). Below 48 rem the shared staff shell stacks its sidebar above the content —
app-wide behaviour, unchanged by this PR.

## Shots

- `shots/commission-1440.png` — 1440 × 900, page top.
- `shots/commission-1440-full.png` — full page, 1440 wide.
- `shots/commission-390.png` — 390 × 844, document top (the shared staff nav stacked).
- `shots/commission-390-content.png` — 390 × 844, content top (the state panel + KPI tiles).
- `shots/commission-390-full.png` — full page, 390 wide.

## Tests

- `tests/fixture-contract/commission.test.ts` — fixture unconfigured; no numeric leaf and no
  rate-like key; one base vocabulary shared with the agent workspace fixture; PRD capability
  coverage; malformed seed handling.
- `tests/unit/commission-view.test.ts` — the pool split (sales / awaiting / cancelled), real
  value per currency, no rate-derived field.
- `tests/unit/commission-page.test.tsx` — 403 without `billing:read`; the state first; blanks
  marked (no `₱0`, no percentage figure); real sales incl. the cancelled order; the shape
  words; one next step on the client's line; one `h1`.
- `tests/unit/staff-scope-vocabulary.test.ts` — picks up the new gate automatically.
- `tests/unit/nav.test.ts` + `tests/unit/content-editor-nav.test.ts` — the Finance nav entry
  resolves and its page file exists.

# Agent sales — the statement as a table

**Task:** `villa-agent-sales` · **Repo:** villa-memorial · **Branch:** `fm/villa-agent-sales` · **Date:** 2026-10-02
**Contract:** the captain's accepted agent-portal plan (`data/villa-agent-portal-plan/report.md`)
§5.5/§15 **PR 4**. The plan's own verdict on the page this replaces (report §3.2, §11):

> **Sales & commissions** — the honest shape: "₱—" everywhere, the seven configurable bases,
> targets and conversion. **484 words** — the wordiest screen in the portal, and the wrong
> shape for a money page.

The captain, 2026-10-02: *"i dont know whats happening in sales and commission page"*.

---

## 1 · What shipped

One **statement table** answers the page — `line · basis · credited · state · amount` — carrying
the three recorded statement lines from `lib/fixtures/agent/workspace.json` through
`lib/api-client/agent.ts`. The vocabulary the table cannot hold lives in two compact legends:
the four-state path (`pending approval → approved → scheduled → paid`, with the reversal as its
own line) and the seven configurable bases. The engine itself stays deferred scope.

| The plan's ask (§5.5, §15 PR 4) | Where it lives |
|---|---|
| The statement **as a table**: line · basis · credited · state · amount | `app/(agent)/agent/sales/page.tsx` + the workbench `.wb-table` |
| The facts lead; the words explain only what the table cannot | Table + the `states`/`bases` panels |
| Every amount blank, named, never a zero | The table caption + the `₱—` cells |
| The human next step, on the office's own number | Header action, `lib/family/contact.ts` |

The page no longer explains the commission shape in paragraphs, and it no longer prints the
three equal KPI tiles (`pending`/`approved`/`paid`) as money cards — that row was the "wrong
shape" the plan named. The 484-word essay is gone.

## 2 · Measured: the words before → after

Rendered with the same `tests/helpers/prose.ts` measure the reading-budget guard uses, over the
real page component (server render). "Content words" is the plan's own `measure.js` rule
(every visible word inside the page scope); "paragraph prose" is the reading-budget's `<p>` text.

| Measure | Before (`/agent/sales`, `main`) | **After** (`fm/villa-agent-sales`) |
|---|---:|---:|
| Content words | **474** *(the plan measured 484 live)* | **152** |
| Paragraph prose (`<p>` words) | **301** | **14** |
| `<p>` elements | 28 | 5 |
| Longest paragraph (words) | 26 | 7 |
| Money cards / equal tiles | 3 | **0** |
| Statement table | 0 | **1** (3 lines) |
| `h1` per route | 1 | 1 |

The drop is the shape change, not editing: the recorded facts (each line's title, date/terms,
basis, credited party and state) moved into table cells, and only the two sentences the table
cannot say (why the amounts are blank; the path a line walks) remain as prose. `tests/unit/
agent-sales.test.tsx` pins the target (`paragraphWords ≤ 150`); `tests/unit/reading-budget.test.tsx`
now renders `/agent/sales` with the portal's other budgeted screens.

## 3 · The shape, at 1440 and 390

**1440 × 900** — the compact header (eyebrow · h1 · one lead · the office-number action), one
money panel holding the statement table (`Line`·`Basis`·`Credited`·`State`·`Amount`), then the two
legend panels side by side (6/6). `scrollWidth` 1440 = `innerWidth` 1440: no sideways scroll.

**390 × 844** — the header stacks; the table restacks to one card per line, each cell prefixed with
its column name (`BASIS:`, `CREDITED:`, `STATE:`, `AMOUNT:`); the two legend panels stack. Measured
`scrollWidth` 390 = `innerWidth` 390; the `.table-wrapper` itself does not pan (`scrollWidth` =
`clientWidth` = 335). The restacked caption spans the table — a `table-caption` shrinks to
min-content once the table is `display:block`, so `styles/components.css` pins `display:block;
width:100%` for it in the workbench phone block.

The money styling is restrained: the amount cell rides the table's `--text-ui` step with
`tabular-nums` (the `.table__numeric` rule), never a display figure. Nothing animates, so the
reduced-motion rule has nothing to remove.

## 4 · The honest next step

The office has not fixed commission rates (`docs/07-client-villa/open-questions.md` — "Commission
rules and rates"), so no rate is invented and no control pretends one can be set here. The header's
one action reads the office number from `lib/family/contact.ts` (`0917 617 8489`, `tel:+639176178489`).
The page renders no `<form>`, `<input>` or `<button>` at all.

## 5 · Evidence

- `before/sales-1440.png`, `before/sales-390-full.png` — the plan's own captures of the shipped
  `/agent/sales` (Appendix C of `data/villa-agent-portal-plan/report.md`, 2026-10-01). The
  workbench PR did not touch this route, so they are the true before state.
- `after/sales-1440.png` — this branch at 1440 × 900, signed in as `agent@vm.demo` in fixture mode.
- `after/sales-390-full.png` — this branch at 390 × 844, full page.

## 6 · Tests

- **New** `tests/unit/agent-sales.test.tsx` — the five statement columns; the three recorded lines;
  each recorded state; every amount blank (`₱—`) with the reason named exactly once and no `₱0`;
  the four states + reversal and the seven bases; the office number; no rate-setting control; one
  `h1`; the keyboard-reachable table region; the prose budget (`paragraphWords ≤ 150`, longest
  paragraph/list item ≤ 30).
- **Updated** `tests/unit/reading-budget.test.tsx` — `/agent/sales` joins `PAGES` (the guard's own
  rule: a page joins in the PR that compresses it).
- **Updated** `tests/unit/typography-system.test.ts` — the retired `.ag-commission__amount` entry
  removed from the figure-cap manifest.
- **Updated** `tests/unit/portal-calm.test.ts` — the retired `.ag-commission` entry removed from
  the flat-grammar list.
- **Updated** `docs/08-delivery/notes/demo-web-route-coverage.md` — the route's row records the
  new table.
- Dead CSS (`ag-commission*`, `ag-rule*`) removed with the page; no markup references them.

## 7 · Not in this change

The commission engine and rules, rates/target configuration, the staff commission screen and the
agent pipeline writes are out of scope; this page reads records only. The plan's PR-4 table
grammar for `/agent/applications`, `/agent/appointments`, `/agent/clients` and `/agent/marketing`
stays deferred to those routes' own change.

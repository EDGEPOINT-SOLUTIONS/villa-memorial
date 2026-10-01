# Agent dashboard — a clickable box looks clickable

**Task:** `villa-dashboard-hover` · **Repo:** villa-memorial · **Branch:** `fm/villa-dashboard-hover` · **Date:** 2026-10-01
**Route:** `/agent/dashboard` (the agent workbench landed the same day).
**Brief (captain, 2026-10-01):** *“in dashboard, boxes when hover should have a distinct hover
effect so they know that it is clickable.”* Only the tool tiles carried a hover treatment, so a
clickable box and a static one looked identical until the pointer arrived.

---

## 1 · The rule

**A box that IS a link answers on `:hover` AND on `:focus-visible` with one treatment; a box that
does not link paints nothing.** The grammar is the product's own control grammar, not a new one:
the ground shifts to the sky control wash (`--sky-50`) and a hairline ring closes inside the edge
(`--sky-200`) — the same wash the active filter chip (`.ag-filter[data-on="yes"]`) and a filled
stage-flow segment already use. Free-standing tool tiles keep their one-step elevation
(`--shadow-card-hover`) on top of the wash.

The panel and flow open actions are text links, so they earn the matching link affordance — a
sky underline that thickens on hover and keyboard focus — rather than a box treatment.

| Element | Class | Box? | Hover / focus-visible |
|---|---|---|---|
| Brief band lead (the pipeline figure) | `.wb-brief__lead` | yes | sky wash + inset hairline ring |
| Every vitals ribbon entry (8 recorded + device queue) | `.wb-vital` | yes | sky wash + inset hairline ring |
| Quick tools (4) | `.wb-tool` | yes | sky wash + border + elevation |
| Panel open actions (“Show all 7 →”, …) | `.wb-panel__more` | link | sky underline, 2 px |
| Flow open action (“Open the pipeline →”) | `.wb-flow__more` | link | sky underline, 2 px |
| **Deliberately still** — brief band, panels, analytics band, attention rows, stage-flow segments, money rows | `.wb-brief` · `.wb-panel` · `.wb-analytics` · `.wb-alert` · `.stage-flow__seg` · `.wb-money` | no | no hover (no false affordance) |

The stage-flow is a strip of recorded counts, not seven links, so its segments stay still. The band
above them links out through **Open the pipeline →**, and that link answers.

## 2 · Where it lives

- `styles/components.css`, the `agent workbench` block (`.wb-brief__lead`, `.wb-vital`,
  `.wb-tool`, `.wb-panel__more`/`.wb-flow__more`). Tokens only — no raw colour, no raw size, no
  second face.
- `components/agent/workbench.tsx` is unchanged: every box that links already rendered a `<Link>`
  or `<a>`; this pass makes that fact visible rather than changing what is clickable.
- `tests/unit/page-backgrounds.test.ts` — three named control-state entries for the new sky
  grounds (`.wb-brief__lead:`, `.wb-vital:`, `.wb-tool:`), so a new wash stays a review decision.
- The reduced-motion block already dropped the tool tile's shadow for `:hover`; it now drops it for
  `:focus-visible` too, so the keyboard path is not treated as the pointer path's lesser sibling.

## 3 · Consistency, and what does not move

- **One hover grammar, carried by the component.** The shared `WorkbenchPanel` renders
  `.wb-panel__more` on `/agent/profile` and `/agent/performance` too, so those screens inherit the
  same open-action affordance — the affordance travels with the component.
- **No other portal is touched.** No family, admin or public class is edited; the family command
  centre's own hover rules are untouched.
- **No false affordance.** The static boxes are asserted to have no hover rule at all, so a later
  hand cannot quietly make a content box look like a button.

## 4 · Evidence

`before/` — the branch point (main, commit `9010b13`) with the pointer on a clickable box: nothing
changes. `after/` — this branch.

| File | Viewport | Pointer |
|---|---|---|
| `dashboard-1440-vital-hover.png` | 1440 × 900 | first vitals entry (“Sold this month”) |
| `dashboard-1440-brief-hover.png` | 1440 × 900 | brief lead (pipeline figure) |
| `dashboard-1440-vital-focus-visible.png` | 1440 × 900 | first vitals entry, keyboard focus |
| `dashboard-1440-tool-hover.png` | 1440 × 900 | “Price a plan” tool tile |
| `dashboard-1440-panel-more-hover.png` | 1440 × 900 | “Open the statement →” panel action |
| `dashboard-1440-static-hover.png` | 1440 × 900 | the analytics band (non-clickable) |
| `dashboard-390-vital-hover.png` | 390 × 844 | first vitals entry |
| `dashboard-390-brief-hover.png` | 390 × 844 | brief lead |
| `dashboard-390-static-hover.png` | 390 × 844 | the analytics band (non-clickable) |

The two static-box captures are byte-identical before and after (`md5 c9d297a5…` at 1440) — the
still boxes did not move. The before captures of the two clickable boxes are byte-identical to
each other, which is the point: with no hover treatment, the pointer's position is invisible.

## 5 · Guards

**New** `tests/unit/dashboard-hover.test.tsx` — renders the real workbench and reads the
stylesheet:

- every clickable box (brief lead, all 9 vitals, 4 tool tiles, the panel/flow open actions) is a
  real anchor, and no `.wb-vital`/`.wb-tool` is rendered on a non-anchor;
- the stage-flow is 7 `<li>` counts and never an `<a>`; the panels, analytics band and brief band
  are sections, not links;
- each of `.wb-brief__lead` / `.wb-vital` / `.wb-tool` carries one declaration block that answers
  `:hover` **and** `:focus-visible` with the sky wash;
- `.wb-panel__more` / `.wb-flow__more` answer both states with the sky underline;
- the reduced-motion block covers `.wb-tool:focus-visible`;
- the still boxes (`.wb-brief`, `.wb-panel`, `.wb-analytics`, `.stage-flow__seg`, `.wb-alert`,
  `.wb-money`) have no `:hover` rule that paints a ground or a pointer cursor.

Existing guards re-run green: `page-backgrounds`, `agent-density`, `agent-charts`, `broken-pages`,
`typography-system`, `accessibility-craft`.

## 6 · Deliberately not here

- **No new clickability.** The stage-flow segments, the panels and the analytics band stay static;
  making them links is a content/behaviour change, not a hover pass.
- **No layout, copy or figure change.** The DOM delta is class-state only (the same anchors and
  sections), so the dashboard's structure the `agent-density` guard pins is unchanged.

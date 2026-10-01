# Agent list hover — the prospects rows answer (2026-10-01)

> Captain, 2026-10-01, on the agent dashboard: **"boxes when hover should have a
> distinct hover effect so they know that it is clickable."**
>
> The dashboard's boxes got the affordance first
> ([`docs/08-delivery/dashboard-hover-design/`](../dashboard-hover-design/),
> `tests/unit/dashboard-hover.test.tsx`). The workbench rebuild then carried the
> same `.wb-clickable` grammar onto `/agent/clients`, `/agent/applications` and
> `/agent/marketing` ([record](../agent-screens-pass-design/README.md),
> `tests/unit/agent-screens-hover.test.tsx`). This record closes the pair: the
> one screen of the two lists that was still quiet — `/agent/prospects` — now
> answers by that same grammar, so `/agent/prospects` and `/agent/clients` read
> by one hover rule and no clickable row, pill or action on those lists can be
> mistaken for a static one.

## What this commit changes

| | Before | After |
|---|---|---|
| Prospects row (`.wb-table tbody tr`) | the product's flat `.table tbody tr:hover td` neutral wash — no ring, no keyboard half, and the wash stopped short of the last column | the sky control wash + a hairline ring, on the pointer **and** on `:focus-within` |
| Prospects view/filter pill (`.ag-filter`) | quiet — only the chip's own thin border changed | the fill + hairline step its CHOSEN state already wears, so the selection never reads as lost |
| Client rows and chips | already answered by the workbench rebuild | unchanged — re-pinned here so the pair cannot drift apart |
| Header band, filter panel, table panel, search form, note, empty state, board drop cards | static | static — unchanged |

Two files carry it: `app/(agent)/agent/prospects/page.tsx` (the modifier on every
body row and on every `.ag-filter` chip) and
`tests/unit/agent-list-hover.test.tsx` (the gate, re-pinned against the grammar
that is now in `styles/components.css`). The grammar itself — `.wb-clickable`,
the pill step, the collapsed-border cell ground and the `page-backgrounds`
allowlist entry — arrived with the workbench rebuild and is deliberately **not**
duplicated here; one rule, one owner.

## The grammar (already in `styles/components.css`, re-pinned here)

```css
.wb-clickable {
  transition: background-color var(--motion-base),
              border-color       var(--motion-base),
              box-shadow         var(--motion-base);
}

/* keyboard — the rows are not focusable, so :focus-within, not :focus-visible */
.wb-clickable:not(.ag-filter):focus-within,
.workbench .wb-table tbody tr.wb-clickable:focus-within {
  background: var(--sky-50);
  box-shadow: inset 0 0 0 1px var(--sky-200);
}

/* pointer — identical declarations, identical block */
.wb-clickable:not(.ag-filter):hover,
.workbench .wb-table tbody tr.wb-clickable:hover { … }

/* the collapsed-border table needs the ground on the cells too */
.workbench .wb-table tbody tr.wb-clickable:hover > td,
.workbench .wb-table tbody tr.wb-clickable:hover > th,
.workbench .wb-table tbody tr.wb-clickable:focus-within > td,
.workbench .wb-table tbody tr.wb-clickable:focus-within > th {
  background: var(--sky-50);
}

/* a pill is a capsule with its own border: the fill step, not the row's ring */
.ag-filter.wb-clickable:hover:not([data-on="yes"]),
.ag-filter.wb-clickable:focus-visible:not([data-on="yes"]) {
  background: var(--sky-50);
  border-color: var(--sky-200);
}
```

Decisions worth keeping:

1. **The same wash the dashboard already wears** — `--sky-50` ground, `--sky-200`
   hairline closing inside. Not a new treatment invented next to the dashboard's;
   that is the point of the pass.
2. **`.wb-clickable` is a MODIFIER, applied in the view.** The base
   `.wb-table tbody tr` and `.ag-work` rules stay hover-free — `.ag-work` is
   shared markup the family portal's `PortalRow` renders, and the generic
   `.table tbody tr:hover td` wash is the product's, not the agent portal's — so
   the affordance cannot leak into another portal. A still block (a panel, the
   header band, the search form, a note, a figure, a board drop card) never takes
   it: a false affordance on a box that does nothing is worse than a quiet one.
3. **`:focus-within`, not `:focus-visible`.** The rows are not focusable and must
   not be — the name inside the row is the link, the row's own buttons are the
   actions, and making the row a target would be the "make static rows clickable"
   change this pass explicitly excludes. Focus landing anywhere in the row gives
   the step the mouse gives; the RING stays the one global `:focus-visible` in
   `styles/base.css`, and this block declares no `outline`. A pill is an anchor,
   so its own keyboard state is `:focus-visible` — exactly as on the dashboard's
   boxes.
4. **The cells.** A prospects row is a `border-collapse: collapse` table, so the
   base `.table tbody tr:hover td` wash would sit on top of the row's own. The
   ground is painted on the cells and the ring closes on the row's own box, once
   — which also fixes the pre-existing artefact where the neutral wash stopped
   short of the last column (visible in `before/prospects-1440-row-hover.png`).
5. **No lift, no shadow, no gradient, no type.** The test fails on all of them.
   The transition is a colour crossfade only, so the global `prefers-reduced-motion`
   rule reduces it to an instant step and the affordance survives the reduction.
6. **Not gated on `(hover: hover)`.** The portal's hover grammar is ungated
   everywhere else — the dashboard's boxes, `.kpi-card`, `.ag-quick`, the
   product's own table row wash — so a gate here alone would produce exactly the
   inconsistency the captain is asking us to remove (a box that answers on the
   dashboard but not in a list). A tap cannot leave the wash stuck here anyway:
   the rows are not targets themselves (no `cursor: pointer`, no click handler),
   so the row leaves with the link the tap followed. The guard asserts both.

## Evidence — `before/` and `after/`

Captured at 1440×900 and 390×844 against `next dev` on port 4002, signed in as
the fixture agent persona (`agent@vm.demo`). The "before" shots are the same
page with this commit's one file reverted
(`git checkout main -- 'app/(agent)/agent/prospects/page.tsx'`), so each pair is
the real before and the real after. Measured on the rebased head: on a prospects
row `background-color` goes `rgba(0, 0, 0, 0)` → `rgb(234, 246, 253)` with
`box-shadow: inset 0 0 0 1px rgb(165, 220, 247)`, and an unchosen chip steps
from a white ground with a neutral hairline to the chosen state's own
sky-50/sky-200 — the same two values the sibling screen already answers with.

| Shot | What it shows |
|---|---|
| `before/prospects-1440-row-hover.png` → `after/prospects-1440-row-hover.png` | the pointer on a prospects row — a bare neutral wash that stops short of the last column, versus the sky wash and the ring |
| `after/prospects-1440-row-focus.png` | the keyboard ring on the row's own **Open**, with the row stepped by `:focus-within` |
| `before/prospects-1440-pill-hover.png` → `after/prospects-1440-pill-hover.png` | the pointer on a filter chip — quiet before, the chosen-state fill step after |
| `before/prospects-390-row-hover.png` → `after/prospects-390-row-hover.png` | at 390 the row restacks into a card; the affordance paints the whole card evenly, the actions still sit full width and nothing shifts or overflows |
| `after/prospects-390-row-focus.png`, `after/prospects-390-pill-hover.png` | the phone keyboard and pill steps |
| `after/clients-1440-row-hover.png`, `after/clients-1440-row-focus.png`, `after/clients-390-row-hover.png` | the sibling screen unchanged by this commit, answering by the same rule (the same measured wash and ring) — the pair reads as one |

## What is pinned, and where

`tests/unit/agent-list-hover.test.tsx` — the whole claim in three halves:

- **the markup**, rendered from the two real pages: every prospects row and every
  client row carries the modifier (never the header row), every `.ag-filter`
  chip on both does, and the panels, the search form, the note and the empty
  state do not; no row is turned into an anchor.
- **the rule**, parsed out of `styles/components.css`: the hover and focus
  declarations are identical, the wash is the dashboard's approved one, no
  lift / shadow / gradient / transform / outline / type size appears, nothing is
  parked inside a media query, and no `cursor: pointer` is invented on a
  non-target.
- **the containment**: the affordance does not reach the base `.ag-work` rule or
  a bare `tr.wb-clickable`, and the still boxes the earlier guards name
  (`wb-panel`, `wb-money`, `stage-flow__seg`) are untouched.

One existing assertion needed a repair: `tests/unit/agent-density.test.tsx`
counted the prospects rows as the literal string `"<tr>"`, which the modifier
makes untrue. It now counts the element (`"<tr"`), so the assertion still means
"the header plus all seven recorded prospects".

The neighbouring guards (`agent-screens-hover`, `dashboard-hover`,
`typography-system`, `broken-pages`, `phone-layout`, `accessibility-craft`,
`page-backgrounds`, `agent-density`, `agent-prospect-board`, `reading-budget`)
stay green.

## Out of scope

The dashboard and the workbench screens (already done), the quote desk and
performance page (they use the same `.ag-filter` pills but are separate surfaces
with their own pass), the family and admin portals, and making a static row
clickable.
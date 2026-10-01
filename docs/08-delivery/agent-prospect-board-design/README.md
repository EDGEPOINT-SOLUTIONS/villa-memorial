# Agent prospect board — the placement mode of `/agent/prospects` (2026-10-02)

**Status:** shipped on `fm/villa-prospect-board` (local-only).
**Captain's intent:** *"Also i want that kaban board mode for the prospects for easy placements
of stages per prospects if they are qualified, contacted, ready to close etc…"* (2026-10-02).

---

## What this adds

The workbench replaced the old four-lane board (read-only) with the filterable list, because a
board spends the widest screen and cannot hold forty rows. What changed since is the write: the
acquisition work records every stage move (day · author · note) through the pipeline journal, so
a board can be the **placement surface** the captain asked for — as a mode beside the list, not
instead of it.

- `/agent/prospects` gains a **List / Board** switch. The list stays the default and is otherwise
  untouched; `?view=board` swaps the table for the board. The switch keeps every active filter,
  the stage/source chips and the search, so the board shows exactly what the list would.
- The board is **one column per pipeline stage**, in PRD order, taken from the single vocabulary
  the product owns — `PIPELINE_STAGES` in `lib/agent/agent-view.ts`
  (New → Contacted → Qualified → Presentation → Proposal → Reserved → Sold). No second list, and
  **no empty column is hidden**: a stage with nobody in it prints "No one here yet." (Meeting
  planned, Reserved and Sold are all visible on an empty pipeline).
- Every card carries the facts the list row shows: **name · the need · the contract value · the
  next action · the urgency state**, plus Call / Open and the Move control.

## Placement is the existing write, not a new one

The board never writes from itself. A drop (or the card's Move button) opens one dialog that asks
for the note the record promises every move, then `POST`s
`/api/agent/prospects/:id/stage` — the **same route and store** the lead record's step-by-step
acquisition already uses (`app/api/agent/prospects/[id]/stage/route.ts` →
`lib/api-client/agent-store.ts`). The server's refusal (backward move, missing note, someone
else's lead) is shown verbatim and changes nothing.

Because the list, the dashboard stage-flow, the pipeline value, the conversion funnel and the
client book all fold the one journal (`lib/api-client/agent.ts`), a board move reaches every
surface with no second write and no read of its own.

## Easy and safe to place

- **Drag-and-drop** on a wide screen: a dragged card dims (`data-dragging`), the column under the
  pointer answers (`data-over`), and the target says whether the drop is legal (`data-valid` — the
  sky control wash for a legal forward move, the refusal colour for an illegal one).
- **Keyboard first.** Drag is an enhancement, never the only way: every non-terminal card carries
  a **Move** button with a per-person accessible name, which opens the same dialog. The dialog
  offers every forward stage (never the card's own), asks "What happened?", and is trapped by
  `components/ui/use-modal-focus.ts` (focus in, Tab trap, Escape, scroll lock, focus returns to
  the opener). Every control answers on the global `:focus-visible` ring.
- **A refused move explains itself.** Dropping a card on its own or an earlier stage paints the
  refusal banner with the person and both stage names and writes nothing; a failed POST shows the
  server's sentence in the dialog and leaves the board as it was.
- **The terminal stage has no move.** A Sold card prints no Move control — the pipeline has no
  next step.

## Wide-screen mode, narrow-screen truth

The board is a wide-screen layout. Below `48rem` it yields to the list and prints where it lives
("The board is a wide-screen view. Here is the same pipeline as a list — open it on a desktop to
place cards between stages."), so the page keeps working at **390 with no sideways scroll**
(verified: `documentElement.scrollWidth === innerWidth` at 390, 800, 1024, 1280; when the seven
columns are wider than the window they pan *inside* the board frame, which is focusable, not the
page).

The board uses the workbench's own material (one hairlined sheet, tabular value figures, the sky
wash reserved for a control state) and the portal's focus ring; the global
`prefers-reduced-motion` rule in `styles/base.css` removes its transitions, so it respects reduced
motion. Switching List ↔ Board swaps only the panel body — the header, filter bar and page frame
do not move.

## Implementation

- `lib/agent/prospect-board.ts` — the pure model: `boardColumns` (one column per `PIPELINE_STAGES`
  entry, empty included), `canMoveTo` (forward-only, read off `stageIndex`), `moveTargets` (the
  forward stages a card may move to).
- `components/agent/prospect-board.tsx` — the client board: columns, cards, drag/drop state, and
  the one `ProspectMoveDialog` used by both the drop and the keyboard control.
- `lib/agent/agent-view.ts` — `prospectUrgency` moved here from the page so the list and the
  board render a person's state from one reading.
- `app/(agent)/agent/prospects/page.tsx` — the `view` search param, the List/Board switch, and
  the phone fallback (the list markup now lives in one `ProspectTable` used by both modes).
- `styles/components.css` — the appended "agent prospect board" block (`.pb-*`, `.wb-viewswitch`).

## Evidence

### Commands

```bash
npm run lint          # pass (0 errors; pre-existing warnings only)
npm run typecheck     # pass
npm test              # 274 files, 3051 tests, pass (after rebasing onto current main)
npm run build         # pass
```

Focused suites:

```bash
npx vitest run tests/unit/agent-prospect-board.test.tsx \
  tests/unit/agent-acquisition-route.test.ts \
  tests/unit/agent-acquisition-flow.test.tsx \
  tests/unit/agent-view.test.ts \
  tests/unit/page-backgrounds.test.ts \
  tests/unit/typography-system.test.ts \
  tests/unit/broken-pages.test.ts \
  tests/unit/accessibility-craft.test.tsx \
  tests/unit/phone-layout.test.tsx
```

### Screenshots — `shots/`

Captured against the dev server (`DEMO_QUICK_FILL=1`, port 4100), signed in as `agent@vm.demo`,
at 1440×900 and 390×844.

| File | What it shows |
|---|---|
| `list-1440.png` · `list-390.png` | **Before / default:** the unchanged working list, now with the List/Board switch above the filter chips. |
| `board-1440.png` | **After:** the board — seven columns including the three empty ones (Meeting planned 0, Reserved 0, Sold 0), cards carrying name · need · value · next action · state. |
| `board-390.png` | Board mode on a phone: the board yields to the list and prints the "wide-screen view" note; no sideways scroll. |
| `board-drag-1440.png` | A drag in progress: Lorna Castro's card dimmed, the Contacted column under the pointer wearing the legal-drop sky wash. |
| `board-moved-1440.png` | The moved card: after the recorded move, New is 1 and Contacted is 3 with Lorna Castro first. |
| `board-move-dialog-1440.png` | The keyboard-accessible move control: the focused Move button opened the dialog pre-set to the next stage, with the required note and the two actions. |
| `board-refused-1440.png` | A refused move: dropping a Qualified card on Contacted explains "Only forward moves…" and changes nothing. |

### Tests added

- `tests/unit/agent-prospect-board.test.tsx` — the model (columns from `PIPELINE_STAGES`, empty
  columns kept, forward-only targets); the real page in board mode (one column per stage, each
  recorded card in its stage column, the lead facts on the card, filters respected, no Move on a
  Sold card, the phone fallback); the move reaching the board and the list from the one journal;
  and the accessible dialog (role, labelled, every forward stage, the note field, Cancel).
- `tests/unit/page-backgrounds.test.ts` — the legal drop state added to the sky-control allowlist.

## Files

| File | What it is |
|---|---|
| `lib/agent/prospect-board.ts` | The pure board model (columns, forward-only legality, targets). |
| `components/agent/prospect-board.tsx` | The board, cards and the one move dialog. |
| `lib/agent/agent-view.ts` | `prospectUrgency` — one reading of a person's state for both modes. |
| `app/(agent)/agent/prospects/page.tsx` | The List/Board switch and the phone fallback. |
| `styles/components.css` | `.pb-*` board block and `.wb-viewswitch`. |
| `tests/unit/agent-prospect-board.test.tsx` | The board guard. |

## Out of scope

The list's own layout, the stage vocabulary and its rules, and any board for another screen.

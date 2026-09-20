# Component kit — the settled patterns (design + migration record)

**What this is.** `components/kit/` is the one home for the layouts this product repeats on every
screen: an admin table, a status chip, an empty state, a KPI tile, a photograph-first product card,
a card grid and a filter panel. Before this pass each screen re-derived those from scratch — a
product card here, a data table there, a filter rail somewhere else — and then re-judged, re-cropped
and re-verified them. A page fix took an hour partly because the same design decision was made
again on every task.

The kit's own rules live in [`components/kit/README.md`](../../../components/kit/README.md); this
file is the build record.

## What shipped

| Component | Purpose | File |
|---|---|---|
| `DataTable` | Admin table: header, sortable columns, status chips, empty state, self-panning scroll. | `components/kit/data-table.tsx` |
| `ResultsGrid` | Responsive card grid (3 / 2 / 1) with empty and no-match states. | `components/kit/results-grid.tsx` |
| `ProductCard` | Photograph-first product card: title, supporting line, price, status chip, one action. | `components/kit/product-card.tsx` |
| `FilterRail` | Sticky grouped filter panel with counts, a price group and a phone sheet. | `components/kit/filter-rail.tsx` |
| `StatusChip` | One status word + colour (the six `Badge` tones). | `components/kit/status-chip.tsx` |
| `EmptyState` | The empty / no-match state (canonical; `components/ui/empty-state.tsx` re-exports it). | `components/kit/empty-state.tsx` |
| `StatCard` | One KPI figure with its label and its basis. | `components/kit/stat-card.tsx` |

`FilterRail`'s pure decisions live in `components/kit/filter-rail-model.ts`; every component has a
unit test under `tests/unit/kit-*.test.*` (including the zero-count and empty / no-match states).

## The rules the kit encodes

Tokens only from `styles/tokens.css` (kit CSS lives in the "Component kit" block of
`styles/components.css`, so the typography gate scans it); figures, labels and statuses lead with no
prose inside a card or row; every list has an empty **and** a no-match state; photographs lead and a
card without one is a bug (the single honest exception is an item the client's material does not
cover, which renders text-only); and a chip or figure with no recorded source says so rather than
showing a plausible number.

## Migrated screens (markup-for-markup)

`/staff/inventory` · `/staff/accounting` · `/staff/notifications` · `/staff/workflows` ·
`/staff/settings` · `/staff/users`

Their tables are `DataTable`, tiles `StatCard`, state chips `StatusChip`, empty states
`EmptyState`. Behaviour, data, prices and honesty notes are unchanged. The public pages are
deliberately **not** touched — `/lots` is being rebuilt in parallel; `ProductCard` / `ResultsGrid` /
`FilterRail` are the pieces that pass adopts next.

## No-visual-change evidence

The migration emits the same classes and the same DOM as the pages it replaces.

1. **Rendered DOM is byte-identical.** Every migrated page was rendered with `renderToStaticMarkup`
   at the base commit and on this branch (fixture mode, fixed session), with no defaults applied.
   All six pages produced identical HTML byte-for-byte:

   ```
   IDENTICAL accounting  inventory  notifications  settings  users  workflows
   ```

2. **Screenshots at 1440 and 390** (headless Chrome, same session, `before` = base commit,
   `after` = this branch) are the same within rendering nondeterminism — measured with `sharp`
   pixel diff:

   | Page | 1440 | 390 |
   |---|---|---|
   | accounting | 30 / 1,296,000 px | 524 / 329,160 px |
   | inventory | 31 / 1,296,000 px | 37 / 329,160 px |
   | notifications | identical | identical |
   | settings | identical | identical |
   | users | identical | identical |
   | workflows | identical | 592 / 329,160 px |

   The residual diffs are sub-pixel glyph antialiasing (mobile max channel delta ≤ 7; 1440 diffs
   confined to a 7×7 px glyph edge). A **control** — two screenshots of the *same* build — shows the
   same mobile drift (0.14–0.18%, max delta ≤ 7) on those pages, so the difference is the renderer,
   not the code.

   Reproduction: render both trees with the temporary harness
   (`renderToStaticMarkup` → `/tmp/kit-{before,after}/*.html`), and drive `google-chrome
   --headless=new --remote-debugging-port=9222` over CDP (login once via
   `POST /api/auth/login` as `admin@vm.demo`, then `Emulation.setDeviceMetricsOverride` +
   `Page.captureScreenshot` per page/width).
